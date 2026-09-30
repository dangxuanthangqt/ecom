# Queue, Job, Worker, Scheduler — từ cơ bản đến nâng cao

Tài liệu giải thích trọn bộ khái niệm xử lý nền (background processing), viết bám vào stack thật của dự án này: **NestJS 11 + Prisma + PostgreSQL + Redis (ioredis) + Resend + S3**.

Đọc theo thứ tự. **Phần 0 dành cho người chưa từng làm xử lý nền** — giải thích job, cron, worker từ con số không. Phần 1–5 là nền tảng, phần 6–11 là thực hành, phần 12–17 là nâng cao.

---

## 0. Nền tảng: job, cron, worker thực ra là cái gì

Phần này viết cho người chưa từng làm xử lý nền. Nếu đã quen, nhảy xuống mục 1.

### 0.1 Server bình thường chạy thế nào

Một API server chỉ làm đúng một vòng lặp: **nhận request → chạy code → trả response**. Code chạy trong vòng lặp đó gọi là code **đồng bộ với request** — user còn đang giữ kết nối và ngồi chờ. Chờ càng lâu, request càng dễ timeout, server càng ít chỗ trống cho người khác.

Xử lý nền (background processing) là mọi cách để nói: _việc này không cần làm ngay bây giờ, và không cần user chờ_. Toàn bộ tài liệu này chỉ xoay quanh câu đó.

### 0.2 Job — hiểu đúng ngay từ đầu

Trực giác sai hay gặp: "job là một hàm chạy ngầm". Không phải.

**Job là một mẩu dữ liệu mô tả việc cần làm** — đúng nghĩa đen là một object JSON được ghi xuống đâu đó (Redis, database, file). Nó không chứa code, không chứa biến, không chứa kết nối.

```jsonc
// đây là một job. Chỉ có vậy.
{
  "name": "send-verify-email", // tên việc → quyết định hàm nào sẽ xử lý
  "data": { "userId": 42 }, // tham số, phải serialize được thành JSON
  "attemptsMade": 0, // đã thử chạy mấy lần
  "timestamp": 1758585600000, // tạo lúc nào
}
```

So sánh trực tiếp:

```ts
// (A) gọi hàm bình thường: chạy NGAY, trong tiến trình NÀY, user đang chờ
await this.emailService.sendVerifyEmail(42);

// (B) tạo job: chỉ ghi một dòng JSON vào Redis rồi trả về ngay (~2ms)
await this.emailQueue.add("send-verify-email", { userId: 42 });
// việc thật sẽ do một tiến trình khác làm, có thể 1 giây sau, có thể 5 phút sau
```

Vì job chỉ là JSON nên có hai hệ quả phải nhớ ngay:

- **Không nhét được object sống vào `data`** — không Prisma client, không instance class, không function, không `Date` phức tạp. Chỉ truyền ID, worker tự query lại dữ liệu mới nhất.
- **Job sống lâu hơn tiến trình tạo ra nó.** App restart, deploy, sập — job vẫn nằm trong Redis chờ được nhặt. Đây chính là lý do người ta chịu khó dùng queue thay vì `setTimeout`.

### 0.3 Việc được sinh ra từ đâu — hai nguồn duy nhất

| Nguồn         | Kích hoạt bởi                 | Tên gọi                      | Ví dụ trong dự án                       |
| ------------- | ----------------------------- | ---------------------------- | --------------------------------------- |
| **Sự kiện**   | Hành động của user / hệ thống | event-driven job             | User đăng ký → gửi email xác thực       |
| **Thời gian** | Đồng hồ điểm giờ              | **scheduled job / cron job** | 2h sáng mỗi ngày → dọn giỏ hàng bỏ quên |

Chỉ có hai nguồn đó. Cron nằm ở dòng thứ hai — nó là **cái đồng hồ báo thức**, không phải cái máy làm việc.

### 0.4 Cron là gì

"Cron" là tên một chương trình chạy nền trên Unix từ những năm 1970, nhiệm vụ duy nhất là: xem đồng hồ, tới giờ đã hẹn thì chạy một lệnh. Cái tên sống đến hôm nay và trở thành danh từ chung:

- **cron** = cơ chế chạy việc theo lịch
- **cron expression** (hay cron pattern) = chuỗi 5 ô mô tả lịch, ví dụ `0 2 * * *`
- **cron job** = một cặp (lịch + việc), ví dụ "`0 2 * * *` → dọn giỏ hàng"

Đọc cron expression — 5 ô, cách nhau bằng dấu cách, thứ tự **phút → giờ → ngày → tháng → thứ**:

```
 ┌───────────── phút            (0-59)
 │ ┌─────────── giờ             (0-23, giờ 24h, không có AM/PM)
 │ │ ┌───────── ngày trong tháng (1-31)
 │ │ │ ┌─────── tháng           (1-12)
 │ │ │ │ ┌───── thứ trong tuần  (0-7, 0 và 7 đều là Chủ nhật, 1 = thứ Hai)
 │ │ │ │ │
 0 2 * * *
```

Ý nghĩa các ký hiệu trong một ô:

| Ký hiệu | Đọc là           | Ví dụ                              |
| ------- | ---------------- | ---------------------------------- |
| `*`     | "mọi giá trị"    | ô giờ là `*` → giờ nào cũng khớp   |
| `5`     | đúng giá trị đó  | ô giờ là `5` → chỉ 5h              |
| `*/15`  | cứ mỗi 15 đơn vị | ô phút `*/15` → phút 0, 15, 30, 45 |
| `1,15`  | liệt kê          | ô ngày `1,15` → ngày 1 và ngày 15  |
| `9-17`  | khoảng           | ô giờ `9-17` → từ 9h đến 17h       |

Đọc thử vài mẫu hay dùng:

| Expression    | Nghĩa                              |
| ------------- | ---------------------------------- |
| `* * * * *`   | mỗi phút                           |
| `*/5 * * * *` | mỗi 5 phút                         |
| `0 * * * *`   | đầu mỗi giờ (phút 0)               |
| `0 2 * * *`   | 2h00 sáng mỗi ngày                 |
| `30 3 * * 0`  | 3h30 sáng Chủ nhật hàng tuần       |
| `0 9 * * 1-5` | 9h sáng các ngày thứ Hai → thứ Sáu |
| `0 0 1 * *`   | 0h ngày mùng 1 hàng tháng          |

Ba lưu ý dễ sai:

1. **Không có ô giây.** Cron chuẩn nhỏ nhất là phút. Riêng `@nestjs/schedule` và BullMQ dùng thư viện hỗ trợ **6 ô**, ô đầu là giây: `*/10 * * * * *` = mỗi 10 giây. Đếm số ô trước khi đọc.
2. **Luôn nói rõ timezone.** Server production gần như chắc chắn chạy UTC. `0 2 * * *` không kèm `timeZone: "Asia/Ho_Chi_Minh"` sẽ nổ lúc 9h sáng giờ Việt Nam.
3. **Không chắc thì đừng đoán** — dán expression vào [crontab.guru](https://crontab.guru) để nó dịch ra tiếng Anh cho.

Và điều quan trọng nhất về cron: **nó chỉ bấm chuông, không làm việc**. Đến giờ, cron gọi một hàm (hoặc đẩy một job vào queue). Làm gì sau đó là chuyện của code bạn viết.

### 0.5 Worker — kẻ thật sự làm việc

Worker là một tiến trình chạy mãi, bên trong đúng một vòng lặp:

```ts
// mô tả bản chất, không phải code thật — BullMQ làm hộ bạn phần này
while (true) {
  const job = await queue.takeNext(); // chờ tới khi có job (không đốt CPU)
  try {
    await handlers[job.name](job.data); // chạy hàm tương ứng với tên job
    await job.markCompleted();
  } catch (err) {
    await job.markFailedAndMaybeRetry(err);
  }
}
```

Hệ quả đầu tiên, cũng là lỗi số 1 của người mới: **không có worker chạy thì job nằm trong queue mãi mãi**. Queue không tự thực thi gì cả — nó chỉ là cái danh sách.

### 0.6 Ráp lại thành một dòng thời gian

Hai kịch bản, cùng một bộ khái niệm:

```
Kịch bản A — do sự kiện (user đăng ký)

10:00:00.000  API   nhận POST /auth/register
10:00:00.105  API   ghi user vào DB, đẩy job vào queue   ← producer
10:00:00.107  API   trả 201, user đi tiếp                 ← user hết chờ ở đây
10:00:00.140  WORK  nhặt job ra khỏi queue                ← worker
10:00:00.950  WORK  Resend trả 200, đánh dấu completed

Kịch bản B — do thời gian (dọn giỏ hàng)

02:00:00      CRON  đồng hồ điểm giờ theo "0 2 * * *"     ← scheduler
02:00:00      CRON  quét DB, đẩy 5.000 job "cleanup-cart" ← cron làm producer
02:00:01+     WORK  worker nhặt từng job, chạy song song 5 cái một
              WORK  job nào lỗi thì tự retry, không ảnh hưởng 4.999 job kia
```

Nhìn kịch bản B kỹ một chút: cron **không tự dọn 5.000 giỏ hàng**. Nó chỉ sinh job. Đây là nguyên tắc thiết kế quan trọng nhất của cron, mục 12.4 sẽ nói lại.

### 0.7 Những câu hỏi hay gặp nhất

**Job lưu ở đâu?** Trong dự án này là Redis. Redis giữ job qua restart của app; mất Redis mới mất job (mục 16 nói cách chống).

**Cron có cần queue không?** Không bắt buộc. `@Cron()` của NestJS chỉ là một `setTimeout` thông minh chạy trong chính app, không cần Redis. Nhưng nó không có retry, không có lịch sử, và chạy 3 pod thì nổ 3 lần — mục 12 so sánh đầy đủ.

**Khác gì `setTimeout` / `setInterval`?** Khác ở chỗ sống sót. `setTimeout` nằm trong RAM của một tiến trình: app restart là mất trắng, app chạy 3 bản là nổ 3 lần, lỗi thì không ai retry. Queue lưu xuống Redis nên không dính cả ba vấn đề đó.

**App tắt lúc job đang chạy dở thì sao?** Job kẹt ở trạng thái ACTIVE. Lock của nó hết hạn, và ở lần quét định kỳ kế tiếp **một worker khác** phát hiện job không còn ai giữ, đánh dấu "stalled" rồi đưa về lại hàng đợi — nghĩa là **job có thể chạy hai lần**. Đây là lý do mục 11 (idempotency) tồn tại và là mục quan trọng nhất tài liệu.

**Worker chạy ở đâu?** Có thể chung tiến trình với API (đơn giản, hợp lúc mới bắt đầu), có thể tách riêng (an toàn hơn, scale độc lập). Mục 7 so sánh.

### 0.8 Từ vựng tiếng Anh sẽ gặp lại

| Từ                      | Nghĩa trong ngữ cảnh này                                   |
| ----------------------- | ---------------------------------------------------------- |
| enqueue / dispatch      | đẩy job vào queue                                          |
| consume / process       | worker lấy job ra chạy                                     |
| payload                 | phần `data` của job                                        |
| handler / processor     | hàm xử lý một loại job                                     |
| retry / backoff         | chạy lại khi lỗi / thời gian chờ giữa các lần chạy lại     |
| DLQ (dead letter queue) | nơi chứa job đã thất bại hết số lần cho phép               |
| idempotent              | chạy nhiều lần cho cùng một kết quả, không gây hại         |
| at-least-once           | đảm bảo chạy ít nhất một lần — nghĩa là có thể hơn một lần |

---

## 1. Vấn đề gốc: tại sao sinh ra queue

Xem một request đăng ký tài khoản trong dự án này, làm kiểu đồng bộ:

```
POST /auth/register
  ├─ validate input                    ~1ms
  ├─ hash password (bcrypt)            ~100ms
  ├─ INSERT user                       ~5ms
  ├─ gọi Resend gửi email verify       ~800ms  ← mạng ngoài, không kiểm soát được
  ├─ resize avatar mặc định, upload S3 ~1200ms ← nặng CPU + mạng
  └─ trả 201                           TỔNG ~2.1s
```

Ba vấn đề:

1. **User chờ vô lý.** Họ chỉ cần biết "tài khoản đã tạo xong". Việc email tới lúc nào thì 2 giây hay 10 giây đều không đổi trải nghiệm.
2. **Lỗi bên ngoài giết cả request.** Resend down 30 giây → user không đăng ký được, dù user đã nằm trong DB. Muốn retry thì retry ngay trong request? User ngồi chờ thêm 3 lần backoff.
3. **Không chịu được tải đỉnh.** Flash sale 5000 đơn/phút, mỗi đơn gửi 1 email + 1 webhook. Node process có số connection hữu hạn; request xếp hàng, event loop nghẽn, API chết luôn cả những endpoint không liên quan.

Giải pháp: **tách phần "phải trả lời ngay" ra khỏi phần "làm xong lúc nào cũng được"**.

```
POST /auth/register
  ├─ hash password
  ├─ INSERT user
  ├─ đẩy job "send-verify-email" vào queue   ~2ms
  └─ trả 201                                  TỔNG ~110ms

(nền, tiến trình khác)
  worker nhặt job → gọi Resend → xong. Lỗi thì tự retry.
```

Đó là toàn bộ ý tưởng. Mọi khái niệm bên dưới chỉ là tên gọi cho từng mảnh của bức tranh này.

---

## 2. Từ điển khái niệm

Nắm 7 từ này là nắm 80% vấn đề.

| Khái niệm             | Là gì                                                                            | Trong dự án này                                                         |
| --------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Job**               | Một đơn vị công việc + dữ liệu của nó. Bản chất là một object JSON được lưu lại. | `{ name: "send-verify-email", data: { userId: 42, email: "a@b.com" } }` |
| **Queue**             | Hàng đợi chứa job, thường FIFO. Chỉ là chỗ _chứa_, tự nó không chạy gì cả.       | Một tập key trong Redis                                                 |
| **Producer**          | Kẻ tạo job và đẩy vào queue.                                                     | Service trong `src/routes/auth/`                                        |
| **Consumer / Worker** | Tiến trình vòng lặp: lấy job ra → chạy → báo thành công/thất bại.                | Một Node process chạy `EmailProcessor`                                  |
| **Broker**            | Hạ tầng lưu queue và điều phối job giữa producer với worker.                     | Redis (đã có sẵn ở `RedisService`)                                      |
| **Scheduler**         | Kẻ tạo job **theo thời gian** chứ không theo hành động user.                     | Cron "0 2 \* \* \*" dọn giỏ hàng bỏ quên                                |
| **Concurrency**       | Số job một worker chạy song song.                                                | `concurrency: 5` → 5 email cùng lúc                                     |

### Phân biệt 3 cặp hay nhầm

**Queue ≠ Worker.** Queue là cái danh sách, worker là cái tay nhặt. Không có worker chạy thì job nằm trong queue mãi mãi — đây là lỗi số 1 của người mới: "sao job không chạy?" → vì quên start worker.

**Job ≠ Function.** Job là _dữ liệu mô tả_ việc cần làm, được serialize thành JSON và lưu xuống Redis. Nó không phải closure. Nên **không truyền được** instance class, Prisma client, hay function vào `data` — chỉ truyền được ID rồi worker tự load lại.

**Scheduler ≠ Queue.** Scheduler chỉ trả lời câu "khi nào tạo job", queue trả lời câu "job xếp ở đâu chờ chạy". Hai thứ độc lập, thường dùng chung.

### 2.1 Broker chủ động và broker thụ động

Dòng "Broker" trong bảng trên đúng nhưng che mất một khác biệt lớn. Hai hệ thống cùng được gọi là "broker" có thể hoạt động ngược nhau, và chính khác biệt đó quyết định bạn có phải nuôi một tiến trình chạy 24/7 hay không.

**Broker chủ động** — RabbitMQ, Kafka. Là một **tiến trình riêng, có logic riêng**. Nó tự định tuyến message theo exchange/topic, tự biết consumer nào đang sống, tự quản consumer group và offset, tự phát hiện consumer chết. Bạn cài nó, chạy nó, cấu hình nó như một server độc lập. Thư viện phía ứng dụng chỉ là client mỏng nói chuyện qua giao thức của nó.

**Broker thụ động** — Redis dưới BullMQ. Redis **không biết BullMQ tồn tại**. Nó chỉ thấy các key, các list, các sorted set và các script Lua được gửi tới. Toàn bộ logic queue — thứ tự, retry, backoff, lock, phát hiện stalled, lịch repeatable — nằm trong **thư viện chạy ở phía ứng dụng của bạn**, không nằm trong Redis.

|                              | Broker chủ động (RabbitMQ/Kafka)         | Broker thụ động (Redis + BullMQ)                          |
| ---------------------------- | ---------------------------------------- | --------------------------------------------------------- |
| Logic queue nằm ở            | Trong broker                             | Trong thư viện phía client                                |
| Biết consumer nào còn sống   | Có                                       | Không — chỉ có lock hết hạn                               |
| Ai phát hiện consumer chết   | Broker                                   | **Các worker khác**, qua vòng quét định kỳ                |
| Không có worker nào sống thì | Broker vẫn nhận, vẫn giữ, vẫn định tuyến | Redis vẫn giữ job, nhưng **không ai promote job delayed** |
| Vận hành                     | Thêm một server phải trông               | Chỉ là Redis, đã có sẵn cho cache                         |

Ba hệ quả thực tế, và cả ba đều quay lại ở các mục sau:

1. **Câu "broker phát hiện job stalled" là sai với BullMQ.** Redis không phát hiện gì cả. Mỗi worker chạy một timer riêng, quét danh sách ACTIVE tìm job mất lock. Không còn worker nào sống thì không ai phát hiện, và job nằm kẹt ở ACTIVE vô thời hạn.
2. **Job delayed cũng cần worker sống mới nổ.** Nó nằm trong một sorted set theo mốc thời gian, nhưng phải có worker đọc set đó rồi chuyển sang hàng chờ. Đây là lý do BullMQ không dùng được trên nền tảng scale-to-zero — xem [queue-scheduler-gcp-vs-bullmq.md](queue-scheduler-gcp-vs-bullmq.md) §2.
3. **Dịch vụ managed của GCP không nằm trong mô hình broker.** Cloud Tasks và Cloud Scheduler không giữ hàng đợi cho bạn tới lấy — chúng **gửi một HTTP request vào API của bạn** khi tới giờ. Không có consumer, không có kết nối chờ, nên cũng không có gì để gọi là broker. Đó là lý do chúng không cần tiến trình nào luôn sống.

### Ví dụ đời thường

Quán phở:

- **Job** = tờ order "1 tái nạm, không hành"
- **Queue** = cái kẹp giấy treo trước bếp
- **Producer** = nhân viên chạy bàn ghi order
- **Worker** = đầu bếp
- **Concurrency** = số bếp đang bật, một đầu bếp nấu được 3 tô cùng lúc
- **Scheduler** = "5h sáng mỗi ngày ninh nồi nước dùng" — không ai gọi món, vẫn phải làm
- **Retry** = tô bị đổ, nấu lại
- **Dead letter queue** = tô nấu hỏng 3 lần, để riêng ra cho quản lý xem
- **Rate limit** = "hệ thống chỉ cho gửi 10 email/giây" — dù bếp rảnh cũng phải chậm lại

Điểm quan trọng: chạy bàn **không đứng chờ bếp nấu xong**. Ghi order, kẹp lên, quay đi phục vụ bàn khác. Đúng bằng việc API trả 201 rồi mới gửi email.

---

## 3. Vòng đời một job

```
    producer.add()
         │
         ▼
   ┌───────────┐  có delay/cron?   ┌───────────┐
   │  WAITING  │◄──────────────────│ DELAYED   │
   └─────┬─────┘   tới giờ         └───────────┘
         │ worker nhặt
         ▼
   ┌───────────┐
   │  ACTIVE   │  đang chạy handler
   └─────┬─────┘
         │
    ┌────┴─────┐
    │          │
 thành công   ném lỗi
    │          │
    ▼          ▼
┌─────────┐  còn lượt retry?  ─── có ──► DELAYED (chờ backoff) ──► WAITING
│COMPLETED│                   └── hết ──► ┌────────┐
└─────────┘                               │ FAILED │ → DLQ
                                          └────────┘
```

Vài trạng thái nữa hay gặp:

- **STALLED** — worker nhặt job rồi chết (OOM, deploy, mất mạng). Job kẹt ở ACTIVE và lock của nó hết hạn. Việc phát hiện do **chính các worker còn sống** làm, không phải Redis: mỗi worker chạy một vòng quét định kỳ, thấy job trong ACTIVE mà không còn lock thì đẩy ngược về WAITING (mục 2.1 giải thích vì sao Redis không tự làm được). **Đây chính là lý do job có thể chạy 2 lần** — nhớ kỹ, mục 11 sẽ nói.
- **PAUSED** — queue bị tạm dừng, job vẫn vào được nhưng worker không nhặt. Hữu ích khi deploy hoặc khi bên thứ ba đang sự cố.

---

## 4. Queue nằm ở đâu trong kiến trúc

Hiện tại dự án là một process duy nhất:

```
┌──────────────────────────────────┐
│  NestJS API (src/main.ts)        │
│   controller → service → prisma  │
│                       ↘ resend   │  ← chờ, chậm, dễ chết
│                       ↘ s3       │
└──────────────────────────────────┘
```

Sau khi có queue:

```
┌────────────────────┐   add job    ┌─────────┐   nhặt job   ┌────────────────────┐
│  API process       │ ───────────► │  Redis  │ ◄─────────── │  Worker process    │
│  (producer)        │              │ (broker)│              │  (consumer)        │
│  trả response ngay │              └─────────┘              │  → Resend / S3     │
└────────────────────┘                   ▲                   │  → Prisma          │
                                         │ add job           └────────────────────┘
                                   ┌─────┴──────┐
                                   │ Scheduler  │  cron: dọn giỏ hàng, nhắc thanh toán
                                   └────────────┘
```

Ba tiến trình, chung một Redis, chung một Postgres. Scale độc lập: API nghẽn thì thêm API pod, email tồn đọng thì thêm worker pod.

---

## 5. Chọn công nghệ nào

| Lựa chọn     | Broker     | Hợp khi                                                               | Không hợp khi                                          |
| ------------ | ---------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| **BullMQ**   | Redis      | Node/NestJS, cần retry + cron + priority, throughput vài nghìn job/s  | Cần lưu job vĩnh viễn, cần replay lịch sử              |
| **pg-boss**  | PostgreSQL | Không muốn thêm hạ tầng; cần job nằm **cùng transaction** với dữ liệu | Throughput rất cao (DB thành điểm nghẽn)               |
| **AWS SQS**  | SQS        | Hạ tầng AWS, muốn managed, cần durability cao                         | Cần cron, priority, job inspect chi tiết (SQS khá thô) |
| **Kafka**    | Kafka      | Event streaming, nhiều consumer group đọc cùng một luồng, cần replay  | Chỉ cần "chạy việc nền" — quá nặng, sai công cụ        |
| **RabbitMQ** | RabbitMQ   | Routing phức tạp (topic, fanout), đa ngôn ngữ                         | Team nhỏ, chỉ cần job queue đơn giản                   |

**Với dự án này, nếu deploy bằng container tự quản (VM, K8s, docker-compose): BullMQ.** Lý do rất thực tế — Redis đã chạy sẵn (`src/shared/services/redis.service.ts` đang dùng cho role-permission cache), team đã quen NestJS, và `@nestjs/bullmq` tích hợp DI sẵn. Không có lý do kéo thêm Kafka vào.

> **Nhưng kết luận này đổi nếu deploy lên nền tảng scale-to-zero như Cloud Run.** BullMQ là broker thụ động (mục 2.1): không có worker sống thì không ai nhặt job, không ai promote job delayed, không ai phát hiện stalled — nên phải nuôi một tiến trình chạy 24/7. Lúc đó dịch vụ managed dạng push thường hợp hơn. [queue-scheduler-gcp-vs-bullmq.md](queue-scheduler-gcp-vs-bullmq.md) so sánh đầy đủ và chốt lại theo từng nơi deploy.

Cảnh báo về BullMQ trên Redis: **job nằm trong Redis, Redis là in-memory**. Redis mất dữ liệu (không bật AOF, hoặc failover) là mất job. Với email verify thì chấp nhận được. Với "trừ tiền ví" thì không — xem mục 16 (Outbox pattern).

---

## 6. Thực hành: đặt queue vào dự án

### 6.1 Cài đặt

```bash
pnpm add bullmq @nestjs/bullmq
```

### 6.2 Đăng ký kết nối

`src/shared/modules/queue.module.ts`:

```ts
import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";

import { AppConfigService } from "../services/app-config.service";
import { SharedModule } from "./shared.module";

export const QUEUE_EMAIL = "email";

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [SharedModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: { url: config.appConfig.redisUrl },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          // Dọn job thành công để Redis không phình vô hạn.
          removeOnComplete: { age: 3600, count: 1000 },
          // Job hỏng thì giữ lâu hơn để còn điều tra.
          removeOnFail: { age: 7 * 24 * 3600 },
        },
      }),
    }),
    BullModule.registerQueue({ name: QUEUE_EMAIL }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
```

Lưu ý: **BullMQ cần một connection ioredis riêng**, không dùng chung client với cache được. Client hiện tại đặt `enableOfflineQueue: false` và `maxRetriesPerRequest: 2` — BullMQ yêu cầu `maxRetriesPerRequest: null` vì nó dùng lệnh blocking (`BRPOPLPUSH`) chờ job rất lâu. Dùng chung sẽ lỗi ngay khi khởi động.

### 6.3 Producer — đẩy job

```ts
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";

import { QUEUE_EMAIL } from "src/shared/modules/queue.module";

@Injectable()
export class AuthService {
  constructor(
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.prisma.user.create({ data: { ... } });

    await this.emailQueue.add(
      "send-verify-email",
      { userId: user.id },      // ← chỉ ID, không nhét cả object user
      { jobId: `verify-${user.id}` },  // ← chống trùng, xem mục 11
    );

    return user;   // trả về ngay, không chờ email
  }
}
```

Hai nguyên tắc cho `data`:

1. **Chỉ truyền ID, không truyền snapshot.** Job có thể chạy sau 5 phút; lúc đó email user có thể đã đổi. Worker `findUnique` lại để lấy dữ liệu mới nhất.
2. **Giữ payload nhỏ.** Nó bị JSON-serialize và nằm trong RAM của Redis. Đừng nhét base64 của ảnh vào — upload S3 trước, truyền key.

### 6.4 Worker — xử lý job

```ts
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job, UnrecoverableError } from "bullmq";

@Processor(QUEUE_EMAIL, {
  concurrency: 5,
  limiter: { max: 10, duration: 1000 },
})
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<{ userId: number }>): Promise<void> {
    switch (job.name) {
      case "send-verify-email":
        return this.sendVerifyEmail(job);
      default:
        // Tên job lạ → retry cũng vô ích.
        throw new UnrecoverableError(`Unknown job: ${job.name}`);
    }
  }

  private async sendVerifyEmail(job: Job<{ userId: number }>) {
    const user = await this.prisma.user.findUnique({
      where: { id: job.data.userId },
    });

    // User đã bị xoá, hoặc đã verify rồi → không có gì để làm, không phải lỗi.
    if (!user || user.emailVerifiedAt) return;

    await this.emailService.sendVerification(user.email, user.verifyToken);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} (${job.name}) thất bại lần ${job.attemptsMade}: ${error.message}`,
    );
  }
}
```

Đọc kỹ ba chỗ:

- **`concurrency: 5`** — worker chạy tối đa 5 job song song. Đây là song song của I/O, không phải đa luồng CPU: Node vẫn một luồng, chỉ là 5 job cùng chờ mạng.
- **`limiter`** — tối đa 10 job/giây, tính chung cho **tất cả** worker cùng queue (BullMQ lưu bộ đếm trong Redis). Đúng cái cần khi Resend giới hạn rate.
- **`UnrecoverableError`** — báo BullMQ "đừng retry", fail luôn. Retry lỗi nghiệp vụ là đốt tài nguyên vô ích, mục 10 nói kỹ.

---

## 7. Worker chạy chung hay tách process?

Ba mức, chọn theo quy mô:

**Mức 1 — chung process với API.** Import `EmailProcessor` vào `AppModule`, xong. Đơn giản nhất, hợp lúc dev và giai đoạn đầu.
Nhược điểm: job nặng CPU (resize ảnh, xuất Excel) block event loop → **API chậm theo**. Và không scale riêng được.

**Mức 2 — tách process, chung codebase.** Thêm `src/worker.ts`:

```ts
// src/worker.ts
import { NestFactory } from "@nestjs/core";

