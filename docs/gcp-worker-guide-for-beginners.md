# Worker trên Google Cloud cho người mới — hướng dẫn tổng quát, từng bước

> Tài liệu này **không gắn với một repo nào**. Nó trả lời câu hỏi: _"Tôi có một backend, tôi
> muốn chạy việc nền (gửi mail, xử lý file, chạy báo cáo mỗi đêm, đồng bộ dữ liệu) trên GCP.
> Tôi phải dùng dịch vụ nào, nối chúng lại ra sao, viết code thế nào, và tránh những bẫy gì?"_
>
> Cách đọc:
>
> - Phần **I** (khái niệm) và **II** (bản đồ dịch vụ) đọc một lần, đọc chậm.
> - Phần **III** (chuẩn bị) làm theo đúng thứ tự, một lần cho mỗi project GCP.
> - Phần **IV** là **năm flow mẫu**, mỗi flow tự đứng độc lập, có lệnh `gcloud` và code chạy được.
>   Chọn flow gần bài toán của bạn nhất, làm theo, rồi quay lại đọc các flow khác.
> - Phần **V** trở đi là những thứ giúp worker chạy **đúng trong production**: idempotency,
>   bảo mật, log, chi phí, lỗi hay gặp.
>
> Code mẫu viết bằng **Node.js + TypeScript + Express** để không phụ thuộc framework. Nếu bạn
> dùng NestJS, Fastify, Go hay Python thì handler chỉ đổi cú pháp, còn **flow và các header,
> status code, quy tắc bảo mật giữ nguyên**. Mỗi mục đều kết bằng một dòng **"Nhớ một câu"**.

---

# PHẦN I — Khái niệm nền, không gắn với GCP

## 1. Worker là gì và vì sao cần

Một request HTTP bình thường phải trả về trong vài trăm mili-giây. Nhưng có những việc:

| Việc                                 | Vì sao không nên làm trong request                 |
| ------------------------------------ | -------------------------------------------------- |
| Gửi email/SMS qua bên thứ ba         | Chậm, có thể lỗi, không phải lý do client gọi API  |
| Resize ảnh, tạo PDF, chuyển mã video | Tốn CPU hàng giây đến hàng phút                    |
| Đồng bộ dữ liệu sang hệ thống khác   | Phụ thuộc hệ thống ngoài, cần thử lại khi lỗi      |
| Chạy báo cáo mỗi đêm, dọn dữ liệu cũ | Không có request nào kích hoạt; cần chạy theo lịch |
| Xử lý một file CSV 100.000 dòng      | Phải chia nhỏ, chạy song song, có thể mất hàng giờ |

**Worker** là một process (hoặc một endpoint) chạy **ngoài vòng request của người dùng**, nhận
"việc" từ một nơi trung gian và làm việc đó. Ba lợi ích:

1. **Request trả về ngay.** API chỉ ghi nhận việc, không làm việc.
2. **Việc không mất khi lỗi.** Nơi trung gian giữ việc; worker lỗi thì thử lại.
3. **Scale độc lập.** Việc tồn đọng thì thêm worker, API không cần đổi.

> **Nhớ một câu:** worker = làm việc chậm ở chỗ khác, để request trả về ngay và việc không mất.

## 2. Ba vai trong mọi hệ thống worker

```
  PRODUCER ──tạo việc──▶ ┃ BROKER / QUEUE ┃ ──giao việc──▶ CONSUMER (worker)
  (API, cron, sự kiện)     (giữ, sắp lịch,                 (nhận, xử lý, báo kết quả)
                            thử lại)
```

| Vai      | Trách nhiệm                                                                 | Ví dụ trên GCP                                         |
| -------- | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| Producer | Mô tả việc thành một **message nhỏ** (thường chỉ chứa ID), gửi vào broker   | Code API gọi Cloud Tasks; Cloud Scheduler nổ theo cron |
| Broker   | Lưu bền message, giao cho worker, **thử lại** khi thất bại, giới hạn tốc độ | Cloud Tasks, Pub/Sub, Cloud Scheduler                  |
| Consumer | Nhận message, làm việc, **trả lời thành công/thất bại**                     | Cloud Run service/job, Cloud Functions, GKE            |

Điều quan trọng nhất: **producer và consumer không nói chuyện trực tiếp**. Cả hai chỉ biết
broker. Nhờ vậy API có thể deploy lại, worker có thể tắt đi bật lại, mà việc không mất.

## 3. Pull và push — hai cách worker nhận việc

Đây là chỗ GCP khác với các hệ thống bạn có thể đã quen (BullMQ, Sidekiq, Celery).

```
PULL (worker chủ động)                  PUSH (broker chủ động)
┌────────┐   "có việc không?"           ┌────────┐   HTTP POST /tasks/xyz
│ worker │ ─────────────▶ queue         │ broker │ ─────────────────────▶ worker (HTTP server)
│        │ ◀───────────── job           │        │ ◀───────────────────── 200 OK / 5xx
└────────┘   (giữ kết nối, vòng lặp)    └────────┘   (một request = một việc)
```

| Tiêu chí             | Pull                                          | Push                                                        |
| -------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| Worker là gì         | Process chạy liên tục, vòng lặp lấy job       | **HTTP server** có endpoint nhận việc                       |
| Ai quyết định tốc độ | Worker (lấy bao nhiêu thì lấy)                | Broker (theo cấu hình rate limit)                           |
| Scale-to-zero        | Khó — worker phải luôn chạy để hỏi            | Dễ — không có request thì không có instance                 |
| Thử lại              | Worker tự làm                                 | Broker làm, dựa trên status code                            |
| Ví dụ                | BullMQ, Celery, Pub/Sub **pull subscription** | Cloud Tasks, Cloud Scheduler, Pub/Sub **push subscription** |

**Trên GCP, mô hình chủ đạo là push.** Cloud Tasks và Cloud Scheduler chỉ có push. Pub/Sub có cả
hai. Lý do: nền tảng compute của GCP (Cloud Run, Cloud Functions) là serverless, tính tiền theo
request, và tự tắt về 0 khi không có request. Một vòng lặp pull chạy 24/7 đi ngược triết lý đó.

Hệ quả thực tế bạn phải chấp nhận ngay từ đầu:

- **Worker của bạn là một web server.** Nó nhận `POST`, đọc body, làm việc, trả status code.
- **Status code là ngôn ngữ duy nhất** để nói "xong" hay "làm lại".
- **Ai cũng có thể gọi endpoint đó** nếu bạn không khoá. Bảo mật (Phần VI) không phải tuỳ chọn.

> **Nhớ một câu:** trên GCP, worker là một HTTP endpoint; 2xx là xong, 5xx là làm lại.

## 4. At-least-once — quy tắc vàng bạn không thể tránh

Mọi broker trên GCP đều giao việc theo kiểu **at-least-once**: một message có thể được giao
**nhiều hơn một lần**. Không phải lỗi, là thiết kế. Nó xảy ra khi:

- Worker xử lý xong nhưng **chết trước khi trả 200** → broker không biết, giao lại.
- Worker xử lý quá lâu, **vượt deadline** → broker coi là thất bại, giao lại; bản cũ vẫn đang chạy.
- Mạng rớt giữa lúc worker trả 200 và broker nhận được.

Vì thế **mọi handler worker phải idempotent**: chạy hai lần cho cùng một message phải cho kết
quả như chạy một lần. Chi tiết cách làm ở Phần V. Bây giờ chỉ cần ghim câu này:

> **Nhớ một câu:** message sẽ đến hai lần; code của bạn phải không sao khi điều đó xảy ra.

---

# PHẦN II — Bản đồ dịch vụ GCP cho việc nền

## 5. Toàn cảnh một bảng

```
                     ┌──────────────── NGUỒN VIỆC (producer) ────────────────┐
                     │  Cloud Scheduler   code API    Eventarc/GCS/Firestore │
                     └──────┬─────────────────┬────────────────┬─────────────┘
                            │ cron            │ việc lẻ        │ sự kiện
                            ▼                 ▼                ▼
                     ┌───────────── BROKER (giữ + thử lại + giao) ───────────┐
                     │   (Scheduler tự push)   Cloud Tasks      Pub/Sub      │
                     │                          Workflows (điều phối nhiều bước) │
                     └──────┬─────────────────┬────────────────┬─────────────┘
                            │ HTTP push        │ HTTP push      │ HTTP push / pull
                            ▼                 ▼                ▼
                     ┌───────────── CONSUMER (nơi code chạy) ────────────────┐
                     │  Cloud Run service   Cloud Run job   Cloud Functions   │
                     │  GKE / Compute Engine (khi cần pull hoặc kiểm soát sâu) │
                     └───────────────────────────────────────────────────────┘
```

| Dịch vụ               | Vai       | Một câu mô tả                                                                       | Dùng khi                                                        |
| --------------------- | --------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Cloud Scheduler**   | Producer  | Cron được quản lý: đến giờ thì gọi một URL, publish một topic, hoặc chạy job        | Việc theo lịch: báo cáo đêm, dọn dữ liệu, nhắc nhở              |
| **Cloud Tasks**       | Broker    | Hàng đợi việc lẻ, mỗi task gọi một URL, có rate limit, retry, hẹn giờ, khử trùng    | Việc do API sinh ra, cần kiểm soát tốc độ và thứ tự thử lại     |
| **Pub/Sub**           | Broker    | Bus sự kiện: một topic, nhiều subscription, mỗi subscription nhận đủ mọi message    | Một sự kiện nhiều bên quan tâm; throughput lớn; có DLQ          |
| **Workflows**         | Điều phối | Máy trạng thái viết YAML: gọi API, chờ, rẽ nhánh, lặp, thử lại từng bước            | Quy trình nhiều bước, kéo dài hàng giờ/ngày                     |
| **Eventarc**          | Producer  | Biến sự kiện GCP (file lên GCS, audit log...) thành HTTP call tới Cloud Run         | Xử lý khi có file mới, khi resource thay đổi                    |
| **Cloud Run service** | Consumer  | Container HTTP, scale 0→N theo request, mỗi request tối đa 60 phút                  | Worker push cho Tasks/Scheduler/Pub/Sub — **mặc định nên chọn** |
| **Cloud Run job**     | Consumer  | Container chạy đến khi xong (không có HTTP), chia N task song song, tối đa 24h/task | Batch dài: xử lý file lớn, migrate, ETL                         |
| **Cloud Functions**   | Consumer  | Hàm nhỏ, GCP lo container; thực chất là Cloud Run bên dưới (gen 2)                  | Việc rất nhỏ, không muốn quản lý Dockerfile                     |
| **GKE / GCE**         | Consumer  | Bạn tự quản lý; cần khi muốn worker pull chạy 24/7 hoặc cần GPU, state đặc thù      | Đã có cluster; cần pull; cần tài nguyên đặc biệt                |
| **Memorystore Redis** | Hỗ trợ    | Redis được quản lý: khoá phân tán, dedupe, cache                                    | Khi worker cần khoá hoặc đếm ngoài DB                           |

## 6. Chọn dịch vụ nào — cây quyết định

