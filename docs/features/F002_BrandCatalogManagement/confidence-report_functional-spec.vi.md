---
source_artifact: docs/features/F002_BrandCatalogManagement/functional-spec.md
claims_total: 8
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Báo cáo độ tin cậy -- docs/features/F002_BrandCatalogManagement/functional-spec.md

> **Thống kê độ phủ trích dẫn tự báo cáo -- KHÔNG phải kiểm chứng độ chính xác.** Báo cáo này được suy ra một cách tất định bằng cách phân tích các trích dẫn nội tuyến `**Source:** file:line` và các thẻ đánh dấu `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` của chính artifact. Nó KHÔNG xác minh rằng trích dẫn chính xác hay khẳng định đúng. Để kiểm chứng độc lập, xem `claude/skills/audit-doc-parity/`.

## Khẳng định ↔ Bằng chứng

Chú giải: `○` = có trích dẫn (có Source file:line) · `△` = gắn thẻ đánh dấu (chưa chắc chắn, không có trích dẫn).

| Khẳng định | Mục | Bằng chứng (file:line) | Trạng thái ○/△ |
|---|---|---|---|
| **FR-602** `` Việc xem chi tiết một brand được tài liệu ghi là public nhưng lại được enforce là yêu cầu `Bearer`-r… | 4. Requirements | — | △ |
| `` Vì các quyền cấp theo module gán cho role chỉ được lọc theo module, không theo HTTP method, nên một `cli… | 5. Business Rules | — | △ |
| [ ] `` Lệnh gọi này yêu cầu một `Bearer` session hợp lệ tại runtime dù được tài liệu ghi là public —… | 7. User Stories | — | △ |
| [ ] `` Một người gọi role `client` hiện cũng có thể thực hiện hành động này — xem Open Decision D002. | 7. User Stories | — | △ |
| [ ] `` Một người gọi role `client` hiện cũng có thể thực hiện hành động này — xem Open Decision D002. | 7. User Stories | — | △ |
| [ ] `` Một người gọi role `client` hiện cũng có thể thực hiện hành động này — xem Open Decision D002. | 7. User Stories | — | △ |
| RISK-01 \| known-issue \| Việc tra cứu chi tiết brand (ROUTE012) được tài liệu ghi là public nhưng thực tế lại yêu cầ… | 11. Risks & Known Issues | — | △ |
| RISK-02 \| known-issue \| Các quyền cấp theo module gán cho role chỉ được lọc theo tên module, chưa bao giờ theo HT… | 11. Risks & Known Issues | — | △ |

## Thông tin còn thiếu

Các mục ứng viên cần kiểm tra khẳng định gắn thẻ `△` -- chỉ mang tính tham khảo, không phải căn cứ chính thức:

- 4. Requirements: **FR-602** `` Việc xem chi tiết một brand được tài liệu ghi là public nhưng lại được enforce là yêu cầu `Bearer`-r…
- 5. Business Rules: `` Vì các quyền cấp theo module gán cho role chỉ được lọc theo module, không theo HTTP method, nên một `cli…
- 7. User Stories: [ ] `` Lệnh gọi này yêu cầu một `Bearer` session hợp lệ tại runtime dù được tài liệu ghi là public —…
- 7. User Stories: [ ] `` Một người gọi role `client` hiện cũng có thể thực hiện hành động này — xem Open Decision D002.
- 7. User Stories: [ ] `` Một người gọi role `client` hiện cũng có thể thực hiện hành động này — xem Open Decision D002.
- 7. User Stories: [ ] `` Một người gọi role `client` hiện cũng có thể thực hiện hành động này — xem Open Decision D002.
- 11. Risks & Known Issues: RISK-01 \| known-issue \| Việc tra cứu chi tiết brand (ROUTE012) được tài liệu ghi là public nhưng thực tế lại yêu cầ…
- 11. Risks & Known Issues: RISK-02 \| known-issue \| Các quyền cấp theo module gán cho role chỉ được lọc theo tên module, chưa bao giờ theo HT…

## Cờ rủi ro

- Độ phủ trích dẫn thấp (0%) -- phần lớn khẳng định được gắn thẻ đánh dấu, không có trích dẫn.
</content>