import { WorkerModule } from "./worker.module"; // chỉ import processors + shared

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks(); // bắt buộc — xem mục 15
}
void bootstrap();
```

```jsonc
// package.json
"start:worker": "node dist/worker",
"start:worker:dev": "NODE_ENV=development nest start --watch --entryFile worker"
```

Dùng `createApplicationContext` chứ không `create` — worker không cần HTTP server. Trong `docker-compose.yml` thêm một service dùng chung image, khác command. Đây là mức **nên dùng cho production** của dự án này.

**Mức 3 — worker riêng cho từng loại queue.** `worker-email`, `worker-media`. Khi email nhẹ mà xử lý ảnh nặng, tách ra để đặt `concurrency` và resource limit khác nhau, và để job ảnh chết không kéo email chết theo.

---

## 8. Concurrency — đặt bao nhiêu

Không có số thần thánh, phụ thuộc job bị nghẽn ở đâu:

| Loại job                        | Nghẽn ở  | Concurrency gợi ý        |
| ------------------------------- | -------- | ------------------------ |
| Gọi API ngoài (Resend, webhook) | Mạng     | 10–50                    |
| Query DB nặng                   | Postgres | ≤ pool size, thường 5–10 |
| Resize ảnh, sinh PDF            | CPU      | 1–2 mỗi process          |

Cái bẫy hay dính: đặt `concurrency: 50` cho job chạm DB, trong khi Prisma pool mặc định chỉ ~10 connection. Kết quả là 40 job đứng chờ connection, timeout, retry, càng tắc. **Concurrency của worker không được vượt quá tài nguyên khan hiếm nhất ở phía sau nó.**

Throughput thực tế = `số worker × concurrency`, nhưng bị chặn trên bởi `limiter` nếu có.

---

## 9. Delayed job và priority

```ts
// Chạy sau 15 phút — nhắc user chưa thanh toán
await queue.add("payment-reminder", { orderId }, { delay: 15 * 60 * 1000 });

