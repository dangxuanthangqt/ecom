---
source_artifact: docs/system/overview.md
claims_total: 4
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Báo cáo độ tin cậy -- docs/system/overview.md

> **Thống kê phạm vi trích dẫn tự báo cáo -- KHÔNG phải xác minh độ chính xác.** Báo cáo này được sinh ra một cách xác định bằng cách phân tích trích dẫn `**Source:** file:line` nội tuyến và thẻ `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` của chính artifact. Nó KHÔNG xác minh rằng trích dẫn chính xác hay yêu cầu là đúng. Để xác minh sự thật mù, xem `claude/skills/audit-doc-parity/`.

## Yêu cầu ↔ Bằng chứng

Chú thích: `○` = có trích dẫn (có `Source: file:line`) · `△` = gắn nhãn đánh dấu (không chắc, không có trích dẫn).

| Yêu cầu | Phần | Bằng chứng (file:line) | Trạng thái ○/△ |
|---|---|---|---|
| Lý do**: — không có ADR hay comment nào nói rõ kế hoạch migration; comment ở `base.module.ts:70`… | Quyết định thiết kế chính | — | △ |
| **Mã hoá dữ liệu**: Mật khẩu hashed bằng bcrypt, 10 vòng muối (`hashing.service.ts:4-12`). JWT… | Tổng quan bảo mật | — | △ |
| **Chiến lược mở rộng**: — không tìm thấy cấu hình tự động mở rộng, manifest k8s, hoặc cơ sở hạ tầng queue/worker… | Khả năng mở rộng | — | △ |
| **Mục tiêu hiệu suất**: — không tìm thấy SLA, mục tiêu độ trễ, hoặc artifact load-test trong kho. | Khả năng mở rộng | — | △ |

## Thông tin bị thiếu

Phần ứng viên để kiểm tra cho `△` (thẻ đánh dấu) yêu cầu -- nỗ lực tốt nhất, không có tính chính thống:

- Quyết định thiết kế chính: Lý do**: — không có ADR hay comment nào nói rõ kế hoạch migration; comment ở `base.module.ts:70`…
- Tổng quan bảo mật: **Mã hoá dữ liệu**: Mật khẩu hashed bằng bcrypt, 10 vòng muối (`hashing.service.ts:4-12`). JWT…
- Khả năng mở rộng: **Chiến lược mở rộng**: — không tìm thấy cấu hình tự động mở rộng, manifest k8s, hoặc cơ sở hạ tầng queue/worker…
- Khả năng mở rộng: **Mục tiêu hiệu suất**: — không tìm thấy SLA, mục tiêu độ trễ, hoặc artifact load-test trong kho.

## Cờ rủi ro

- Phạm vi trích dẫn thấp (0%) -- hầu hết yêu cầu được thẻ đánh dấu, không phải trích dẫn.
