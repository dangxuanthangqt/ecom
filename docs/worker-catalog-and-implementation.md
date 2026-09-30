# Worker trong dự án thực tế — danh mục và cách triển khai

> **Mới với queue/worker?** Đọc [worker-for-beginners.md](worker-for-beginners.md) trước.
> Tài liệu dưới đây giả định bạn đã chạy được một job.
>
> Tài liệu này trả lời hai câu hỏi: **dự án thật thường chạy những worker nào**, và
> **đặt chúng vào repo này thì code trông ra sao**.
>
> Ba tài liệu anh em, đọc khi cần chiều sâu:
>
> | Tài liệu                                                                   | Trả lời gì                                                            |
> | -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
> | [queue-job-worker-scheduler-guide.md](queue-job-worker-scheduler-guide.md) | Queue/job/worker/scheduler là gì, vòng đời job, idempotency, retry    |
> | [bullmq-nestjs-schedule-deep-dive.md](bullmq-nestjs-schedule-deep-dive.md) | BullMQ và `@nestjs/schedule` chạy thế nào bên trong, deploy Cloud Run |
> | [queue-scheduler-gcp-vs-bullmq.md](queue-scheduler-gcp-vs-bullmq.md)       | Chọn Cloud Tasks/Scheduler hay BullMQ                                 |
>
> Tài liệu này **không** lặp lại lý thuyết ở đó. Nó là phần "làm gì, làm thế nào, và
> chạy thật trên production ra sao" — xem [§7](#7-worker-trên-production--cloud-run).
>
> Tài liệu mô tả **hai mô hình**: _pull_ với BullMQ (§4–§7) và _push_ với Cloud Tasks (§8).
> Mô hình push được đối chiếu với một dự án production thật trong workspace —
> `aimo-parking-lessor-server` / `aimo-parking-worker-server` — để phần "làm thế nào" không
> chỉ là lý thuyết.

---

## 0. Hiện trạng repo (tính đến `feat/prisma-7-migration`)

Nói thẳng để khỏi hiểu nhầm: **repo chưa chạy worker nào.**

| Thứ                        | Tình trạng                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `bullmq`, `@nestjs/bullmq` | **chưa cài**                                                                                                               |
| `@nestjs/schedule`         | **chưa cài**                                                                                                               |
| `ioredis` `6.0.0`          | đã có — [`RedisService`](../src/shared/services/redis.service.ts) đang dùng cho cache role/permission và throttler storage |
| Process                    | duy nhất một process API, bootstrap ở [`src/main.ts`](../src/main.ts)                                                      |
| Việc chạy nền              | không có. Mọi thứ chạy đồng bộ trong request                                                                               |

Nghĩa là mọi đoạn code trong tài liệu này là **code sẽ thêm**, không phải code đang có.
Đường dẫn file được đề xuất theo đúng quy ước repo (alias `@/`, `SharedModule` global,
service mỏng — repository giữ transaction).

---

## 1. Khi nào một việc đáng được đẩy ra worker

Đừng đẩy mọi thứ ra queue. Queue thêm Redis, thêm process, thêm một lớp lỗi mới.
Chỉ đẩy khi việc đó thỏa **ít nhất một** trong năm điều:

1. **Chậm** — mất > ~300ms mà người dùng không cần chờ kết quả (gửi mail, resize ảnh).
2. **Hay hỏng vì bên thứ ba** — gọi API ngoài, cần retry có backoff (Resend, S3, cổng thanh toán).
3. **Phải chạy theo lịch** — không có request nào kích hoạt (huỷ đơn quá hạn, dọn token hết hạn).
4. **Bùng nổ số lượng** — một hành động sinh ra N việc (một sản phẩm đổi giá → cập nhật N cache/index).
5. **Được phép trễ** — kết quả trễ 5 giây không ai chết.

