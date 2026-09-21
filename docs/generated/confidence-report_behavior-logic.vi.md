---
source_artifact: docs/generated/behavior-logic.md
claims_total: 2
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Báo cáo độ tin cậy -- docs/generated/behavior-logic.md

> **Thống kê độ phủ trích dẫn tự báo cáo -- KHÔNG phải kiểm chứng độ chính xác.** Báo cáo này được suy ra một cách tất định bằng cách phân tích các trích dẫn nội tuyến `**Source:** file:line` và các thẻ đánh dấu `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` của chính artifact. Nó KHÔNG xác minh rằng trích dẫn chính xác hay khẳng định đúng. Để kiểm chứng độc lập, xem `claude/skills/audit-doc-parity/`.

## Khẳng định ↔ Bằng chứng

Chú giải: `○` = có trích dẫn (có Source file:line) · `△` = gắn thẻ đánh dấu (chưa chắc chắn, không có trích dẫn).

| Khẳng định | Mục | Bằng chứng (file:line) | Trạng thái ○/△ |
|---|---|---|---|
| : không tìm thấy bước CI/CD hay npm postinstall hook nào gắn script này vào deploy; nó được gọi thủ côn… | BL001_SyncRoutePermissionsScript | — | △ |
| Wrapper mỏng quanh Resend SDK (`resend.emails.send`, `:16-21`), hardcode `from: "onboarding@r… | BL005_SendVerificationCodeEmail | — | △ |

## Thông tin còn thiếu

Các mục ứng viên cần kiểm tra khẳng định gắn thẻ `△` -- chỉ mang tính tham khảo, không phải căn cứ chính thức:

- BL001_SyncRoutePermissionsScript: : không tìm thấy bước CI/CD hay npm postinstall hook nào gắn script này vào deploy; nó được gọi thủ côn…
- BL005_SendVerificationCodeEmail: Wrapper mỏng quanh Resend SDK (`resend.emails.send`, `:16-21`), hardcode `from: "onboarding@r…

## Cờ rủi ro

- Độ phủ trích dẫn thấp (0%) -- phần lớn khẳng định được gắn thẻ đánh dấu, không có trích dẫn.
</content>