// Job gấp chen lên trước (số nhỏ = ưu tiên cao)
await queue.add("password-reset", { userId }, { priority: 1 });
await queue.add("newsletter", { userId }, { priority: 10 });
```

`delay` là công cụ cực mạnh, nhiều người không biết nên tự viết `setTimeout` — sai, vì `setTimeout` chết theo process khi deploy, còn delayed job nằm trong Redis nên sống sót.

Lưu ý `priority` làm chậm queue một chút (BullMQ phải dùng sorted set thay vì list). Chỉ bật khi thực sự cần phân hạng.

---

## 10. Retry, backoff, Dead Letter Queue

### Retry đúng cách

```ts
{
  attempts: 5,
  backoff: { type: "exponential", delay: 1000 },
  // lần 1 chờ 1s → 2s → 4s → 8s → 16s
}
```

Vì sao phải **exponential** chứ không retry ngay: nếu Resend đang quá tải, 1000 job retry tức thì cùng lúc sẽ dập chết nó thêm lần nữa. Đây là hiệu ứng thundering herd. Backoff tăng dần cho bên kia thời gian thở.

Nâng cao hơn là thêm **jitter** (nhiễu ngẫu nhiên) để các job không retry đồng loạt cùng một mili giây:

```ts
backoff: {
  type: "custom",
},
// trong settings của worker:
settings: {
  backoffStrategy: (attemptsMade: number) => {
    const base = Math.pow(2, attemptsMade) * 1000;
    return base + Math.floor(Math.random() * 1000);
  },
},
```

### Lỗi nào đáng retry, lỗi nào không

| Loại lỗi   | Ví dụ                                   | Retry?                                       |
| ---------- | --------------------------------------- | -------------------------------------------- |
| Tạm thời   | Timeout mạng, 503, deadlock DB          | **Có**                                       |
| Rate limit | 429                                     | Có, nhưng backoff dài                        |
| Nghiệp vụ  | User không tồn tại, email sai định dạng | **Không** — `UnrecoverableError`             |
| Lập trình  | `TypeError: undefined`                  | Không — retry 5 lần vẫn hỏng, chỉ tổ rác log |

```ts
if (error.status === 400) {
  throw new UnrecoverableError(`Email không hợp lệ: ${error.message}`);
}
throw error; // lỗi khác → để BullMQ retry
```

### Dead Letter Queue

Job hết lượt retry → vào trạng thái FAILED. BullMQ không có DLQ riêng như SQS, nhưng danh sách failed **chính là** DLQ: job còn nguyên payload, stack trace, số lần thử. Việc cần làm là:

1. **Cảnh báo** khi số failed vượt ngưỡng (`@OnWorkerEvent("failed")` → Sentry/Slack).
2. **Xem được** — dựng Bull Board (mục 14).
3. **Retry tay được** sau khi đã sửa nguyên nhân: `await job.retry()`.

Queue không ai nhìn là queue vô dụng. Job hỏng im lặng còn tệ hơn lỗi 500, vì 500 thì user báo, còn job hỏng thì không ai biết cho tới lúc khách hỏi "sao tôi không nhận được email?".

---

## 11. Idempotency — phần quan trọng nhất tài liệu này

**Job sẽ chạy nhiều hơn một lần. Đây là chuyện chắc chắn xảy ra, không phải rủi ro hiếm.**

Vì sao:

- Worker chết giữa chừng sau khi đã gửi email nhưng chưa kịp báo "xong" → job stalled → worker khác chạy lại → user nhận 2 email.
- Retry vì timeout, nhưng thực ra lần đầu đã thành công, chỉ là response về chậm.
- Deploy đúng lúc job đang chạy.

Hầu hết hệ thống queue đảm bảo **at-least-once** (ít nhất một lần), không phải exactly-once. Nên thay vì cố ép hệ thống chạy đúng một lần, ta làm cho **việc chạy nhiều lần cho ra cùng kết quả**. Đó là idempotency.

### Ba cách làm

**Cách 1 — jobId cố định (chống trùng lúc đẩy).**

```ts
await queue.add("send-verify-email", { userId }, { jobId: `verify-${userId}` });
```

Cùng `jobId` đang tồn tại thì lần add sau bị bỏ qua. Chống được user bấm "gửi lại" 5 lần. **Không** chống được retry sau khi job đã completed và bị xoá khỏi Redis.

**Cách 2 — kiểm tra trạng thái trước khi làm (tốt nhất).**

```ts
const user = await this.prisma.user.findUnique({ where: { id: userId } });
if (user.emailVerifiedAt) return; // đã xong rồi, không gửi lại
```

Bản chất: để chính dữ liệu trả lời câu hỏi "việc này làm chưa". Không cần bảng phụ, không cần khoá.

**Cách 3 — bảng idempotency key (cho việc không thể đảo ngược).**

Với thao tác kiểu trừ tiền, gọi cổng thanh toán:

```ts
await this.prisma.$transaction(async (tx) => {
  try {
    await tx.processedJob.create({ data: { key: `charge-${orderId}` } });
  } catch (e) {
    if (isUniqueViolation(e)) return;   // đã xử lý, thoát
    throw e;
  }
  await tx.wallet.update({ ... });
});
```

Unique constraint của Postgres làm nhiệm vụ khoá. Đặt cùng transaction với thao tác nghiệp vụ thì mới đúng — tách ra là hở.

### Bảng tra nhanh

| Việc                              | Idempotent sẵn? | Cách xử lý              |
| --------------------------------- | --------------- | ----------------------- |
| `UPDATE user SET status='active'` | Có              | Không cần làm gì        |
| Gửi email                         | Không           | Cách 2 hoặc 3           |
| `balance = balance - 100`         | **Không**       | Bắt buộc cách 3         |
| Upload S3 với key cố định         | Có              | Ghi đè, vô hại          |
| Gọi webhook bên thứ ba            | Tuỳ họ          | Gửi kèm idempotency key |

---

## 12. Scheduler — việc chạy theo thời gian

Có hai họ công cụ, khác nhau ở chỗ nào thì đọc bảng cuối mục.

### 12.1 `@nestjs/schedule` — cron in-process

```bash
pnpm add @nestjs/schedule
```

```ts
@Injectable()
export class CartCleanupService {
  @Cron("0 2 * * *", {
    name: "cleanup-abandoned-carts",
    timeZone: "Asia/Ho_Chi_Minh",
  })
  async cleanup() {
    await this.prisma.cartItem.deleteMany({
      where: { updatedAt: { lt: subDays(new Date(), 30) } },
    });
  }
}
```

Đọc cú pháp cron (giải thích đầy đủ ký hiệu ở mục 0.4):

```
 ┌───── phút (0-59)
 │ ┌───── giờ (0-23)
 │ │ ┌───── ngày trong tháng (1-31)
 │ │ │ ┌───── tháng (1-12)
 │ │ │ │ ┌───── thứ (0-7, 0 và 7 đều là CN)
 │ │ │ │ │
 0 2 * * *     → 2h sáng mỗi ngày
