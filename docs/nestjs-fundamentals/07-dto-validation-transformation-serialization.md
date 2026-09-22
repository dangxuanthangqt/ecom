# Chương 7 — DTO: validation, transformation, serialization

> Repo có **28 file DTO**. Ai thêm endpoint cũng phải sửa chúng, và ai cũng bắt đầu bằng cùng một hiểu nhầm: nghĩ
> "DTO" là **một** thứ. Thực ra đó là **ba việc khác nhau, do hai thư viện khác nhau làm, ở hai đầu ngược nhau của
> request**.
>
> Chương này tách ba việc đó ra, rồi ráp lại. Kết thúc bằng cái bẫy nguy hiểm nhất trong cả series: một chỗ mà làm
> sai thì **dữ liệu nhạy cảm lọt ra ngoài mà không có lỗi nào báo**.

**Mục lục**

1. [Ba việc, hai thư viện](#1-ba-việc-hai-thư-viện)
2. [Vì sao DTO bắt buộc phải là class](#2-vì-sao-dto-bắt-buộc-phải-là-class)
3. [Chiều vào: `ValidationPipe`](#3-chiều-vào-validationpipe)
4. [Từ lỗi validate tới response](#4-từ-lỗi-validate-tới-response)
5. [Validator tự viết](#5-validator-tự-viết)
6. [Serialization: chiều ra](#6-serialization-chiều-ra)
7. [DTO lồng nhau và cái bẫy `@Type`](#7-dto-lồng-nhau-và-cái-bẫy-type)
8. [Pipe tự viết, và luồng upload file](#8-pipe-tự-viết-và-luồng-upload-file)
9. [Swagger ăn theo DTO](#9-swagger-ăn-theo-dto)
10. [Nâng cao và những chỗ dễ vấp](#10-nâng-cao-và-những-chỗ-dễ-vấp)
11. [Trong dự án này](#11-trong-dự-án-này)
12. [Tự kiểm chứng](#12-tự-kiểm-chứng)

---

## 1. Ba việc, hai thư viện

```
     CHIỀU VÀO                                       CHIỀU RA
JSON của client                               object trong service
      │                                               │
      ▼                                               ▼
┌──────────────┐   ┌──────────────────┐        ┌──────────────────┐
│  VALIDATION  │   │  TRANSFORMATION  │        │  SERIALIZATION   │
│ dữ liệu hợp  │ + │ chuỗi → số/Date, │        │ field nào được   │
│ lệ không?    │   │ object → instance│        │ ra ngoài?        │
└──────────────┘   └──────────────────┘        └──────────────────┘
 class-validator    class-transformer           class-transformer
      └────────── ValidationPipe ──────┘        ClassSerializerInterceptor
         (tầng 9, chương 5)                       (tầng 14, chương 5)
```

Hai thư viện, ba việc:

| Thư viện            | Decorator                                              | Làm gì                              | Chạy ở       |
| ------------------- | ------------------------------------------------------ | ----------------------------------- | ------------ |
| `class-validator`   | `@IsString()` `@IsInt()` `@IsOptional()` `@Length()` … | Kiểm dữ liệu, **không** đổi dữ liệu | chiều vào    |
| `class-transformer` | `@Type()`                                              | Đổi kiểu                            | chiều vào    |
| `class-transformer` | `@Expose()` `@Exclude()`                               | Chọn field ra ngoài                 | **chiều ra** |

Vì hai nhóm decorator này nằm lẫn trong cùng một file DTO, người mới tưởng chúng cùng họ. Chúng không. Mẹo nhớ:

> **`@Is...` là người gác cổng vào. `@Expose` là người soát vé ra.** Chúng không bao giờ gặp nhau.

Nhìn một DTO thật —
[login.dto.ts](../../src/dtos/auth/login.dto.ts): `LoginRequestDto` chỉ có `@Is...`, `LoginResponseDto` chỉ có
`@Expose()`. Hai class, hai chiều, không chồng lấn. Đó là quy ước tốt và nên giữ.

---

## 2. Vì sao DTO bắt buộc phải là class

Câu hỏi hay gặp: _"DTO chỉ mô tả hình dạng dữ liệu, sao không dùng `interface` cho nhẹ?"_

Vì `interface` **biến mất sau khi biên dịch**. Và cả hai thư viện trên đều cần đọc thông tin **lúc chạy**.

Nối về [chương 1 §5](01-decorators-and-metadata.md#5-hai-cờ-tsconfig-quyết-định-mọi-thứ): nhờ `emitDecoratorMetadata`,
mỗi handler có tham số được dán `design:paramtypes`. Nest lấy kiểu của tham số `@Body()` từ đó và truyền cho pipe
dưới tên **`metatype`**.

`ValidationPipe` mở đầu bằng một câu hỏi: _metatype này có phải class có decorator không?_ Nếu không, **nó không làm
gì cả** — thực nghiệm 6 ở [mục 12](#12-tự-kiểm-chứng):

```
6. metatype = Object → bỏ qua, trả nguyên: {"x":1}
```

Hệ quả rất thực tế: khai `@Body() body: SomeInterface` thì `metatype` là `Object`, pipe im lặng bỏ qua, và
**endpoint của bạn không hề được validate** — không có lỗi, không có cảnh báo. Đây là loại bug tệ nhất: nó trông
như đang hoạt động.

Cùng lý do, những kiểu này cũng bị bỏ qua: `String`, `Number`, `Boolean`, `Array`, `Object`. Muốn validate một tham
số nguyên thuỷ thì dùng pipe riêng (`ParseUUIDPipe`, `ParseIntPipe`) chứ không phải `ValidationPipe`.

---

## 3. Chiều vào: `ValidationPipe`

Dự án đăng ký **một** cấu hình pipe duy nhất, qua `APP_PIPE`
([chương 6 §6](06-modules-and-dependency-injection.md#6-bốn-token-đặc-biệt-app_guard-và-anh-em)) —
[validation-pipe.config.ts:15-22](../../src/shared/utils/validation-pipe.config.ts#L15-L22):

```ts
export const validationPipeOptions: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  errorHttpStatusCode: HttpStatus.BAD_REQUEST,
  exceptionFactory: (errors) =>
    new ValidateException(transformValidateObject(errors)),
};
```

Năm dòng, mỗi dòng một quyết định. Bảng dưới đây là kết quả **chạy thật** với input
`{ name: "a", pageSize: "10", hacker: 1 }` trên DTO có `name: string` và `pageSize?: number` (thực nghiệm [mục 12](#12-tự-kiểm-chứng)):

| Cấu hình                             | Kết quả                                                      | Nhận xét                          |
| ------------------------------------ | ------------------------------------------------------------ | --------------------------------- |
| mặc định (không cờ nào)              | `{"name":"a","pageSize":"10","hacker":1}`                    | field lạ **đi thẳng vào service** |
| `whitelist: true`                    | `{"name":"a","pageSize":10}`                                 | `hacker` bị **lược im lặng**      |
| `whitelist` + `forbidNonWhitelisted` | **THROW** `["property hacker should not exist"]`             | báo lỗi thay vì lược              |
| `transform: false`                   | `{"name":"a","pageSize":"10"}`, `instanceof Dto` = **false** | trả object thường                 |
| `transform: true`                    | `{"name":"a","pageSize":10}`, `instanceof Dto` = **true**    | trả **instance DTO thật**         |

### `whitelist` — mặc định là bỏ

Không bật, mọi field client gửi lên đều lọt vào service. Đó là chỗ sinh ra lỗ hổng **mass assignment**: client thêm
`{"isSystem": true}` hay `{"roleId": "<id-admin>"}` vào body, và nếu service có chỗ nào spread thẳng body xuống
Prisma thì field đó được ghi.

`whitelist: true` lật mặc định: **chỉ field có decorator validate mới được đi qua**. Field không khai = không tồn
tại.

### `forbidNonWhitelisted` — báo thay vì lược

Lược im lặng thì client gửi sai tên field (`pageSizes` thay vì `pageSize`) sẽ thấy API "không nhận giá trị của tôi"
mà không hiểu vì sao. Bật cờ này, họ nhận `property pageSizes should not exist` — sai ở đâu nói rõ ở đó.

### `transform` — và vì sao query string cần nó

HTTP không có kiểu. `?pageSize=10` đến server là **chuỗi** `"10"`, luôn luôn. Không có transform, `@IsInt()` sẽ
trượt với mọi request.

Lời giải nằm ở `@Type()` của class-transformer —
[pagination.dto.ts:40-45](../../src/dtos/shared/pagination.dto.ts#L40-L45):

```ts
@ApiPropertyOptional({ description: "Number of items per page", example: 20 })
@IsInt({ message: "pageSize must be an integer" })
@Type(() => Number)          // ← chuỗi "10" → số 10, TRƯỚC khi validate
@IsPositive({ message: "pageSize must be greater than 0" })
@IsOptional()
pageSize?: number;
```

Thứ tự thật sự xảy ra: **transform trước, validate sau**. `@Type(() => Number)` đổi `"10"` thành `10`, rồi
`@IsInt()` mới chạy trên số.

`transform: true` còn có tác dụng thứ hai, quan trọng cho [mục 6](#6-serialization-chiều-ra): giá trị handler nhận được là **instance của DTO
class**, không phải object thường. Nhờ vậy các method và default trên DTO hoạt động.

---

## 4. Từ lỗi validate tới response

`exceptionFactory` là móc để tự quyết hình dạng lỗi. Dự án đi qua hai bước.

**Bước 1 — làm phẳng cây lỗi.** `class-validator` trả về `ValidationError[]` **lồng nhau** (lỗi của field con nằm
trong `children` của field cha). [`transformValidateObject`](../../src/shared/utils/app.util.ts) duyệt đệ quy và
dựng đường dẫn:

```ts
function collectInto(
  details: ErrorDetailDto[],
  error: ValidationError,
  parentPath: string | null = null,
): void {
  const path = parentPath ? `${parentPath}.${error.property}` : error.property;

  if (error.constraints) {
    for (const code of Object.keys(error.constraints)) {
      details.push({ field: path, code, message: error.constraints[code] });
    }
  }
  for (const child of error.children ?? []) collectInto(details, child, path);
}
```

Kết quả là `field: "inner.code"` chứ không phải `"code"` — client biết chính xác field nào trong cấu trúc lồng bị
sai.

**Bước 2 — bọc vào envelope chung.**
[validate.exception.ts](../../src/shared/exceptions/validate.exception.ts):

```ts
export class ValidateException extends BadRequestException {
  constructor(details: ErrorDetailDto[], message = "Validation failed") {
    super({
      statusCode: HttpStatus.BAD_REQUEST,
      error: ErrorCode.VALIDATION_FAILED,
      message,
      details,
    });
  }
}
```

Nó kế thừa `BadRequestException`, nên đi qua `GlobalExceptionFilter` như mọi `HttpException` khác và ra đúng hợp
đồng lỗi của API ([error-handling.md](../error-handling.md)). Response cuối:

```json
{
  "statusCode": 400,
  "error": "VALIDATION_FAILED",
  "message": "Validation failed",
  "details": [
    {
      "field": "inner.code",
      "code": "isString",
      "message": "code must be a string"
    }
  ],
  "requestId": "9b1e…"
}
```

`code` (`isString`, `isInt`, `whitelistValidation`…) chính là tên constraint của class-validator. Frontend map
`code` sang thông điệp tiếng Việt của mình, không parse `message` tiếng Anh.

---

## 5. Validator tự viết

Khi luật không nằm trong bộ có sẵn — đặc biệt là luật **liên quan nhiều field**. Repo có bốn cái, trong
[src/validations/decorators/](../../src/validations/decorators/).

### Hai kiểu viết

**Kiểu 1 — validator inline.** Gọn, dùng một chỗ —
[is-password-match.decorator.ts](../../src/validations/decorators/is-password-match.decorator.ts):

```ts
export function IsPasswordMatch(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "matchPassword",
      target: object.constructor,
      propertyName,
      constraints: [property], // ← tham số, đọc lại qua args.constraints
      options: validationOptions,
      validator: {
        validate(value: string, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as string[];
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];
          return (
            typeof value === "string" &&
            typeof relatedValue === "string" &&
            value === relatedValue
          );
        },
        defaultMessage(args: ValidationArguments) {
          /* … */
        },
      },
    });
  };
}
```

**Kiểu 2 — class `@ValidatorConstraint`.** Tách logic ra class riêng, test được độc lập —
[is-only-one-exists.ts](../../src/validations/decorators/is-only-one-exists.ts):

```ts
@ValidatorConstraint({ name: "mutuallyExclusive", async: false })
export class OnlyOneExistsConstraint implements ValidatorConstraintInterface {
  validate(value: string | undefined, args: ValidationArguments) {
    /* … */
  }
  defaultMessage(args: ValidationArguments) {
    /* … */
  }
}

export function IsOnlyOneExists(
  property: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "IsOnlyOneExists",
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: OnlyOneExistsConstraint,
    });
  };
}
```

Class-constraint còn có `async: true` cho validate cần I/O (ví dụ "email này đã tồn tại chưa"). Nhưng cân nhắc kỹ:
validate chạm DB đưa truy vấn vào tầng pipe, và tạo ra race condition kinh điển — kiểm "chưa tồn tại" rồi insert vẫn
có thể đụng unique constraint. Dự án chọn cách khác: để DB làm trọng tài và map lỗi `P2002` thành 409
([prisma-error.mapper.ts](../../src/shared/filters/prisma-error.mapper.ts)).

### Chìa khoá của luật liên trường: `args.object`

`validate()` nhận `value` (giá trị field đang xét) và `args`, trong đó **`args.object` là cả DTO**. Đó là cách nhìn
sang field khác:

```ts
const object = args.object as LoginRequestDto;
const relatedPropertyName = args.constraints[0] as keyof LoginRequestDto;
const relatedPropertyValue = object[relatedPropertyName];
if (value !== undefined && relatedPropertyValue !== undefined) return false; // cả hai cùng có → sai
```

Đọc ra nghiệp vụ: `login` nhận **hoặc** `totpCode` **hoặc** `code`, không được cả hai
([login.dto.ts:49](../../src/dtos/auth/login.dto.ts#L49)). Bốn validator của repo:

| Validator                                                                            | Luật                          | Dùng ở                                  |
| ------------------------------------------------------------------------------------ | ----------------------------- | --------------------------------------- |
| [`IsPasswordMatch`](../../src/validations/decorators/is-password-match.decorator.ts) | field này phải khớp field kia | register, forgot-password, đổi mật khẩu |
| [`IsOnlyOneExists`](../../src/validations/decorators/is-only-one-exists.ts)          | nhiều nhất một trong hai      | login (`totpCode` / `code`)             |
| [`IsExactlyOneExists`](../../src/validations/decorators/is-exactly-one-exists.ts)    | **đúng** một trong hai        | tắt 2FA                                 |
| [`IsUniqueStringArray`](../../src/validations/decorators/is-unique-string-array.ts)  | mảng không có phần tử trùng   | danh sách id                            |

> **Chỗ dễ vấp:** `is-only-one-exists.ts` `import { LoginRequestDto }` chỉ để ép kiểu. Điều đó buộc một tiện ích
> dùng chung phải biết về một DTO cụ thể, và là mầm mống của vòng tròn import
> ([chương 6 §9](06-modules-and-dependency-injection.md#9-phụ-thuộc-vòng-tròn)). Nếu sửa: dùng
> `Record<string, unknown>` như `IsPasswordMatch` đang làm, hoặc `import type` để phụ thuộc biến mất sau biên dịch.

---

## 6. Serialization: chiều ra

Đây là mục quan trọng nhất của chương. Đọc kỹ.

### Cấu hình

[base.module.ts:56-64](../../src/shared/modules/base.module.ts#L56-L64):

```ts
const serializerInterceptor: Provider = {
  provide: APP_INTERCEPTOR,
  useFactory: (reflector: Reflector) =>
    new ClassSerializerInterceptor(reflector, {
      excludeExtraneousValues: true,
    }),
  inject: [Reflector],
};
```

`excludeExtraneousValues: true` nghĩa là: **chỉ field có `@Expose()` mới ra ngoài**. Mặc định không lộ gì, phải khai
mới lộ — đúng tinh thần deny-by-default của cả codebase.

### Nó thực sự làm gì

Mã nguồn `ClassSerializerInterceptor` rút gọn:

```js
serialize(response, options) {
  if (!isObject(response) || response instanceof StreamableFile) return response;
  return Array.isArray(response)
    ? response.map(item => this.transformToPlain(item, options))
    : this.transformToPlain(response, options);
}
transformToPlain(plainOrClass, options) {
  if (!options.type) return classTransformer.classToPlain(plainOrClass, options);
  // …
}
```

Nó gọi `classToPlain` (tức `instanceToPlain`) lên **bất cứ thứ gì** handler trả về.

### Cái bẫy

Câu hỏi: nếu handler trả về **object Prisma thô** thay vì instance DTO thì sao?

Trực giác của nhiều người — kể cả tôi khi viết [chương 5](05-request-lifecycle-in-this-project.md) lần đầu — là _"không có `@Expose()` nào, chắc bị lọc thành
`{}`"_. **Sai.** Đây là kết quả chạy thật (thực nghiệm [mục 12](#12-tự-kiểm-chứng)):

```
1. instance DTO + excludeExtraneousValues:
    { id: 'r1', name: 'admin' }                                    ← password, secret bị bỏ ✓
2. object THÔ (không phải instance) + excludeExtraneousValues:
    { id: 'r1', name: 'admin', password: 'hash', secret: 'x' }     ← LỘ HẾT ✗
3. instance DTO, KHÔNG bật cờ:
    { id: 'r1', name: 'admin', password: 'hash', secret: 'x' }     ← LỘ HẾT ✗
4. DTO lồng object thô bên trong:
    { inner: { id: 'r1', name: 'admin', password: 'hash', secret: 'x' } }  ← LỘ HẾT ✗
```

`excludeExtraneousValues` áp **luật `@Expose()` của một class**. Object thường không thuộc class nào, nên **không có
luật nào để áp**, và nó đi thẳng ra nguyên vẹn.

> **Hỏng ở đây hỏng theo hướng lộ dữ liệu, không phải mất dữ liệu.** Không có exception, không có log, response
> trông vẫn hợp lệ. Bạn chỉ phát hiện khi ai đó mở DevTools và thấy `password` trong JSON.

Đây chính là điều comment trong service đang cảnh báo —
[manage-product.service.ts:111-114](../../src/routes/product/manage-product/manage-product.service.ts#L111-L114):

```ts
// Wrap each row in the response DTO so ClassSerializerInterceptor
// (excludeExtraneousValues) can actually strip fields — it only
// applies @Expose() rules to real DTO instances, not plain Prisma rows.
data: products.map((product) => new ProductResponseDto(product)),
```

### Ba quy tắc rút ra

1. **Handler luôn trả instance DTO.** `return new XResponseDto(result)`, không `return result`.
2. **Danh sách phải map từng phần tử.** `results.map(r => new XDto(r))` — một `PageDto` bọc mảng object thô vẫn lộ,
   như kết quả 4 cho thấy.
3. **Object lồng nhau cũng cần DTO riêng** — xem [mục 7](#7-dto-lồng-nhau-và-cái-bẫy-type).

### Tuyến phòng thủ thứ hai: `select` của Prisma

Nếu query không bao giờ **lấy** `password` lên thì có quên `@Expose()` cũng không lộ. Đó là việc của
[selectors/](../../src/selectors/) — mỗi entity có một `select` tường minh, và `Prisma.validator<Prisma.RoleSelect>()`
khiến gõ sai tên field là lỗi compile ([role.selector.ts](../../src/selectors/role.selector.ts)).

Hai tuyến độc lập: selector chặn ở tầng truy vấn, DTO chặn ở tầng response. Đây là phòng thủ theo lớp, và nên giữ cả
hai.

### `PageDto` — DTO generic

[page.dto.ts](../../src/dtos/shared/page.dto.ts):

```ts
export class PageDto<T> {
  @Expose() data: T[];
  @Expose() @ApiProperty() pagination: PaginationResponseDto;

  constructor({
    data,
    pagination,
  }: {
    data: T[];
    pagination: PaginationResponseDto;
  }) {
    this.data = data;
    this.pagination = pagination;
  }
}
```

Generic `<T>` chỉ tồn tại ở tầng kiểu — lúc chạy, `class-transformer` không biết `T` là gì. Nên `data` phải **đã là**
mảng instance DTO trước khi vào đây; `PageDto` không tự bọc hộ. Swagger cũng không suy ra được `T`, phải khai tay
bằng `ApiExtraModels` + `getSchemaPath` — [mục 9](#9-swagger-ăn-theo-dto).

---

## 7. DTO lồng nhau và cái bẫy `@Type`

Khi một field là object, `class-transformer` **không biết** phải dựng nó thành class nào — kiểu ở TypeScript đã bị
xoá. Bạn phải nói bằng `@Type()`:

```ts
class Inner {
  @IsString() code: string;
}

class WithType {
  @ValidateNested() @Type(() => Inner) inner: Inner;
} // đúng
class WithoutType {
  @ValidateNested() inner: Inner;
} // thiếu
```

Thiếu `@Type()` thì hỏng thế nào? Chạy thật với **đúng cấu hình của dự án** (thực nghiệm [mục 12](#12-tự-kiểm-chứng)):

| Trường hợp                        | Input                       | Kết quả                                                                                            |
| --------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------- |
| Có `@Type`, inner sai kiểu        | `{ inner: { code: 123 } }`  | `[{"field":"inner.code","code":"isString","message":"code must be a string"}]`                     |
| Có `@Type`, inner đúng            | `{ inner: { code: "ok" } }` | OK, và `inner instanceof Inner` = **true**                                                         |
| **Thiếu `@Type`**, inner sai kiểu | `{ inner: { code: 123 } }`  | `[{"field":"inner.code","code":"whitelistValidation","message":"property code should not exist"}]` |

Dòng cuối là chỗ người mới mất cả buổi. Lỗi nói **`property code should not exist`** — nghe như bạn gửi thừa field.
Sự thật hoàn toàn khác: vì không có `@Type()`, class-transformer không dựng `inner` thành `Inner`, nên `whitelist`
nhìn vào và thấy **mọi** field bên trong đều "không được khai" → lược sạch và báo thừa.

> **Quy tắc:** thấy `whitelistValidation` / `should not exist` trên một field mà bạn **biết chắc** đã khai — kiểm
> ngay xem field cha có `@Type(() => …)` chưa. Đây gần như luôn là nguyên nhân.

`@Type()` cũng là thứ đã dùng cho `pageSize` ở [mục 3](#3-chiều-vào-validationpipe) — cùng một decorator, hai công dụng: đổi kiểu nguyên thuỷ, và
chỉ định class cho object lồng.

---

## 8. Pipe tự viết, và luồng upload file

### Hợp đồng `PipeTransform`

```ts
@Injectable()
export class ImageValidationPipe implements PipeTransform {
  transform(file: Express.Multer.File) {
    if (!file) throw new BadRequestException("File is required.");
    if (file.size > this.maxSize)
      throw new BadRequestException(`File too large. …`);
    if (!this.allowedMimeTypes.includes(file.mimetype))
      throw new BadRequestException(/* … */);
    return file; // ← trả về giá trị handler sẽ nhận
  }
}
```

([image-validation.pipe.ts](../../src/shared/pipes/image-validation.pipe.ts))

Pipe khác guard ở chỗ: guard trả `boolean` (cho qua hay không), pipe trả **giá trị** (có thể đã biến đổi). Pipe là
nơi duy nhất trong dây chuyền vừa validate vừa transform một tham số cụ thể.

Ba pipe của repo, trong [shared/pipes/](../../src/shared/pipes/): một file, nhiều file, và mảng file có cấu hình
(`new ArrayFilesValidationPipe({ maxCount, minCount, maxSize, minSize, allowedMimeTypes })` —
[media.controller.ts:107-117](../../src/routes/media/media.controller.ts#L107-L117)). Pipe **có tham số** thì phải
`new` tại chỗ dùng; pipe không tham số thì truyền class để container tạo hộ.

### Vì sao upload file cần cả interceptor lẫn pipe

`multipart/form-data` không phải JSON — `body-parser` không đọc được. Cần `multer`, và trong Nest, multer chạy dưới
dạng **interceptor**:

```ts
@Post("upload/image")
@UseInterceptors(createSingleImageDiskInterceptor("image"))
async uploadLargeImageFromDisk(@UploadedFile() image: Express.Multer.File) { … }
```

Thứ tự (nhắc [chương 5 §2](05-request-lifecycle-in-this-project.md#2-bảng-từng-tầng)): **interceptor chạy trước
pipe**. Nên:

```
multer interceptor  →  đọc multipart, ghi ra đĩa/bộ nhớ, gắn vào req.file
        ↓
pipe (@UploadedFile(ImageValidationPipe))  →  kiểm size / mimetype
        ↓
handler
```

Comment ở [media.controller.ts:60-62](../../src/routes/media/media.controller.ts#L60-L62) nêu đúng hệ quả khó chịu
của thứ tự đó:

> _If validate with pipe in `@UploadedFile`, file size will be available, but it will be after the file is uploaded.
> Now file is uploaded to disk first, then validated._

Nghĩa là pipe **không** ngăn được file 2 GB được ghi ra đĩa — nó chỉ từ chối **sau khi** ghi xong. Muốn chặn sớm,
giới hạn phải đặt ở chính multer (`limits.fileSize`), tức ở interceptor. Đây là ví dụ tốt cho nguyên tắc
[chương 5 §6](05-request-lifecycle-in-this-project.md#6-muốn-thêm-x-thì-đặt-ở-tầng-nào): _sớm nhất có thể, nhưng
không sớm hơn dữ liệu bạn cần_.

Repo cũng ghi nhận lý do chọn disk thay vì buffer:

> _Should be use upload file from disk instead of buffer, because buffer will cause memory issue (OUT OF MEMORY)
> when uploading large files_

### Pipe có sẵn

`ParseUUIDPipe` dùng khắp nơi: `@Param("id", ParseUUIDPipe) productId: string`. Nó chặn id rác **trước khi** chạm
DB — không có nó, một `id` sai định dạng sẽ thành lỗi Prisma và ra 500 thay vì 400. Anh em: `ParseIntPipe`,
`ParseBoolPipe`, `ParseArrayPipe`, `ParseEnumPipe`, `DefaultValuePipe`.

---

## 9. Swagger ăn theo DTO

DTO phục vụ **ba** khách hàng, không phải hai: validate, serialize, và sinh tài liệu API.

`@ApiProperty()` / `@ApiPropertyOptional()` trên từng field cung cấp mô tả, ví dụ, enum. Ba composite decorator gói
sẵn hợp đồng lỗi cho ba nhóm route ([chương 1 §9](01-decorators-and-metadata.md#9-applydecorators--ghép-nhiều-decorator-thành-một)):
`ApiAuth` (route cần token — có 401/403), `ApiPublic` (không có), `ApiPageOkResponse` (danh sách phân trang).

Với `PageDto<T>` generic, Swagger không suy ra `T`, nên
[http-decorator.ts:188-224](../../src/shared/param-decorators/http-decorator.ts#L188-L224) ghép tay bằng
`ApiExtraModels` + `getSchemaPath` + `allOf`.

Đừng quên hai lệnh sau khi đổi DTO:

```bash
pnpm build:swagger   # sinh lại swagger.yaml
pnpm build:schema    # swagger.yaml → schema.ts cho frontend
```

Bỏ qua thì `swagger.yaml` (265 KB) và `schema.ts` (204 KB) lệch với code, và frontend gõ theo kiểu cũ.

---

## 10. Nâng cao và những chỗ dễ vấp

**DTO request và response nên là hai class.** Trộn chung thì `@Expose()` và `@Is...` nằm lẫn, và field chỉ dành cho
input (`confirmPassword`) có nguy cơ bị expose ra response. Repo đang tách đúng — giữ vậy.

**`@Exclude()` ngược với `@Expose()`.** Với `excludeExtraneousValues: true`, `@Exclude()` gần như thừa — không
`@Expose()` là đã bị loại. Nó chỉ có ý nghĩa ở class **không** bật cờ đó.

**`@Expose({ name: "created_at" })`** đổi tên field khi ra ngoài, và `@Transform(({ value }) => …)` đổi giá trị. Hữu
ích khi hợp đồng API khác tên cột DB.

**`@SerializeOptions({ groups: ["admin"] })`** trên handler cho phép cùng một DTO lộ nhiều hay ít tuỳ route (kết hợp
`@Expose({ groups: [...] })`). `ClassSerializerInterceptor` đọc nó bằng `Reflector`
([chương 2](02-reflector-execution-context-and-discovery.md)) — lại đúng cơ chế cũ.

**`transform: true` có chi phí.** Mỗi request dựng một instance DTO. Không đáng kể ở quy mô này, nhưng là lý do
không nên đặt DTO khổng lồ lồng nhiều tầng.

**Validate không thay được ràng buộc DB.** Kiểm "email chưa tồn tại" trong pipe vẫn thua race condition. Để unique
constraint làm trọng tài, map `P2002` → 409.

**`whitelist` không bảo vệ nếu service spread body.** `data: { ...body }` xuống Prisma vẫn nguy hiểm nếu một ngày ai
đó thêm field vào DTO mà quên nghĩ tới ghi DB. Liệt kê field tường minh ở tầng repository.

**`@IsOptional()` bỏ qua mọi validator khác khi giá trị là `undefined` hoặc `null`.** Muốn "cho phép vắng mặt nhưng
nếu có thì không được null" thì dùng `@ValidateIf((o) => o.x !== undefined)`.

**Thứ tự decorator validate không quan trọng**, nhưng `@Type()` **luôn** chạy trước mọi `@Is...` vì nó thuộc pha
transform.

---

## 11. Trong dự án này

| Mảnh                   | File                                                                                                            | Ghi chú                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Cấu hình pipe duy nhất | [validation-pipe.config.ts](../../src/shared/utils/validation-pipe.config.ts)                                   | dùng chung cho `main.ts` và e2e               |
| Đăng ký pipe toàn cục  | [base.module.ts:66-69](../../src/shared/modules/base.module.ts#L66-L69)                                         | `APP_PIPE` + `useFactory`                     |
| Làm phẳng lỗi validate | [app.util.ts](../../src/shared/utils/app.util.ts)                                                               | đệ quy, dựng `field` dạng `a.b.c`             |
| Exception validate     | [validate.exception.ts](../../src/shared/exceptions/validate.exception.ts)                                      | kế thừa `BadRequestException`                 |
| Serializer toàn cục    | [base.module.ts:56-64](../../src/shared/modules/base.module.ts#L56-L64)                                         | `excludeExtraneousValues: true`               |
| 4 validator tự viết    | [validations/decorators/](../../src/validations/decorators/)                                                    | ba cái là luật liên trường                    |
| 3 pipe file            | [shared/pipes/](../../src/shared/pipes/)                                                                        | một / nhiều / mảng có cấu hình                |
| DTO generic phân trang | [page.dto.ts](../../src/dtos/shared/page.dto.ts) · [pagination.dto.ts](../../src/dtos/shared/pagination.dto.ts) | `@Type(() => Number)` cho query               |
| Composite Swagger      | [http-decorator.ts](../../src/shared/param-decorators/http-decorator.ts)                                        | `ApiAuth` / `ApiPublic` / `ApiPageOkResponse` |
| Tuyến phòng thủ 2      | [selectors/](../../src/selectors/)                                                                              | `Prisma.validator` — 16 file                  |

---

## 12. Tự kiểm chứng

Ba thí nghiệm dưới đây **không cần database**, và đã được chạy thật khi viết — mọi output trong chương này là output
thật.

**Thí nghiệm A — serialization (quan trọng nhất).** Tạo `scratch-serialize.ts` ở gốc repo:

```ts
import "reflect-metadata";
import { Expose, instanceToPlain } from "class-transformer";

class RoleResponseDto {
  @Expose() id: string;
  @Expose() name: string;
  password: string; // KHÔNG có @Expose
  constructor(p: Partial<RoleResponseDto>) {
    Object.assign(this, p);
  }
}

const prismaRow = { id: "r1", name: "admin", password: "hash", secret: "x" };

console.log(
  "1.",
  instanceToPlain(new RoleResponseDto(prismaRow), {
    excludeExtraneousValues: true,
  }),
);
console.log(
  "2.",
  instanceToPlain(prismaRow, { excludeExtraneousValues: true }),
);
console.log("3.", instanceToPlain(new RoleResponseDto(prismaRow)));

class Nested {
  @Expose() inner: RoleResponseDto;
  constructor(p: any) {
    Object.assign(this, p);
  }
}
console.log(
  "4.",
  instanceToPlain(new Nested({ inner: prismaRow }), {
    excludeExtraneousValues: true,
  }),
);
```

```bash
npx ts-node --transpile-only scratch-serialize.ts
```

Chỉ dòng 1 an toàn. Dòng 2, 3, 4 đều lộ `password` và `secret` — ba cách khác nhau để làm rò dữ liệu mà không có
lỗi nào báo.

**Thí nghiệm B — bốn cờ của `ValidationPipe`.** `ValidationPipe` gọi trực tiếp được, không cần boot Nest:

```ts
import "reflect-metadata";
import { ValidationPipe, ArgumentMetadata } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsInt, IsString, IsOptional } from "class-validator";

class Dto {
  @IsString() name: string;
  @Type(() => Number) @IsInt() pageSize?: number;
  @IsOptional() @IsString() note?: string;
}
const meta: ArgumentMetadata = { type: "body", metatype: Dto, data: "" };
const run = async (label: string, pipe: ValidationPipe, input: unknown) => {
  try {
    const out = await pipe.transform(input, meta);
    console.log(
      label,
      "→ OK   ",
      JSON.stringify(out),
      "| là instance Dto?",
      out instanceof Dto,
    );
  } catch (e: any) {
    const r = e.getResponse?.() ?? e.message;
    console.log(
      label,
      "→ THROW",
      JSON.stringify(typeof r === "string" ? r : r.message).slice(0, 90),
    );
  }
};
(async () => {
  const bad = { name: "a", pageSize: "10", hacker: 1 };
  await run("1. mặc định, field lạ      ", new ValidationPipe(), bad);
  await run(
    "2. whitelist               ",
    new ValidationPipe({ whitelist: true }),
    bad,
  );
  await run(
    "3. whitelist+forbidNonWL   ",
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    bad,
  );
  await run(
    "4. KHÔNG transform         ",
    new ValidationPipe({ transform: false }),
    { name: "a", pageSize: "10" },
  );
  await run(
    "5. transform (query string)",
    new ValidationPipe({ transform: true }),
    { name: "a", pageSize: "10" },
  );
  const out = await new ValidationPipe({ whitelist: true }).transform(
    { x: 1 },
    { type: "body", metatype: Object, data: "" },
  );
  console.log(
    "6. metatype = Object       → bỏ qua, trả nguyên:",
    JSON.stringify(out),
  );
})();
```

Kết quả (đối chiếu với bảng ở [mục 3](#3-chiều-vào-validationpipe)):

```
1. mặc định, field lạ       → OK    {"name":"a","pageSize":"10","hacker":1} | là instance Dto? false
2. whitelist                → OK    {"name":"a","pageSize":10}
3. whitelist+forbidNonWL    → THROW ["property hacker should not exist"]
4. KHÔNG transform          → OK    {"name":"a","pageSize":"10"} | là instance Dto? false
5. transform (query string) → OK    {"name":"a","pageSize":10} | là instance Dto? true
6. metatype = Object       → bỏ qua, trả nguyên: {"x":1}
```

**Thí nghiệm C — cái bẫy `@Type` với cấu hình thật của dự án.** Import thẳng `validationPipeOptions` từ repo, nên
kết quả đúng bằng production:

```ts
import "reflect-metadata";
import { ValidationPipe, ArgumentMetadata } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsString, ValidateNested } from "class-validator";
import { validationPipeOptions } from "./src/shared/utils/validation-pipe.config";

class Inner {
  @IsString() code: string;
}
class WithType {
  @ValidateNested() @Type(() => Inner) inner: Inner;
}
class WithoutType {
  @ValidateNested() inner: Inner;
}

const pipe = new ValidationPipe(validationPipeOptions);
const run = async (label: string, metatype: any, input: unknown) => {
  try {
    const out: any = await pipe.transform(input, {
      type: "body",
      metatype,
      data: "",
    } as ArgumentMetadata);
    console.log(
      label,
      "→ OK   ",
      JSON.stringify(out),
      "| inner là Inner?",
      out.inner instanceof Inner,
    );
  } catch (e: any) {
    console.log(
      label,
      "→ THROW",
      JSON.stringify(e.getResponse?.()?.details).slice(0, 120),
    );
  }
};
(async () => {
  await run("  có @Type,   inner sai kiểu ", WithType, {
    inner: { code: 123 },
  });
  await run("  có @Type,   inner đúng     ", WithType, {
    inner: { code: "ok" },
  });
  await run("  KHÔNG @Type, inner sai kiểu", WithoutType, {
    inner: { code: 123 },
  });
})();
```

```bash
npx ts-node -r tsconfig-paths/register --transpile-only scratch-nested.ts
```

Dòng thứ ba trả `property code should not exist` — thông điệp **không liên quan gì** tới nguyên nhân thật là thiếu
`@Type()`. Biết trước điều này tiết kiệm cho bạn nửa buổi debug.

Nhớ xoá các file `scratch-*.ts` sau khi xem.

---

**Đọc tiếp:** [Chương 5 — Vòng đời một request](05-request-lifecycle-in-this-project.md) để xem tầng 9 và tầng 14 của
chương này nằm ở đâu trong toàn bộ dây chuyền · [error-handling.md](../error-handling.md) cho hợp đồng lỗi đầy đủ ·
[Mục lục bộ tài liệu](README.md).