```
Việc này kích hoạt bởi cái gì?
│
├─ Theo giờ/ngày cố định ─────────────────────────▶ Cloud Scheduler
│     │  Việc chạy < 60 phút, có thể chia theo request?  ─▶ Scheduler → Cloud Run service   [Flow 1]
│     └─ Việc chạy hàng giờ, hoặc cần N bản song song?  ─▶ Scheduler → Cloud Run job        [Flow 4]
│
├─ Code của tôi sinh ra, mỗi lần một việc cụ thể ─▶ Cloud Tasks → Cloud Run service        [Flow 2]
│     (gửi mail cho user X, sync đơn hàng Y, hẹn 30 phút sau nhắc Z)
│
├─ Một sự kiện mà NHIỀU bên cần biết, hoặc lượng rất lớn ─▶ Pub/Sub → Cloud Run service   [Flow 3]
│     (đơn hàng tạo xong → kho, kế toán, analytics cùng nghe)
│
├─ Có file mới trên GCS / bản ghi mới trên Firestore ─▶ Eventarc → Cloud Run service
│
└─ Quy trình nhiều bước, có chờ, có rẽ nhánh, có thể kéo dài ──▶ Workflows                  [Flow 5]
      (import file: upload → validate → chia lô → chờ xử lý → gửi báo cáo)
```

Hai câu hỏi phân biệt Cloud Tasks với Pub/Sub, vì người mới hay nhầm:

| Câu hỏi                                               | Cloud Tasks                | Pub/Sub                                        |
| ----------------------------------------------------- | -------------------------- | ---------------------------------------------- |
| Có **một** người xử lý hay **nhiều** người cùng nghe? | Một (queue → một URL)      | Nhiều (một topic → N subscription)             |
| Producer có cần biết **ai** xử lý không?              | Có — producer chỉ định URL | Không — producer chỉ biết topic                |
| Cần hẹn giờ chạy sau X phút?                          | Có, tới 30 ngày            | Không (chỉ delay rất ngắn qua retry)           |
| Cần giới hạn "tối đa 10 request/giây tới bên thứ ba"? | Có, cấu hình trên queue    | Không trực tiếp (dùng flow control ở consumer) |
| Cần dead-letter queue sẵn có?                         | Không có                   | Có                                             |
| Cần khử trùng theo tên?                               | Có (task name)             | Không (tự làm ở consumer)                      |

> **Nhớ một câu:** cron → Scheduler; việc lẻ → Tasks; sự kiện nhiều người nghe → Pub/Sub;
> batch dài → Cloud Run job; nhiều bước → Workflows. Code chạy trên Cloud Run.

---

# PHẦN III — Kiến thức nền GCP và chuẩn bị môi trường

## 7. Bốn khái niệm GCP phải hiểu trước

### 7.1 Project, region, billing

- **Project** là đơn vị chứa mọi resource, có `PROJECT_ID` (chuỗi duy nhất toàn cầu) và
  `PROJECT_NUMBER` (số). Một số lệnh cần ID, một số cần NUMBER — để ý.
- **Region** (ví dụ `asia-southeast1` Singapore, `asia-northeast1` Tokyo): Cloud Run, Cloud
  Tasks queue, Scheduler job, Workflows đều **thuộc một region**. Đặt tất cả cùng một region để
  giảm độ trễ và tránh lỗi "queue không tồn tại" vì bạn tạo ở region khác.
- **Billing account** phải gắn vào project, nếu không hầu hết API bị từ chối.

### 7.2 Service Account (SA) — "user" của máy

Con người đăng nhập bằng Google account. **Máy** (Cloud Run instance, Scheduler job, Cloud Tasks
queue) đăng nhập bằng **service account**, có dạng `ten-sa@PROJECT_ID.iam.gserviceaccount.com`.

Nguyên tắc: **mỗi thành phần một SA riêng, quyền tối thiểu**.

```
sa-api        → chạy Cloud Run API;  được phép: tạo task (cloudtasks.enqueuer), publish Pub/Sub
sa-worker     → chạy Cloud Run worker; được phép: đọc/ghi DB, GCS bucket cụ thể
sa-scheduler  → Cloud Scheduler dùng để gọi worker; được phép: run.invoker trên worker
sa-tasks      → Cloud Tasks dùng để gọi worker; được phép: run.invoker trên worker
```

Không dùng **default compute service account** (`PROJECT_NUMBER-compute@developer.gserviceaccount.com`)
cho production — nó thường có quyền Editor, quá rộng.

### 7.3 IAM role — ai được làm gì trên cái gì

IAM binding = (**ai**: SA/user) + (**được làm gì**: role) + (**trên cái gì**: project / một
resource cụ thể). Role dùng nhiều nhất trong bài toán worker:

| Role                                   | Cho phép                                                      | Gán cho                                                 |
| -------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| `roles/run.invoker`                    | Gọi một Cloud Run service (hoặc chạy một job)                 | SA của Scheduler/Tasks/Pub/Sub, **trên service worker** |
| `roles/cloudtasks.enqueuer`            | Tạo task vào queue                                            | SA của API                                              |
| `roles/pubsub.publisher`               | Publish vào topic                                             | SA của API                                              |
| `roles/iam.serviceAccountUser`         | "Đóng vai" một SA (cần khi tạo task với OIDC token của SA đó) | SA của API, trên SA-tasks                               |
| `roles/iam.serviceAccountTokenCreator` | Tạo token thay cho SA khác                                    | Hiếm khi cần ở đây                                      |
| `roles/cloudsql.client`                | Kết nối Cloud SQL qua connector                               | SA của worker                                           |
| `roles/storage.objectAdmin`            | Đọc/ghi object trong bucket                                   | SA của worker, **trên bucket**                          |
| `roles/logging.logWriter`              | Ghi log                                                       | Thường có sẵn qua default                               |

### 7.4 OIDC token — cách máy chứng minh "tôi là ai" khi gọi HTTP

Khi Cloud Scheduler hoặc Cloud Tasks gọi worker, nó gửi header
`Authorization: Bearer <ID token>`. Token đó là một JWT do Google ký, chứa:

```json
{
  "iss": "https://accounts.google.com",
  "aud": "https://worker-xxxx-as.a.run.app",         ← audience: URL nó định gọi
  "email": "sa-tasks@PROJECT_ID.iam.gserviceaccount.com",  ← ai gọi
  "email_verified": true,
  "exp": 1727000000, "iat": 1726996400
}
```

Cloud Run (khi service **không cho phép unauthenticated**) sẽ **tự verify token này trước khi
request tới code của bạn**: chữ ký đúng, chưa hết hạn, audience trùng URL, SA có
`run.invoker`. Sai một điều là trả `403` hoặc `401` ngay ở tầng hạ tầng. Đây là lớp bảo vệ
quan trọng nhất và bạn có nó **miễn phí** chỉ bằng cách không bật `--allow-unauthenticated`.

> **Nhớ một câu:** mỗi thành phần một SA; SA nào gọi worker thì cần `run.invoker` trên worker;
> Cloud Run tự verify OIDC nếu bạn không mở public.

## 8. Chuẩn bị máy và project — làm một lần

```bash
# 1. Cài gcloud CLI: https://cloud.google.com/sdk/docs/install
gcloud init                                   # chọn account, project, region mặc định
gcloud auth application-default login         # để SDK trên máy local dùng được credential của bạn

# 2. Biến dùng xuyên suốt tài liệu (đổi theo bạn)
export PROJECT_ID="my-shop-dev"
export REGION="asia-southeast1"
export PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
gcloud config set project "$PROJECT_ID"
gcloud config set run/region "$REGION"

# 3. Bật API — tắt là lệnh sau lỗi "API not enabled"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  cloudtasks.googleapis.com \
  cloudscheduler.googleapis.com \
  pubsub.googleapis.com \
  workflows.googleapis.com \
  eventarc.googleapis.com \
  iam.googleapis.com \
  logging.googleapis.com

# 4. Tạo các service account
for SA in sa-api sa-worker sa-scheduler sa-tasks; do
  gcloud iam service-accounts create "$SA" --display-name="$SA"
done

# 5. Artifact Registry để chứa image
gcloud artifacts repositories create apps \
  --repository-format=docker --location="$REGION"
```

## 9. Bộ khung worker tối thiểu (dùng cho mọi flow phía dưới)

Một Cloud Run service phải: lắng nghe cổng `$PORT` (mặc định 8080), trả lời HTTP, tắt sạch khi
nhận `SIGTERM`. Dưới đây là khung Express đủ dùng.

```
worker/
├── Dockerfile
├── package.json
└── src/
    ├── server.ts        # bootstrap, health, graceful shutdown
    ├── auth.ts          # verify OIDC (lớp 2, sau lớp Cloud Run)
    └── handlers/
        ├── nightly-report.ts
        ├── send-email.ts
        └── order-created.ts
```

```ts
// src/server.ts
import express from "express";
import { requireGoogleOidc } from "./auth";
import { nightlyReport } from "./handlers/nightly-report";
import { sendEmail } from "./handlers/send-email";
import { orderCreated } from "./handlers/order-created";

const app = express();
app.use(express.json({ limit: "1mb" }));

// Health check: Cloud Run không bắt buộc, nhưng tiện để probe và kiểm tra deploy.
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// Mỗi loại việc một route. Prefix theo nguồn để nhìn log là biết ai gọi.
app.post("/cron/nightly-report", requireGoogleOidc, nightlyReport);
app.post("/tasks/send-email", requireGoogleOidc, sendEmail);
app.post("/pubsub/order-created", requireGoogleOidc, orderCreated);

const port = Number(process.env.PORT ?? 8080);
const server = app.listen(port, () =>
  console.log(
    JSON.stringify({ severity: "INFO", message: `listening on ${port}` }),
  ),
);

// Cloud Run gửi SIGTERM rồi chờ tối đa 10 giây trước khi kill.
// Ngừng nhận request mới, để request đang chạy kết thúc, đóng DB.
process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 9_000).unref();
});
```

```ts
// src/auth.ts — lớp verify thứ hai, chạy SAU khi Cloud Run đã verify.
// Vì sao cần: (1) nếu ai đó lỡ bật allow-unauthenticated, bạn vẫn an toàn;
//             (2) kiểm tra đúng SA nào được gọi route nào, thứ Cloud Run không phân biệt theo route.
import { OAuth2Client } from "google-auth-library";
import type { Request, Response, NextFunction } from "express";

const client = new OAuth2Client();
const ALLOWED_CALLERS = new Set(
  (process.env.ALLOWED_CALLER_EMAILS ?? "").split(",").filter(Boolean),
);
const SELF_URL = process.env.SELF_URL!; // https://worker-xxxx-as.a.run.app

export async function requireGoogleOidc(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).send("missing bearer token");

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: SELF_URL,
    });
    const payload = ticket.getPayload();
    if (
      !payload?.email_verified ||
      !payload.email ||
      !ALLOWED_CALLERS.has(payload.email)
    ) {
      return res.status(403).send("caller not allowed");
    }
    (req as any).caller = payload.email;
    return next();
  } catch {
    return res.status(401).send("invalid token");
  }
}
```

```dockerfile
# Dockerfile
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build          # tsc → dist/

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
CMD ["node", "dist/server.js"]
```

Deploy lần đầu (các flow sau đều dùng service này):

```bash
cd worker
gcloud run deploy worker \
  --source . \
  --region "$REGION" \
  --service-account "sa-worker@$PROJECT_ID.iam.gserviceaccount.com" \
  --no-allow-unauthenticated \
  --ingress internal-and-cloud-load-balancing \
  --concurrency 10 \
  --timeout 600 \
  --min-instances 0 --max-instances 20 \
  --set-env-vars "ALLOWED_CALLER_EMAILS=sa-scheduler@$PROJECT_ID.iam.gserviceaccount.com,sa-tasks@$PROJECT_ID.iam.gserviceaccount.com"

export WORKER_URL="$(gcloud run services describe worker --region "$REGION" --format='value(status.url)')"
# Gán SELF_URL sau khi biết URL (lần deploy sau không đổi URL)
gcloud run services update worker --region "$REGION" --update-env-vars "SELF_URL=$WORKER_URL"
```

