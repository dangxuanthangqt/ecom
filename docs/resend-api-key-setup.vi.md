# Lấy Resend API key

Tài liệu này chỉ làm một việc: đưa bạn từ chỗ chưa có gì tới chỗ có một
`RESEND_API_KEY` chạy được trong `.env`. Phần cuối nói rõ key đó thực sự
được dùng ở đâu trong repo này — hiện tại ít hơn bạn tưởng.

---

## Các bước

### 1. Tạo tài khoản

Vào <https://resend.com/signup>, đăng ký bằng email hoặc GitHub. Gói free
cho 3.000 email/tháng, 100 email/ngày — thừa cho dev.

### 2. Xác minh email đăng ký

Resend gửi một mail xác nhận. Bấm link trong đó. Chưa xác minh thì trang
API Keys không cho tạo key.

**Nhớ địa chỉ email này** — ở chế độ chưa verify domain, bạn chỉ gửi được
mail tới đúng địa chỉ đó (xem bước 6).

### 3. Tạo API key

Trong dashboard: **API Keys** ở sidebar trái → **Create API Key**.

| Ô          | Điền gì                                                                   |
| ---------- | ------------------------------------------------------------------------- |
| Name       | Đặt theo môi trường, ví dụ `ecom-local`, `ecom-staging`. Mỗi env một key. |
| Permission | `Sending access` — dự án này chỉ gửi mail, không đọc/sửa gì.              |
| Domain     | `All domains` nếu chưa verify domain nào.                                 |

Đừng chọn `Full access` cho key dev: nó cho phép xoá domain và tạo key khác.

### 4. Copy key ngay

Key có dạng `re_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxx` và **chỉ hiện đúng một
lần**. Đóng dialog là mất, phải tạo key mới. Copy trước khi làm gì khác.

### 5. Dán vào `.env`

```bash
cp .env.example .env   # nếu chưa có
```

```dotenv
RESEND_API_KEY="re_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxx"
SANDBOX_EMAIL="email-ban-dung-de-dang-ky-resend@gmail.com"
```

`.env` nằm trong `.gitignore`. Đừng commit key, và đừng dán nó vào
`.env.example`.

### 6. Hiểu giới hạn của sender mặc định

[`email.service.ts`](../src/shared/services/email.service.ts) gửi từ
`onboarding@resend.dev` — địa chỉ test dùng chung của Resend. Kèm theo nó là
một luật cứng: **chỉ gửi được tới chính email bạn đã đăng ký tài khoản**.
Gửi tới địa chỉ khác, Resend trả lỗi 403 `You can only send testing emails to
your own email address`.

Đó là lý do có `SANDBOX_EMAIL`: chỗ gọi gửi mail trong
[`auth.service.ts`](../src/routes/auth/auth.service.ts) lấy
`sandboxEmail || data.email`, nên mọi OTP lúc dev đều rơi vào hòm thư của bạn
bất kể user nhập email nào.

### 7. (Khi cần gửi tới người dùng thật) Verify domain

Chỉ làm bước này khi lên staging/production:

1. **Domains** → **Add Domain** → nhập domain bạn sở hữu.
2. Resend in ra một bộ DNS record (MX + TXT cho SPF, TXT cho DKIM, tuỳ chọn
   DMARC). Thêm hết vào nhà cung cấp DNS của domain.
3. Bấm **Verify**. DNS lan thường mất vài phút tới vài giờ.
4. Sửa `from` trong `email.service.ts` thành địa chỉ thuộc domain đó, ví dụ
   `no-reply@your-domain.com`.
5. Bỏ `SANDBOX_EMAIL` khỏi `.env` của môi trường đó để mail đi đúng người nhận.

---

## Key này đang được dùng ở đâu trong repo

Ba chỗ, và chỉ một chỗ thật sự gọi mạng:

| Nơi                                                           | Chuyện gì xảy ra                                                                             |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [`env.validation.ts`](../src/validations/env.validation.ts)   | `@IsString()` — thiếu hẳn biến thì app không boot.                                           |
| [`email.service.ts`](../src/shared/services/email.service.ts) | Constructor gọi `new Resend(key)`. Key rỗng → ném `Missing API key` ngay lúc boot.           |
| [`auth.service.ts`](../src/routes/auth/auth.service.ts)       | Lời gọi `sendEmail` trong `sendOTP` **đang bị comment**. Không có mail nào thực sự được gửi. |

Nghĩa là hiện tại key chỉ cần **tồn tại và khác rỗng** để app khởi động được.
Muốn OTP thật sự bay đi thì phải bỏ comment khối gửi mail trong `sendOTP` —
lúc đó key mới phải là key thật.

Cho e2e, [`.env.test.example`](../.env.test.example) đã đặt sẵn
`RESEND_API_KEY="re_e2e_dummy_key"` vì lý do trên: đủ để qua constructor, không
cần key thật, không có request nào ra ngoài.

---

## Lỗi hay gặp

| Triệu chứng                                                        | Nguyên nhân                                                                                    |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Boot chết với `Missing API key. Pass it to the constructor`        | `RESEND_API_KEY` để trống. Điền bất kỳ chuỗi khác rỗng nào.                                    |
| Boot chết ở env validation, than `RESEND_API_KEY must be a string` | Thiếu hẳn dòng đó trong `.env`.                                                                |
| 403 `You can only send testing emails to your own email address`   | Đang dùng `onboarding@resend.dev` gửi tới địa chỉ lạ. Đặt `SANDBOX_EMAIL`, hoặc verify domain. |
| 401 `API key is invalid`                                           | Key bị copy thiếu, hoặc đã bị revoke ở dashboard.                                              |
| Không lỗi gì nhưng chẳng có mail nào                               | Khối `sendEmail` trong `sendOTP` vẫn đang bị comment.                                          |

---

## Xoay key

Key lộ ra ngoài thì: tạo key mới (bước 3–5) → cập nhật `.env` và secret của
môi trường tương ứng → **API Keys** → xoá key cũ. Resend không cho xem lại key
cũ nên không có cách nào khác ngoài thay mới.