*/15 * * * *   → mỗi 15 phút
 0 * * * *     → đầu mỗi giờ
 0 9 * * 1     → 9h sáng thứ Hai
```

**Cái bẫy chết người của cách này:** chạy 3 pod trên Kubernetes thì cron chạy **3 lần**. Mỗi pod có timer riêng, không ai biết ai. Với job dọn dẹp thì chỉ tốn tài nguyên; với job "gửi email khuyến mãi hàng tuần" thì khách nhận 3 email.

Cách chữa bằng Redis lock (dự án đã có `RedisService`):

```ts
@Cron("0 2 * * *")
async cleanup() {
  // NX: chỉ set nếu chưa tồn tại. EX 300: tự hết hạn sau 5 phút,
  // để pod chết giữa chừng không khoá vĩnh viễn.
  const acquired = await this.redis.client.set(
    "lock:cleanup-carts", process.env.HOSTNAME ?? "unknown", "EX", 300, "NX",
  );
  if (acquired !== "OK") return;   // pod khác đang làm

  try {
    await this.doCleanup();
  } finally {
    await this.redis.client.del("lock:cleanup-carts");
  }
}
```

TTL phải **dài hơn thời gian chạy thật** của job, nếu không lock nhả sớm và pod khác chen vào. Ngược lại đừng đặt quá dài, vì pod chết thì job bị bỏ lỡ tới tận khi hết hạn.

### 12.2 Repeatable job của BullMQ — cron có queue đỡ

```ts
await this.queue.upsertJobScheduler(
  "daily-cart-cleanup",
  { pattern: "0 2 * * *", tz: "Asia/Ho_Chi_Minh" },
  { name: "cleanup-carts", data: {} },
);
```

BullMQ giữ lịch trong Redis, đến giờ tự sinh một job bình thường vào queue. Ưu điểm lớn: **đã có sẵn khử trùng lặp** (lịch nằm ở Redis dùng chung, không phải ở timer từng pod), và job được hưởng trọn retry, backoff, log, dashboard như mọi job khác.

Gọi `upsertJobScheduler` ở `onModuleInit` — nó idempotent, boot lại bao nhiêu lần cũng chỉ một lịch.

### 12.3 Chọn cái nào

|                        | `@nestjs/schedule`   | BullMQ repeatable  | Cron hệ điều hành / K8s CronJob |
| ---------------------- | -------------------- | ------------------ | ------------------------------- |
| Multi-instance an toàn | Không (phải tự lock) | **Có**             | Có                              |
| Có retry               | Không                | **Có**             | Không                           |
| Thấy được lịch sử chạy | Không                | **Có** (dashboard) | Qua log                         |
| App chết thì           | Mất lịch             | Redis vẫn giữ      | Vẫn chạy                        |
| Độ phức tạp            | Thấp nhất            | Trung bình         | Cần hạ tầng                     |

Khuyến nghị cho dự án: **BullMQ repeatable job** cho mọi việc định kỳ có tính nghiệp vụ. Giữ `@nestjs/schedule` cho những thứ vô hại, thuần local như in metric.

### 12.4 Nguyên tắc thiết kế cron

- **Cron chỉ nên là kẻ phát job, không phải kẻ làm việc.** Sai: cron quét 100.000 giỏ hàng và xử lý hết trong một lần chạy — chạy 40 phút, chết giữa chừng là mất sạch tiến độ. Đúng: cron quét ID rồi đẩy 100.000 job nhỏ vào queue, mỗi job xử lý một giỏ, chết cái nào retry cái đó.
- **Luôn đặt timezone.** Server chạy UTC, "2h sáng" của bạn là 9h sáng của khách.
- **Cron phải idempotent.** Chạy 2 lần trong một ngày (do lock hỏng, do restart) không được làm sai dữ liệu.
- **Chừa chỗ chạy tay.** Luôn để một cách gọi lại job đó theo yêu cầu, vì sẽ có ngày cron trượt và cần chạy bù.

---

## 13. Job workflow — job sinh job

Việc thật thường nhiều bước. Ví dụ seller upload ảnh sản phẩm:

```
upload gốc lên S3
    ├─ tạo thumbnail 200px   ┐
    ├─ tạo bản 800px         ├─ chạy song song
    └─ quét nội dung nhạy cảm┘
              ↓
       cập nhật Product.images  ← chỉ chạy khi cả 3 xong