Giải thích từng flag, vì mỗi flag là một bẫy đã có người dẫm:

| Flag                                          | Vì sao                                                                                                     |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `--no-allow-unauthenticated`                  | Bắt Cloud Run verify OIDC. **Không bao giờ** bật public cho worker.                                        |
| `--ingress internal-and-cloud-load-balancing` | Chặn traffic từ internet ở tầng mạng. Cloud Tasks/Scheduler/Pub/Sub được coi là internal.                  |
| `--concurrency 10`                            | Mặc định là 80 request/instance. Worker thường nặng CPU/RAM hơn API, hạ xuống để không OOM.                |
| `--timeout 600`                               | Mặc định 300 giây. Phải **lớn hơn** thời gian việc dài nhất, và **khớp** với deadline bên broker (Phần V). |
| `--min-instances 0`                           | Tiết kiệm. Nếu cron chạy đúng giờ quan trọng, đặt 1 để tránh cold start làm trễ vài giây.                  |
| `--max-instances 20`                          | Chặn trần chi phí và chặn "tự DDoS" DB khi queue bùng nổ.                                                  |

Kiểm tra bảo mật ngay:

```bash
curl -i "$WORKER_URL/healthz"                       # phải 403 (không có token)
curl -i -H "Authorization: Bearer $(gcloud auth print-identity-token)" "$WORKER_URL/healthz"
# 200 nếu tài khoản của bạn có run.invoker; nếu 403 thì gán tạm cho chính bạn để test:
gcloud run services add-iam-policy-binding worker --region "$REGION" \
  --member "user:$(gcloud config get-value account)" --role roles/run.invoker
```

> **Nhớ một câu:** worker Cloud Run = container nghe `$PORT`, không public, timeout đủ dài,
> concurrency vừa phải, xử lý SIGTERM.

---

# PHẦN IV — Năm flow mẫu, từng bước

## Flow 1 — Việc theo lịch: Cloud Scheduler → Cloud Run service

**Bài toán:** mỗi ngày 02:00 giờ Việt Nam chạy báo cáo doanh thu hôm trước và gửi cho quản lý.

### 1.1 Sơ đồ

```
 02:00 Asia/Ho_Chi_Minh
      │
      ▼
┌──────────────────┐  POST /cron/nightly-report            ┌──────────────────┐
│ Cloud Scheduler  │  Authorization: Bearer <OIDC sa-scheduler> │ Cloud Run worker │
│ job: nightly-rpt │ ────────────────────────────────────▶  │ (verify → chạy)  │
│                  │ ◀────────────────────────────────────  │                  │
└──────────────────┘  200 trong ≤ attemptDeadline           └──────────────────┘
      │ nếu 5xx / timeout → retry theo retryConfig
```

### 1.2 Bước 1 — cho phép SA của Scheduler gọi worker

```bash
gcloud run services add-iam-policy-binding worker --region "$REGION" \
  --member "serviceAccount:sa-scheduler@$PROJECT_ID.iam.gserviceaccount.com" \
  --role roles/run.invoker
```

### 1.3 Bước 2 — viết handler

```ts
// src/handlers/nightly-report.ts
import type { Request, Response } from "express";

export async function nightlyReport(req: Request, res: Response) {
  // Scheduler gửi kèm các header này — dùng để log và để idempotency.
  const jobName = req.header("x-cloudscheduler-jobname");
  const scheduleTime = req.header("x-cloudscheduler-scheduletime"); // ISO, giờ nổ theo lịch (không phải giờ thật)

  // Cho phép truyền ngày qua body để chạy tay/chạy lại ngày cũ.
  const reportDate = req.body?.date ?? previousDayOf(scheduleTime);

  // Idempotency: khoá theo (job, ngày). Nếu đã có bản báo cáo ngày đó → trả 200 luôn.
  const already = await reportRepo.findByDate(reportDate);
  if (already) {
    log("INFO", "report already exists, skipping", { reportDate, jobName });
    return res.status(200).send("already done");
  }

  try {
    const report = await buildRevenueReport(reportDate);
    await reportRepo.save(report); // ghi trước
    await mailer.sendToManagers(report); // gửi sau; nếu lỗi ở đây, lần retry sẽ vào nhánh already → không gửi lại
    return res.status(200).send("ok");
  } catch (err) {
    log("ERROR", "nightly report failed", { reportDate, err: String(err) });
    return res.status(500).send("retry"); // 5xx → Scheduler retry
  }
}
```

Hai chi tiết đáng chú ý:

- `X-CloudScheduler-ScheduleTime` là **giờ theo lịch**, không phải giờ request đến. Dùng nó để
  tính "hôm qua" thì chạy lại lúc 03:15 vì retry vẫn ra đúng ngày.
- Thứ tự "ghi trước, gửi sau" + kiểm tra "đã có chưa" là dạng idempotency đơn giản nhất.
  Nếu bước gửi mail lỗi, retry sẽ thấy report đã có và **không** tính lại. Bạn đánh đổi: mail
  không được gửi lại. Nếu mail quan trọng, tách bước gửi thành một Cloud Tasks (Flow 2).

### 1.4 Bước 3 — tạo job

```bash
gcloud scheduler jobs create http nightly-report \
  --location "$REGION" \
  --schedule "0 2 * * *" \
  --time-zone "Asia/Ho_Chi_Minh" \
  --uri "$WORKER_URL/cron/nightly-report" \
  --http-method POST \
  --headers "Content-Type=application/json" \
  --message-body '{}' \
  --oidc-service-account-email "sa-scheduler@$PROJECT_ID.iam.gserviceaccount.com" \
  --oidc-token-audience "$WORKER_URL" \
  --attempt-deadline 540s \
  --max-retry-attempts 3 \
  --min-backoff 30s \
  --max-backoff 300s
```

| Tham số                 | Ý nghĩa và cách chọn                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `--schedule`            | Cron 5 trường chuẩn Unix: phút giờ ngày tháng thứ. `0 2 * * *` = 02:00 mỗi ngày.                                           |
| `--time-zone`           | Tên IANA. Nếu bỏ trống là UTC. Việt Nam không có DST nên an toàn; múi giờ có DST có thể nổ 2 lần/0 lần một ngày trong năm. |
| `--oidc-token-audience` | Phải **bằng đúng URL gốc** của service (không có path). Sai audience = 401.                                                |
| `--attempt-deadline`    | Scheduler chờ tối đa bao lâu cho một lần gọi. Mặc định 180 giây, tối đa 30 phút. **Phải ≤ Cloud Run timeout.**             |
| `--max-retry-attempts`  | Mặc định 0 = không retry. Đặt 3 cho việc idempotent.                                                                       |
| `--min/max-backoff`     | Khoảng chờ giữa các lần retry, tăng gấp đôi.                                                                               |

### 1.5 Bước 4 — chạy tay và xem log

```bash
gcloud scheduler jobs run nightly-report --location "$REGION"

# Log của Scheduler (nó gọi được không?)
gcloud logging read 'resource.type="cloud_scheduler_job" AND resource.labels.job_id="nightly-report"' --limit 5

# Log của worker (nó nhận được không, trả gì?)
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="worker" AND httpRequest.requestUrl:"/cron/nightly-report"' --limit 10
```

### 1.6 Bẫy riêng của Flow 1

| Triệu chứng                                           | Nguyên nhân                                                                                                    | Sửa                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Scheduler log `PERMISSION_DENIED` / worker trả 403    | SA Scheduler chưa có `run.invoker` trên service                                                                | Bước 1                                                             |
| Worker trả 401                                        | Audience sai (có thêm path, hoặc URL cũ)                                                                       | `--oidc-token-audience` = URL gốc                                  |
| Job chạy lúc 02:00 nhưng **hai lần** cách nhau 3 phút | Việc chạy lâu hơn `attempt-deadline` (180s mặc định) → Scheduler coi là fail, retry, trong khi bản cũ vẫn chạy | Tăng deadline, hoặc trả 200 ngay và đẩy việc thật sang Cloud Tasks |
| Chạy lệch giờ so với mong đợi                         | Quên `--time-zone`, mặc định UTC                                                                               | Đặt IANA timezone                                                  |
| "Ngày hôm qua" bị tính sai khi retry                  | Tính từ `Date.now()` thay vì `X-CloudScheduler-ScheduleTime`                                                   | Dùng header                                                        |

> **Nhớ một câu:** Scheduler chỉ biết gọi URL đúng giờ; deadline của nó phải ≤ timeout của
> worker, và worker phải chịu được gọi hai lần cho cùng một ngày.

---

## Flow 2 — Việc lẻ do API sinh ra: API → Cloud Tasks → Cloud Run service

**Bài toán:** user đăng ký xong, API phải trả về ngay; email chào mừng gửi ở nền, thử lại nếu
dịch vụ mail lỗi, và không bao giờ gửi hai lần.

### 2.1 Sơ đồ

```
Client ──POST /signup──▶ API (Cloud Run, sa-api)
                           │ 1. INSERT user
                           │ 2. createTask({ url: worker/tasks/send-email,
                           │                 body: { userId }, name: "welcome-<userId>" })
                           │ 3. 201 Created ──▶ Client (không chờ mail)
                           ▼
                  ┌────────────────────┐   rate limit, backoff
                  │ Cloud Tasks queue  │ ─────────────────────────────┐
                  │  "emails"          │                              │ POST /tasks/send-email
                  └────────────────────┘                              │ Authorization: Bearer <OIDC sa-tasks>
                           ▲                                          ▼
                           │ 5xx/timeout → giữ task, thử lại    ┌──────────────────┐
                           └─────────────────────────────────── │ Cloud Run worker │
                                                                └──────────────────┘
```

### 2.2 Bước 1 — tạo queue và phân quyền

```bash
gcloud tasks queues create emails \
  --location "$REGION" \
  --max-dispatches-per-second 20 \
  --max-concurrent-dispatches 50 \
  --max-attempts 10 \
  --min-backoff 10s \
  --max-backoff 600s \
  --max-doublings 5 \
  --max-retry-duration 86400s

# API được tạo task
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:sa-api@$PROJECT_ID.iam.gserviceaccount.com" \
  --role roles/cloudtasks.enqueuer

# API được "đóng vai" sa-tasks khi gắn OIDC token vào task
gcloud iam service-accounts add-iam-policy-binding "sa-tasks@$PROJECT_ID.iam.gserviceaccount.com" \
  --member "serviceAccount:sa-api@$PROJECT_ID.iam.gserviceaccount.com" \
  --role roles/iam.serviceAccountUser

# sa-tasks được gọi worker
gcloud run services add-iam-policy-binding worker --region "$REGION" \
  --member "serviceAccount:sa-tasks@$PROJECT_ID.iam.gserviceaccount.com" \
  --role roles/run.invoker
```

Ý nghĩa các tham số queue — đây là chỗ Cloud Tasks mạnh hơn Pub/Sub:

| Tham số                       | Ý nghĩa                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `max-dispatches-per-second`   | Tốc độ giao tối đa. Đặt bằng giới hạn của bên thứ ba (mail provider cho 20 req/s thì đặt 20).                                         |
| `max-concurrent-dispatches`   | Số task đang chạy cùng lúc. Nhân với thời gian mỗi task → số instance worker cần. Đừng vượt `max-instances × concurrency` của worker. |
| `max-attempts`                | Tổng số lần thử (kể cả lần đầu). `-1` = vô hạn — tránh.                                                                               |
| `min-backoff` / `max-backoff` | Chờ giữa các lần thử: lần 1 chờ `min`, rồi ×2 mỗi lần cho tới `max-doublings` lần, sau đó tăng tuyến tính, không quá `max`.           |
| `max-retry-duration`          | Bỏ cuộc sau tổng bao lâu kể từ lần thử đầu, dù chưa hết `max-attempts`.                                                               |

Với cấu hình trên, lịch thử lại là: 10s → 20s → 40s → 80s → 160s → 320s → 600s → 600s → 600s
(10 lần trong ~40 phút). Đủ để vượt qua một sự cố mail provider ngắn.

### 2.3 Bước 2 — producer: API tạo task

```ts
// api/src/tasks/enqueue-email.ts
import { CloudTasksClient, protos } from "@google-cloud/tasks";

const client = new CloudTasksClient();
const PROJECT = process.env.GCP_PROJECT!;
const LOCATION = process.env.GCP_REGION!;
const WORKER_URL = process.env.WORKER_URL!;
const TASKS_SA = process.env.TASKS_SA_EMAIL!; // sa-tasks@...

export async function enqueueWelcomeEmail(
  userId: string,
  opts?: { delaySeconds?: number },
) {
  const parent = client.queuePath(PROJECT, LOCATION, "emails");

  // Tên task = khoá khử trùng. Cùng tên trong cùng queue → lần tạo thứ hai bị ALREADY_EXISTS.
  // Chỉ dùng chữ, số, gạch ngang, gạch dưới; tối đa 500 ký tự.
  const taskId = `welcome-${userId}`;

  const task: protos.google.cloud.tasks.v2.ITask = {
    name: client.taskPath(PROJECT, LOCATION, "emails", taskId),
    httpRequest: {
      httpMethod: "POST",
      url: `${WORKER_URL}/tasks/send-email`,
      headers: { "Content-Type": "application/json" },
      // Body PHẢI là base64/bytes. Chỉ gửi ID, không gửi cả object user.
      body: Buffer.from(JSON.stringify({ type: "welcome", userId })).toString(
        "base64",
      ),
      oidcToken: { serviceAccountEmail: TASKS_SA, audience: WORKER_URL },
    },
    // Hẹn giờ (tối đa 30 ngày). Bỏ trống = chạy ngay.
    ...(opts?.delaySeconds && {
      scheduleTime: {
        seconds: Math.floor(Date.now() / 1000) + opts.delaySeconds,
      },
    }),
    // Worker phải trả lời trong bao lâu. Mặc định 10 phút; 15s–30 phút. Phải ≤ Cloud Run timeout.
    dispatchDeadline: { seconds: 300 },
  };

  try {
    const [created] = await client.createTask({ parent, task });
    return created.name;
  } catch (err: any) {
    if (err.code === 6 /* ALREADY_EXISTS */) return null; // đã enqueue rồi, không sao
    throw err;
  }
}
```

Gọi trong controller:

```ts
app.post("/signup", async (req, res) => {
  const user = await users.create(req.body); // 1. ghi DB trước
  try {
    await enqueueWelcomeEmail(user.id); // 2. enqueue
  } catch (err) {
    // Không fail request vì mail. Log để có thể chạy bù. Hoặc dùng outbox pattern (Phần V).
    log("ERROR", "enqueue failed", { userId: user.id, err: String(err) });
  }
  res.status(201).json({ id: user.id }); // 3. trả ngay
});
```

### 2.4 Bước 3 — consumer: handler trên worker

```ts
// src/handlers/send-email.ts
import type { Request, Response } from "express";

export async function sendEmail(req: Request, res: Response) {
  // Header Cloud Tasks luôn gửi:
  const queue = req.header("x-cloudtasks-queuename"); // "emails"
  const taskName = req.header("x-cloudtasks-taskname"); // "welcome-123"
  const retryCount = Number(req.header("x-cloudtasks-taskretrycount") ?? 0); // số lần đã retry
  const execCount = Number(req.header("x-cloudtasks-taskexecutioncount") ?? 0); // số lần worker đã nhận và trả lời

  const { type, userId } = req.body as { type: string; userId: string };
  const ctx = { queue, taskName, retryCount, userId };

  // Idempotency: ghi dấu "đã gửi" theo taskName. Nếu có dấu → 200 luôn.
  if (await sentLog.exists(taskName)) {
    log("INFO", "duplicate delivery, already sent", ctx);
    return res.status(200).send("already sent");
  }

  const user = await users.findById(userId);
  if (!user) {
    // Lỗi KHÔNG thể sửa bằng retry → trả 2xx để task kết thúc, đừng để nó thử 10 lần vô ích.
    log("WARNING", "user not found, dropping task", ctx);
    return res.status(200).send("dropped");
  }

  try {
    await mailer.send({ to: user.email, template: type });
    await sentLog.mark(taskName); // đánh dấu SAU khi gửi thành công
    return res.status(200).send("ok");
  } catch (err: any) {
    if (err.status === 429 || err.status >= 500) {
      // Lỗi tạm → 503 để Cloud Tasks retry theo backoff
      log("WARNING", "mail provider unavailable, retrying", {
        ...ctx,
        err: String(err),
      });
      return res.status(503).send("retry");
    }
    // Lỗi vĩnh viễn (địa chỉ sai, template không tồn tại) → ghi lại rồi 200 để dừng
    log("ERROR", "permanent mail failure", { ...ctx, err: String(err) });
    await failedJobs.record({ taskName, userId, reason: String(err) }); // "dead letter" tự chế
    return res.status(200).send("dropped");
  }
}
```

Nguyên tắc trả status code — **quan trọng nhất trong cả Flow 2**:

| Tình huống                                                    | Trả về                         | Cloud Tasks làm gì                                                             |
| ------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| Làm xong                                                      | `200`–`299`                    | Xoá task                                                                       |
| Đã làm rồi (trùng)                                            | `200`                          | Xoá task                                                                       |
| Lỗi **tạm thời** (mạng, 429, 5xx của bên thứ ba, DB deadlock) | `503` (hoặc 5xx bất kỳ)        | Giữ task, thử lại sau backoff                                                  |
| Lỗi **vĩnh viễn** (dữ liệu sai, không tìm thấy)               | `200` sau khi ghi lại ở đâu đó | Xoá task — **bạn** phải lưu vết, vì Cloud Tasks **không có dead-letter queue** |
| Không trả lời trong `dispatchDeadline`                        | (timeout)                      | Coi là thất bại, thử lại; bản cũ có thể vẫn đang chạy                          |

Đừng trả `4xx` cho lỗi vĩnh viễn với hy vọng "nó sẽ không retry": Cloud Tasks **vẫn retry với
mọi mã không phải 2xx**. Chỉ 2xx mới kết thúc task.

### 2.5 Bước 4 — test end-to-end

```bash
# Tạo task bằng tay để kiểm tra worker trước khi nối API
gcloud tasks create-http-task --queue emails --location "$REGION" \
  --url "$WORKER_URL/tasks/send-email" \
  --method POST \
  --header "Content-Type: application/json" \
  --body-content '{"type":"welcome","userId":"test-1"}' \
  --oidc-service-account-email "sa-tasks@$PROJECT_ID.iam.gserviceaccount.com" \
  --oidc-token-audience "$WORKER_URL"

gcloud tasks queues describe emails --location "$REGION"       # xem stats: tasksCount, oldestEstimatedArrivalTime
gcloud tasks list --queue emails --location "$REGION"          # task đang chờ/đang retry

# Tạm dừng / mở lại queue khi có sự cố ở worker
gcloud tasks queues pause emails --location "$REGION"
gcloud tasks queues resume emails --location "$REGION"
```

### 2.6 Bẫy riêng của Flow 2

| Triệu chứng                                                         | Nguyên nhân                                                                                                                  | Sửa                                                               |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `createTask` lỗi `PERMISSION_DENIED` về `iam.serviceAccounts.actAs` | sa-api chưa có `serviceAccountUser` trên sa-tasks                                                                            | Bước 1, lệnh thứ hai                                              |
| Task chạy nhưng worker 403                                          | sa-tasks chưa có `run.invoker`, hoặc audience sai                                                                            | Bước 1, lệnh cuối; audience = URL gốc                             |
| Task tạo lại sau khi xong bị `ALREADY_EXISTS`                       | Tên task được giữ để khử trùng một thời gian sau khi hoàn thành (theo tài liệu hiện tại khoảng 1 giờ, kiểm tra lại khi dùng) | Thêm timestamp/phiên bản vào tên nếu cần chạy lại sớm             |
| Task chạy đúng 1 lần nhưng handler chạy 2 lần                       | `dispatchDeadline` < thời gian xử lý → timeout → retry chồng                                                                 | Tăng deadline; idempotency                                        |
| Queue đầy, worker không bắt kịp                                     | `max-concurrent-dispatches` > sức worker, hoặc worker `max-instances` quá thấp                                               | Cân lại hai số; xem `oldestEstimatedArrivalTime`                  |
| Task "biến mất" sau vài lần lỗi                                     | Hết `max-attempts` hoặc `max-retry-duration`, không có DLQ                                                                   | Ghi vết lỗi vĩnh viễn trước khi trả 200; alert khi retryCount cao |
| Body đọc ra rỗng                                                    | Quên base64 khi tạo, hoặc quên `express.json()`                                                                              | Kiểm tra cả hai đầu                                               |

> **Nhớ một câu:** Cloud Tasks = một URL, một queue, rate limit + backoff cấu hình được, khử
> trùng theo tên; chỉ 2xx mới kết thúc task, và không có DLQ nên lỗi vĩnh viễn bạn phải tự lưu.

---

## Flow 3 — Sự kiện nhiều bên quan tâm: Pub/Sub → Cloud Run service

**Bài toán:** khi đơn hàng được tạo, ba việc phải xảy ra độc lập: trừ tồn kho, ghi sổ kế toán,
gửi sự kiện sang analytics. Mỗi bên có thể lỗi riêng, thử lại riêng, thêm bớt bên nghe mà
không sửa API.

### 3.1 Sơ đồ

```
API ──publish("order.created", {orderId})──▶ Topic: order-events
                                                 │
                 ┌───────────────────────────────┼───────────────────────────────┐
                 ▼                               ▼                               ▼
   Subscription: inventory        Subscription: accounting          Subscription: analytics
   (push → worker/pubsub/inventory) (push → worker/pubsub/accounting) (pull, consumer riêng trên GKE)
         │ nack/5xx ×5                       │
         ▼                                   ▼
   Dead-letter topic: order-events-dlq  ◀────┘
```

Mỗi subscription là **một bản sao độc lập** của luồng message. Inventory lỗi không ảnh hưởng
accounting. Thêm bên thứ tư = tạo subscription thứ tư, API không biết.

### 3.2 Bước 1 — topic, DLQ, subscription và quyền

