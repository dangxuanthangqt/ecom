# Worker cho người mới — hiểu bằng một quán phở, rồi tự chạy trong 30 phút

> Đọc tài liệu này **trước** khi đọc ba tài liệu worker còn lại. Chúng viết cho người đã
> chạy queue rồi và muốn biết bên trong. Tài liệu này viết cho người **chưa thấy một job
> chạy bao giờ**.
>
> Quy ước: mỗi mục đều có một dòng **"Nhớ một câu"**. Nếu chỉ nhớ được các dòng đó là đủ
> để đọc tiếp các tài liệu khác.

---

## 0. Hai điều cần biết trước khi đọc bất cứ thứ gì

1. **Repo này chưa có worker.** Không có `bullmq`, không có `@nestjs/schedule`, chỉ có một
   process API bootstrap ở [`src/main.ts`](../src/main.ts). Redis đã có qua
   [`RedisService`](../src/shared/services/redis.service.ts) nhưng chỉ dùng làm cache. Vì
   thế bạn không tìm được "worker chạy ở đâu" trong code là **đúng**, không phải bạn đọc sót.
2. **Mọi thứ khó trong ba tài liệu kia đều là cách phòng lỗi.** Lock, stalled,
   `maxRetriesPerRequest`, Cloud Run bind cổng... đều là "cái bảng có thể hỏng thế nào".
   Bạn chỉ cần chúng **sau** khi đã chạy được thứ cơ bản và bắt đầu gặp lỗi.

---

## 1. Bài toán, bằng đúng code của repo

Mở [`AuthService.sendOTP`](../src/routes/auth/auth.service.ts). Luồng hiện tại:

```
Client gọi POST /auth/otp
  → tạo verification code trong Postgres
  → (đoạn gửi email đang bị comment) gọi Resend gửi mail
  → trả response
```

Nếu bỏ comment đoạn gửi mail, ba chuyện xấu xảy ra:

| Chuyện xấu                                     | Vì sao                          |
| ---------------------------------------------- | ------------------------------- |
| Client phải chờ Resend xong mới nhận response  | Gửi mail chạy **trong** request |
| Resend lỗi một lần là mail mất luôn            | Không ai thử lại                |
| Resend chậm 5 giây thì cả endpoint chậm 5 giây | Một việc phụ kéo tụt việc chính |

Worker sinh ra để giải đúng ba dòng này.

> **Nhớ một câu:** worker là cách **làm việc chậm ở chỗ khác, để request trả về ngay**.

---

## 2. Mô hình quán phở

Quên Redis, BullMQ, Lua đi. Tưởng tượng một quán phở.

```
   Khách ──gọi món──▶ THU NGÂN ──cắm phiếu──▶ ┃ BẢNG PHIẾU ┃ ◀──rút phiếu── ĐẦU BẾP ──▶ nấu
                        (API)                   (queue)                    (worker)
```

| Trong quán                                    | Trong hệ thống                                                |
| --------------------------------------------- | ------------------------------------------------------------- |
| Khách gọi món                                 | Client gọi `POST /auth/otp`                                   |
| Thu ngân ghi phiếu, đưa số bàn, **không nấu** | API tạo job, trả response ngay                                |
| Phiếu                                         | **Job**: một mẩu JSON nhỏ, ví dụ `{ verificationCodeId: 42 }` |
| Bảng phiếu trong bếp                          | **Queue**: một danh sách nằm trong Redis                      |
| Đầu bếp đứng cạnh bảng, có phiếu thì rút      | **Worker**: process chạy nền, có job thì xử lý                |
| Nấu hỏng thì cắm phiếu lại, lát làm lại       | Job lỗi thì **retry**                                         |
| Hai đầu bếp không được cùng rút một phiếu     | Lock (chưa cần quan tâm bây giờ)                              |

Ba điểm quan trọng nhất của mô hình:

- **Thu ngân và đầu bếp không nói chuyện với nhau.** Họ chỉ dùng chung một cái bảng. API
  không gọi worker, worker không gọi API. Cả hai chỉ đọc/ghi Redis.