Và **không đẩy** khi: kết quả cần trả về ngay trong response; việc phải nằm trong cùng
transaction với ghi DB (lúc đó dùng [outbox](#103-outbox--khi-job-tuyệt-đối-không-được-mất));
hoặc việc chỉ mất vài ms.

> **Câu hỏi kiểm tra nhanh:** "Nếu job này chạy **hai lần**, dữ liệu có sai không?"
> Nếu có → phải thiết kế idempotency **trước khi** viết processor. Xem [§9](#9-idempotency--phần-bắt-buộc).

---

## 2. Danh mục worker dự án thực tế hay dùng

Bảng tổng, rồi chi tiết từng nhóm ở dưới. Cột "repo này" đánh dấu mức độ liên quan
tới ecom: ✅ nên làm sớm · 🟡 khi lớn hơn · ⬜ chưa cần.

| #   | Worker                                                                | Nguồn kích hoạt                    | Repo này |
| --- | --------------------------------------------------------------------- | ---------------------------------- | -------- |
| 1   | Gửi email giao dịch (OTP, xác nhận đơn)                               | Event từ API                       | ✅       |
| 2   | Thông báo (push / SMS / webhook ra ngoài)                             | Event từ API                       | 🟡       |
| 3   | Xử lý media (resize, thumbnail, quét virus)                           | Sau khi upload S3                  | ✅       |
| 4   | Vòng đời đơn hàng (auto-cancel, auto-complete)                        | Scheduler                          | ✅       |
| 5   | Đối soát & webhook thanh toán                                         | Webhook + Scheduler                | ✅       |
| 6   | Đồng bộ search index                                                  | Event thay đổi Product/SKU         | 🟡       |
| 7   | Export / report (CSV, Excel, PDF)                                     | Người dùng bấm nút                 | 🟡       |
| 8   | Import hàng loạt                                                      | Người dùng upload file             | 🟡       |
| 9   | Dọn dẹp định kỳ (token, OTP, file mồ côi)                             | Scheduler                          | ✅       |
| 10  | Cache warmup / invalidation fan-out                                   | Event + Scheduler                  | 🟡       |
| 11  | Outbox dispatcher                                                     | Scheduler                          | 🟡       |
| 12  | Audit / analytics ingest                                              | Event                              | ⬜       |
| 13  | Đổi trạng thái theo giờ hẹn (flash sale, công khai sản phẩm, đổi giá) | Scheduler + sổ lịch trong DB       | ✅       |
| 14  | Thu tiền định kỳ / gia hạn tự động                                    | Scheduler → job theo từng thuê bao | 🟡       |

---

### 2.1 Email giao dịch — worker đầu tiên nên có

**Vì sao:** [`AuthService.sendOTP`](../src/routes/auth/auth.service.ts) hiện **đang comment
phần gửi mail** — và đó chính là lý do. Gọi Resend đồng bộ trong request đăng ký nghĩa là:
Resend chậm 3 giây → API đăng ký chậm 3 giây; Resend lỗi 500 → người dùng nhận
`UnprocessableEntityException` dù **verification code đã được ghi vào DB rồi**. Trạng thái
rách: code tồn tại, người dùng không nhận được, và không có gì retry.

**Đúng ra phải là:** ghi `VerificationCode` xong → `queue.add('send-otp', { verificationCodeId })`
→ trả 200 ngay. Worker đọc lại code từ DB và gửi.

| Thuộc tính    | Giá trị đề xuất                                                                               |
| ------------- | --------------------------------------------------------------------------------------------- |
| Queue         | `email`                                                                                       |
| Job name      | `send-otp`, `order-confirmed`, `password-changed`                                             |
| Payload       | **chỉ `id`**, không nhét nội dung mail (xem [§5.2](#52-payload--chỉ-id-không-nhét-cả-entity)) |
| `attempts`    | 5                                                                                             |
| `backoff`     | `exponential`, 3000ms                                                                         |
| `concurrency` | 10–20 (I/O thuần)                                                                             |
| Idempotency   | `jobId = otp:{verificationCodeId}`                                                            |
| Khi hết retry | vào DLQ + cho người dùng nút "gửi lại"                                                        |

---

### 2.2 Thông báo ra ngoài

Push (FCM/APNs), SMS, webhook gửi tới hệ thống của người bán. Cùng hình dạng với email
nhưng **fan-out**: một sự kiện → N người nhận. Mẫu chuẩn là hai tầng queue:

```
order.created → [notification-fanout] 1 job
                      ↓ tra danh sách người nhận, add N job
                → [notification-send] N job (mỗi job 1 người nhận)
```

Tách hai tầng để một người nhận lỗi không kéo theo retry cho cả N người.
Webhook ra ngoài thì thêm HMAC signature và `attempts: 8` với backoff tới hàng giờ —
hệ thống đối tác có thể chết cả buổi.

---

### 2.3 Xử lý media

Repo đã có [`MediaService`](../src/routes/media/media.service.ts) với presigned upload
và [`S3Service`](../src/shared/services/s3.service.ts). Cái còn thiếu là **những gì xảy ra
sau khi file nằm trên S3**:

- sinh thumbnail nhiều kích cỡ (`sharp`) — CPU-bound;
- lột EXIF (ảnh điện thoại mang theo toạ độ GPS);
- quét virus với file do người bán upload;
- ghi lại `width/height` vào DB để frontend không bị layout shift.

| Thuộc tính    | Giá trị đề xuất                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Queue         | `media`                                                                                                                                    |
| `concurrency` | **2–4** — CPU-bound, đặt cao sẽ làm đói event loop                                                                                         |
| `attempts`    | 3                                                                                                                                          |
| Idempotency   | `jobId = thumb:{s3Key}`; ghi đè cùng key S3 nên chạy lại vô hại                                                                            |
| Lưu ý         | **Worker media phải tách process khỏi API.** `sharp` chiếm CPU; chung process thì mọi request đều trễ. Xem [§6.4](#64-tách-process-worker) |

---

### 2.4 Vòng đời đơn hàng — worker "kiếm tiền" nhất

Đây là chỗ business logic thật nằm. Schema có
[`OrderStatus`](../prisma/schema.prisma) gồm `PENDING_CONFIRMATION` → `PENDING_PICKUP` →
`PENDING_DELIVERY` → `DELIVERED` / `RETURNED` / `CANCELLED`. Mỗi mũi tên "tự động" là một job.

| Job                       | Luật                                                              | Ghi chú kỹ thuật                                                                                                                                                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto-cancel-unpaid`      | `PENDING_CONFIRMATION` quá 30 phút chưa thanh toán → `CANCELLED`  | **Phải hoàn `stock`.** Checkout đã trừ stock trong transaction tại [`order-checkout.repository.ts`](../src/repositories/order/order-checkout.repository.ts) (`tx.sKU.updateMany` với điều kiện `stock: { gte: quantity }`). Huỷ mà quên cộng lại = mất hàng vĩnh viễn |
| `auto-complete-delivered` | `DELIVERED` quá 7 ngày, không khiếu nại → chốt tiền cho người bán | Chạy 1 lần/ngày                                                                                                                                                                                                                                                       |
| `remind-pending-pickup`   | `PENDING_PICKUP` quá 24h → nhắc người bán                         | Đẩy job sang queue `email`                                                                                                                                                                                                                                            |

**Mẫu triển khai đúng — scheduler chỉ quét, không xử lý:**

```ts
// ❌ SAI: cron vừa quét vừa xử lý
@Cron('*/5 * * * *')
async autoCancel() {
  const orders = await this.repo.findExpired();   // 5.000 đơn
  for (const o of orders) await this.cancel(o);   // chạy 40 phút, tick sau chồng lên
}

// ✅ ĐÚNG: cron là producer, worker là consumer
@Cron('*/5 * * * *')
async enqueueAutoCancel() {
  const ids = await this.repo.findExpiredIds({ limit: 500 });
  await this.orderQueue.addBulk(
    ids.map((id) => ({
      name: 'auto-cancel',
      data: { orderId: id },
      opts: { jobId: `auto-cancel:${id}` },   // trùng jobId → BullMQ bỏ qua
    })),
  );
}
```

`jobId` cố định theo `orderId` khiến tick sau **không** tạo job trùng cho đơn đang xử lý dở.
Đó là toàn bộ lý do mẫu này an toàn.

**Huỷ đơn phải nằm trong một transaction và phải có điều kiện trạng thái:**

```ts
// repositories/order/order-auto-cancel.repository.ts
await this.prismaService.$transaction(async (tx) => {
  const { count } = await tx.order.updateMany({
    where: { id: orderId, status: OrderStatus.PENDING_CONFIRMATION }, // ← chốt chặn
    data: { status: OrderStatus.CANCELLED },
  });
  if (count === 0) return; // người dùng vừa thanh toán xong — không làm gì cả

  const snapshots = await tx.productSKUSnapshot.findMany({
    where: { orderId },
    select: { skuId: true, quantity: true },
  });
  for (const s of snapshots) {
    if (!s.skuId) continue;
    await tx.sKU.update({
      where: { id: s.skuId },
      data: { stock: { increment: s.quantity } },
    });
  }
});
```

`count === 0` là idempotency guard: job chạy lần hai không cộng stock lần hai.

---

### 2.5 Thanh toán

Schema đã có `PaymentTransaction`. Hai worker đi kèm:

- **`payment-webhook-ingest`** — endpoint webhook chỉ làm ba việc: xác thực chữ ký, ghi
  raw payload vào bảng, `queue.add(...)`, rồi trả `200` **trong dưới 1 giây**. Cổng thanh
  toán sẽ retry nếu chậm, và retry của họ nghĩa là webhook trùng — nên `jobId` phải là mã
  giao dịch của cổng.
- **`payment-reconcile`** — cron hàng giờ, đối chiếu đơn `PENDING_CONFIRMATION` với API
  của cổng để bắt những webhook bị mất. Webhook **luôn** mất, đây là lưới an toàn.

---

### 2.6 Đồng bộ search index

Khi `Product`/`SKU`/`ProductTranslation` đổi → đẩy job `reindex-product` sang
Elasticsearch/Meilisearch. Ba quy tắc:

1. **Debounce** — sửa 10 field trong 1 phút không nên thành 10 lần reindex. Dùng `jobId`
   cố định `reindex:{productId}` + `delay: 5000`.
2. **Đọc lại từ DB trong worker**, đừng gửi document trong payload — payload cũ sẽ ghi đè
   dữ liệu mới nếu job chạy trễ.
3. Có job `reindex-all` chạy tay để dựng lại index khi mapping đổi.

---

### 2.7 Export & import

Người dùng bấm "Xuất báo cáo" → API trả `{ jobId }` ngay, frontend poll `GET /exports/:id`.
Worker query DB **theo cursor** (không `OFFSET` trên 500k dòng), ghi file, upload S3 qua
`S3Service`, rồi sinh presigned download URL và gửi mail.

`concurrency: 1–2`, và tuyệt đối không load toàn bộ kết quả vào RAM — stream ra file tạm.

Import ngược lại: upload CSV → worker parse theo batch 500 dòng → trả về report dòng nào lỗi.

Trên GCP còn một đường nữa mà dự án aimo đang dùng: **Google Cloud Workflows** lặp gọi API
export theo cursor, mỗi trang một request ngắn — xem [§8.5](#85-việc-lớn-nhiều-trang--google-cloud-workflows).

---

### 2.8 Dọn dẹp định kỳ

Việc ít hào nhoáng nhưng thiếu là DB phình. Repo này có sẵn ba ứng viên rõ ràng:

| Job                                | Bảng                                   | Lịch     |
| ---------------------------------- | -------------------------------------- | -------- |
| `purge-expired-verification-codes` | `VerificationCode` (`expiresAt < now`) | mỗi giờ  |
| `purge-expired-refresh-tokens`     | `RefreshToken`                         | mỗi ngày |
| `purge-orphan-s3-objects`          | object S3 không có hàng nào trỏ tới    | mỗi tuần |

Xoá theo **lô có giới hạn** (`deleteMany` với `take` qua subquery, hoặc vòng lặp 1.000 dòng/lần),
đừng `DELETE` một phát 2 triệu dòng — nó khoá bảng.

---

### 2.9 Đổi trạng thái theo giờ hẹn — "lịch hẹn là dữ liệu"

Flash sale bắt đầu 0h, sản phẩm công khai vào thứ Hai, giá mới hiệu lực từ 1/10. Cách ngây
thơ là cron quét `WHERE publishAt <= now() AND published = false` trên từng bảng nghiệp vụ.
Cách dự án aimo làm gọn hơn: **một bảng `task_schedule` duy nhất** ghi lại mọi lời hẹn —

```
type, start_time, end_time?, status (PENDING → RUNNING → COMPLETED | FAILED),
enabled, data jsonb, last_triggered_at
```

— và một cron quét đúng bảng đó. Lợi: người dùng thấy và huỷ được lịch hẹn của mình
(nó là một hàng, có id), audit được ai hẹn lúc nào, và thêm loại hẹn mới không cần thêm cron.
Chi tiết và những chỗ cần làm chặt hơn aimo ở [§8.4](#84-việc-theo-lịch--cloud-scheduler-và-sổ-task_schedule)
và [§8.6](#86-những-chỗ-aimo-làm-chưa-chặt--để-ecom-không-lặp-lại).

---

## 3. Bảng tra tham số

Copy khi tạo worker mới:

| Loại việc                             | `concurrency` | `attempts` | `backoff`       | Tách process?  |
| ------------------------------------- | ------------- | ---------- | --------------- | -------------- |
| Gọi API ngoài (mail, SMS, push)       | 10–30         | 5          | exponential 3s  | không bắt buộc |
| Webhook ra ngoài                      | 10            | 8          | exponential 10s | không bắt buộc |
| CPU (ảnh, PDF, mã hoá)                | 2–4           | 3          | fixed 5s        | **có**         |
| Ghi DB nặng (export, import, cleanup) | 1–2           | 3          | fixed 10s       | **có**         |
| Chuyển trạng thái nghiệp vụ           | 5             | 3          | exponential 5s  | không bắt buộc |

`concurrency` cho việc I/O đặt cao được vì Node chờ mạng thì rảnh CPU. Việc CPU thì
`concurrency` cao **không** làm nhanh hơn — chỉ làm mọi job cùng chậm.

---

## 4. Cài đặt vào repo này

```bash
pnpm add bullmq @nestjs/bullmq @nestjs/schedule
pnpm add -D @bull-board/api @bull-board/express @bull-board/nestjs
```

`REDIS_URL` đã có sẵn trong config nên không cần biến mới cho Redis. Thêm hai biến để
điều khiển vai trò process:

```ts
// src/types/config.type.ts — thêm vào AppConfig
  // Queue
  readonly workerEnabled: boolean;      // process này có chạy worker không
  readonly workerConcurrency: number;   // mặc định chung, worker có thể ghi đè
```

```ts
// src/shared/services/app-config.service.ts — trong getAppConfig()
      // Queue
      workerEnabled: this.getBoolean("WORKER_ENABLED"),
      workerConcurrency: this.getNumber("WORKER_CONCURRENCY"),
```

```dotenv
# .env
WORKER_ENABLED=true
WORKER_CONCURRENCY=5
```

> Repo dùng `AppConfigService` với `getBoolean`/`getNumber` **ném lỗi khi thiếu biến** —
> đó là chủ ý, nên nhớ thêm cả vào `.env.example` và env của CI/e2e, không thì app không boot.

---

## 5. Bộ khung code

### 5.1 Tên queue và job — một chỗ duy nhất

```ts
// src/constants/queue.ts
export const QUEUE = {
  EMAIL: "email",
  MEDIA: "media",
  ORDER: "order",
} as const;

export const JOB = {
  SEND_OTP: "send-otp",
  ORDER_CONFIRMED: "order-confirmed",
  GENERATE_THUMBNAIL: "generate-thumbnail",
  AUTO_CANCEL_ORDER: "auto-cancel",
} as const;
```

Chuỗi rời rạc trong `queue.add('sendOtp')` và `@Processor('send-otp')` là lỗi kinh điển:
job vào queue, không ai nhặt, và **không có gì báo lỗi cả**.

### 5.2 Payload — chỉ `id`, không nhét cả entity

```ts
// src/types/queue.type.ts
export type SendOtpJob = { verificationCodeId: string };
export type GenerateThumbnailJob = { s3Key: string; mediaId: string };
export type AutoCancelOrderJob = { orderId: string };
```

Ba lý do: payload nằm trong Redis nên nhỏ mới rẻ; dữ liệu trong payload là **ảnh chụp lúc
enqueue**, có thể đã cũ khi job chạy; và không rò thông tin nhạy cảm vào Redis/Bull Board.

### 5.3 Module đăng ký queue

```ts
// src/shared/modules/queue.module.ts
import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";

import { QUEUE } from "@/constants/queue";

import { AppConfigService } from "../services/app-config.service";

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: { url: config.appConfig.redisUrl },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 3000 },
          // Giữ lại một ít để debug, xoá phần còn lại — nếu không Redis phình
          // theo số job đã chạy, và đây là nguyên nhân OOM Redis phổ biến nhất.
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 24 * 3600 },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE.EMAIL },
      { name: QUEUE.MEDIA },
      { name: QUEUE.ORDER },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
```

Thêm `QueueModule` vào `imports` của [`AppModule`](../src/app.module.ts), cạnh `SharedModule`.

> `registerQueue` đăng ký **producer**. Nó không tự tạo worker. Worker chỉ tồn tại khi có
> một class `@Processor` được đưa vào providers — điều này cho phép tách process ở [§6.4](#64-tách-process-worker).

### 5.4 Producer — bọc trong một service, đừng inject `Queue` khắp nơi

```ts
// src/shared/services/email-queue.service.ts
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";

import { JOB, QUEUE } from "@/constants/queue";
import { SendOtpJob } from "@/types/queue.type";

@Injectable()
export class EmailQueueService {
  constructor(@InjectQueue(QUEUE.EMAIL) private readonly queue: Queue) {}

  /** `jobId` cố định theo verification code: gọi lại API resend OTP trong lúc
   *  job cũ còn chờ sẽ không sinh ra hai email. */
  enqueueSendOtp(data: SendOtpJob) {
    return this.queue.add(JOB.SEND_OTP, data, {
      jobId: `otp:${data.verificationCodeId}`,
      attempts: 5,
    });
  }
}
```

Rồi [`AuthService.sendOTP`](../src/routes/auth/auth.service.ts) thay khối gọi Resend đang
bị comment bằng đúng một dòng:

```ts
await this.emailQueueService.enqueueSendOtp({
  verificationCodeId: verificationCode.id,
});

return verificationCode;
```

### 5.5 Processor

```ts
// src/workers/email/email.processor.ts
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job, UnrecoverableError } from "bullmq";

import { JOB, QUEUE } from "@/constants/queue";
import { VerificationCodeRepository } from "@/repositories/auth/verification-code.repository";
import { AppConfigService } from "@/shared/services/app-config.service";
import { EmailService } from "@/shared/services/email.service";
import { SendOtpJob } from "@/types/queue.type";

@Processor(QUEUE.EMAIL, { concurrency: 20 })
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: AppConfigService,
    private readonly verificationCodeRepository: VerificationCodeRepository,
  ) {
    super();
  }

  async process(job: Job<SendOtpJob>): Promise<void> {
    switch (job.name) {
      case JOB.SEND_OTP:
        return this.sendOtp(job);
      default:
        // Job lạ: ném UnrecoverableError để BullMQ bỏ thẳng vào failed,
        // không retry 5 lần một việc chắc chắn không bao giờ chạy được.
        throw new UnrecoverableError(`Unknown job name: ${job.name}`);
    }
  }

  private async sendOtp(job: Job<SendOtpJob>): Promise<void> {
    const code = await this.verificationCodeRepository.findById(
      job.data.verificationCodeId,
    );

    // Code đã bị dùng hoặc đã hết hạn trong lúc job nằm chờ — gửi nữa là vô nghĩa.
    if (!code || code.expiresAt < new Date()) {
      this.logger.warn(`Skipping stale OTP job ${job.id}`);
      return;
    }

    const { error } = await this.emailService.sendEmail({
      email: this.configService.appConfig.sandboxEmail || code.email,
      code: code.code,
    });

    // Ném lỗi = job fail = BullMQ retry theo backoff. Đây là điểm khác cốt lõi
    // so với gọi Resend thẳng trong request: ở đó lỗi là mất luôn.
    if (error) throw new Error(`Resend failed: ${error.message}`);
  }
}
```

**Quy tắc:** phân biệt lỗi **tạm** (mạng, 5xx, timeout → ném lỗi thường để retry) và lỗi
**vĩnh viễn** (payload sai, bản ghi không tồn tại, 4xx → `UnrecoverableError` hoặc `return`).
Retry một lỗi vĩnh viễn 5 lần chỉ tốn tiền và làm nhiễu log.

### 5.6 Module worker

```ts
// src/workers/worker.module.ts
import { Module } from "@nestjs/common";

