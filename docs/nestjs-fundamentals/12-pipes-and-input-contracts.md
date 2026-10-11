# Chương 12 — Pipe và hợp đồng đầu vào

> Pipe nhận **một giá trị tham số handler**, kiểm hoặc biến đổi nó, rồi trả giá trị mới hoặc ném lỗi.
> Chương 7 giải thích DTO và thư viện; chương này giải thích hợp đồng của pipe, thứ tự chạy và các bẫy đầu vào.

## 1. Pipe nhận gì

```ts
import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from "@nestjs/common";

@Injectable()
export class PositiveIntegerPipe implements PipeTransform<unknown, number> {
  transform(value: unknown, metadata: ArgumentMetadata): number {
    const raw = typeof value === "number" ? String(value) : value;
    if (typeof raw !== "string" || !/^[1-9]\d*$/.test(raw)) {
      throw new BadRequestException(
        `${metadata.data ?? "value"} must be a positive integer`,
      );
    }
    const result = Number(raw);
    if (!Number.isSafeInteger(result)) {
      throw new BadRequestException("Value exceeds safe integer range");
    }
    return result;
  }
}
```

`ArgumentMetadata` gồm `type` (`body`, `query`, `param`, `custom`), `metatype` và `data` (ví dụ `"page"`).
Không có `getHandler()`, `getClass()` hay `switchToHttp()`: pipe không nhận `ExecutionContext`.
Quyết định theo metadata route thuộc guard/interceptor, trừ khi bạn truyền cấu hình cụ thể vào pipe.

Pipe có thể trả Promise; Nest chờ kết quả. Không trả Observable với kỳ vọng Nest tự resolve nó như guard.
Pipe không `next()`; giá trị return trở thành đầu vào của pipe tiếp theo rồi handler.

## 2. Parse và default

```ts
@Get()
list(
  @Query("page", new DefaultValuePipe(1), PositiveIntegerPipe) page: number,
  @Query("enabled", new DefaultValuePipe(false), ParseBoolPipe) enabled: boolean,
) {
  return { page, enabled };
}
```

Fragment cần các import Nest tương ứng và controller/module. Parse pipe tích hợp bao gồm
`ParseIntPipe`, `ParseFloatPipe`, `ParseBoolPipe`, `ParseUUIDPipe`, `ParseEnumPipe`, `ParseArrayPipe`.
Chọn đúng mức nghiêm ngặt: ví dụ positive integer trên cố ý từ chối `0`, `-1`, `1.5`, `1e3`, số quá lớn.
`DefaultValuePipe` xử lý thiếu/null/NaN; không coi chuỗi rỗng là thiếu. Test `?page=` riêng.

Không dùng `@Type(() => Boolean)` để parse query boolean: JavaScript `Boolean("false")` là **true**.
Nếu hợp đồng chỉ nhận `true`/`false`, `ParseBoolPipe` biểu đạt rõ hơn. `@Type(() => Number)` cũng dùng quy tắc
Number của JavaScript: chuỗi rỗng có thể thành 0; cần validator range và test biên phù hợp.

## 3. Phạm vi và thứ tự

| Phạm vi    | Đăng ký                                     |
| ---------- | ------------------------------------------- |
| Global     | `APP_PIPE` hoặc `app.useGlobalPipes(...)`   |
| Controller | `@UsePipes(MyPipe)` trên class              |
| Method     | `@UsePipes(MyPipe)` trên handler            |
| Parameter  | `@Param("id", MyPipe)` hoặc `@Body(MyPipe)` |

Với **một tham số**, thứ tự là global → controller → method → parameter, theo thứ tự pipe trong mỗi danh sách.
Giá trị được decorator trích ra trước khi chạy chuỗi pipe của tham số đó.

Với **nhiều tham số**, Nest resolve bằng `Promise.all`; không có hợp đồng "validate body xong mới đọc user".
Thứ tự duyệt tham số không đảm bảo thứ tự hoàn tất các pipe async. Đừng dựa vào side effect ở pipe A để pipe B
đọc state, hoặc kỳ vọng thứ tự lỗi giữa nhiều tham số luôn cố định. Handler chỉ chạy khi toàn bộ tham số thành công.

Global pipe được áp cho các tham số Nest đánh dấu pipeable, không có nghĩa nó validate mọi header/request/response.
Trong repo, `APP_PIPE` dùng [createValidationPipe](../../src/shared/utils/validation-pipe.config.ts).

## 4. DTO metatype và object request

```ts
class SearchDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;
}

@Get()
search(@Query() query: SearchDto, @Req() req: Request) {
  return { page: query.page, rawPage: req.query.page };
}
```