- **Bảng phiếu vẫn còn khi đầu bếp nghỉ.** Redis giữ job. Worker chết, khởi động lại,
  job vẫn ở đó chờ. Đây là lý do dùng Redis chứ không dùng một mảng trong bộ nhớ.
- **Thêm đầu bếp không cần sửa thu ngân.** Queue tồn đọng thì chạy thêm process worker.
  API không biết và không cần biết.

> **Nhớ một câu:** Redis là cái bảng, job là phiếu, API cắm phiếu, worker rút phiếu.

---

## 3. BullMQ và `@nestjs/bullmq` là gì trong bức tranh này

- **BullMQ** là _luật viết và rút phiếu_. Nó quy định cắm phiếu lên bảng như thế nào, rút
  ra như thế nào để hai đầu bếp không đụng nhau, phiếu hỏng thì để đâu, thử lại sau bao lâu.
  Bạn không phải tự viết những luật này. Nó chạy trên Redis, dùng thư viện `ioredis` mà
  repo đã có.
- **`@nestjs/bullmq`** là _lớp dán BullMQ vào NestJS_: cho phép inject `Queue` vào
  service và khai báo worker bằng decorator `@Processor`, thay vì tự `new Worker(...)`.

Bạn sẽ cài cả hai:

```bash
pnpm add bullmq @nestjs/bullmq
```

> **Nhớ một câu:** BullMQ = luật của cái bảng; `@nestjs/bullmq` = cách khai báo luật đó
> theo kiểu Nest.

---

## 4. Trong code chỉ có ba mảnh

Toàn bộ worker, dù lớn tới đâu, cũng chỉ là ba mảnh sau lặp lại.

### Mảnh 1 — nói cho cả hai bên biết cái bảng ở đâu

```ts
// src/shared/modules/queue.module.ts
BullModule.forRootAsync({
  inject: [AppConfigService],
  useFactory: (config: AppConfigService) => ({
    connection: { url: config.appConfig.redisUrl }, // cùng REDIS_URL đang dùng cho cache
  }),
}),
  BullModule.registerQueue({ name: "email" }); // đặt tên cho một cái bảng
```

`registerQueue` chỉ **tạo cái bảng và cho phép cắm phiếu**. Nó **không** tạo đầu bếp.

### Mảnh 2 — thu ngân cắm phiếu (producer)

```ts
// trong AuthService, thay khối gửi mail đang comment
constructor(@InjectQueue("email") private readonly emailQueue: Queue) {}

await this.emailQueue.add("send-otp", { verificationCodeId: verificationCode.id });
return verificationCode;   // trả về ngay, không chờ mail
```

`add()` resolve nghĩa là **phiếu đã nằm trên bảng**. Không có nghĩa là mail đã gửi.

### Mảnh 3 — đầu bếp rút phiếu (processor)

```ts
// src/workers/email.processor.ts
@Processor("email")
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly emailService: EmailService,
    private readonly verificationCodeRepository: VerificationCodeRepository,
  ) {
    super();
  }

  async process(job: Job<{ verificationCodeId: number }>) {
    const code = await this.verificationCodeRepository.findUnique({
      where: { id: job.data.verificationCodeId },
    });
    if (!code) return; // phiếu cũ, bỏ qua

    const { error } = await this.emailService.sendEmail({
      email: code.email,
      code: code.code,
    });
    if (error) throw new Error(error.message); // ném lỗi = BullMQ sẽ thử lại
  }
}
```

**Bạn không viết vòng lặp rút phiếu.** `@nestjs/bullmq` tạo một `Worker` của BullMQ đứng
canh Redis và gọi `process(job)` mỗi khi có job. Việc của bạn chỉ là viết hàm `process`.

Hai quy tắc trong `process`:

| Muốn gì                         | Làm gì                 |
| ------------------------------- | ---------------------- |
| Job xong, đánh dấu thành công   | `return`               |
| Job hỏng tạm thời, muốn thử lại | `throw new Error(...)` |