import { EmailProcessor } from "./email/email.processor";
import { MediaProcessor } from "./media/media.processor";
import { OrderProcessor } from "./order/order.processor";

@Module({ providers: [EmailProcessor, MediaProcessor, OrderProcessor] })
export class WorkerModule {}
```

---

## 6. Chạy worker ở đâu

### 6.1 Ba lựa chọn

| Cách                      | Khi nào                                                         |
| ------------------------- | --------------------------------------------------------------- |
| Chung process với API     | dev, staging, hoặc production rất nhỏ và job đều nhẹ I/O        |
| Tách process, chung image | **mặc định cho production**                                     |
| Tách hẳn service/repo     | khi worker cần thư viện nặng (ffmpeg, ML) hoặc team khác sở hữu |

### 6.2 Bật/tắt bằng config

```ts
// src/app.module.ts
@Module({
  imports: [
    SharedModule,
    BaseModule,
    QueueModule,
    RouteModule,
    // Không có `WorkerModule` ở đây — xem bên dưới.
  ],
})
export class AppModule {}
```

Cách sạch nhất là **hai entrypoint**, cùng một `AppModule` cho phần dùng chung:

```ts
// src/main.worker.ts
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";

import { WorkerRootModule } from "./worker-root.module";

async function bootstrap() {
  const app = await NestFactory.create(WorkerRootModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  // Bắt buộc: không có dòng này, BullMQ không được báo tắt, job đang chạy bị
  // cắt giữa chừng và phải chờ hết `lockDuration` mới có worker khác nhặt lại.
  app.enableShutdownHooks();

  // Worker không phục vụ nghiệp vụ, nhưng vẫn phải mở cổng: Cloud Run coi một
  // service là khởi động xong khi container bind `$PORT`, và một worker không
  // mở cổng nào sẽ bị kết luận là deploy hỏng. Cổng này chỉ để mang health
  // check. Chi tiết ở §7.3.
  await app.listen(process.env.PORT ?? 8080);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
```

> **Không dùng `NestFactory.createApplicationContext()`** cho worker sẽ chạy trên Cloud Run
> service. Nó không mở HTTP server, gọn hơn thật, nhưng deploy lên Cloud Run là thất bại
> với `failed to start and listen on the port`. Chỉ dùng nó khi worker chạy trên VM,
> Kubernetes hay ECS — những nơi không yêu cầu bind cổng.

với

```ts
// src/worker-root.module.ts
import { Module } from "@nestjs/common";

import { BaseModule } from "./shared/modules/base.module";
import { QueueModule } from "./shared/modules/queue.module";
import { SharedModule } from "./shared/modules/shared.module";
import { WorkerModule } from "./workers/worker.module";

// Không import RouteModule: worker không cần controller, guard hay Swagger.
@Module({ imports: [SharedModule, BaseModule, QueueModule, WorkerModule] })
export class WorkerRootModule {}
```

```jsonc
// package.json
"scripts": {
  "start:worker": "node dist/main.worker",
  "start:worker:dev": "nest start --watch --entryFile main.worker"
}
```

### 6.3 Graceful shutdown

`enableShutdownHooks()` + `@nestjs/bullmq` tự gọi `worker.close()` khi nhận `SIGTERM`.
`close()` **ngừng nhận job mới và chờ job đang chạy xong**. Hệ quả thực tế: mỗi job phải
chạy xong trong khoảng thời gian orchestrator cho phép trước khi `SIGKILL` —
Kubernetes mặc định 30 giây, Cloud Run **10 giây**. Job dài hơn thế phải chia nhỏ hoặc
checkpoint. Chi tiết trong [bullmq deep dive §E5](bullmq-nestjs-schedule-deep-dive.md).

### 6.4 Tách process worker

Lý do không phải "cho đẹp kiến trúc" mà là ba thứ đo được:

1. **CPU** — một job `sharp` chiếm event loop 800ms; chung process thì p99 của **mọi**
   endpoint tăng đúng 800ms.
2. **Scale khác nhau** — API scale theo QPS, worker scale theo độ sâu queue. Chung thì
   phải scale cả hai theo cái lớn hơn, tốn tiền.
3. **Bán kính nổ** — worker OOM vì một file CSV 2GB không nên làm chết API đang phục vụ khách.

### 6.5 Scheduler

> Cách thứ ba — Cloud Scheduler gọi HTTP, không có process nào giữ lịch — ở [§8.4](#84-việc-theo-lịch--cloud-scheduler-và-sổ-task_schedule).

`@nestjs/schedule` chạy **in-process**, nên nếu API chạy 3 replica thì `@Cron` chạy 3 lần
mỗi tick. Hai cách xử lý, chọn một:

- **Repeatable job của BullMQ** — lịch nằm trong Redis, chỉ một job được sinh ra dù bao nhiêu
  replica. Đây là lựa chọn mặc định khi đã có BullMQ.
- **`@Cron` nhưng chỉ bật trên đúng một process** (một deployment `scheduler` chạy 1 replica),
  cộng thêm khoá Redis `SET key NX PX` làm lưới an toàn.

```ts
// src/workers/order/order.scheduler.ts — dùng repeatable job
async onModuleInit() {
  await this.orderQueue.add(
    JOB.AUTO_CANCEL_ORDER_SCAN,
    {},
    {
      repeat: { pattern: "*/5 * * * *" },
      // Trùng `jobId` + cùng pattern → Redis chỉ giữ một lịch duy nhất,
      // kể cả khi 10 replica cùng chạy đoạn này lúc boot.
      jobId: "scan:auto-cancel",
    },
  );
}
```

---

## 7. Worker trên production — Cloud Run

Mục này trả lời: **cùng bộ code đó, chạy thật trên Cloud Run thì hình dạng ra sao**.
Cơ chế _vì sao_ Cloud Run hành xử như vậy nằm ở
[bullmq-nestjs-schedule-deep-dive.md PHẦN E](bullmq-nestjs-schedule-deep-dive.md) — ở đây là
phần vận hành: chạy cái gì ở đâu, cấu hình bao nhiêu, deploy theo thứ tự nào.

> Tên cờ `gcloud`, thời gian ân hạn và hành vi autoscale của Cloud Run thay đổi theo thời
> gian. Đối chiếu lại tài liệu GCP trước khi thiết kế dựa vào một con số cụ thể ở đây.

### 7.1 Bức tranh triển khai

```
                  ┌────────────────────────────┐
  Internet ─────► │ Cloud Run Service: api     │  min=0, max=10
                  │ args: node dist/src/main.js│  scale-to-zero, CPU theo request
                  │ vai trò: PRODUCER          │  (rẻ)
                  └─────────────┬──────────────┘
                                │ queue.add()
                                ▼
                  ┌────────────────────────────┐
                  │ Memorystore for Redis      │  IP riêng trong VPC
                  │ maxmemory-policy=noeviction│
                  └─────────────▲──────────────┘
                                │ BRPOPLPUSH — kết nối chặn, giữ liên tục
  không nhận      ┌─────────────┴──────────────┐
  traffic ngoài ► │ Cloud Run Service: worker  │  min=1, --no-cpu-throttling
                  │ args: node dist/src/main.  │  --no-allow-unauthenticated
                  │       worker.js            │
                  │ vai trò: CONSUMER          │
                  └─────────────┬──────────────┘
                                ▼
                         Cloud SQL / Postgres
                                ▲
  ┌──────────────────────────┐  │  chạy MỘT LẦN trước mỗi rollout
  │ Cloud Run Job: migrator  │──┘  (Dockerfile target `migrator` đã có sẵn)
  └──────────────────────────┘
```

**Cùng một image cho `api` và `worker`, chỉ khác `--args`.** Hai image riêng sẽ trôi lệch
phiên bản, và một ngày nào đó worker chạy code cũ hơn API mà không ai nhận ra.

Ngoại lệ có lý: aimo tách **hai repo, hai image** vì lessor-server kéo theo Chromium
(puppeteer để in PDF) còn worker thì không — nhét chung làm image worker nặng gấp nhiều lần.
Khi phụ thuộc lệch nhau tới mức đó, tách image là đúng, nhưng phải trả giá bằng contract
test cho tên job và schema payload — chính chỗ aimo đang lệch (xem [§8.6](#86-những-chỗ-aimo-làm-chưa-chặt--để-ecom-không-lặp-lại)).

**Vì sao không gộp `api` và `worker` làm một service:** API cần `min-instances=0` để rẻ,
worker cần `min-instances≥1` để còn sống mà nhặt job. Hai nhu cầu ngược nhau thì không
ở chung được — đây là lý do vận hành, nặng ký hơn cả ba lý do kỹ thuật ở [§6.4](#64-tách-process-worker).

### 7.2 Ba loại tài nguyên Cloud Run, đừng nhầm

| Loại                | Đặc điểm                                                        | Dùng cho worker nào                               |
| ------------------- | --------------------------------------------------------------- | ------------------------------------------------- |
| **Service**         | luôn sẵn sàng, nhận HTTP, phải bind `$PORT`                     | Worker BullMQ chạy liên tục (email, media, order) |
| **Job**             | chạy tới khi exit, không bind cổng, có `--task-timeout` tới 24h | Export/import lớn, migration, backfill một lần    |
| **Cloud Scheduler** | chỉ là cron gọi HTTP, không chạy code                           | Kích hoạt các job định kỳ                         |

Sai lầm hay gặp là nhét mọi thứ vào Service. Một job export 40 phút **không** hợp với
Service (giới hạn request và ~10 giây shutdown), nhưng hợp hoàn hảo với Cloud Run Job.

### 7.3 Worker phải mở cổng — cái bẫy làm hỏng lần deploy đầu tiên

Cloud Run Service coi container là khởi động xong khi nó bind vào `$PORT` được tiêm vào.
Một worker BullMQ thuần **không mở cổng nào** → Cloud Run chờ hết startup timeout →
`failed to start and listen on the port` → rollback. Container không sai; Cloud Run chỉ
không có cách nào biết nó còn sống.

Đó là lý do [§6.2](#62-bậttắt-bằng-config) dùng `NestFactory.create()` + `app.listen()`.
Cổng đó chỉ mang một thứ: health check **có thật**.

```ts
// src/workers/worker-health.controller.ts
import { InjectQueue } from "@nestjs/bullmq";
import { Controller, Get } from "@nestjs/common";
import { Queue } from "bullmq";

import { QUEUE } from "@/constants/queue";

@Controller()
export class WorkerHealthController {
  constructor(@InjectQueue(QUEUE.EMAIL) private readonly queue: Queue) {}

  @Get("healthz")
  async health() {
    // Ping Redis THẬT. Health endpoint trả 200 vô điều kiện là vô dụng: Redis
    // đứt, worker không nhặt nổi job nào, mà Cloud Run vẫn thấy "khoẻ" và
    // không restart. Queue tồn đọng trong im lặng.
    const client = await this.queue.client;
    await client.ping();

    return { status: "ok" };
  }
}
```

Khai báo `WorkerHealthController` trong `WorkerRootModule`, và deploy kèm liveness probe để
Cloud Run tự restart instance hỏng:

```bash
--liveness-probe=httpGet.path=/healthz,periodSeconds=30,failureThreshold=3
```

Kèm `--no-allow-unauthenticated` để cổng này không tồn tại trên Internet công cộng.

### 7.4 Hai cờ bắt buộc, phải đi cùng nhau

Cloud Run mặc định **chỉ cấp CPU khi đang xử lý request**. Worker không nhận request nào →
giữa các lần bị bóp CPU gần về 0. Hậu quả không chỉ là chậm: **lock của job không được
renew** → BullMQ coi job là `stalled` → một worker khác chạy lại job đó. Job trừ kho chạy
hai lần vì lý do này.

```bash
--no-cpu-throttling      # CPU always allocated
--min-instances=1        # luôn giữ ít nhất một instance sống
```

Thiếu `--min-instances=1`: instance vẫn bị thu hồi khi rảnh, `--no-cpu-throttling` thành
vô nghĩa. Thiếu `--no-cpu-throttling`: instance sống nhưng đóng băng. Đây cũng là **khoản
chi phí thật** của việc chạy BullMQ trên Cloud Run: trả tiền cho một instance 24/7 kể cả
khi queue rỗng ([§7.12](#712-chi-phí-và-khi-nào-không-nên-dùng-cloud-run-service)).

### 7.5 Không autoscale theo độ sâu queue được — nên phải tự tính sizing

Autoscaler của Cloud Run nhìn **CPU utilization và concurrency utilization**, cộng lưu
lượng request. Không metric nào của nó biết queue đang tồn đọng bao nhiêu job. Hệ quả cụ thể:

- Worker nghẽn I/O (gửi email) gần như **không bao giờ** scale — CPU thấp, dù tồn 10.000 job.
- Không thể scale từ 0 bằng job trong queue, vì chỉ request mới kéo được từ 0 lên.
- Công suất worker thực tế bị ghim quanh `min-instances`.

Nên phải **tự đặt công suất**, và công thức là:

```
throughput ≈ (số instance) × (concurrency) / (thời gian trung bình 1 job)

Ràng buộc bắt buộc:
  (số instance worker) × (tổng concurrency mọi processor) + (kết nối của API)
      ≤ connection_limit của Postgres
```

Vế ràng buộc hay bị bỏ quên và hậu quả rất khó chẩn đoán: worker scale lên 5 instance ×
concurrency 20 = 100 kết nối, Cloud SQL hết slot, và **API** bắt đầu văng lỗi kết nối chứ
không phải worker. Tăng `concurrency` thì phải tính lại pool Prisma.

Khi cần nhiều hơn, theo thứ tự đơn giản dần tới mạnh dần:

1. **Cố định công suất** — `--min-instances=1 --max-instances=1`, chỉnh `concurrency`
   trong `@Processor`. Đủ cho phần lớn dự án ở quy mô repo này.
2. **Scale bằng Cloud Scheduler** — cron 5 phút đọc `queue.getJobCounts()` rồi gọi Cloud Run
   Admin API cập nhật `min-instances`. Thô nhưng khoảng 50 dòng là xong.
3. **Chuyển worker sang GKE + KEDA** — KEDA đọc thẳng độ sâu queue Redis và scale theo đó.
   Đúng bài nhất, đổi lại phải vận hành một cụm Kubernetes.

### 7.6 Chỉ có ~10 giây để tắt

Cloud Run gửi `SIGTERM` rồi `SIGKILL` sau khoảng **10 giây**:

```
t=0s   SIGTERM → worker.close() → ngừng nhận job mới, CHỜ job đang chạy
t=10s  SIGKILL ← job nào chưa xong bị cắt ngang
       → mất lock → stalled → worker khác chạy LẠI job đó
```

Ba điều bắt buộc, chiếu thẳng vào danh mục ở [§2](#2-danh-mục-worker-dự-án-thực-tế-hay-dùng):

- **Giữ mỗi job dưới ~10 giây.** Gửi một email: được. Resize 20 ảnh trong một job: không —
  tách thành 20 job. Export 500k dòng: **không đặt trên Cloud Run Service**, dùng Cloud Run Job.
- **Idempotency không còn là lý thuyết** ([§9](#9-idempotency--phần-bắt-buộc)). Mỗi lần deploy
  là một cơ hội để job chạy hai lần. Deploy vài lần một ngày thì việc này xảy ra thật.
- **Tin tốt về repo này:** [`docker-entrypoint.sh`](../docker-entrypoint.sh) kết thúc bằng
  `exec "$@"`. Nhờ `exec`, tiến trình `node` _thay thế_ shell nên nhận `SIGTERM` trực tiếp.
  Thiếu `exec` thì shell nuốt tín hiệu và mọi nỗ lực graceful shutdown thành vô nghĩa.
  Repo đang đúng — đừng sửa dòng đó.

### 7.7 Deploy: cùng image, chỉ khác `--args`

**Không cần Dockerfile mới.** Stage `production` hiện có kết thúc bằng:

```dockerfile
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
```

Cloud Run map `--command` → `ENTRYPOINT` và `--args` → `CMD`. Chỉ override `--args`, để
**giữ nguyên entrypoint** (nó kiểm tra `DATABASE_URL` và `exec`).

> ⚠️ **Kiểm tra đường dẫn entry trước khi deploy.** `tsconfig.json` include cả
> `prisma/**/*.ts` và `initial-scripts/**/*.ts`, nên `tsc` lấy thư mục gốc dự án làm
> `rootDir` và xuất ra **`dist/src/main.js`**, không phải `dist/main.js`.
> `Dockerfile` CMD và script `start:prod` (`node dist/main`) đang trỏ sai đường dẫn đó;
> `build:swagger` thì trỏ đúng (`dist/src/generate-swagger.js`). Xác nhận bằng
> `pnpm build && ls dist`, rồi sửa cho khớp trước khi thêm worker — nếu không thì worker
> sẽ thừa hưởng đúng cái lỗi này.

```bash
IMAGE="asia-southeast1-docker.pkg.dev/$PROJECT/ecom/api:$SHA"
COMMON="--network=default --subnet=default --vpc-egress=private-ranges-only \
  --set-secrets=DATABASE_URL=db-url:latest,REDIS_URL=redis-url:latest"

# 1) API — producer, scale-to-zero
gcloud run deploy ecom-api \
  --image="$IMAGE" \
  --args=node,dist/src/main.js \
  --min-instances=0 --max-instances=10 \
  --allow-unauthenticated \
  --set-env-vars=WORKER_ENABLED=false \
  $COMMON

# 2) Worker — consumer, CÙNG image, khác args và khác chế độ tính tiền
gcloud run deploy ecom-worker \
  --image="$IMAGE" \
  --args=node,dist/src/main.worker.js \
  --min-instances=1 --max-instances=1 \
  --no-cpu-throttling \
  --cpu=1 --memory=512Mi \
  --no-allow-unauthenticated \
  --set-env-vars=WORKER_ENABLED=true,WORKER_CONCURRENCY=10 \
  --liveness-probe=httpGet.path=/healthz,periodSeconds=30,failureThreshold=3 \
  $COMMON
```

`nest build` tự biên dịch `src/main.worker.ts` vì nó nằm trong `tsconfig` — không cần
cấu hình build riêng, chỉ cần thêm script chạy trong `package.json`.

### 7.8 Scheduler trên production

`@nestjs/schedule` chạy in-process. Service `api` scale tới 5 instance thì `@Cron` chạy 5
lần mỗi tick — nghĩa là huỷ đơn 5 lần, gửi mail 5 lần. Ba cách đúng:

| Cách                                | Cấu hình                                                       | Khi nào                                                         |
| ----------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| **Repeatable job BullMQ**           | lịch nằm trong Redis, tự chống trùng                           | mặc định khi đã có BullMQ ([§6.5](#65-scheduler))               |
| **Cloud Scheduler → HTTP**          | cron của GCP gọi `POST /internal/jobs/scan` trên service `api` | khi muốn lịch hiện ra trong Console và sửa được mà không deploy |
| **Cloud Scheduler → Cloud Run Job** | cron khởi chạy một Job chạy rồi thoát                          | việc nặng, dài, hiếm (export tháng, backfill)                   |

Nếu chọn Cloud Scheduler gọi HTTP: endpoint đó phải yêu cầu OIDC token của service account,
**không** để `--allow-unauthenticated`, và bản thân handler chỉ nên `queue.addBulk()` rồi
trả `200` ngay — đừng xử lý trong request đó.

### 7.9 Bảng cấu hình production cho từng worker

Đây là chỗ danh mục [§2](#2-danh-mục-worker-dự-án-thực-tế-hay-dùng) gặp Cloud Run:

| Worker              | Chạy trên                      | CPU / RAM | min/max | `concurrency` | Ghi chú                                               |
| ------------------- | ------------------------------ | --------- | ------- | ------------- | ----------------------------------------------------- |
| Email, thông báo    | Service `worker`               | 1 / 512Mi | 1 / 1   | 10–20         | I/O thuần, một instance gánh được nhiều               |
| Vòng đời đơn hàng   | Service `worker`               | 1 / 512Mi | 1 / 2   | 5             | Job ngắn, phải idempotent tuyệt đối                   |
| Media (thumbnail)   | Service `worker-cpu` **riêng** | 2 / 1Gi   | 0–1 / 3 | 2             | `sharp` ngốn RAM; tách để OOM không giết worker email |
| Export / import lớn | **Cloud Run Job**              | 2 / 2Gi   | —       | 1             | `--task-timeout=3600s`, tránh giới hạn 10 giây        |
| Dọn dẹp định kỳ     | Cloud Run Job + Scheduler      | 1 / 512Mi | —       | 1             | Chạy rồi thoát, không tốn instance 24/7               |
| Webhook thanh toán  | Service `worker`               | 1 / 512Mi | 1 / 3   | 5             | `max` cao hơn vì cổng thanh toán bắn dồn              |

Bắt đầu bằng **một** service `worker` gánh tất cả. Chỉ tách ra khi có lý do đo được: worker
media OOM, hoặc job email bị kẹt sau job nặng.

### 7.10 Redis production — hai thiết lập không được sai

Chi tiết phương án Memorystore vs Redis public ở
[deep dive §E6](bullmq-nestjs-schedule-deep-dive.md). Hai thứ **phải** đúng:

1. **`maxmemory-policy = noeviction`.** Mọi policy khác cho phép Redis tự xoá key khi đầy
   bộ nhớ — mà key ở đây chính là job. Job biến mất không lỗi, không log, không dấu vết.
   Kiểm tra bằng `CONFIG GET maxmemory-policy`; mặc định của dịch vụ managed thường **không**
   phải `noeviction`.
2. **`removeOnComplete` / `removeOnFail`** đã đặt trong `QueueModule` ở [§5.3](#53-module-đăng-ký-queue).
   Thiếu chúng thì Redis phình theo tổng số job từng chạy và OOM sau vài tuần.

Và nhớ rằng [`RedisService`](../src/shared/services/redis.service.ts) hiện đặt
`enableOfflineQueue: false` với `maxRetriesPerRequest: 2` — đúng cho cache, **sai cho
BullMQ**. Worker BullMQ cần connection riêng với `maxRetriesPerRequest: null` vì nó dùng
lệnh chặn giữ lâu. Đừng chia sẻ `RedisService.client` cho BullMQ; để `BullModule` tự mở
connection của nó như ở [§5.3](#53-module-đăng-ký-queue).

Phía API (producer), `queue.add()` sẽ **ném lỗi** khi Redis chết. Phải quyết định trước cho
từng chỗ: request nghiệp vụ hỏng theo, hay nuốt lỗi và chấp nhận mất job? Với OTP thì nuốt
được (người dùng bấm gửi lại); với hoàn tiền thì không — đó là lúc cần
[outbox](#103-outbox--khi-job-tuyệt-đối-không-được-mất).

### 7.11 Thứ tự rollout

Rolling deploy nghĩa là trong vài phút, **worker cũ và API mới cùng sống**. Ba luật:

1. **Migration chạy trước tất cả.** Repo đã có lời giải: stage `migrator` trong
   [`Dockerfile`](../Dockerfile), chạy như Cloud Run Job trước khi rollout. Container app
   cố tình không migrate — lý do ghi rõ trong [`docker-entrypoint.sh`](../docker-entrypoint.sh).
2. **Thêm loại job mới thì deploy `worker` TRƯỚC `api`.**

   ```
   Sai:  deploy api mới → api đẩy job "send-welcome-email"
                        → worker cũ không biết tên job này
                        → UnrecoverableError → job chết luôn, không retry

   Đúng: deploy worker mới (biết job mới, chưa ai đẩy) → rồi deploy api
   ```

3. **Payload phải tương thích ngược.** Job đã nằm trong Redis mang schema cũ; worker mới
   phải đọc được. Đổi tên field thì qua hai lần deploy: thêm field mới và đọc cả hai →
   deploy → lần sau mới bỏ field cũ. Đây chính là lý do
   [§5.2](#52-payload--chỉ-id-không-nhét-cả-entity) bảo chỉ truyền `id`: payload càng nhỏ,
   bề mặt lệch schema càng nhỏ.

**Runbook một lần deploy:**

```
1. build & push image (một image duy nhất, tag = commit SHA)
2. chạy Cloud Run Job `migrator`  → chờ exit 0
3. deploy ecom-worker             → chờ revision healthy (/healthz xanh)
4. deploy ecom-api                → chia traffic nếu cần
5. kiểm tra: waiting không tăng, failed không tăng, stalled = 0
```

Rollback thì làm ngược: trả traffic `api` về revision cũ trước, rồi mới tới `worker`.

### 7.12 Chi phí, và khi nào không nên dùng Cloud Run Service

Nói thẳng: với BullMQ trên Cloud Run, bạn trả tiền cho **một instance chạy 24/7 cộng
Memorystore**, chỉ để có một vòng lặp hỏi Redis "có việc chưa?". Ở quy mô nhỏ, phần lớn thời
gian nó hỏi vào chỗ trống.

| Nếu                                                                                   | Thì                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Job thưa, không cần Flow, không cần dashboard replay, chấp nhận khoá GCP              | Dùng **Cloud Tasks** — mô hình push, không cần worker luôn bật ([so sánh](queue-scheduler-gcp-vs-bullmq.md); cách một dự án thật làm ở [§8](#8-mô-hình-push-với-cloud-tasks--cách-một-dự-án-thật-đang-chạy))                                         |
| Cần Flow / parent-child, cần Bull Board để replay job hỏng, muốn giữ khả năng rời GCP | Giữ **BullMQ**, coi tiền instance 24/7 là cái giá cho những thứ đó                                                                                                                                                                                   |
| Chỉ vướng mỗi khoản tiền instance                                                     | Đặt worker ở **nơi khác**: một VM `e2-micro` hay container tính tiền theo giờ thường rẻ hơn Cloud Run `min-instances=1` + CPU always-on. API vẫn ở Cloud Run và vẫn scale-to-zero — mô hình pull không bắt buộc producer và consumer ở cùng nền tảng |

### 7.13 Checklist trước khi bật production

- [ ] `main.worker.ts` có `app.listen($PORT)` — thiếu là không deploy nổi ([§7.3](#73-worker-phải-mở-cổng--cái-bẫy-làm-hỏng-lần-deploy-đầu-tiên))
- [ ] `main.worker.ts` có `enableShutdownHooks()` — `main.ts` hiện **chưa có**
- [ ] `/healthz` ping Redis thật, đã khai báo `--liveness-probe`
- [ ] Worker deploy kèm **cả** `--no-cpu-throttling` **và** `--min-instances≥1`
- [ ] Worker `--no-allow-unauthenticated`
- [ ] `--args` trỏ đúng `dist/src/...` (xem cảnh báo ở [§7.7](#77-deploy-cùng-image-chỉ-khác---args))
- [ ] Connection Redis **riêng** cho BullMQ, `maxRetriesPerRequest: null`
- [ ] Mọi job trên Service chạy dưới ~10 giây; việc dài đã chuyển sang Cloud Run Job
- [ ] `(instance × concurrency) + API` ≤ connection limit của Postgres
- [ ] `removeOnComplete` / `removeOnFail` đã đặt
- [ ] Redis `maxmemory-policy = noeviction`, đã bật persistence ở mức tier cho phép
- [ ] Mọi handler idempotent — mỗi lần deploy là một cơ hội job chạy lại
- [ ] Bull Board có xác thực
- [ ] Alert cho `waiting` tăng liên tục, `failed` vượt ngưỡng, và `stalled > 0`
- [ ] Đã quyết định `queue.add()` lỗi thì request hỏng theo hay nuốt, cho từng luồng

> **`stalled > 0` là chỉ số đáng chú ý nhất trên Cloud Run.** Nó thường có nghĩa: worker bị
> OOM kill, hoặc `lockDuration` ngắn hơn job, hoặc deploy cắt ngang job. Ba nguyên nhân cần
> ba hành động khác nhau, nhưng đều bắt đầu từ con số này.

---

## 8. Mô hình push với Cloud Tasks — cách một dự án thật đang chạy

Mọi thứ từ §4 tới §7 xoay quanh **mô hình pull**: worker giữ kết nối tới Redis và tự nhặt
job. Đó không phải cách duy nhất, và trên Cloud Run thường không phải cách rẻ nhất. Mục này
mô tả **mô hình push** qua một dự án production thật trong cùng workspace —
`aimo-parking-lessor-server` (API) và `aimo-parking-worker-server` (worker) — rồi chiếu
lại vào repo này.

> Toàn bộ nhận xét dưới đây đọc từ **bản code đang có trên máy** (tháng 9/2026). Hai repo
> có thể đã lệch nhau vài commit; chỗ nào lệch tôi ghi rõ.

### 8.1 Bức tranh của aimo

```
                          ┌──────────────────────────────┐
 Cloud Scheduler ───────► │ lessor-server (Cloud Run)    │
 (cron, ngoài repo)       │  POST /task-schedule/*       │  StaticAuthGuard: header api-key
   header: api-key        │  quét bảng task_schedule     │
                          │                              │
 người dùng ────────────► │  POST /camera/.../past-video │
                          │   └─ WorkerService.publish() │──┐ OIDC id-token (audience = WORKER_API_URL)
                          │                              │  │
                          │  GET /csv/... (export lớn)   │  │
                          │   └─ Workflows.createExec()  │──┼──► Google Cloud Workflows
                          └──────────────────────────────┘  │        │ vòng lặp cursor
                                                            ▼        ▼
                          ┌──────────────────────────────┐  ┌──────────────────────────────┐
                          │ Cloud Tasks queue            │  │ worker-server (Cloud Run)    │
                          │ projects/…/queues/tasks      │─►│  POST /  ← QueueWorkerModule │
                          │ retry policy nằm Ở ĐÂY,      │  │   @QueueWorker('download-…') │
                          │ không nằm trong code         │  │   @QueueWorker('auto-send-…')│
                          └──────────────────────────────┘  │   @QueueWorker('…-auto-pay') │
                                                            │  GET /csv/export  ← Workflows│
                                                            │  POST /csv/execute           │
                                                            │  GET /health (terminus, DB)  │
                                                            └──────────────────────────────┘
 máy in Star CloudPRNT ──── poll ────► bảng printer_job + file .bin trên GCS
```

Bốn cơ chế chạy nền, **không cái nào là BullMQ, không cái nào là `@Cron`**:

| Việc                                                                              | Cơ chế                                                                                                            | Ai giữ trạng thái "còn việc" |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Việc lẻ, kích hoạt bởi người dùng (tải video quá khứ, gửi mail, thu tiền tự động) | **Cloud Tasks** → HTTP push sang worker-server                                                                    | Cloud Tasks                  |
| Việc theo lịch (áp giá đã hẹn, công khai bãi đã hẹn, xoá barcode cũ)              | **Cloud Scheduler** → HTTP vào lessor-server, quét bảng `task_schedule`                                           | Postgres                     |
| Export CSV lớn nhiều trang                                                        | **Google Cloud Workflows** gọi vòng lặp `GET /csv/export?afterCursor=…` rồi `POST /csv/execute` để nén + gửi mail | Workflows                    |
| In QR qua máy in vật lý                                                           | Bảng `printer_job` + file trên GCS; **máy in tự poll**                                                            | Postgres                     |

### 8.2 Producer — cách lessor-server đẩy việc

```ts
// aimo-parking-lessor-server/src/shared/worker/worker.service.ts (rút gọn)
const TASK_NAME = {
  DOWNLOAD_PAST_VIDEO: "download-past-video",
  EXTERNAL_PROPERTY_SYNC: "external-property-sync",
};

@Injectable()
export class WorkerService {
  constructor(
    private googleCloudAuthService: GoogleCloudAuthService,
    private tasksPublisherService: TasksPublisherService, // @anchan828/nest-cloud-run-queue-tasks-publisher
  ) {}

  private async getOptions(executeTime?: Date): Promise<PublishOptions> {
    // OIDC id-token, audience = URL của worker-server. Cloud Run IAM của
    // worker-server sẽ kiểm token này — code worker KHÔNG tự kiểm.
    const token = await this.googleCloudAuthService.getTokenWorkerServer();
    return {
      httpRequest: { headers: { Authorization: `Bearer ${token}` } },
      scheduleTime: executeTime
        ? { seconds: executeTime.getTime() / 1000 }
        : null,
    };
  }

  async downloadPastVideo(data: any) {
    try {
      return await this.tasksPublisherService.publish(
        { data, name: TASK_NAME.DOWNLOAD_PAST_VIDEO },
        await this.getOptions(),
      );
    } catch (error) {
      this.logger.error(error); // ← nuốt lỗi, xem §8.6
    }
  }
}
```

Cấu hình queue và URL đích nằm trong env, không hard-code:

```dotenv
WORKER_QUEUE=projects/aimo-api-worker/locations/asia-northeast1/queues/tasks
WORKER_API_URL=https://worker-server-xxxx.a.run.app     # đích Cloud Tasks POST tới
USE_GCLOUD_TASKS_EMULATOR=true                           # local: trỏ client sang emulator
```

Điểm đáng học: **`scheduleTime`**. Cloud Tasks nhận "chạy lúc X" ngay trong lệnh publish —
tương đương `delay` của BullMQ nhưng không cần worker sống để promote job.

### 8.3 Consumer — cách worker-server nhận việc

```ts
// aimo-parking-worker-server/src/api/worker/worker.module.ts
@Module({
  imports: [QueueWorkerModule.register() /* … */], // mở POST / nhận Cloud Tasks
  providers: [
    HealthProcessor, // @QueueWorker({ name: 'health' })
    DownloadPastVideoProcessor, // @QueueWorker({ name: 'download-past-video' })
    SendMailProcessor, // @QueueWorker({ name: 'auto-send-mail' })
    SpaceRentalAutoPaymentProcessor, // @QueueWorker({ name: 'space-rental-auto-payment' })
    PropertyRentalAutoPaymentProcessor, // @QueueWorker({ name: 'property-rental-auto-payment' })
  ],
})
export class WorkerModule {}
```

```ts
// aimo-parking-worker-server/src/api/worker/processor/send-mail.processor.ts
@QueueWorker({ name: "auto-send-mail" })
export class SendMailProcessor {
  constructor(private readonly mailerService: MailerService) {}

