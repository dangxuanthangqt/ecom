# Chương 11 — Controller và HTTP routing

> Controller nhận đầu vào HTTP, gọi service rồi trả kết quả. Đây là điểm bắt đầu để viết endpoint;
> các chương về guard, pipe, interceptor giải thích những lớp bọc quanh nó.
> Số chương được giữ ổn định; người mới có thể đọc chương này trước chương 1.

## 1. Một endpoint được tạo thế nào

```ts
import { Controller, Get, Injectable, Module } from "@nestjs/common";

@Injectable()
class CatalogService {
  list() {
    return [{ id: "p1", name: "Áo" }];
  }
}

@Controller("catalog")
class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list() {
    return this.catalog.list();
  }
}

@Module({ controllers: [CatalogController], providers: [CatalogService] })
export class CatalogModule {}
```

Module gốc phải import `CatalogModule`. `@Controller()` không tự đăng ký class vào app.
`GET /catalog` gọi `list()`; tên method không quyết định URL. Đổi tên method thành `findAll()` vẫn giữ route đó.

Đây là mini module độc lập, không sử dụng auth hoặc DB. Trong repo, thêm controller vào module tính năng,
import module vào cây [RouteModule](../../src/routes/route.module.ts), rồi khai chính sách quyền như các endpoint hiện có.
Boot-check của repo có thể từ chối route chưa khai policy; mini example không thay thế quy ước này.

## 2. Ghép path, method và thứ tự route

URL được ghép từ global prefix nếu có, prefix controller và path method:

```ts
@Controller("catalog")
class CatalogController {
  @Get("search")
  search() {
    return { items: [] };
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return { id };
  }
}
```

Ví dụ này cần thêm `Param` vào import. Đặt route tĩnh `search` trước route động `:id` để tránh Express
hiểu `search` là ID. Không chỉ dựa vào tên method hay type `string` để phân biệt route.

| Khai báo                               | Request khớp                     |
| -------------------------------------- | -------------------------------- |
| `@Get()` dưới `@Controller("catalog")` | `GET /catalog`                   |
| `@Get(":id")`                          | `GET /catalog/p1`                |
| `@Post()`                              | `POST /catalog`                  |
| `@Patch(":id")`                        | `PATCH /catalog/p1`              |
| `app.setGlobalPrefix("api")`           | thêm `/api` trước các route trên |

Repo hiện không gọi `setGlobalPrefix("api")`; `/api` trong `SwaggerModule.setup()` là URL trang Swagger,
không phải prefix của API nghiệp vụ. Đọc [main.ts](../../src/main.ts) để phân biệt hai việc.

Nest 11 với Express 5 dùng wildcard có tên: `*path`; `{*path}` còn khớp đường dẫn rỗng ở vị trí wildcard.
Đừng copy cú pháp Express 4 như wildcard `*` hoặc optional `?` mà không kiểm phiên bản.
Nếu không cần route wildcard, giữ path cụ thể để tránh che các route khác.

## 3. Tách tham số khác với validate tham số

```ts
@Get(":id")
detail(
  @Param("id", ParseUUIDPipe) id: string,
  @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
) {
  return { id, page };
}
```

Các decorator/pipe cần import từ `@nestjs/common`. `@Param()` chọn dữ liệu; `ParseUUIDPipe` kiểm UUID;
`ParseIntPipe` chuyển chuỗi số thành number hoặc ném 400. Annotation `page: number` không tự đổi query string.
`DefaultValuePipe` đứng trước parse pipe để xử lý khi thiếu giá trị.

| Decorator                 | Giá trị lấy từ đâu      | Cần lưu ý                                                |
| ------------------------- | ----------------------- | -------------------------------------------------------- |
| `@Body()`                 | body đã được parser đọc | DTO class + ValidationPipe mới kiểm hợp đồng             |
| `@Param("id")`            | path parameter          | ban đầu là chuỗi                                         |
| `@Query()`                | query parser            | có thể chứa chuỗi, mảng hoặc object theo cấu hình parser |
| `@Headers("x-tenant-id")` | HTTP header             | không chứng minh caller được phép vào tenant             |
| `@Req()`                  | request của adapter     | `req.body` không tự thành DTO sau pipe                   |