> **Nhớ một câu:** ba mảnh = _bảng ở đâu_, _cắm phiếu_, _rút phiếu_. Cắm là `queue.add`,
> rút là hàm `process`.

---

## 5. Worker "chạy ở đâu" — câu hỏi hay gây rối nhất

Đầu bếp (`EmailProcessor`) chỉ tồn tại khi class đó nằm trong `providers` của một module
**được boot**. Đó là công tắc duy nhất.

| Muốn                                | Làm                                                                                | Khi nào               |
| ----------------------------------- | ---------------------------------------------------------------------------------- | --------------------- |
| API và worker **cùng một process**  | Đưa `EmailProcessor` vào providers của một module mà `AppModule` import            | Dev, học, staging nhỏ |
| API và worker **hai process riêng** | Tạo `main.worker.ts` boot một module riêng chỉ chứa processor, không có controller | Production            |

Cả hai process đều trỏ vào **cùng một Redis**, nên API ở process này cắm phiếu, worker ở
process kia vẫn rút được. Chi tiết hai process xem
[worker-catalog-and-implementation.md §6](worker-catalog-and-implementation.md#6-chạy-worker-ở-đâu).

Cho bài thực hành bên dưới, dùng cách **cùng một process** để chỉ cần một lệnh `start:dev`.

> **Nhớ một câu:** processor nằm trong module nào được boot thì worker chạy trong process đó.

---

## 6. Thực hành 30 phút — thấy một job đi hết vòng đời

Mục tiêu: gọi `POST /auth/otp`, nhìn job xuất hiện trong Redis, nhìn worker nhặt nó, nhìn
nó thành công, rồi cố tình làm nó lỗi để nhìn retry. **Không cần Resend key thật** — bước
6.4 sẽ giả lập.

### 6.1 Chuẩn bị (5 phút)

```bash
docker compose up -d redis db           # Redis 7 đã có trong docker-compose.yml, cổng 6379
pnpm add bullmq @nestjs/bullmq
git switch -c learn/first-worker        # làm trên branch riêng để dễ vứt
```

Mở sẵn một terminal thứ hai để soi Redis:

```bash
docker compose exec redis redis-cli
```

### 6.2 Viết ba mảnh (10 phút)

1. Tạo `src/shared/modules/queue.module.ts` như Mảnh 1, thêm `@Global()` và
   `exports: [BullModule]`. Import nó vào [`AppModule`](../src/app.module.ts).
2. Tạo `src/workers/email.processor.ts` như Mảnh 3. Tạo `src/workers/worker.module.ts`
   với `providers: [EmailProcessor]`. Import `WorkerModule` vào `AppModule`.
3. Trong [`AuthService`](../src/routes/auth/auth.service.ts): inject queue, thay khối
   Resend đang comment bằng `emailQueue.add(...)` như Mảnh 2.

Rồi chạy `pnpm start:dev`. Nếu app boot được là ba mảnh đã nối nhau.

### 6.3 Nhìn phiếu được cắm (5 phút)

Trong terminal `redis-cli`, chạy trước khi gọi API:

```
KEYS bull:email:*
```

Chưa có gì. Giờ gọi API:

```bash
curl -X POST localhost:4000/auth/otp \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","type":"REGISTER"}'
```

Response về **ngay lập tức**. Quay lại `redis-cli`:

```
KEYS bull:email:*            # giờ có bull:email:1, bull:email:completed, bull:email:events ...
HGETALL bull:email:1          # xem phiếu: name = send-otp, data = {"verificationCodeId":..}
ZRANGE bull:email:completed 0 -1   # id 1 nằm đây → worker đã nhặt và chạy xong
```

Nếu `bull:email:1` xuất hiện rồi biến khỏi `wait` và nằm trong `completed`, bạn đã nhìn
thấy trọn một vòng: **cắm → rút → xong**. Đây là toàn bộ cơ chế.

> Gặp `bull:email:wait` có id mà mãi không sang `completed`? Worker chưa chạy. Kiểm tra
> `WorkerModule` đã được import vào `AppModule` chưa.

### 6.4 Cố tình làm hỏng để nhìn retry (10 phút)

Trong `EmailProcessor.process`, tạm thay dòng gửi mail bằng:

```ts
console.log(`attempt ${job.attemptsMade + 1} for job ${job.id}`);
throw new Error("giả lập Resend sập");
```

Và ở Mảnh 2 thêm option: `{ attempts: 3, backoff: { type: "fixed", delay: 2000 } }`.

Gọi API lần nữa, nhìn console:

```
attempt 1 for job 2
(2 giây)
attempt 2 for job 2
(2 giây)
attempt 3 for job 2
```

Rồi trong `redis-cli`:

```
ZRANGE bull:email:failed 0 -1        # id 2 nằm đây sau 3 lần
HGET bull:email:2 failedReason        # "giả lập Resend sập"
HGET bull:email:2 attemptsMade        # 3
```

Bạn vừa thấy điều quan trọng nhất mà gọi Resend trực tiếp trong request **không bao giờ**
cho bạn: lỗi không mất, nó được thử lại, và khi hết lượt vẫn còn dấu vết để điều tra.

Xong bài. Xoá dòng giả lập, hoặc bỏ luôn branch.

---

## 7. Đọc tiếp cái gì, theo thứ tự

Bây giờ bạn đã có hình ảnh cụ thể trong đầu. Đọc lại các tài liệu kia sẽ dễ hơn nhiều,
theo đúng thứ tự này:

| Bước | Đọc                                                                                     | Để trả lời                                                               |
| ---- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1    | [queue-job-worker-scheduler-guide.md](queue-job-worker-scheduler-guide.md)              | Từ vựng chuẩn: job lifecycle, idempotency, retry, scheduler là gì        |
| 2    | [worker-catalog-and-implementation.md](worker-catalog-and-implementation.md) §1, §2, §5 | Việc nào đáng đẩy ra worker, và code chuẩn của repo nên trông thế nào    |
| 3    | [bullmq-nestjs-schedule-deep-dive.md](bullmq-nestjs-schedule-deep-dive.md) §B2–B6       | Bạn vừa soi các key `bull:email:*`; phần này giải thích từng key         |
| 4    | [worker-catalog-and-implementation.md](worker-catalog-and-implementation.md) §6, §7     | Tách process và deploy Cloud Run. Chỉ cần khi thật sự lên production     |
| 5    | [queue-scheduler-gcp-vs-bullmq.md](queue-scheduler-gcp-vs-bullmq.md)                    | Khi nào không dùng BullMQ mà dùng Cloud Tasks, như các repo aimo-parking |

Ba câu hỏi để tự kiểm tra trước khi đọc bước 3. Trả lời được cả ba là sẵn sàng:

1. Vì sao `await queue.add()` xong mà mail vẫn chưa gửi?
2. Nếu tắt process worker rồi gọi API 5 lần, 5 job đó ở đâu? Bật lại thì chuyện gì xảy ra?
3. Trong `process`, `return` và `throw` khác nhau ở chỗ nào?

---

## Phụ lục — một cảnh báo duy nhất bạn _cần_ biết ngay

Đừng dùng lại `RedisService.client` cho BullMQ. Kết nối đó cố ý cấu hình **fail nhanh**
(`maxRetriesPerRequest: 2`, `commandTimeout: 1000`) vì nó phục vụ cache. Worker của BullMQ
cần một kết nối **chờ được lâu**, vì đầu bếp đứng canh bảng bằng một lệnh Redis chặn nhiều
giây. Cứ để `BullModule.forRoot({ connection: { url } })` tự mở kết nối riêng như Mảnh 1.
Lý do đầy đủ ở [bullmq deep dive §B4](bullmq-nestjs-schedule-deep-dive.md#b4-worker-nhặt-job--chặn-chứ-không-poll).