  @QueueWorkerProcess()
  public async process(
    message: AutoSendMailRequestDto,
    _raw: QueueWorkerRawMessage,
  ) {
    const { from, to, mailType, data } = message;
    await this.mailerService.sendMail(to, mailType, data, from);
  }
}
```

So với `@Processor` + `WorkerHost` của BullMQ, khác biệt cốt lõi:

|                  | BullMQ (pull)                                                 | Cloud Tasks (push) — aimo                                                                        |
| ---------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Ai gọi processor | worker tự nhặt từ Redis                                       | Cloud Tasks HTTP POST vào worker                                                                 |
| Worker rảnh thì  | vẫn giữ kết nối chặn → phải `min-instances≥1` + CPU always-on | **không có request → scale về 0**                                                                |
| Retry/backoff    | trong code (`attempts`, `backoff`)                            | **trong cấu hình queue** trên GCP (`retryConfig`) — code chỉ cần **ném lỗi → 5xx**               |
| Concurrency      | `concurrency` trong `@Processor`                              | `maxDispatchesPerSecond`, `maxConcurrentDispatches` của queue + autoscale Cloud Run theo request |
| Delay            | `delay`, cần worker sống để promote                           | `scheduleTime`, Cloud Tasks giữ                                                                  |
| Dashboard        | Bull Board                                                    | Console Cloud Tasks (không replay từng job tiện bằng)                                            |
| Local dev        | Redis trong docker-compose                                    | `ghcr.io/aertje/cloud-tasks-emulator` trong docker-compose                                       |
| Health           | phải tự viết ping Redis                                       | `@nestjs/terminus` ping DB, không có Redis để ping                                               |

Hệ quả vận hành lớn nhất: **mọi cạm bẫy ở §7.3–§7.5 biến mất.** Worker là một HTTP server
bình thường, Cloud Run tự scale theo request (mà request ở đây chính là job), không cần
`--no-cpu-throttling`, không cần giữ instance 24/7. Đây đúng là điều
[queue-scheduler-gcp-vs-bullmq.md](queue-scheduler-gcp-vs-bullmq.md) kết luận, và aimo là
bằng chứng nó chạy được trong production.

Giới hạn ~10 giây shutdown (§7.6) **vẫn còn** — nhưng ít cắn hơn, vì Cloud Run chỉ thu hồi
instance khi không còn request đang chạy, và một task đang xử lý _là_ một request.
Thay vào đó phải nhìn **request timeout** của Cloud Run (mặc định 5 phút, tối đa 60) và
`dispatchDeadline` của Cloud Tasks (mặc định 10 phút): task dài hơn hai giới hạn đó bị
coi là fail và retry.

### 8.4 Việc theo lịch — Cloud Scheduler và sổ `task_schedule`

aimo không quét "đơn nào quá hạn" tại thời điểm cron chạy. Thay vào đó, **lúc người dùng hẹn**
(đặt giá mới có hiệu lực từ 1/10, hẹn công khai bãi từ thứ Hai) API ghi một hàng vào bảng
`task_schedule`:

```
task_schedule
  id, type (RentalCost | PublicProperty), start_time, end_time?,
  status (Pending → Running → Completed | Fail), enabled, data jsonb, last_triggered_at
