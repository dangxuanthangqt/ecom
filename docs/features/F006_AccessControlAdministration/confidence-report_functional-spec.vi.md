---
source_artifact: docs/features/F006_AccessControlAdministration/functional-spec.md
claims_total: 4
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Báo cáo độ tin cậy -- docs/features/F006_AccessControlAdministration/functional-spec.md

> **Thống kê độ phủ trích dẫn tự báo cáo -- KHÔNG phải kiểm chứng độ chính xác.** Báo cáo này được suy ra một cách tất định bằng cách phân tích các trích dẫn nội tuyến `**Source:** file:line` và các thẻ đánh dấu `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` của chính artifact. Nó KHÔNG xác minh rằng trích dẫn chính xác hay khẳng định đúng. Để kiểm chứng độc lập, xem `claude/skills/audit-doc-parity/`.

## Khẳng định ↔ Bằng chứng

Chú giải: `○` = có trích dẫn (có Source file:line) · `△` = gắn thẻ đánh dấu (chưa chắc chắn, không có trích dẫn).

| Khẳng định | Mục | Bằng chứng (file:line) | Trạng thái ○/△ |
|---|---|---|---|
| [ ] `` Một dòng được tạo thủ công có thể bị xóa vào lần script đồng bộ CAP-03 chạy tiếp theo, nếu (path, m… | 7. User Stories | — | △ |
| RISK-01 \| known-issue \| Chỉnh sửa `path` của một dòng permission không tính lại nhãn `module` của nó — t… | 11. Risks & Known Issues | — | △ |
| RISK-02 \| known-issue \| Enum database của field `method` trên permission có 7 giá trị (thêm OPTIONS an… | 11. Risks & Known Issues | — | △ |
| RISK-03 \| risk \| Không tìm thấy trigger tự động nào (deploy hook, bước CI/CD, app startup) cho perm… | 11. Risks & Known Issues | — | △ |

## Thông tin còn thiếu

Các mục ứng viên cần kiểm tra khẳng định gắn thẻ `△` -- chỉ mang tính tham khảo, không phải căn cứ chính thức:

- 7. User Stories: [ ] `` Một dòng được tạo thủ công có thể bị xóa vào lần script đồng bộ CAP-03 chạy tiếp theo, nếu (path, m…
- 11. Risks & Known Issues: RISK-01 \| known-issue \| Chỉnh sửa `path` của một dòng permission không tính lại nhãn `module` của nó — t…
- 11. Risks & Known Issues: RISK-02 \| known-issue \| Enum database của field `method` trên permission có 7 giá trị (thêm OPTIONS an…
- 11. Risks & Known Issues: RISK-03 \| risk \| Không tìm thấy trigger tự động nào (deploy hook, bước CI/CD, app startup) cho perm…

## Cờ rủi ro

- Độ phủ trích dẫn thấp (0%) -- phần lớn khẳng định được gắn thẻ đánh dấu, không có trích dẫn.
</content>