```

BullMQ có **Flow** cho đúng bài này:

```ts
await this.flowProducer.add({
  name: "finalize-product-images",
  queueName: QUEUE_MEDIA,
  data: { productId },
  children: [
    { name: "resize", queueName: QUEUE_MEDIA, data: { key, width: 200 } },
    { name: "resize", queueName: QUEUE_MEDIA, data: { key, width: 800 } },
    { name: "moderate", queueName: QUEUE_MEDIA, data: { key } },
  ],
});
```

Parent chỉ vào WAITING khi toàn bộ children COMPLETED, và đọc được kết quả con qua `job.getChildrenValues()`.

Khi luồng phức tạp hơn nữa (có rẽ nhánh theo điều kiện, có bước chờ người duyệt, chạy hàng giờ), lúc đó mới nên nghĩ tới workflow engine thật như Temporal. Đừng tự viết state machine bằng job — cực nhanh thành mớ bòng bong.

---

## 14. Quan sát và vận hành

### Dashboard

```bash
pnpm add @bull-board/nestjs @bull-board/express @bull-board/api
```

Cho phép xem job đang chờ/đang chạy/thất bại, đọc payload, đọc stack trace, retry tay. **Bắt buộc chặn bằng auth** — payload job thường chứa email, ID user, đôi khi cả token.

### Chỉ số cần theo dõi

| Chỉ số                 | Ngưỡng báo động       | Ý nghĩa khi vượt                    |
| ---------------------- | --------------------- | ----------------------------------- |
| Độ sâu queue (waiting) | Tăng liên tục 10 phút | Worker không kịp, thiếu công suất   |
| Tuổi job cũ nhất       | > 5 phút              | Job kẹt, hoặc worker chết           |
| Tỷ lệ failed           | > 1%                  | Bên thứ ba có vấn đề, hoặc bug      |
| Thời gian xử lý (p95)  | Tăng gấp đôi          | Chậm dần, sắp tắc                   |
| Số job stalled         | > 0                   | Worker bị OOM kill hoặc job quá lâu |

**Độ sâu queue là chỉ số quan trọng nhất.** Queue phải rỗng phần lớn thời gian. Queue luôn có 5000 job chờ không phải "đang bận" — đó là hệ thống đang thiếu công suất, và độ trễ chỉ có tăng.

### Log

Luôn log kèm `jobId`, `job.name`, `attemptsMade`, và ID nghiệp vụ. Dự án dùng `nestjs-pino`, nên log structured:

```ts
this.logger.log(
  { jobId: job.id, jobName: job.name, userId: job.data.userId },
  "email sent",
);
```

---

## 15. Graceful shutdown

Khi deploy, Kubernetes gửi `SIGTERM`. Nếu worker chết ngay lập tức, job đang chạy dở bị bỏ giữa chừng — email gửi rồi mà chưa kịp đánh dấu, tiền trừ rồi mà chưa ghi sổ.

```ts
const app = await NestFactory.createApplicationContext(WorkerModule);
app.enableShutdownHooks();
```

`@nestjs/bullmq` sẽ gọi `worker.close()`: ngừng nhặt job mới, **chờ** job đang chạy xong, rồi mới thoát.

Ba điều kèm theo:

1. `terminationGracePeriodSeconds` trong K8s phải **lớn hơn** thời gian job dài nhất, nếu không K8s `SIGKILL` và mọi nỗ lực thành vô nghĩa.
2. Giữ job **ngắn**. Job chạy 30 phút làm mọi lần deploy thành cơn đau. Chia nhỏ.
3. Dù có graceful shutdown, vẫn phải idempotent — `SIGKILL` và OOM không báo trước.

---

## 16. Nâng cao: khi job tuyệt đối không được mất

Có một khe hở trong code ở mục 6.3:

```ts
const user = await this.prisma.user.create({ ... });   // ✅ commit vào Postgres
// ← process chết ngay đây
await this.emailQueue.add("send-verify-email", { ... });  // ❌ không bao giờ chạy
```

User tồn tại nhưng email không bao giờ được gửi. Đây là bài toán kinh điển **dual write** — ghi vào hai hệ thống (Postgres + Redis) mà không có transaction chung.

Ngược lại cũng hỏng: add job trước, rồi transaction rollback → worker nhặt job, `findUnique` không thấy user → gửi email cho user không tồn tại. (Vì thế mục 6.4 kiểm tra `if (!user) return`.)

### Outbox pattern

Ghi job vào **cùng transaction** với dữ liệu nghiệp vụ, rồi mới chuyển sang queue:

```prisma
model OutboxJob {
  id          String    @id @default(uuid())
  queueName   String
  jobName     String
  payload     Json
  publishedAt DateTime?
  createdAt   DateTime  @default(now())

  @@index([publishedAt, createdAt])
}
```

```ts
await this.prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { ... } });
  await tx.outboxJob.create({
    data: { queueName: "email", jobName: "send-verify-email", payload: { userId: user.id } },
  });
});
// Transaction commit → user và ý định gửi email cùng sống hoặc cùng chết.
```

Rồi một relay (cron 5 giây) đọc các bản ghi `publishedAt: null`, đẩy vào BullMQ, đánh dấu đã publish. Relay có thể publish trùng khi nó chết giữa chừng — chấp nhận được, vì worker đã idempotent.

**Khi nào cần:** thanh toán, trừ kho, ghi sổ kế toán, bất cứ thứ gì mất đi thì mất tiền. **Khi nào không:** email marketing, cập nhật cache, log analytics — không đáng đổi lấy độ phức tạp này.

### Thứ tự (ordering)

Queue **không đảm bảo thứ tự** khi `concurrency > 1`. Ba job "cập nhật tồn kho" của cùng một sản phẩm có thể chạy đảo lộn.

Cách chữa:

- Thiết kế thao tác **giao hoán** — `stock = stock - 1` thay vì `stock = 9`. Thứ tự nào cũng ra cùng kết quả.
- Dùng **optimistic locking** — mang theo `version`, `UPDATE ... WHERE version = ?`, không khớp thì ném lỗi cho retry.
- Cần thứ tự nghiêm ngặt trong một nhóm thì dùng **BullMQ Group** (bản Pro) hoặc Kafka partition theo key. Nhưng ordering đổi lấy throughput — cân nhắc thật sự có cần không.

---

## 17. Anti-pattern — những lỗi hay gặp

| Lỗi                                  | Vì sao sai                                  | Làm đúng                               |
| ------------------------------------ | ------------------------------------------- | -------------------------------------- |
| Nhét cả object vào job data          | Dữ liệu cũ khi job chạy; Redis phình        | Truyền ID, worker load lại             |
| Job chạy 30 phút                     | Deploy nào cũng đau, stalled, retry tốn kém | Chia thành nhiều job nhỏ               |
| Không có retry                       | Một lỗi mạng thoáng qua là mất việc         | `attempts` + exponential backoff       |
| Retry mọi lỗi                        | Lỗi nghiệp vụ retry 5 lần vẫn hỏng          | `UnrecoverableError` cho lỗi vĩnh viễn |
| Không idempotent                     | Email gửi 2 lần, tiền trừ 2 lần             | Mục 11                                 |
| Không ai xem queue failed            | Job hỏng âm thầm nhiều tháng                | Dashboard + alert                      |
| `concurrency: 100` chạm DB           | Cạn connection pool, tắc dây chuyền         | Concurrency ≤ tài nguyên phía sau      |
| `@Cron` trên nhiều pod               | Chạy trùng N lần                            | Redis lock hoặc repeatable job         |
| Dùng queue cho việc cần trả lời ngay | User không thấy kết quả đâu cả              | Việc cần đồng bộ thì giữ đồng bộ       |
| Không `removeOnComplete`             | Redis đầy dần rồi OOM                       | Đặt `age`/`count`                      |
| Không graceful shutdown              | Mỗi lần deploy hỏng một ít dữ liệu          | `enableShutdownHooks()`                |

Thêm một nguyên tắc gốc: **đừng đẩy vào queue thứ mà người dùng đang đứng chờ kết quả**. Queue tốt cho "gửi đi rồi quên"; nếu UI phải hiển thị kết quả ngay, hoặc xử lý đồng bộ, hoặc phải làm thêm cả cơ chế polling/websocket để báo về — và lúc đó cân nhắc xem có đáng không.

---

## 18. Áp dụng vào dự án này

Những chỗ nên chuyển sang queue, xếp theo thứ tự đáng làm:

| Việc                                                        | Hiện tại                                   | Sau khi có queue                                   |
| ----------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------- |
| Email verify / reset password (`EmailService` + Resend)     | Chặn request ~800ms, Resend lỗi là API lỗi | Job, retry 3 lần, `jobId` theo userId              |
| Xử lý ảnh sản phẩm (`S3Service`)                            | Chặn request, nặng CPU                     | Flow: upload → resize song song → cập nhật Product |
| Email xác nhận đơn (F012 OrderPlacement)                    | Nằm trong transaction đặt hàng             | Outbox → queue, vì đơn hàng liên quan tiền         |
| Dọn giỏ hàng bỏ quên (F011)                                 | Chưa có                                    | Repeatable job 2h sáng, cron phát job nhỏ          |
| Làm ấm cache role-permission (`RolePermissionCacheService`) | Lazy, request đầu chịu chậm                | Repeatable job, hoặc job khi role đổi              |

Lộ trình gợi ý:

1. Thêm `QueueModule` với connection riêng (nhớ `maxRetriesPerRequest: null`).
2. Chuyển email verify sang queue trước — rủi ro thấp nhất, dễ thấy lợi nhất.
3. Dựng Bull Board sau auth guard, thêm alert khi failed tăng.
4. Tách `src/worker.ts` và thêm service worker vào `docker-compose.yml`.
5. Chuyển xử lý ảnh sang Flow.
6. Khi nào chạm tới thanh toán, lúc đó mới dựng Outbox.

Đừng làm cả 6 bước một lúc. Mỗi bước là một PR, có test, có quan sát vài ngày trước khi sang bước sau.

---

## Tóm tắt một màn hình

- **Job** là dữ liệu JSON mô tả việc cần làm; **queue** là chỗ chứa; **worker** là tiến trình nhặt và chạy; **scheduler** là kẻ tạo job theo giờ. Không có worker thì job nằm im.
- Đẩy vào queue những việc **chậm, dễ lỗi, không cần trả lời ngay**.
- **Job sẽ chạy nhiều hơn một lần** — idempotency không phải tuỳ chọn.
- Retry phải có **backoff**, và phải phân biệt lỗi tạm thời với lỗi nghiệp vụ.
- Cron trên nhiều instance sẽ chạy trùng — dùng repeatable job hoặc Redis lock.
- Queue không ai quan sát là queue vô dụng: dashboard + alert từ ngày đầu.
- Dữ liệu liên quan tiền thì cần **Outbox**, không thể tin dual write.

---

## Đọc thêm

- [BullMQ docs](https://docs.bullmq.io/) — patterns và flows đáng đọc kỹ
- [@nestjs/bullmq](https://docs.nestjs.com/techniques/queues)
- [@nestjs/schedule](https://docs.nestjs.com/techniques/task-scheduling)
- [Transactional Outbox — microservices.io](https://microservices.io/patterns/data/transactional-outbox.html)

### Đi tiếp trong bộ tài liệu này

Tài liệu bạn đang đọc là lớp _khái niệm_. Ba tài liệu sau đi sâu hơn, đọc khi cần:

| Tài liệu                                                                   | Trả lời câu hỏi                                                                                                                        |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [queue-scheduler-gcp-vs-bullmq.md](queue-scheduler-gcp-vs-bullmq.md)       | **Chọn hạ tầng nào** — BullMQ tự quản, dịch vụ managed của GCP, hay thư viện có sẵn của NestJS. Quyết định theo nơi deploy.            |
| [bullmq-nestjs-schedule-deep-dive.md](bullmq-nestjs-schedule-deep-dive.md) | **BullMQ và `@nestjs/schedule` chạy ra sao bên trong** — key Redis, lock, stalled, vòng đời timer, và cách chạy BullMQ trên Cloud Run. |
| [gcp-queue-scheduler-deep-dive.md](gcp-queue-scheduler-deep-dive.md)       | **Phía GCP chạy ra sao** — Cloud Scheduler, Cloud Tasks, Pub/Sub, Cloud Run Jobs: hạn mức, công thức retry, dead-letter, OIDC.         |

### Tài liệu khác trong repo

- [redis-caching-guide.md](redis-caching-guide.md) · [race-conditions-analysis.md](race-conditions-analysis.md) · [error-handling.md](error-handling.md)