Đừng nhận toàn bộ body rồi truyền thẳng vào Prisma `data`. DTO giới hạn hợp đồng đầu vào;
service vẫn phải chọn field được sửa và kiểm ownership. Xem [chương 7](07-dto-validation-transformation-serialization.md)
và [chương 12](12-pipes-and-input-contracts.md).

## 4. Return, status code và response

Trong cách xử lý thông thường, handler trả object/array, Nest gửi JSON; handler có thể là `async`.
Lỗi `throw` hoặc Promise reject đi về filter khi còn có thể ghi response.

```ts
@Post()
@HttpCode(200)
async create(@Body() body: CreateCatalogDto) {
  return this.catalog.create(body);
}
```

Đây là fragment: cần DTO, service method và import tương ứng. `POST` mặc định 201; các method thông thường khác
mặc định 200. `@HttpCode(200)` phải khai nếu muốn đổi. `@Delete()` không tự có status 204:
khai `@HttpCode(204)` và đừng đặt hợp đồng trả body cho response 204.

Type return `Promise<ResponseDto>` chỉ giúp TypeScript; không lọc field nhạy cảm lúc chạy.
Trong repo, service dựng instance response DTO, global `ClassSerializerInterceptor` lọc theo metadata.
Plain object Prisma có thể bỏ qua quy tắc expose. Xem [chương 7 §6](07-dto-validation-transformation-serialization.md#6-serialization-chiều-ra).

## 5. Khi dùng response của Express

```ts
@Get("with-header")
withHeader(@Res({ passthrough: true }) res: Response) {
  res.setHeader("X-Example", "yes");
  return { ok: true };
}
```

`Response` là type từ `express`; decorator `Res` là giá trị runtime từ Nest.
Với passthrough, Nest vẫn ghi body từ return. Dùng `@Res()` không passthrough thì phải tự gửi response;
return object đơn thuần có thể khiến request chờ mãi.

Interceptor vẫn chạy trong chế độ tự gửi, nhưng Nest không dùng kết quả biến đổi của nó để ghi body.
Sau `res.send()`/`res.redirect()`/`res.write()` đã gửi header, filter không thể thay response bằng JSON lỗi mới.
Xem [chương 9 §11](09-interceptors.md#11-res-bỏ-qua-kết-quả-trả-về-interceptor-vẫn-chạy).

## 6. Controller nên giữ việc gì

Controller giữ việc ghép đầu vào và HTTP contract. Service giữ nghiệp vụ; repository giữ truy cập dữ liệu.
Guard quyết định quyền vào route, service kiểm quyền theo bản ghi và thực hiện thao tác.

Ví dụ seller có quyền `product:update:own`: guard chấp nhận permission không có nghĩa seller được sửa
mọi product. Service phải kiểm product thuộc seller đó trong cùng quy trình đọc/ghi phù hợp.
Tránh giữ `currentUser` trong field controller singleton; truyền actor bằng tham số hoặc context đúng scope.

## 7. Tự kiểm chứng

Dùng mini module ở mục 1 với `TestingModule` như [chương 13](13-testing-fundamentals.md):

1. Gửi `GET /catalog`: kỳ vọng 200 và một mảng JSON.
2. Đổi tên method: URL giữ nguyên. Bỏ controller khỏi module: URL trở thành 404.
3. Thêm route động và tĩnh, kiểm `GET /catalog/search` gọi đúng method.
4. Với parse pipe, ID sai phải trả 400 và service không được gọi.
5. Với `@Res()` không passthrough, tự gửi body rồi kiểm interceptor vẫn nhận sự kiện chiều về.

Nguồn: [Nest controllers](https://docs.nestjs.com/controllers),
[router-execution-context của phiên bản cài trong repo](../../node_modules/@nestjs/core/router/router-execution-context.js).

**Tiếp theo:** [Chương 12 — Pipe và hợp đồng đầu vào](12-pipes-and-input-contracts.md).