```bash
gcloud pubsub topics create order-events
gcloud pubsub topics create order-events-dlq

# API được publish
gcloud pubsub topics add-iam-policy-binding order-events \
  --member "serviceAccount:sa-api@$PROJECT_ID.iam.gserviceaccount.com" \
  --role roles/pubsub.publisher

# SA mà Pub/Sub dùng để gọi worker (dùng lại sa-tasks cho gọn, hoặc tạo sa-pubsub)
gcloud run services add-iam-policy-binding worker --region "$REGION" \
  --member "serviceAccount:sa-tasks@$PROJECT_ID.iam.gserviceaccount.com" \
  --role roles/run.invoker

# Pub/Sub cần quyền tạo token cho SA đó (một lần cho project)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:service-$PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com" \
  --role roles/iam.serviceAccountTokenCreator

# Push subscription cho inventory, có DLQ
gcloud pubsub subscriptions create inventory \
  --topic order-events \
  --push-endpoint "$WORKER_URL/pubsub/inventory" \
  --push-auth-service-account "sa-tasks@$PROJECT_ID.iam.gserviceaccount.com" \
  --push-auth-token-audience "$WORKER_URL" \
  --ack-deadline 60 \
  --message-retention-duration 7d \
  --dead-letter-topic order-events-dlq \
  --max-delivery-attempts 5 \
  --min-retry-delay 10s \
  --max-retry-delay 600s

# BẪY IAM của DLQ: service agent của Pub/Sub phải được publish vào DLQ topic
# và subscribe trên subscription nguồn, nếu không message KHÔNG được chuyển sang DLQ.
gcloud pubsub topics add-iam-policy-binding order-events-dlq \
  --member "serviceAccount:service-$PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com" \
  --role roles/pubsub.publisher
gcloud pubsub subscriptions add-iam-policy-binding inventory \
  --member "serviceAccount:service-$PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com" \
  --role roles/pubsub.subscriber

# Subscription để đọc DLQ (ít nhất phải có một cái, không thì message trong DLQ topic bị mất)
gcloud pubsub subscriptions create order-events-dlq-reader --topic order-events-dlq \
  --message-retention-duration 7d
```

| Tham số                        | Ý nghĩa                                                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--ack-deadline`               | Worker phải trả 2xx trong bao lâu (10–600 giây). Quá → coi là nack, giao lại. **Không thể vượt 600s** — việc dài hơn 10 phút không hợp Pub/Sub push. |
| `--message-retention-duration` | Giữ message chưa ack bao lâu (tối đa 31 ngày).                                                                                                       |
| `--max-delivery-attempts`      | Sau bao nhiêu lần giao thất bại thì chuyển sang DLQ (5–100).                                                                                         |
| `--min/max-retry-delay`        | Backoff giữa các lần giao lại. Không đặt = giao lại gần như ngay lập tức, dễ dập worker.                                                             |

### 3.3 Bước 2 — producer: publish

```ts
// api/src/events/publish-order-created.ts
import { PubSub } from "@google-cloud/pubsub";

const pubsub = new PubSub();
const topic = pubsub.topic("order-events", {
  batching: { maxMessages: 100, maxMilliseconds: 50 }, // gom message, giảm số call
});

export async function publishOrderCreated(orderId: string, customerId: string) {
  const messageId = await topic.publishMessage({
    // data: bytes; attributes: string→string, dùng để filter và để route không cần parse body
    data: Buffer.from(
      JSON.stringify({ orderId, occurredAt: new Date().toISOString() }),
    ),
    attributes: { eventType: "order.created", schemaVersion: "1" },
    // orderingKey chỉ khi topic bật ordering và bạn thật sự cần thứ tự theo customer
    // orderingKey: customerId,
  });
  return messageId;
}
```

### 3.4 Bước 3 — consumer: handler nhận push

Định dạng body Pub/Sub push gửi tới **khác** Cloud Tasks — nó bọc message của bạn:

```json
{
  "message": {
    "data": "eyJvcmRlcklkIjoiMTIzIn0=",         ← base64 của data bạn publish
    "attributes": { "eventType": "order.created", "schemaVersion": "1" },
    "messageId": "1234567890",
    "publishTime": "2026-09-24T02:00:00.000Z",
    "deliveryAttempt": 1                           ← chỉ có khi subscription bật DLQ
  },
  "subscription": "projects/my-shop-dev/subscriptions/inventory"
}
```

```ts
// src/handlers/order-created.ts  (route /pubsub/inventory)
import type { Request, Response } from "express";

export async function inventoryOnOrderCreated(req: Request, res: Response) {
  const envelope = req.body;
  if (!envelope?.message) return res.status(400).send("bad envelope"); // 400 → Pub/Sub vẫn retry; nhưng body sai thì retry cũng vô ích → cân nhắc 204

  const { messageId, attributes, deliveryAttempt } = envelope.message;
  const payload = JSON.parse(
    Buffer.from(envelope.message.data, "base64").toString("utf8"),
  );
  const ctx = {
    messageId,
    deliveryAttempt,
    orderId: payload.orderId,
    subscription: envelope.subscription,
  };

  // Idempotency theo messageId (Pub/Sub) HOẶC theo khoá nghiệp vụ (orderId) — khoá nghiệp vụ tốt hơn
  // vì nếu API publish hai lần cho cùng order (retry phía API) thì messageId khác nhau nhưng orderId trùng.
  const reserved = await inventory.tryReserveForOrder(payload.orderId); // UPSERT có unique(orderId) → trả false nếu đã có
  if (!reserved) {
    log("INFO", "inventory already reserved, ack", ctx);
    return res.status(204).end();
  }

  try {
    await inventory.commitReservation(payload.orderId);
    return res.status(204).end(); // 2xx = ack. 204 gọn nhất.
  } catch (err) {
    log("ERROR", "inventory failed", { ...ctx, err: String(err) });
    return res.status(500).send("nack"); // non-2xx = nack → giao lại; đủ 5 lần → DLQ
  }
}
```

Pub/Sub push coi `102, 200, 201, 202, 204` là ack. Mọi mã khác là nack.

### 3.5 Bước 4 — test và theo dõi DLQ

```bash
gcloud pubsub topics publish order-events \
  --message '{"orderId":"o-1","occurredAt":"2026-09-24T00:00:00Z"}' \
  --attribute eventType=order.created,schemaVersion=1

# Message đã sang DLQ chưa?
gcloud pubsub subscriptions pull order-events-dlq-reader --limit 10 --auto-ack=false
# Message trong DLQ mang thêm attributes: CloudPubSubDeadLetterSourceSubscription,
# CloudPubSubDeadLetterSourceDeliveryCount, ... rất tiện để debug.

# Số message chưa ack — metric quan trọng nhất để alert
# Metrics Explorer: pubsub.googleapis.com/subscription/num_undelivered_messages
# và subscription/oldest_unacked_message_age
```

### 3.6 Khi nào dùng pull thay vì push

Dùng **pull subscription** (worker chạy liên tục trên GKE/GCE, dùng `subscription.on('message')`)
khi:

- Việc xử lý một message **quá 10 phút** (ack deadline tối đa 600s với push; pull có thể gia hạn lease).
- Bạn cần **exactly-once delivery** — Pub/Sub chỉ hỗ trợ trên pull, và chỉ trong cùng region, và
  vẫn yêu cầu bạn ack đúng cách. Không phải "bật là hết trùng".
- Bạn cần **flow control** phía consumer (giới hạn số message đang xử lý theo RAM).
- Worker ở trong VPC không có URL công khai.

Nếu không rơi vào các trường hợp trên, push + Cloud Run đơn giản và rẻ hơn.

### 3.7 Bẫy riêng của Flow 3

| Triệu chứng                                                              | Nguyên nhân                                                                                    | Sửa                                                             |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Worker nhận message nhưng `data` là chuỗi lạ                             | Chưa decode base64                                                                             | `Buffer.from(data, 'base64')`                                   |
| Message lỗi mãi mà không sang DLQ                                        | Thiếu IAM cho service agent của Pub/Sub (publisher trên DLQ topic + subscriber trên sub nguồn) | Hai lệnh IAM ở Bước 1                                           |
| Message vào DLQ topic rồi... mất                                         | DLQ topic không có subscription nào                                                            | Tạo `*-dlq-reader`                                              |
| Worker bị dập hàng nghìn request/giây khi lỗi                            | Không đặt retry delay → giao lại tức thì                                                       | `--min-retry-delay 10s`                                         |
| Cùng một order xử lý hai lần                                             | At-least-once, hoặc API publish trùng                                                          | Idempotency theo khoá nghiệp vụ, không theo messageId           |
| Bật `orderingKey` xong throughput giảm mạnh, một message lỗi chặn cả key | Ordering đánh đổi song song lấy thứ tự; lỗi một message chặn các message sau cùng key          | Chỉ bật khi thật sự cần; xử lý lỗi vĩnh viễn bằng ack + ghi vết |
| Subscription tạo xong không nhận gì                                      | Message publish **trước** khi subscription tồn tại không được giao                             | Tạo subscription trước, publish sau                             |

> **Nhớ một câu:** Pub/Sub = một topic nhiều bên nghe độc lập; body bọc và base64; 2xx là ack;
> DLQ có sẵn nhưng phải cấp IAM cho service agent và phải có subscription đọc DLQ.

---

## Flow 4 — Batch dài, chạy song song: Cloud Scheduler → Cloud Run job

**Bài toán:** mỗi đêm tính lại điểm tín dụng cho 2 triệu khách hàng. Chạy tuần tự mất 6 giờ.
Không hợp Cloud Run service (60 phút/request) hay Pub/Sub push (10 phút/message).

### 4.1 Cloud Run job khác service ở đâu

| Đặc điểm              | Cloud Run **service**       | Cloud Run **job**                                               |
| --------------------- | --------------------------- | --------------------------------------------------------------- |
| Nhận việc bằng        | HTTP request                | Lệnh `run` (tay, Scheduler, Workflows, API)                     |
| Vòng đời              | Sống chờ request, scale 0→N | Chạy container đến khi process exit, rồi kết thúc               |
| Thời gian tối đa      | 60 phút / request           | 24 giờ / task                                                   |
| Song song             | Nhiều request/instance      | `--tasks N` bản chạy cùng lúc, mỗi bản biết mình là số mấy      |
| Thành công / thất bại | Status code                 | Exit code 0 = xong; ≠0 = fail → retry task đó (`--max-retries`) |
| Cần HTTP server không | Có                          | **Không** — chỉ là một script                                   |

### 4.2 Sơ đồ

```
02:00 ──▶ Cloud Scheduler ──POST run.googleapis.com/.../jobs/recalc-scores:run (OAuth token)──▶ Cloud Run Jobs
                                                                                                  │
                                    ┌─────────────────────────────────────────────────────────────┤ tạo 20 task
                                    ▼                     ▼                          ▼             ▼
                              task index 0          task index 1        ...      task index 19
                              (khách 0..99k)        (khách 100k..199k)           (khách 1.9M..2M)
                              exit 0                exit 1 → retry               exit 0
```

### 4.3 Bước 1 — viết script chia việc theo index

```ts
// job/src/recalc-scores.ts — không có Express, không có PORT
const TASK_INDEX = Number(process.env.CLOUD_RUN_TASK_INDEX ?? 0); // 0..N-1
const TASK_COUNT = Number(process.env.CLOUD_RUN_TASK_COUNT ?? 1); // N
const ATTEMPT = Number(process.env.CLOUD_RUN_TASK_ATTEMPT ?? 0); // 0 lần đầu, 1 lần retry thứ nhất...
const RUN_DATE = process.env.RUN_DATE ?? new Date().toISOString().slice(0, 10); // truyền từ Scheduler