```

Rồi Cloud Scheduler gọi `POST /task-schedule/rental-cost` định kỳ. Handler:

1. `SELECT … WHERE type=? AND enabled AND status='Pending' AND start_time <= now()`
2. cập nhật cả lô sang `Running`
3. từng hàng một transaction: đóng giá cũ (`endTime=now, isApply=false`), mở giá mới
   (`startTime=now, isApply=true`), hàng lịch → `Completed`
4. hàng nào lỗi → `Fail` **ngoài** transaction, `Promise.allSettled` để một hàng hỏng không
   chặn hàng khác

Đây là mẫu **"lịch hẹn là dữ liệu nghiệp vụ"**, và nó hợp với ecom hơn cron quét mù: hẹn
giờ flash sale, hẹn công khai sản phẩm, hẹn đổi giá — tất cả đều là "một hàng có
`start_time` chờ được áp".

Cách xác thực endpoint: `StaticAuthGuard` so `header['api-key'] !== STATIC_API_KEY`.
Chạy được, nhưng ecom nên làm tốt hơn: Cloud Scheduler hỗ trợ **OIDC token** natively —
đặt endpoint sau `--no-allow-unauthenticated` và cấp `roles/run.invoker` cho service account
của Scheduler, không cần key tĩnh, không cần so chuỗi trong code.

### 8.5 Việc lớn, nhiều trang — Google Cloud Workflows

Export CSV vài trăm nghìn dòng không hợp với một request Cloud Tasks. aimo giải bằng
Workflows: lessor-server gọi `ExecutionsClient.createExecution()` với đối số
`{ jobParam, searchParam, afterCursor: '', limit }`; Workflow **lặp** gọi
`GET /csv/export` trên worker-server theo cursor, ghi từng trang lên GCS, hết dữ liệu thì
`POST /csv/execute` để nén, ký URL và gửi mail. Trạng thái vòng lặp nằm trong Workflows,
mỗi bước là một request ngắn — vừa khít hợp đồng Cloud Run.

Với ecom, đây là câu trả lời cho hàng "Export / report" ở §2.7 nếu đi đường GCP-native;
đường Cloud Run Job ở §7.2 là lựa chọn đơn giản hơn khi không cần vòng lặp có trạng thái.

### 8.6 Những chỗ aimo làm chưa chặt — để ecom không lặp lại

Tài liệu nội bộ của aimo (`docs/jobs/task-schedule.md`) tự liệt kê phần lớn. Đối chiếu code:

| Vấn đề                                                                                       | Ở đâu                                                 | Hậu quả                                                                                    | ecom làm gì                                                                                                  |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Không lock giữa `SELECT Pending` và `UPDATE Running`                                         | `TaskScheduleService.scheduleRentalCost`              | Scheduler bắn 2 lần cùng lúc → cùng hàng được xử lý 2 lần                                  | `UPDATE … WHERE status='PENDING' RETURNING` hoặc `SELECT … FOR UPDATE SKIP LOCKED` — chính kỹ thuật §9 lớp 2 |
| Hàng `Fail` / `Running` **không bao giờ** được nhặt lại                                      | truy vấn chỉ lấy `Pending`                            | Process chết giữa chừng → lịch hẹn treo vĩnh viễn, giá không đổi, không ai biết            | thêm `attempts`, và cron "thu hồi `Running` quá N phút về `Pending`"                                         |
| Publish nuốt lỗi                                                                             | `WorkerService.downloadPastVideo` `try/catch` chỉ log | Người dùng nhận 200, task không bao giờ tồn tại                                            | quyết định rõ theo §7.10: hỏng theo hay nuốt — không nuốt im                                                 |
| `triggerWorkflowDownloadCsv` không `await`                                                   | `.then().catch()`                                     | Lỗi tạo execution chỉ vào log                                                              | như trên                                                                                                     |
| Key tĩnh, so bằng `!==`                                                                      | `StaticAuthGuard`                                     | Không constant-time, không rotate được                                                     | OIDC (§8.4)                                                                                                  |
| Worker không xác thực caller trong code                                                      | `main.ts` comment `useGlobalGuards(StaticAuthGuard)`  | Chỉ an toàn **nếu** Cloud Run để `--no-allow-unauthenticated`; chạy local hay đổi cờ là hở | giữ IAM **và** kiểm `Authorization` bằng `google-auth-library` `verifyIdToken`                               |
| Lessor publish `external-property-sync`, worker (bản trên máy) **không có** processor tên đó | `TASK_NAME` vs `worker.module.ts`                     | Task 404 → Cloud Tasks retry tới hết `maxAttempts` → chết im                               | tên job ở **một** package dùng chung, hoặc contract test; xem §7.11 luật 2                                   |
| Payload mang cả entity (`{...downloadPastVideoRequestDto, propertyId, userId}`)              | `CameraService.downloadPastVideo`                     | Dữ liệu cũ khi task chạy trễ; lộ trong Console                                             | chỉ `id` (§5.2) — dù aimo đọc lại DB trong processor nên hậu quả nhẹ                                         |

### 8.7 Ecom đi đường nào

|                              | Pull — BullMQ (§4–§7)         | Push — Cloud Tasks (mục này)                     |
| ---------------------------- | ----------------------------- | ------------------------------------------------ |
| Chi phí nền trên Cloud Run   | 1 instance 24/7 + Memorystore | ~0 khi rỗng                                      |
| Khoá nhà cung cấp            | không                         | GCP                                              |
| Flow / job cha–con           | có                            | tự làm bằng Workflows                            |
| Replay job hỏng từ dashboard | Bull Board                    | hạn chế                                          |
| Rate limit / concurrency     | trong code                    | trong queue config                               |
| Local dev                    | Redis (đã có)                 | thêm emulator                                    |
| Thư viện Nest                | `@nestjs/bullmq` (chính thức) | `@anchan828/nest-cloud-run-queue-*` (bên thứ ba) |

**Đề xuất cho ecom:** nếu đích production là Cloud Run, đi **push** theo đúng hình aimo —
đó là đường ít cạm bẫy vận hành nhất và đã có bằng chứng chạy thật. Toàn bộ §5 vẫn đúng
(tên job một chỗ, payload chỉ `id`, producer bọc trong service, processor tách lỗi tạm/vĩnh
viễn); chỉ đổi lớp vận chuyển:

```ts
// src/shared/services/task-queue.service.ts — bản push của §5.4
@Injectable()
export class TaskQueueService {
  constructor(
    private readonly publisher: TasksPublisherService,
    private readonly auth: GoogleCloudAuthService,
  ) {}

