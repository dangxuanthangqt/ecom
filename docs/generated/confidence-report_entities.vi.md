---
source_artifact: docs/generated/entities.md
claims_total: 3
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Báo cáo độ tin cậy -- docs/generated/entities.md

> **Thống kê độ phủ trích dẫn tự báo cáo -- KHÔNG phải kiểm chứng độ chính xác.** Báo cáo này được suy ra một cách tất định bằng cách phân tích các trích dẫn nội tuyến `**Source:** file:line` và các thẻ đánh dấu `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` của chính artifact. Nó KHÔNG xác minh rằng trích dẫn chính xác hay khẳng định đúng. Để kiểm chứng độc lập, xem `claude/skills/audit-doc-parity/`.

## Khẳng định ↔ Bằng chứng

Chú giải: `○` = có trích dẫn (có Source file:line) · `△` = gắn thẻ đánh dấu (chưa chắc chắn, không có trích dẫn).

| Khẳng định | Mục | Bằng chứng (file:line) | Trạng thái ○/△ |
|---|---|---|---|
| Schema chính thức**: `prisma/schema.prisma` (563 dòng, 21 model, 4 enum). Đã kiểm chứng, không phải ``: `… | Schema Source | — | △ |
| Quan hệ**: Không có quan hệ nào được model trong schema (không có FK tới Order/User — việc đối soát, nếu có, diễn ra bằng m… | Entities | — | △ |
| `` PaymentTransaction không có FK tới Order/User và không có repository file — logic đối soát (nếu có… | Unresolved | — | △ |

## Thông tin còn thiếu

Các mục ứng viên cần kiểm tra khẳng định gắn thẻ `△` -- chỉ mang tính tham khảo, không phải căn cứ chính thức:

- Schema Source: Schema chính thức**: `prisma/schema.prisma` (563 dòng, 21 model, 4 enum). Đã kiểm chứng, không phải ``: `…
- Entities: Quan hệ**: Không có quan hệ nào được model trong schema (không có FK tới Order/User — việc đối soát, nếu có, diễn ra bằng m…
- Unresolved: `` PaymentTransaction không có FK tới Order/User và không có repository file — logic đối soát (nếu có…

## Cờ rủi ro

- Độ phủ trích dẫn thấp (0%) -- phần lớn khẳng định được gắn thẻ đánh dấu, không có trích dẫn.
</content>