async function main() {
  log("INFO", "task start", { TASK_INDEX, TASK_COUNT, ATTEMPT, RUN_DATE });

  // Chia việc theo modulo để mỗi task lấy một lát khách hàng, không đụng nhau.
  // Với 2M khách, 20 task → mỗi task ~100k. Xử lý theo trang để không nạp hết vào RAM.
  const pageSize = 1000;
  let cursor: string | null = null;
  let processed = 0;

  do {
    const page = await customers.pageWhere({
      shard: TASK_INDEX,
      shards: TASK_COUNT,
      after: cursor,
      limit: pageSize,
    });
    // SQL: WHERE mod(hashtext(id), $shards) = $shard AND id > $after ORDER BY id LIMIT $limit

    for (const c of page.items) {
      // Idempotent: UPSERT theo (customerId, RUN_DATE). Retry của task này ghi đè cùng dòng, không nhân đôi.
      await scores.upsert({
        customerId: c.id,
        runDate: RUN_DATE,
        score: computeScore(c),
      });
    }
    processed += page.items.length;
    cursor = page.nextCursor;
  } while (cursor);

  log("INFO", "task done", { TASK_INDEX, processed });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    log("ERROR", "task failed", { TASK_INDEX, ATTEMPT, err: String(err) });
    process.exit(1); // ≠0 → Cloud Run retry đúng task này (tối đa --max-retries)
  });
```

### 4.4 Bước 2 — tạo job và cho Scheduler quyền chạy

```bash
cd job
gcloud run jobs deploy recalc-scores \
  --source . \
  --region "$REGION" \
  --service-account "sa-worker@$PROJECT_ID.iam.gserviceaccount.com" \
  --tasks 20 \
  --parallelism 10 \
  --task-timeout 3600 \
  --max-retries 2 \
  --memory 1Gi --cpu 1

# Chạy thử ngay, chờ kết quả
gcloud run jobs execute recalc-scores --region "$REGION" --wait \
  --update-env-vars RUN_DATE=2026-09-23

# Scheduler gọi Cloud Run Admin API để chạy job → dùng OAuth token (không phải OIDC),
# và sa-scheduler cần run.invoker TRÊN JOB.
gcloud run jobs add-iam-policy-binding recalc-scores --region "$REGION" \
  --member "serviceAccount:sa-scheduler@$PROJECT_ID.iam.gserviceaccount.com" \
  --role roles/run.invoker

gcloud scheduler jobs create http recalc-scores-nightly \
  --location "$REGION" \
  --schedule "0 2 * * *" --time-zone "Asia/Ho_Chi_Minh" \
  --uri "https://$REGION-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/$PROJECT_ID/jobs/recalc-scores:run" \
  --http-method POST \
  --oauth-service-account-email "sa-scheduler@$PROJECT_ID.iam.gserviceaccount.com"
```

| Tham số            | Ý nghĩa                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| `--tasks 20`       | Tổng số lát. Nhiều lát nhỏ → retry rẻ hơn, nhưng overhead khởi động nhiều hơn.                          |
| `--parallelism 10` | Bao nhiêu lát chạy cùng lúc. Đây là **cái phanh cho DB**: 10 task × mỗi task 1 kết nối = 10 kết nối.    |
| `--task-timeout`   | Mỗi task tối đa bao lâu (tối đa 24h). Quá → task fail → retry.                                          |
| `--max-retries`    | Retry **từng task** lỗi, không chạy lại cả job. Task đã xong không chạy lại.                            |
| OAuth vs OIDC      | Gọi **API của Google** (run.googleapis.com) → OAuth token. Gọi **service của bạn** → OIDC. Nhầm là 401. |

### 4.5 Bẫy riêng của Flow 4

| Triệu chứng                                | Nguyên nhân                                                                     | Sửa                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Scheduler 401 khi gọi `:run`               | Dùng `--oidc-*` thay vì `--oauth-service-account-email`                         | Đổi sang OAuth                                                                                                          |
| Scheduler 403                              | sa-scheduler thiếu `run.invoker` trên **job** (không phải service)              | Bước 2                                                                                                                  |
| Job chạy 2 lần một đêm                     | Đêm trước chưa xong, Scheduler nổ tiếp; hoặc Scheduler retry vì `:run` trả chậm | Kiểm tra `RUN_DATE` đã có kết quả thì exit 0 ngay; đặt `--attempt-deadline` Scheduler ngắn (chỉ cần gọi API thành công) |
| Task retry xử lý lại từ đầu, tốn thời gian | Không có checkpoint                                                             | UPSERT theo khoá + cursor ghi vào DB để resume                                                                          |
| DB quá tải                                 | `parallelism` quá cao                                                           | Hạ `--parallelism`                                                                                                      |
| Task một lát nặng hơn lát khác nhiều       | Chia theo range ID tuần tự, dữ liệu không đều                                   | Chia theo hash (`mod(hashtext(id), N)`)                                                                                 |

> **Nhớ một câu:** Cloud Run job = script chạy đến khi exit, chia N lát bằng
> `CLOUD_RUN_TASK_INDEX`, retry theo lát, Scheduler kích bằng OAuth qua API `:run`.

---

## Flow 5 — Quy trình nhiều bước: Workflows điều phối

**Bài toán:** user upload CSV 50.000 đơn hàng. Phải: validate → chia thành 50 lô → xử lý từng
lô (mỗi lô là một Cloud Tasks/HTTP call) → chờ hết → tổng hợp → gửi báo cáo → nếu lỗi thì rollback.
Toàn bộ có thể mất 40 phút.

Làm bằng Cloud Tasks thuần sẽ phải tự viết "máy trạng thái" trong DB. Workflows là máy trạng
thái đó, viết bằng YAML, chạy tới 1 năm, giữ trạng thái giữa các bước, có retry từng bước.

### 5.1 Sơ đồ

```
API ──executions.create({ fileId })──▶ Workflow: import-orders
                                          │
                                          ├─ step validate:   POST worker/import/validate     → {rows, batches}
                                          ├─ step fanout:     for batch in batches (parallel, max 10):
                                          │                        POST worker/import/process-batch  (retry 3 lần)
                                          ├─ step summarize:  POST worker/import/summarize
                                          ├─ step notify:     POST worker/import/notify
                                          └─ on error:        POST worker/import/rollback → raise
```

### 5.2 Định nghĩa workflow

```yaml
# import-orders.yaml
main:
  params: [args]              # { fileId: "...", userId: "..." }
  steps:
    - init:
        assign:
          - workerUrl: ${sys.get_env("WORKER_URL")}
          - fileId: ${args.fileId}

    - validate:
        try:
          call: http.post
          args:
            url: ${workerUrl + "/import/validate"}
            auth: { type: OIDC }                   # Workflows dùng SA của chính nó để ký token
            body: { fileId: ${fileId} }
            timeout: 300
          result: validation
        retry:
          predicate: ${http.default_retry_predicate}   # retry 429/5xx/timeout
          max_retries: 3
          backoff: { initial_delay: 5, max_delay: 60, multiplier: 2 }

    - check_valid:
        switch:
          - condition: ${validation.body.ok == false}
            next: notify_invalid

    - process_batches:
        parallel:
          concurrency_limit: 10
          for:
            value: batchId
            in: ${validation.body.batchIds}
            steps:
              - process_one:
                  try:
                    call: http.post
                    args:
                      url: ${workerUrl + "/import/process-batch"}
                      auth: { type: OIDC }
                      body: { fileId: ${fileId}, batchId: ${batchId} }
                      timeout: 600
                  retry:
                    predicate: ${http.default_retry_predicate}
                    max_retries: 3
                    backoff: { initial_delay: 10, max_delay: 120, multiplier: 2 }
                  except:
                    as: e
                    steps:
                      - rollback:
                          call: http.post
                          args:
                            url: ${workerUrl + "/import/rollback"}
                            auth: { type: OIDC }
                            body: { fileId: ${fileId} }
                      - fail:
                          raise: ${e}

    - summarize:
        call: http.post
        args:
          url: ${workerUrl + "/import/summarize"}
          auth: { type: OIDC }
          body: { fileId: ${fileId} }
        result: summary

    - notify:
        call: http.post
        args:
          url: ${workerUrl + "/import/notify"}
          auth: { type: OIDC }
          body: { fileId: ${fileId}, userId: ${args.userId}, summary: ${summary.body} }
        next: done

    - notify_invalid:
        call: http.post
        args:
          url: ${workerUrl + "/import/notify"}
          auth: { type: OIDC }
          body: { fileId: ${fileId}, userId: ${args.userId}, errors: ${validation.body.errors} }

    - done:
        return: ${fileId}
```

### 5.3 Deploy, quyền, kích hoạt

```bash
gcloud iam service-accounts create sa-workflows
gcloud run services add-iam-policy-binding worker --region "$REGION" \
  --member "serviceAccount:sa-workflows@$PROJECT_ID.iam.gserviceaccount.com" --role roles/run.invoker

gcloud workflows deploy import-orders \
  --location "$REGION" \
  --source import-orders.yaml \
  --service-account "sa-workflows@$PROJECT_ID.iam.gserviceaccount.com" \
  --set-env-vars "WORKER_URL=$WORKER_URL"

# Nhớ thêm sa-workflows vào ALLOWED_CALLER_EMAILS của worker.

# API kích hoạt: sa-api cần roles/workflows.invoker
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:sa-api@$PROJECT_ID.iam.gserviceaccount.com" --role roles/workflows.invoker

# Chạy tay để test
gcloud workflows run import-orders --location "$REGION" --data '{"fileId":"f-1","userId":"u-1"}'
gcloud workflows executions list import-orders --location "$REGION"
```

```ts
// api: kích hoạt từ code
import { ExecutionsClient } from "@google-cloud/workflows";
const wf = new ExecutionsClient();
await wf.createExecution({
  parent: wf.workflowPath(PROJECT, LOCATION, "import-orders"),
  execution: { argument: JSON.stringify({ fileId, userId }) },
});
```

### 5.4 Khi nào KHÔNG dùng Workflows

- Việc chỉ có **một bước** → Cloud Tasks đủ, Workflows là thừa.
- Cần **throughput hàng nghìn/giây** → Workflows tính tiền theo step và có quota; dùng Pub/Sub.
- Logic rẽ nhánh **rất phức tạp** → YAML khó đọc hơn code; cân nhắc viết orchestrator bằng code
  với trạng thái trong DB, hoặc dùng Temporal nếu đội đã có.

> **Nhớ một câu:** Workflows = máy trạng thái YAML gọi các HTTP step, có retry/parallel/except
> sẵn, giữ trạng thái tới 1 năm; dùng khi có ≥ 3 bước phụ thuộc nhau.

---

# PHẦN V — Thiết kế worker đúng trong production

## 10. Idempotency — bốn kỹ thuật, từ dễ đến chắc

| Kỹ thuật                        | Cách làm                                                                                               | Hợp với                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| **Kiểm tra trước khi làm**      | `if (await exists(key)) return 200`                                                                    | Việc "tạo nếu chưa có"; có race nhỏ giữa check và ghi   |
| **UPSERT / unique constraint**  | `INSERT ... ON CONFLICT (key) DO NOTHING/UPDATE`; DB đảm bảo, không race                               | Ghi kết quả vào DB — **nên là mặc định**                |
| **Bảng processed_messages**     | Trong cùng transaction với nghiệp vụ: `INSERT INTO processed (message_id)`; trùng → rollback → trả 200 | Nghiệp vụ nhiều bảng; cần chắc tuyệt đối                |
| **Khoá phân tán (Redis SETNX)** | `SET lock:key 1 NX EX 300`; lấy được mới làm; giải phóng khi xong                                      | Việc không ghi DB (gọi API bên thứ ba); chặn chạy chồng |

Khoá nên là **khoá nghiệp vụ** (`orderId`, `userId + ngày`) hơn là ID kỹ thuật (`messageId`,
`taskName`), vì producer có thể tạo hai message cho cùng một việc.

Với bên thứ ba (thanh toán, gửi mail), truyền **idempotency key** của họ nếu có (Stripe, Resend
đều hỗ trợ header `Idempotency-Key`), và dùng chính khoá nghiệp vụ của bạn làm giá trị.

## 11. Outbox pattern — khi "ghi DB rồi enqueue" có thể gãy giữa chừng

Flow 2 có một lỗ: ghi user xong, `createTask` lỗi (mạng, quota) → user tồn tại nhưng không có
task → mail không bao giờ gửi. Ngược lại nếu enqueue trước rồi ghi DB lỗi → task chạy, không
thấy user.

Outbox giải quyết bằng cách **ghi cả nghiệp vụ và "ý định gửi" trong một transaction**:

```
Transaction:
  INSERT users (...)
  INSERT outbox (id, type='welcome-email', payload={userId}, status='pending')