Fragment cần `Type` từ class-transformer, validator từ class-validator, decorator Nest và type Request.
Import `SearchDto` bằng import giá trị runtime nếu tách file; `import type` không cung cấp constructor metatype.
Interface, generic element type và `SearchDto[]` không tự cho pipe biết DTO từng phần tử.

`ValidationPipe` dựng instance DTO nội bộ để validate cả khi `transform: false`; `@Type` vẫn chạy.
Với `transform: true`, instance được đưa vào handler. Pipe không thay toàn bộ `req.query`/`req.body` bằng DTO đó;
interceptor/service đọc trực tiếp request vẫn có thể thấy dữ liệu thô.

`whitelist` dựa vào validator metadata, không dựa vào field TypeScript hay `@ApiProperty()`.
`forbidNonWhitelisted` từ chối field lạ thay vì âm thầm xoá. Hai option là hợp đồng đầu vào,
không thay thế authorization hoặc việc chọn field khi ghi DB.

## 5. Custom decorator không tự được validate

```ts
export const HeaderPayload = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ({
    name: ctx.switchToHttp().getRequest().headers["x-name"],
  }),
);

class HeaderPayloadDto {
  @IsString()
  name: string;
}

@Get()
read(
  @HeaderPayload(undefined, new ValidationPipe({
    validateCustomDecorators: true,
    transform: true,
    whitelist: true,
  })) payload: HeaderPayloadDto,
) {
  return payload;
}
```

Đây là fragment cần các import Nest/class-validator. Global `ValidationPipe` mặc định có
`validateCustomDecorators: false`, nên bỏ qua tham số `type: "custom"` ngay cả khi decorator trả instance DTO.
Bật option trên pipe riêng như trên, hoặc global nếu chủ động áp hợp đồng cho mọi custom parameter.

Metatype được lấy từ kiểu **tham số handler**, không suy ra đơn giản từ object decorator trả.
`@ActiveUser()` của repo đọc state đã xác thực từ guard; thường không cần validate lại như dữ liệu client.
`@ActiveUser("userId")` trên public route thiếu user có thể ném khi truy cập field; đừng coi public route
luôn có identity. Xem [chương 1 §8](01-decorators-and-metadata.md#8-createparamdecorator--loại-decorator-thứ-hai-chạy-mỗi-request).

## 6. Nested object, array và optional

Để validate nested DTO, dùng `@ValidateNested()` + `@Type(() => ChildDto)` để dựng đúng instance;
với array, khai `@IsArray()` cho container và validator phần tử (`{ each: true }`) khi phù hợp.
Ví dụ `@IsUUID("4", { each: true })` kiểm từng ID; `@IsArray()` một mình không kiểm ID hợp lệ.

`@IsOptional()` bỏ qua cả `undefined` và `null`. Nếu API cho phép vắng field nhưng cấm null, cần điều kiện
như `@ValidateIf((_obj, value) => value !== undefined)` cùng validator thích hợp. `PartialType()` cũng cần
kiểm semantics của phiên bản đang dùng; không mặc định hiểu rằng PATCH sẽ từ chối null.

Với mảng ở body, dùng wrapper DTO có field array hoặc `ParseArrayPipe({ items: ItemDto })`.
Không kỳ vọng `@Body() items: ItemDto[]` tự giữ element metatype sau TypeScript compile.

## 7. Lỗi và kiểm chứng

Pipe ném lỗi → handler không chạy → interceptor có thể thấy lỗi trong `catchError` → filter gửi response.
Exception factory của repo giữ envelope `VALIDATION_FAILED`; dùng shared factory trong test thay vì cấu hình
một global pipe khác rồi assert body không giống production.

Chạy [foundation probes](examples/foundation-probes.cjs) từ gốc repo:

```bash
node docs/nestjs-fundamentals/examples/foundation-probes.cjs
```

Các probe kiểm custom decorator bị bỏ qua/bật validation, DTO khác request body, và `@Res()` vẫn chạy interceptor.
Khi thêm endpoint, kiểm cả thiếu field, null, chuỗi rỗng, field lạ, ID sai và input biên; assert service không
được gọi khi pipe thất bại.

Nguồn: [Nest pipes](https://docs.nestjs.com/pipes),
[Nest custom decorators](https://docs.nestjs.com/custom-decorators),
[ValidationPipe của repo](../../node_modules/@nestjs/common/pipes/validation.pipe.js),
[resolve tham số handler](../../node_modules/@nestjs/core/router/router-execution-context.js).

**Tiếp theo:** [Chương 13 — Testing nền tảng](13-testing-fundamentals.md).