  async enqueueSendOtp(data: SendOtpJob, runAt?: Date) {
    const token = await this.auth.idTokenFor(
      this.config.appConfig.workerApiUrl,
    );
    return this.publisher.publish(
      { name: JOB.SEND_OTP, data },
      {
        httpRequest: {
          headers: { Authorization: `Bearer ${token}` },
          // Cloud Tasks khử trùng theo tên task trong ~1 giờ — thay cho jobId của BullMQ
        },
        ...(runAt && {
          scheduleTime: { seconds: Math.floor(runAt.getTime() / 1000) },
        }),
      },
    );
  }
}
```

```ts
// src/workers/email/send-otp.worker.ts — bản push của §5.5
@QueueWorker({ name: JOB.SEND_OTP })
export class SendOtpWorker {
  @QueueWorkerProcess()
  async process(data: SendOtpJob) {
    const code = await this.verificationCodeRepository.findById(
      data.verificationCodeId,
    );
    if (!code || code.expiresAt < new Date()) return; // lỗi vĩnh viễn → 2xx, không retry
    const { error } = await this.emailService.sendEmail({
      email: code.email,
      code: code.code,
    });
    if (error) throw new Error(error.message); // lỗi tạm → 5xx → Cloud Tasks retry
  }
}
```

Việc theo lịch: bảng `ScheduledChange` kiểu `task_schedule` cho flash sale / công khai sản
phẩm, Cloud Scheduler (OIDC) gọi `POST /internal/scheduled-changes/apply`, handler dùng
`UPDATE … WHERE status='PENDING' … RETURNING` để chống chạy đôi.

Nếu sau này cần Flow, cần replay, hoặc muốn rời GCP — quay lại §4–§7; code nghiệp vụ trong
processor không đổi, chỉ đổi decorator và lớp vận chuyển.

---

## 9. Idempotency — phần bắt buộc

Một job **sẽ** chạy hai lần. Không phải "nếu": worker bị `SIGKILL` giữa chừng, lock hết hạn,
job thành `stalled` và worker khác nhặt lại. Ba lớp phòng thủ, dùng kết hợp:

**Lớp 1 — `jobId` chống trùng lúc enqueue.** BullMQ từ chối job có `jobId` đã tồn tại
trong queue. Chặn được double-submit và cron tick chồng nhau, **không** chặn được stalled retry.

**Lớp 2 — điều kiện trong câu ghi DB.** Mạnh nhất, không cần hạ tầng thêm:

```ts
// Chạy lần hai: `count === 0`, không có gì xảy ra thêm.
const { count } = await tx.order.updateMany({
  where: { id: orderId, status: OrderStatus.PENDING_CONFIRMATION },
  data: { status: OrderStatus.CANCELLED },
});
```

Cùng một kỹ thuật checkout đang dùng cho stock (`stock: { gte: quantity }` trong
`updateMany`) — dùng lại nó cho worker.

**Lớp 3 — khoá Redis, khi việc không ghi DB** (ví dụ gọi API bên thứ ba thu tiền):

```ts
const ok = await this.redisService.client.set(
  `job:done:${job.id}`,
  "1",
  "EX",
  86400,
  "NX",
);
if (!ok) return; // job này đã chạy rồi
```

`RedisService` đã có sẵn trong `SharedModule`, `set(..., 'NX')` là atomic nên không có khe hở.

---

## 10. Ba thứ hay bị bỏ quên

### 10.1 Bull Board

```ts
BullBoardModule.forRoot({ route: "/admin/queues", adapter: ExpressAdapter });
```

Production **phải** đặt sau guard admin — dashboard cho phép xem payload và retry/xoá job.
Repo đã có hệ thống permission ngữ nghĩa, dùng lại nó thay vì basic auth.

### 10.2 Quan sát

Theo dõi tối thiểu bốn số, cảnh báo trên hai số đầu:

| Chỉ số                            | Ngưỡng cảnh báo                                             |
| --------------------------------- | ----------------------------------------------------------- |
| `waiting` (độ sâu queue)          | tăng đều trong 10 phút → worker không theo kịp hoặc đã chết |
| `failed`                          | > 0 với queue thanh toán; tỉ lệ > 5% với queue email        |
| thời gian chờ (enqueue → bắt đầu) | > SLA của việc đó                                           |
| `active` kéo dài bất thường       | job treo, sắp thành stalled                                 |

Log **luôn kèm `job.id`, `job.name`, `attemptsMade`** — không có chúng thì không truy được
một job hỏng qua log của 5 replica.

### 10.3 Outbox — khi job tuyệt đối không được mất

`queue.add()` nằm ngoài transaction DB. Nếu commit xong rồi Redis chết trước khi `add()`
thành công → đơn hàng tồn tại, email xác nhận không bao giờ được gửi. Với email OTP thì
chấp nhận được (người dùng bấm gửi lại); với hoàn tiền thì không.

Cách chuẩn: ghi bảng `OutboxEvent` **trong cùng transaction** với nghiệp vụ, rồi một cron
đọc bảng đó và `queue.add()`. Đánh đổi: trễ thêm một chu kỳ cron, đổi lấy đảm bảo
at-least-once thật sự. Chi tiết trong
[queue-job-worker-scheduler-guide.md §16](queue-job-worker-scheduler-guide.md).

---

## 11. Test worker

Processor là một class Nest bình thường → test đúng như service, theo mẫu harness repo
đang dùng trong `__tests__`:

```ts
const job = {
  id: "1",
  name: JOB.SEND_OTP,
  data: { verificationCodeId: "vc-1" },
} as Job;
await processor.process(job);
expect(emailService.sendEmail).toHaveBeenCalledOnce();
```

Ba ca **bắt buộc** có cho mỗi processor:

1. đường thành công;
2. **chạy hai lần → chỉ một hiệu ứng** (đây là test quan trọng nhất);
3. lỗi tạm thì ném ra (để retry), lỗi vĩnh viễn thì không ném.

Đừng dựng Redis thật trong unit test. E2E thì dùng Redis của
[docker-compose](../docker-compose.yml) và `worker.waitUntilFinished()`.

---

## 12. Anti-pattern

| Sai                                                        | Hậu quả                                                        |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| Nhét cả entity vào payload                                 | Redis phình; job chạy với dữ liệu cũ, ghi đè dữ liệu mới       |
| Không đặt `removeOnComplete`                               | Redis OOM sau vài tuần — lỗi vận hành phổ biến nhất của BullMQ |
| `@Cron` vừa quét vừa xử lý                                 | Tick chồng lên nhau, một lỗi giết cả mẻ                        |
| `@Cron` chạy trên nhiều replica                            | Job chạy N lần; trừ tiền N lần                                 |
| `concurrency` cao cho job CPU                              | Mọi job cùng chậm, không job nào xong sớm                      |
| Retry mọi lỗi                                              | Đốt quota API bên thứ ba vì payload sai                        |
| Worker chung process với API                               | Một job nặng làm chậm toàn bộ API                              |
| Không có idempotency                                       | Gửi hai email, trừ hai lần kho, hoàn tiền hai lần              |
| Bull Board không guard                                     | Lộ payload và cho phép người lạ xoá job                        |
| Không `enableShutdownHooks()`                              | Deploy nào cũng bỏ lại job dở                                  |
| Worker Cloud Run thiếu `--no-cpu-throttling`               | Worker đóng băng, lock hết hạn, job chạy lại                   |
| Redis production để `maxmemory-policy` mặc định            | Job bị Redis tự xoá — mất im lặng, không lỗi, không log        |
| Job dài hơn 10 giây trên Cloud Run Service                 | Mỗi lần deploy cắt ngang job và nhân đôi nó                    |
| Publish job trong `try/catch` chỉ log                      | Người dùng nhận 200, job không bao giờ tồn tại                 |
| Cron chỉ nhặt `PENDING`, không thu hồi `RUNNING` treo      | Process chết giữa chừng → lịch hẹn treo vĩnh viễn              |
| Tên job định nghĩa riêng ở producer và consumer (hai repo) | Lệch một chữ → task chết im sau khi retry hết                  |

---

## Lộ trình đề xuất cho repo này

Trước hết chọn lớp vận chuyển — hai nhánh dưới dùng chung toàn bộ §5 (tên job, payload,
producer service, processor), chỉ khác cách job đi từ API tới worker:

| Đích production                       | Chọn                                                                                                          | Vì sao                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Cloud Run (GCP)                       | **Push — Cloud Tasks**, theo hình aimo ([§8](#8-mô-hình-push-với-cloud-tasks--cách-một-dự-án-thật-đang-chạy)) | không instance 24/7, không Memorystore, không cạm bẫy §7.3–§7.5 |
| VM / Kubernetes / muốn không khoá GCP | **Pull — BullMQ** (§4–§7)                                                                                     | Flow, Bull Board, replay, chạy ở đâu cũng được                  |

Các bước dưới viết cho nhánh BullMQ; nhánh Cloud Tasks thay `QueueModule`/`@Processor` bằng
`TasksPublisherModule`/`@QueueWorker` như [§8.7](#87-ecom-đi-đường-nào), phần còn lại giữ nguyên.

1. **Bước 1** — `QueueModule` + queue `email` + `EmailProcessor`, gỡ đoạn Resend bị comment
   trong `AuthService.sendOTP`. Đây là bug thật, sửa được ngay.
2. **Bước 2** — queue `order` + `auto-cancel-unpaid` (repeatable job). Đây là chỗ hoàn stock,
   giá trị nghiệp vụ cao nhất.
3. **Bước 3** — tách `main.worker.ts`, deploy thành Cloud Run service riêng cùng image
   ([§7](#7-worker-trên-production--cloud-run)).
4. **Bước 4** — queue `media` cho thumbnail, và các cron dọn dẹp.
5. **Bước 5** — Bull Board sau guard admin, cùng cảnh báo trên `waiting`/`failed`.