COMMIT

Relay (Cloud Scheduler mỗi phút → worker/cron/outbox-relay, hoặc worker riêng):
  SELECT * FROM outbox WHERE status='pending' ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED
  for each: createTask(name = 'outbox-' + row.id)   ← tên = id → khử trùng miễn phí
            UPDATE outbox SET status='sent'
```

Chậm hơn tối đa một chu kỳ relay, nhưng **không bao giờ mất việc**. Với nghiệp vụ tiền/đơn hàng,
đây nên là mặc định.

## 12. Ba deadline phải khớp nhau

```
 broker deadline  ≤  Cloud Run request timeout  ;  thời gian việc thật  <  broker deadline × 0.8
```

| Broker            | Tên tham số        | Mặc định | Tối đa  |
| ----------------- | ------------------ | -------- | ------- |
| Cloud Scheduler   | `attemptDeadline`  | 180s     | 30 phút |
| Cloud Tasks       | `dispatchDeadline` | 10 phút  | 30 phút |
| Pub/Sub push      | `ackDeadline`      | 10s      | 10 phút |
| Cloud Run service | `--timeout`        | 5 phút   | 60 phút |
| Cloud Run job     | `--task-timeout`   | 10 phút  | 24 giờ  |

Nếu việc thật có thể dài hơn tối đa của broker: **trả 200 ngay, đẩy việc sang Cloud Run job**,
hoặc chia việc nhỏ hơn (Flow 2 tạo nhiều task con).

## 13. Payload: gửi ID, không gửi dữ liệu

```
❌ { user: { id, email, name, address, preferences, ...2KB } }
✅ { userId: "u-123", version: 7 }
```

Lý do: giới hạn kích thước (Cloud Tasks 1MB, Pub/Sub 10MB, nhưng đừng tới gần), dữ liệu trong
message **cũ ngay khi gửi** (user đổi email trước khi worker chạy), và lộ dữ liệu trong log.
Worker đọc lại từ DB là nguồn sự thật. Thêm `version`/`schemaVersion` để xử lý khi đổi format.

## 14. Lỗi tạm thời và lỗi vĩnh viễn — phân loại rõ ngay trong code

```ts
class RetryableError extends Error {}      // 5xx, 429, ECONNRESET, deadlock, lock timeout
class PermanentError extends Error {}      // validation sai, không tìm thấy, 4xx từ bên thứ ba (trừ 429)

// handler:
} catch (err) {
  if (err instanceof PermanentError) { await deadLetter.record(...); return res.status(200).send('dropped'); }
  return res.status(503).send('retry');    // mọi thứ khác coi là tạm thời
}
```

Và **alert** khi `X-CloudTasks-TaskRetryCount` hoặc `deliveryAttempt` ≥ 3 — đó là lúc lỗi tạm
thời đang biến thành vĩnh viễn.

## 15. Concurrency, tài nguyên và kết nối DB

- Số kết nối DB tối đa từ worker ≈ `max-instances × concurrency × pool size mỗi instance`. Với
  20 instance × 10 concurrency × pool 5 = 1.000 kết nối → Postgres sập. Đặt pool **nhỏ**
  (2–5) và concurrency vừa (5–20), hoặc dùng connection pooler (Cloud SQL Auth Proxy + PgBouncer).
- Cloud Run **tắt CPU** khi không có request đang xử lý (mặc định). Đừng `setTimeout` làm việc
  sau khi đã trả 200 — CPU sẽ bị throttle và việc đó có thể không chạy. Muốn làm việc nền trong
  instance: bật `--cpu-boost` hoặc `--no-cpu-throttling` (tốn tiền), hoặc đơn giản là **đừng trả
  200 trước khi xong**.
- Cold start: `--min-instances 1` cho worker nếu cron/tasks cần chạy đúng giây. Với worker xử lý
  nền thông thường, cold start 1–3 giây không quan trọng.

## 16. Graceful shutdown

Cloud Run gửi `SIGTERM` khi scale down hoặc deploy mới, chờ **10 giây**, rồi `SIGKILL`.
Trong 10 giây đó: dừng nhận request mới (`server.close()`), để request đang chạy kết thúc, đóng
pool DB. Việc đang chạy mà bị kill → broker không nhận 2xx → sẽ retry (đó là lý do idempotency).
Nếu việc thường dài hơn 10 giây, hãy chấp nhận retry chứ đừng cố "chạy nốt".

> **Nhớ một câu (cả Phần V):** UPSERT theo khoá nghiệp vụ, outbox cho việc quan trọng, ba
> deadline khớp nhau, payload chỉ có ID, phân loại lỗi rõ, pool DB nhỏ, không làm việc sau 200.

---

# PHẦN VI — Bảo mật

## 17. Checklist bảo mật worker

| #   | Việc                                                                                  | Vì sao                                                                           |
| --- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | `--no-allow-unauthenticated` trên mọi worker                                          | Cloud Run tự verify OIDC; ai không có `run.invoker` bị chặn ở tầng hạ tầng       |
| 2   | `--ingress internal-and-cloud-load-balancing`                                         | Chặn thêm ở tầng mạng; Tasks/Scheduler/Pub/Sub/Workflows vẫn gọi được            |
| 3   | Mỗi caller một SA; gán `run.invoker` **trên service**, không trên project             | Trên project = mọi service trong project đều gọi được                            |
| 4   | Verify lớp 2 trong code: audience + `email` thuộc danh sách cho phép                  | Phòng khi ai đó lỡ bật public; phân biệt SA nào gọi route nào                    |
| 5   | **Không** dùng header `X-CloudTasks-*` / `X-CloudScheduler-*` làm bằng chứng xác thực | Header giả được. Chỉ dùng để log. Token mới là bằng chứng                        |
| 6   | Secret (API key mail, DB password) trong **Secret Manager**, mount làm env            | Không hard-code, không đưa vào image: `--set-secrets "MAIL_KEY=mail-key:latest"` |
| 7   | SA worker chỉ có quyền trên đúng bucket/DB nó dùng                                    | Worker bị lợi dụng thì phạm vi thiệt hại hẹp                                     |
| 8   | Không log payload chứa PII                                                            | Log giữ 30 ngày mặc định, nhiều người đọc được                                   |
| 9   | Cloud SQL qua Auth Proxy/connector + IAM auth, không mở IP public                     | Worker không cần password DB                                                     |
| 10  | Bật Audit Logs cho Cloud Tasks/Pub/Sub nếu nghiệp vụ nhạy cảm                         | Truy được ai tạo task nào                                                        |

## 18. Debug 401/403 theo thứ tự

```
403 từ Cloud Run (body: "Forbidden" HTML)  → SA caller thiếu run.invoker trên service, hoặc ingress chặn
401 từ Cloud Run                           → token hỏng/hết hạn/audience sai
401/403 từ CODE của bạn (body do bạn viết) → lớp 2: email không trong ALLOWED_CALLER_EMAILS, SELF_URL sai
```

```bash
gcloud run services get-iam-policy worker --region "$REGION"        # ai có run.invoker
gcloud scheduler jobs describe nightly-report --location "$REGION"   # audience, SA đang dùng
gcloud logging read 'resource.type="cloud_run_revision" AND httpRequest.status>=400' --limit 20
```

---

# PHẦN VII — Quan sát: log, metric, alert

## 19. Log có cấu trúc

Cloud Run gửi stdout lên Cloud Logging. Nếu mỗi dòng là **một JSON**, Logging parse thành
field và bạn filter được:

```ts
export function log(
  severity: "DEBUG" | "INFO" | "WARNING" | "ERROR",
  message: string,
  fields: Record<string, unknown> = {},
) {
  // Gắn trace để nhóm log theo request: header X-Cloud-Trace-Context = "TRACE_ID/SPAN_ID;o=1"
  console.log(
    JSON.stringify({
      severity,
      message,
      ...fields,
      time: new Date().toISOString(),
    }),
  );
}
```

Luôn kèm **khoá nghiệp vụ** (`orderId`, `userId`) và **khoá broker** (`taskName`, `messageId`,
`retryCount`) trong mỗi dòng. Khi có sự cố, câu hỏi đầu tiên luôn là "đơn hàng X đã qua bước
nào?", và bạn trả lời bằng một filter `jsonPayload.orderId="X"`.

## 20. Metric nên có dashboard và alert

| Dịch vụ         | Metric                                                   | Alert khi                                    |
| --------------- | -------------------------------------------------------- | -------------------------------------------- |
| Cloud Tasks     | `cloudtasks.googleapis.com/queue/depth`                  | Tăng liên tục 15 phút → worker không bắt kịp |
| Cloud Tasks     | `queue/task_attempt_count` filter `response_code != 2xx` | Tỷ lệ lỗi > 5%                               |
| Pub/Sub         | `subscription/num_undelivered_messages`                  | > ngưỡng và tăng                             |
| Pub/Sub         | `subscription/oldest_unacked_message_age`                | > 10 phút                                    |
| Pub/Sub         | `topic/send_message_operation_count` trên DLQ topic      | > 0 (có message vào DLQ)                     |
| Cloud Scheduler | Log `severity=ERROR` của `cloud_scheduler_job`           | Bất kỳ                                       |
| Cloud Run       | `request_count` với `response_code_class=5xx`            | Tỷ lệ > 2%                                   |
| Cloud Run       | `container/instance_count` chạm `max-instances`          | Đang bị cap, có thể tồn đọng                 |
| Cloud Run job   | `job/completed_task_attempt_count` với `result=failed`   | > 0                                          |

Tạo alert bằng Cloud Monitoring → Alerting → gửi về Slack/email. Với người mới, **hai alert
đầu tiên nên có** là: queue depth tăng và DLQ có message.

## 21. Error Reporting

Log `severity: ERROR` kèm stack trace (`err.stack`) sẽ được Error Reporting gom nhóm tự động
theo loại lỗi, đếm tần suất, báo khi có lỗi mới. Miễn phí và không cần cấu hình.

---

# PHẦN VIII — Phát triển và test trên máy local

## 22. Chiến lược

Bạn **không cần** chạy Cloud Tasks/Pub/Sub thật để phát triển handler. Handler chỉ là HTTP
endpoint. Ba mức:

1. **Unit test handler** với body giả — nhanh nhất, không cần GCP.
2. **Chạy worker local + curl** giả đúng định dạng broker gửi.
3. **Emulator** khi cần test cả producer.

```bash
# Mức 2: giả Cloud Tasks (bỏ qua auth bằng env)
SKIP_OIDC=1 PORT=8080 npm run dev
curl -X POST localhost:8080/tasks/send-email \
  -H 'Content-Type: application/json' \
  -H 'X-CloudTasks-QueueName: emails' -H 'X-CloudTasks-TaskName: welcome-1' -H 'X-CloudTasks-TaskRetryCount: 0' \
  -d '{"type":"welcome","userId":"u-1"}'

# Giả Pub/Sub push (nhớ bọc envelope + base64)
DATA=$(echo -n '{"orderId":"o-1"}' | base64)
curl -X POST localhost:8080/pubsub/inventory -H 'Content-Type: application/json' \
  -d "{\"message\":{\"data\":\"$DATA\",\"messageId\":\"1\",\"attributes\":{\"eventType\":\"order.created\"}},\"subscription\":\"projects/p/subscriptions/inventory\"}"
```

```ts
// auth.ts — cho phép tắt trong local, nhưng KHÔNG BAO GIỜ để env này lên production
export const requireGoogleOidc =
  process.env.SKIP_OIDC === "1" ? (_r, _s, next) => next() : realVerify;
```

```bash
# Mức 3: Pub/Sub emulator
gcloud components install pubsub-emulator
gcloud beta emulators pubsub start --project=local &
$(gcloud beta emulators pubsub env-init)     # export PUBSUB_EMULATOR_HOST=localhost:8085
# SDK @google-cloud/pubsub tự nhận biến này; tạo topic/sub bằng SDK rồi test publish → push tới localhost.
```

Cloud Tasks không có emulator chính thức; cộng đồng có `cloud-tasks-emulator` (Docker). Với
Cloud Tasks, mức 2 thường đủ: producer chỉ là một lệnh `createTask`, test nó bằng một project
dev thật rẻ hơn mọi emulator.

## 23. Môi trường dev/staging/prod

- **Một project GCP mỗi môi trường** (`shop-dev`, `shop-stg`, `shop-prod`). Quyền, quota, chi
  phí tách bạch. Đừng dùng prefix tên resource để giả lập môi trường trong cùng project.
- Đặt tên queue/topic **giống nhau** giữa các môi trường; chỉ `PROJECT_ID` khác. Code không cần
  biết mình đang ở env nào.
- Deploy bằng CI (Cloud Build / GitHub Actions với Workload Identity Federation) chứ không
  `gcloud run deploy` từ máy cá nhân lên prod.

---

# PHẦN IX — Chi phí

## 24. Ước tính nhanh

Con số dưới đây là **cách tính**, không phải bảng giá; giá thật xem trang pricing từng dịch vụ
(có free tier hàng tháng cho hầu hết).

| Dịch vụ         | Tính tiền theo                                              | Ghi chú cho bài toán worker                                                                  |
| --------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Cloud Run       | vCPU-giây + GiB-giây **khi có request**, + số request       | `min-instances > 0` tính tiền 24/7 kể cả idle. Concurrency cao → rẻ hơn                      |
| Cloud Run job   | vCPU-giây + GiB-giây trong lúc task chạy                    | Rẻ cho batch: chạy 1 giờ/đêm chỉ trả 1 giờ                                                   |
| Cloud Tasks     | Số thao tác (create, dispatch...); có free tier             | Rất rẻ cho < vài triệu task/tháng                                                            |
| Pub/Sub         | Dung lượng dữ liệu publish + deliver; free tier 10 GB/tháng | Message nhỏ (chỉ ID) → gần như miễn phí                                                      |
| Cloud Scheduler | Theo số job/tháng, vài job đầu miễn phí                     | Không đáng kể                                                                                |
| Workflows       | Theo số step; free tier vài nghìn step/tháng                | Fan-out 50 lô × 5 step = 250 step/execution — vẫn rẻ, nhưng đừng dùng cho hàng triệu event   |
| Cloud Logging   | Theo GB ingest sau free tier 50 GB/tháng                    | **Đây là chỗ hoá đơn bất ngờ**: log DEBUG mỗi message → vượt free tier. Đặt exclusion filter |
| Memorystore     | Theo GB/giờ, chạy 24/7                                      | Chỉ tạo khi thật cần khoá phân tán; Cloud Tasks dedupe + UPSERT thường đủ                    |

Ba việc tiết kiệm nhiều nhất: `max-instances` hợp lý, `min-instances 0` cho worker không cần
độ trễ thấp, và **giảm log** (severity ≥ INFO trên prod, không log payload).

---

# PHẦN X — Lỗi hay gặp, tra nhanh

| Bạn thấy                                          | Thường là                                                            | Xem mục         |
| ------------------------------------------------- | -------------------------------------------------------------------- | --------------- |
| `403 Forbidden` HTML từ Cloud Run                 | Thiếu `run.invoker` hoặc ingress chặn                                | 7.3, 17, 18     |
| `401` từ Cloud Run                                | Audience ≠ URL gốc, hoặc dùng OAuth thay OIDC (hay ngược lại)        | 7.4, Flow 4     |
| `PERMISSION_DENIED: iam.serviceAccounts.actAs`    | Producer thiếu `serviceAccountUser` trên SA gắn vào task/job         | Flow 2 bước 1   |
| `API [x.googleapis.com] not enabled`              | Quên `gcloud services enable`                                        | 8               |
| `NOT_FOUND: Queue does not exist`                 | Queue ở region khác với region trong code                            | 7.1             |
| Việc chạy 2 lần                                   | Deadline < thời gian việc; hoặc at-least-once bình thường            | 4, 12, 10       |
| Việc chạy 1 lần rồi biến mất dù lỗi               | Trả 2xx khi lỗi; hoặc hết max-attempts mà không có DLQ               | Flow 2 §2.4, 14 |
| Việc lỗi mãi không sang DLQ (Pub/Sub)             | Thiếu IAM cho service agent                                          | Flow 3 bước 1   |
| Container không start: `failed to listen on PORT` | Bind cổng cứng thay vì `$PORT`, hoặc bind `localhost` thay `0.0.0.0` | 9               |
| Worker chậm bất thường sau khi trả response       | Làm việc sau 200, CPU bị throttle                                    | 15              |
| DB `too many connections`                         | instances × concurrency × pool quá lớn                               | 15              |
| Cron chạy lệch giờ                                | Quên timezone (mặc định UTC)                                         | Flow 1          |
| Hoá đơn Logging tăng vọt                          | Log DEBUG / log payload mỗi message                                  | 24              |
| Body rỗng ở worker                                | Quên base64 (Tasks), quên bọc envelope (Pub/Sub), quên body parser   | Flow 2, Flow 3  |

---

# PHẦN XI — Checklist trước khi go-live

```
[ ] Worker --no-allow-unauthenticated, ingress internal
[ ] Mỗi caller (Scheduler/Tasks/Pub/Sub/Workflows) một SA, run.invoker gán trên service
[ ] Verify lớp 2: audience + allowed caller emails
[ ] Mọi handler idempotent (UPSERT / processed table / khoá), đã test bằng cách gửi 2 lần
[ ] Phân loại lỗi: tạm thời → 5xx; vĩnh viễn → ghi vết + 2xx
[ ] Ba deadline khớp: broker ≤ Cloud Run timeout; việc thật < 80% deadline
[ ] Retry config trên queue/subscription/job có max-attempts hữu hạn và backoff
[ ] Pub/Sub: DLQ + IAM service agent + subscription đọc DLQ
[ ] Cloud Tasks: nơi lưu lỗi vĩnh viễn (bảng failed_jobs) và cách chạy lại
[ ] Payload chỉ chứa ID + version
[ ] Log JSON có severity, khoá nghiệp vụ, khoá broker; không PII
[ ] Alert: queue depth / undelivered tăng; DLQ > 0; 5xx rate; Scheduler error
[ ] max-instances và pool DB đã tính; concurrency phù hợp RAM
[ ] SIGTERM handler; không làm việc sau khi trả 2xx
[ ] Secret trong Secret Manager
[ ] Đã chạy tay từng flow trên staging và xem log cả hai phía (broker + worker)
[ ] Có runbook: cách pause queue, cách replay DLQ, cách chạy lại cron cho một ngày cũ
```

---

# Từ vựng nhanh

| Thuật ngữ                  | Nghĩa                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Producer / Consumer        | Bên tạo việc / bên làm việc                                                                                |
| Broker / Queue / Topic     | Nơi trung gian giữ việc. Queue: một người nhận. Topic: nhiều subscription cùng nhận                        |
| Push / Pull                | Broker gọi worker qua HTTP / worker chủ động hỏi broker                                                    |
| At-least-once              | Có thể giao trùng, không bao giờ mất                                                                       |
| Idempotent                 | Làm N lần = làm 1 lần                                                                                      |
| Ack / Nack                 | Xác nhận đã xử lý (2xx) / từ chối, giao lại (non-2xx)                                                      |
| Backoff                    | Khoảng chờ tăng dần giữa các lần thử lại                                                                   |
| Dead-letter (DLQ)          | Nơi chứa message thất bại quá số lần cho phép                                                              |
| Service Account (SA)       | Danh tính của máy trong GCP                                                                                |
| OIDC token / ID token      | JWT do Google ký, chứng minh SA nào gọi và gọi tới audience nào; dùng khi gọi **service của bạn**          |
| OAuth token / access token | Token dùng khi gọi **API của Google** (run.googleapis.com, pubsub.googleapis.com)                          |
| Audience                   | URL đích ghi trong token; phải trùng URL gốc của service                                                   |
| Service agent              | SA do Google tạo tự động cho một dịch vụ (ví dụ `service-NUMBER@gcp-sa-pubsub...`) để nó thao tác thay bạn |
| Outbox                     | Bảng ghi "ý định gửi" cùng transaction với nghiệp vụ, relay sau                                            |
| Cold start                 | Thời gian khởi động instance mới khi scale từ 0                                                            |

---

# Nguồn tham khảo (đọc theo thứ tự)

1. Cloud Run — Services vs Jobs, request timeout, CPU allocation, container contract:
   https://cloud.google.com/run/docs/container-contract
2. Cloud Run — Authenticating service-to-service:
   https://cloud.google.com/run/docs/authenticating/service-to-service
3. Cloud Scheduler — HTTP targets, retry, timezone:
   https://cloud.google.com/scheduler/docs/creating
4. Cloud Tasks — HTTP targets, headers, retry parameters:
   https://cloud.google.com/tasks/docs/creating-http-target-tasks
   https://cloud.google.com/tasks/docs/configuring-queues
5. Pub/Sub — Push subscriptions, dead-letter topics, exactly-once:
   https://cloud.google.com/pubsub/docs/push
   https://cloud.google.com/pubsub/docs/handling-failures
6. Cloud Run Jobs — parallel tasks, `CLOUD_RUN_TASK_INDEX`:
   https://cloud.google.com/run/docs/create-jobs
7. Workflows — syntax, retry, parallel steps:
   https://cloud.google.com/workflows/docs/reference/syntax
8. Triggering Cloud Run jobs from Scheduler:
   https://cloud.google.com/run/docs/execute/jobs-on-schedule
9. Các con số giới hạn (deadline, kích thước, retention) thay đổi theo thời gian — luôn đối
   chiếu trang **Quotas and limits** của từng dịch vụ trước khi chốt cấu hình production.
