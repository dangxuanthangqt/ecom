# Chương 1 — Decorator và metadata

> Chương này trả lời: decorator **là gì**, **chạy lúc nào**, dán dữ liệu **vào đâu**, và vì sao `@RequirePermission`
> chỉ có hai dòng mà vẫn đủ. Đọc xong bạn phân biệt được hai loại decorator hoàn toàn khác nhau đang sống chung
> trong `src/shared/param-decorators/`.
>
> **Chưa vững `prototype`?** Chương này dùng `X.prototype` ở rất nhiều chỗ.
> [Chương 0 — Prototype, `this`, và class](00-prototype-and-this.md) giải thích nó bằng JavaScript thuần trước, rồi
> nối ngược về đây. Đọc 20 phút, tiết kiệm cả chương.

**Mục lục**

1. [Decorator là một hàm, không phải cú pháp ma thuật](#1-decorator-là-một-hàm-không-phải-cú-pháp-ma-thuật)
2. [Bốn loại decorator và chữ ký của chúng](#2-bốn-loại-decorator-và-chữ-ký-của-chúng)
   - [2.1 Nhìn tận mắt](#21-nhìn-tận-mắt) · [2.2 Bảng tra](#22-bảng-tra) · [2.3 `descriptor.value` chính là hàm](#23-descriptorvalue-chính-là-hàm-method) · [2.4 Property](#24-property-decorator-không-có-descriptor) · [2.5 Parameter](#25-parameter-decorator-một-mình-không-làm-được-gì) · [2.6 Trong dự án](#26-mỗi-loại-trong-dự-án-dùng-để-làm-gì) · [2.7 Nest không dùng](#27-ba-thứ-typescript-cho-phép-mà-nest-không-dùng)
3. [Decorator factory — vì sao có dấu ngoặc](#3-decorator-factory--vì-sao-có-dấu-ngoặc)
4. [Thứ tự chạy](#4-thứ-tự-chạy)
5. [Hai cờ tsconfig quyết định mọi thứ](#5-hai-cờ-tsconfig-quyết-định-mọi-thứ)
6. [Metadata: bảng ẩn của `reflect-metadata`](#6-metadata-bảng-ẩn-của-reflect-metadata)
   - [6.1 Chuỗi đó đi đâu?](#61-câu-hỏi-cụ-thể-chuỗi-đó-đi-đâu) · [6.2 Hình dung: cuốn sổ của thủ thư](#62-hình-dung-cuốn-sổ-riêng-của-thủ-thư) · [6.3 Ba hàm đầu tiên](#63-ba-hàm-đầu-tiên) · [6.4 Class và hàm là hai quyển khác nhau](#64-một-class-một-hàm--hai-quyển-sách-khác-nhau) · [6.5 Cả quyển hay một trang](#65-dán-cho-cả-quyển-hay-cho-một-trang) · [6.6 Sai địa chỉ: class hay prototype](#66-sai-địa-chỉ-example-hay-exampleprototype) · [6.7 Kế thừa](#67-kế-thừa-con-đọc-được-nhãn-của-cha) · [6.8 Metadata thật trong dự án](#68-xem-metadata-thật-trong-dự-án) · [6.9 Bảng tra API](#69-bảng-tra-api) · [6.10 Hai điều nên nhớ](#610-hai-điều-nên-nhớ)
7. [`SetMetadata` — decorator metadata trong một dòng](#7-setmetadata--decorator-metadata-trong-một-dòng)
8. [`createParamDecorator` — loại decorator thứ hai, chạy mỗi request](#8-createparamdecorator--loại-decorator-thứ-hai-chạy-mỗi-request)
9. [`applyDecorators` — ghép nhiều decorator thành một](#9-applydecorators--ghép-nhiều-decorator-thành-một)
10. [Decorator có sẵn của Nest cũng chỉ là metadata](#10-decorator-có-sẵn-của-nest-cũng-chỉ-là-metadata)
11. [Nâng cao: những chỗ dễ vấp](#11-nâng-cao-những-chỗ-dễ-vấp)
12. [Trong dự án này](#12-trong-dự-án-này)
13. [Tự kiểm chứng](#13-tự-kiểm-chứng)

---

## 1. Decorator là một hàm, không phải cú pháp ma thuật

Bỏ NestJS ra một bên. Đây là TypeScript thuần:

```ts
function log(target: object, key: string) {
  console.log(`đang định nghĩa method ${key}`);
}

class Foo {
  @log
  hello() {}
}

console.log("xong phần định nghĩa class");
```

Chạy ra:

```
đang định nghĩa method hello
xong phần định nghĩa class
```

Hai điều cần thấy:

1. `@log` chỉ là cách viết khác của **gọi hàm `log`**. Không có gì ngoài một lời gọi hàm.
2. Nó chạy **lúc class được định nghĩa** — khi file được `import` lần đầu — chứ **không phải** lúc ai đó gọi
   `new Foo().hello()`. Chưa có request nào, chưa có instance nào. Chạy đúng một lần cho mỗi class.

Điểm 2 là thứ người mới hay nhầm nhất. Decorator **không** là "hook chạy trước method". Nó là đoạn code chạy lúc
khai báo, và thứ nó để lại (metadata) mới là cái được dùng sau này.

---

## 2. Bốn loại decorator và chữ ký của chúng

Decorator là một hàm — vậy hàm đó **nhận tham số gì**? Tuỳ **chỗ bạn dán nó**. Nguyên tắc chung:

> TypeScript trao cho decorator **toạ độ của chỗ nó vừa được dán**, đủ để tìm lại đúng nơi đó sau này.

### 2.1 Nhìn tận mắt

Dán bốn loại lên một class rồi in ra tham số chúng nhận (code ở [mục 13](#13-tự-kiểm-chứng)):

```ts
@ClassDec
class Foo {
  @PropDec name: string;
  constructor(@ParamDec dep: string) {}
  @MethodDec hello(@ParamDec a: number, @ParamDec b: string) {}
}
```

```
PROPERTY  | target = [object Foo.prototype] | key = "name"  | desc = undefined
PARAM     | target = [object Foo.prototype] | key = "hello" | index = 1
PARAM     | target = [object Foo.prototype] | key = "hello" | index = 0
METHOD    | target = [object Foo.prototype] | key = "hello" | desc.value = [Function hello]
PARAM     | target = [Function Foo]         | key = undefined | index = 0
CLASS     | target = [Function Foo]
```

Ba điều đáng nhớ:

1. **`target` là `prototype`, không phải class** — trừ decorator dán lên chính class và lên tham số constructor,
   khi đó `target` là constructor. (`X.prototype` là "cái tủ dùng chung của mọi instance `X`" — vì sao nó là địa chỉ
   duy nhất decorator nhận được, xem [chương 0 §10.1](00-prototype-and-this.md#101-vì-sao-method-decorator-nhận-prototype).)
2. **Tham số constructor có `key = undefined`**, vì constructor không có tên method. Đây là chỗ DI đọc
   `design:paramtypes`.
3. **Tham số chạy ngược** (`index = 1` trước `index = 0`) — hệ quả của quy tắc "áp từ dưới lên" ở
   [mục 4](#4-thứ-tự-chạy).

### 2.2 Bảng tra

| Loại                        | Dán lên             | `target`        | Tham số 2       | Tham số 3            |
| --------------------------- | ------------------- | --------------- | --------------- | -------------------- |
| **Class**                   | `class X {}`        | constructor `X` | —               | —                    |
| **Method**                  | `foo() {}`          | `X.prototype`   | tên method      | `PropertyDescriptor` |
| **Property**                | `bar: string`       | `X.prototype`   | tên property    | **`undefined`**      |
| **Parameter** (method)      | `foo(@D a)`         | `X.prototype`   | tên method      | **chỉ số**           |
| **Parameter** (constructor) | `constructor(@D a)` | constructor `X` | **`undefined`** | **chỉ số**           |

Chữ ký để tra khi cần:

```ts
type ClassDecorator = (target: Function) => void;
type MethodDecorator = (
  target: object,
  key: string,
  descriptor: PropertyDescriptor,
) => void;
type PropertyDecorator = (target: object, key: string) => void;
type ParameterDecorator = (
  target: object,
  key: string | undefined,
  index: number,
) => void;
```

### 2.3 `descriptor.value` chính là hàm method

Tham số thứ ba của method decorator là `PropertyDescriptor` — bản mô tả property mà JavaScript vẫn luôn dùng:

```ts
Object.getOwnPropertyDescriptor(Foo.prototype, "hello");
```

```
{ value: [Function: hello], writable: true, enumerable: false, configurable: true }
```

`descriptor.value` **chính là hàm**:

```ts
Foo.prototype.hello === descriptor.value; // true
```

Ghi nhớ dòng này — nó là mắt xích của cả chương 1 và [chương 2](02-reflector-execution-context-and-discovery.md). `SetMetadata` dán nhãn lên `descriptor.value`
([mục 7](#7-setmetadata--decorator-metadata-trong-một-dòng)), còn `context.getHandler()` của guard trả về **chính
hàm đó** (chương 2). Hai bên gặp nhau ở cùng một object.

### 2.4 Property decorator không có `descriptor`

Tham số thứ ba là `undefined`, và điều đó có lý: lúc decorator chạy, property **chưa tồn tại** — nó chỉ được gán khi
ai đó `new` class ra.

Nên property decorator chỉ làm một việc: **dán nhãn lên cặp `(prototype, tên property)`**. Đó chính xác là cách
`class-validator` và Swagger hoạt động:

```ts
export class CreateRoleRequestDto {
  @ApiProperty({ description: "Role name" })
  @IsString()
  name: string; // ← hai nhãn ghi vào (CreateRoleRequestDto.prototype, "name")
}
```

[Chương 7](07-dto-validation-transformation-serialization.md) nói ai đọc lại chúng.

### 2.5 Parameter decorator một mình không làm được gì

Nó **chỉ** biết: _"tham số thứ `index` của method `key` vừa được đánh dấu"_. Không `descriptor`, không cách nào
chạm vào giá trị tham số.

Vậy `@Body()`, `@ActiveUser("userId")` lấy giá trị bằng cách nào? Chúng **không** lấy. Chúng ghi một dòng metadata
kiểu _"tham số số 2 của method này lấy giá trị bằng hàm factory kia"_, rồi **Nest** đọc dòng đó mỗi request và gọi
factory hộ — đó là `createParamDecorator` ở [mục 8](#8-createparamdecorator--loại-decorator-thứ-hai-chạy-mỗi-request).

> **Hệ quả thực tế:** vì `@Inject("TOKEN")` ghi metadata theo `index`, thêm hay bớt một tham số ở giữa constructor
> sẽ làm lệch chỉ số. Một lý do nữa để inject bằng class thay vì token chuỗi.

### 2.6 Mỗi loại trong dự án dùng để làm gì

| Loại      | Trong dự án                                                                                | File        |
| --------- | ------------------------------------------------------------------------------------------ | ----------- |
| Class     | `@Controller("roles")`, `@Injectable()`, `@Module()`, `@Global()`, `@Catch()`              | mọi nơi     |
| Method    | `@Get()` `@Post()`, `@RequirePermission()`, `@IsPublicApi()`, `@Throttle()`, `@HttpCode()` | controller  |
| Property  | `@IsString()` `@IsInt()` (validate), `@Expose()` (serialize), `@ApiProperty()` (Swagger)   | `src/dtos/` |
| Parameter | `@Body()` `@Param()` `@Query()`, `@ActiveUser()`, `@PermissionScope()`, `@CurrentLang()`   | controller  |

Một controller thật dùng cả bốn:

```ts
@Controller("manage-product/products") // ← class
export class ManageProductController {
  @RequirePermission("product:read:own") // ← method
  @Get()
  async getManageProducts(
    @Query() query: ManageProductPaginationQueryDto, // ← parameter
    @ActiveUser("userId") userId: UserSchema["id"], // ← parameter
    @PermissionScope(["product", "read"]) scope: ScopeType, // ← parameter
  ) {}
}
```

Còn `ManageProductPaginationQueryDto` bên trong đầy **property** decorator. Bốn loại, bốn vai trò, không chồng lấn.

### 2.7 Ba thứ TypeScript cho phép mà Nest không dùng

Gặp trong tài liệu ngoài thì biết là gì, đừng mang vào dự án này:

| Thứ                                  | Là gì                                                                           | Vì sao Nest không dùng                                                                                                                                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Decorator trên `static`**          | `target` thành constructor thay vì prototype                                    | Nest chỉ quét method instance của controller                                                                                                                                                                                                             |
| **Accessor decorator** (`get`/`set`) | cùng chữ ký method, `descriptor` có `get`/`set` thay `value`                    | route và DTO không dùng accessor                                                                                                                                                                                                                         |
| **Bọc hàm / thay class**             | method decorator gán lại `descriptor.value`; class decorator `return` class mới | bọc hàm là **một chiều và không quan sát được** — hai decorator cùng bọc thì thứ tự quyết định hành vi, và không ai nhìn ra được chuyện gì đã xảy ra. Dán nhãn thì đọc được, kiểm tra được lúc boot, và guard/pipe làm phần "bọc" ở tầng riêng của chúng |

Dòng cuối là quyết định thiết kế đáng nhớ nhất: **Nest có thể bọc hàm nhưng chọn không.** Toàn bộ framework xây trên
"dán nhãn rồi đọc lại" thay vì "thay thế hành vi".

---

## 3. Decorator factory — vì sao có dấu ngoặc

`@log` (không ngoặc) và `@Get("users")` (có ngoặc) là hai thứ khác nhau về cấu trúc.

- `@log` — `log` **là** decorator.
- `@Get("users")` — `Get("users")` là **lời gọi hàm trả về** một decorator. `Get` là _factory_.

```ts
// factory: nhận tham số, trả về decorator
function Tag(name: string): MethodDecorator {
  return (target, key, descriptor) => {
    console.log(`method ${String(key)} được gắn tag ${name}`);
  };
}

class Foo {
  @Tag("quan-trọng")
  hello() {}
}
```

Đây chính là hình dạng của decorator trong dự án —
[require-permission.decorator.ts:12-13](../../src/shared/param-decorators/require-permission.decorator.ts#L12-L13):

```ts
export const RequirePermission = (key: PermissionKey) =>
  SetMetadata(PERMISSION_KEY, key);
```

`RequirePermission` là factory nhận `key`. Nó gọi `SetMetadata(...)`, mà `SetMetadata` **cũng là một factory** trả
về decorator thật. Nên `@RequirePermission("x")` = gọi `RequirePermission("x")` = gọi `SetMetadata(KEY, "x")` = một
decorator, được TypeScript áp lên method. Ba tầng gọi hàm, không tầng nào có logic.

---

## 4. Thứ tự chạy

Ba quy tắc, đủ cho mọi tình huống thực tế:

**Quy tắc 1 — Nhiều decorator trên cùng một method: factory chạy từ trên xuống, decorator áp từ dưới lên.**

```ts
class Foo {
  @A() // factory A chạy trước  → decorator A áp SAU
  @B() // factory B chạy sau    → decorator B áp TRƯỚC
  hello() {}
}
```

Hệ quả thực tế với `SetMetadata`: nếu `@A` và `@B` cùng ghi **một key**, `B` ghi trước rồi `A` ghi đè →
**decorator nằm trên cùng thắng**. Ít khi bạn cố ý làm vậy, nhưng khi debug "sao metadata không như tôi đặt", nhìn
xem có hai decorator cùng key không.

**Quy tắc 2 — Trong một class: parameter → method/property → class.**

Decorator của tham số trong một method chạy trước decorator của method đó. Decorator của class chạy cuối cùng, sau
mọi member. Vì thế `@Controller()` (class decorator) có thể "nhìn thấy" tất cả `@Get()` đã dán xong.

**Quy tắc 3 — Thứ tự giữa `@Get()` và `@RequirePermission()` không quan trọng.**

Cả hai chỉ dán metadata với key khác nhau lên cùng một hàm. Không cái nào đọc cái nào. Dự án viết
`@RequirePermission` trên `@Get` cho dễ đọc, không phải vì bắt buộc.

---

## 5. Hai cờ tsconfig quyết định mọi thứ

[tsconfig.json:8-9](../../tsconfig.json#L8-L9):

```json
"emitDecoratorMetadata": true,
"experimentalDecorators": true,
```

**`experimentalDecorators`** — bật cú pháp decorator kiểu "legacy" mà NestJS dùng. TypeScript 5 có thêm chuẩn
decorator mới (TC39 stage 3) với chữ ký khác hẳn; **NestJS không dùng chuẩn đó**. Tắt cờ này là toàn bộ Nest không
compile.

**`emitDecoratorMetadata`** — bảo compiler tự dán thêm ba mẩu metadata về **kiểu** lên bất kỳ thứ gì có decorator:

| Key                 | Gắn lên           | Nội dung                  | Ai dùng                                     |
| ------------------- | ----------------- | ------------------------- | ------------------------------------------- |
| `design:type`       | property          | kiểu của property         | `class-validator`, Swagger                  |
| `design:paramtypes` | class hoặc method | mảng kiểu của các tham số | **DI container của Nest**, `ValidationPipe` |
| `design:returntype` | method            | kiểu trả về               | ít dùng                                     |

Đây là lý do DI của Nest hoạt động mà bạn không phải khai báo gì:

```ts
@Injectable()
export class RoleService {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly rolePermissionCacheService: RolePermissionCacheService,
  ) {}
}
```

Vì class có decorator (`@Injectable()`), compiler dán `design:paramtypes = [RoleRepository, RolePermissionCacheService]`
lên class. Nest đọc mảng đó, tra container, tiêm vào. **Bỏ `@Injectable()` đi là mảng này không được dán**, và Nest
báo "can't resolve dependencies" — không phải vì `@Injectable` làm gì, mà vì nó là cái cớ để compiler emit metadata.

Cùng cơ chế: `@Body() body: CreateRoleRequestDto` — `ValidationPipe` biết phải validate theo class
`CreateRoleRequestDto` là nhờ đọc `design:paramtypes` của handler.

> Giới hạn: `design:paramtypes` chỉ ghi được **class**. Interface, union, generic bị emit thành `Object`. Đây là lý
> do DTO phải là class, không thể là interface.

---

## 6. Metadata: bảng ẩn của `reflect-metadata`

> Mục này dừng ở **cách dùng**. Bảng ẩn thật ra là `WeakMap` gì, `getMetadata` đi ngược chain bằng đoạn code nào, và
> TypeScript tự dán `design:*` theo quy tắc gì — xem [phụ lục A](appendix-a-reflect-metadata-internals.md) sau khi
> đọc xong chương này.

### 6.1 Câu hỏi cụ thể: chuỗi đó đi đâu?

Quay lại dòng quen thuộc:

```ts
@RequirePermission("product:read:own")
@Get()
async getManageProducts(...) {}
```

[Mục 1](#1-decorator-là-một-hàm-không-phải-cú-pháp-ma-thuật) đã nói: decorator chạy **một lần** lúc class được định nghĩa, rồi xong. Vậy chuỗi `"product:read:own"` —
**nó nằm ở đâu** để guard đọc lại được khi có request, vài giờ sau?

Nó không nằm trong hàm. Thử in hàm ra mà xem:

```ts
console.log(Object.keys(ManageProductController.prototype.getManageProducts)); // []
console.log(
  ManageProductController.prototype.getManageProducts.required_permission,
); // undefined
```

Hàm sạch trơn, y như trước khi dán. Vậy chuỗi đó **ở chỗ khác**. Mục này nói về cái "chỗ khác" ấy.

### 6.2 Hình dung: cuốn sổ riêng của thủ thư

Cách dễ hình dung nhất:

> Object của bạn là **quyển sách**. `reflect-metadata` là **cuốn sổ riêng của thủ thư**.
>
> Thủ thư không viết gì vào sách. Ông ghi vào sổ của mình: _"quyển sách này → ghi chú kia"_.
> Ai mượn sách về đọc sẽ **không thấy** ghi chú. Muốn biết, phải cầm sách đến hỏi thủ thư.

Ba hệ quả, và cả ba đều quan trọng:

| Trong đời thật                       | Trong code                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| Sách không bị viết vào               | Object không đổi — `Object.keys`, `JSON.stringify`, spread đều không thấy     |
| Phải cầm **đúng quyển sách** đến hỏi | `getMetadata(key, target)` — phải đưa đúng object đã dán                      |
| Sách bị huỷ thì dòng trong sổ bỏ đi  | Sổ là `WeakMap`, object bị thu gom rác thì metadata mất theo, không rò bộ nhớ |

Cuốn sổ đó, sau khi Nest chạy xong, trông đại khái thế này:

```
Sổ của thủ thư  (WeakMap: object → { key → value })
│
├── ManageProductController                    (class)
│      └── "path"                = "manage-product/products"
│      └── "__controller__"      = true
│
├── ...prototype.getManageProducts             (HÀM — không phải class)
│      └── "path"                = "/"
│      └── "method"              = 0
│      └── "required_permission" = "product:read:own"      ← chuỗi ở đây!
│
└── CreateRoleRequestDto.prototype             (prototype của DTO)
       └── ["name"]                                         ← ngăn riêng cho property "name"
              └── "design:type"  = String
```

Ba loại "quyển sách" khác nhau — class, hàm, prototype — mỗi loại một trang riêng trong sổ. Và ở dòng cuối còn có
thêm một tầng nữa: ghi chú không dán cho cả quyển, mà cho **một trang cụ thể**. [Mục 6.5](#65-dán-cho-cả-quyển-hay-cho-một-trang) nói về tầng đó.

### 6.3 Ba hàm đầu tiên

Chỉ cần ba hàm là hiểu được 90% những gì Nest làm:

```ts
Reflect.defineMetadata(key, value, target); // ghi vào sổ
Reflect.getMetadata(key, target); // tra sổ
Reflect.getMetadataKeys(target); // quyển này có những ghi chú nào?
```

Làm thử, **đúng những gì `@Controller("roles")` làm**:

```ts
class RoleController {
  createRole() {}
}

// 1. chưa dán gì
Reflect.getMetadata("path", RoleController); // undefined

// 2. dán nhãn
Reflect.defineMetadata("path", "roles", RoleController);
Reflect.getMetadata("path", RoleController); // "roles"
```

Giờ kiểm tra lời hứa "object không đổi":

```
Object.keys(RoleController)  = []
"path" in RoleController     = false
RoleController.path          = undefined
```

Nhãn đọc được, mà class thì **hoàn toàn không biết** mình có nhãn. Đó là toàn bộ ý tưởng.

### 6.4 Một class, một hàm — hai quyển sách khác nhau

Chỗ này người mới hay nhầm, nên làm rõ bằng ví dụ.

`@Controller("roles")` dán lên **class**. `@Get()` và `@RequirePermission()` dán lên **hàm**. Hai chỗ cất tách biệt
hoàn toàn:

```ts
const handler = RoleController.prototype.createRole;

Reflect.defineMetadata("path", "roles", RoleController); // ← lên class
Reflect.defineMetadata("required_permission", "role:create:any", handler); // ← lên hàm
Reflect.defineMetadata("method", 1, handler); // ← lên hàm
```

```
trên hàm  : [ 'required_permission', 'method' ]
trên class: [ 'path' ]
```

Hai danh sách rời nhau. Hỏi sổ về class thì không bao giờ ra được nhãn của hàm, và ngược lại.

Đây chính là lý do guard phải hỏi **hai lần**
([chương 2 §2](02-reflector-execution-context-and-discovery.md#2-thứ-tự-targets-là-một-hợp-đồng)):

```ts
this.reflector.getAllAndOverride(PERMISSION_KEY, [
  context.getHandler(), // hỏi về HÀM trước
  context.getClass(), // không có thì hỏi về CLASS
]);
```

Không phải Nest làm phức tạp cho vui — mà vì thật sự có **hai quyển sổ riêng**, và nhãn có thể nằm ở quyển nào cũng
được.

### 6.5 Dán cho cả quyển, hay cho một trang

Đến đây thêm một tầng nữa, và nó là tầng cuối.

Ghi chú có thể gắn cho **cả object**, hoặc cho **một property cụ thể** của object. Cùng hàm `defineMetadata`, chỉ
khác ở tham số thứ tư:

| Cách viết                                    | Nghĩa                              |
| -------------------------------------------- | ---------------------------------- |
| `defineMetadata(key, value, target)`         | ghi chú cho **cả quyển sách**      |
| `defineMetadata(key, value, target, "name")` | ghi chú cho **trang tên `"name"`** |

Đọc cũng phải đúng chỗ đã ghi:

```ts
class CreateRoleDto {
  name: string;
}

Reflect.defineMetadata("design:type", String, CreateRoleDto.prototype, "name");
```

```
getMetadata('design:type', proto, 'name') = String      ← đúng chỗ
getMetadata('design:type', proto)         = undefined   ← thiếu tham số thứ 4, tìm sai chỗ
```

Vì sao cần tầng này? Vì một DTO có **nhiều field**, mỗi field có ràng buộc riêng:

```ts
export class CreateRoleRequestDto {
  @IsString() name: string; // ghi chú cho trang "name"
  @IsOptional() description: string; // ghi chú cho trang "description"
  @IsArray() permissionIds: string[]; // ghi chú cho trang "permissionIds"
}
```

Cả ba cùng dán lên `CreateRoleRequestDto.prototype`. Không có tham số thứ tư thì ba ghi chú đè lên nhau và chỉ còn
một cái sống sót.

**Ai dùng dạng nào** — bảng này đủ để đọc hiểu mọi metadata trong dự án:

| Decorator                                       | Dán vào                        | Dạng      |
| ----------------------------------------------- | ------------------------------ | --------- |
| `@Controller("roles")`                          | class `RoleController`         | cả quyển  |
| `@Get()`, `@RequirePermission()`, `@HttpCode()` | **hàm** `descriptor.value`     | cả quyển  |
| `@IsString()`, `@Expose()`, `@ApiProperty()`    | `(Dto.prototype, "tên field")` | một trang |

Dòng giữa nối thẳng về [mục 2.3](#23-descriptorvalue-chính-là-hàm-method): `SetMetadata` dán lên `descriptor.value`
— **chính hàm** — và `context.getHandler()` của guard trả về **chính hàm đó**. Cùng một quyển sách, hai người cùng
cầm đến hỏi thủ thư. Đó là toàn bộ mắt xích của hệ phân quyền.

### 6.6 Sai địa chỉ: `Example` hay `Example.prototype`?

Tham số thứ tư đã đúng rồi vẫn còn một chỗ sai được: **tham số thứ ba**. Câu hỏi hay gặp nhất khi tự gọi
`defineMetadata` bằng tay:

```ts
class Example {
  name: string;
}

Reflect.defineMetadata("description", "Name of the person", Example, "name");
```

Dòng này **không báo lỗi** — và đó chính là vấn đề. Nó ghi thật, chỉ là ghi vào nhầm quyển sổ:

```
getMetadata('description', Example, 'name')             = 'Name of the person'   ← ghi vào đây
getMetadata('description', Example.prototype, 'name')   = undefined              ← mọi người đọc ở đây
```

`Example` là **constructor** — quyển sổ của bản thân class. `name` là field của **instance**, mà mọi thứ thuộc
instance đều mô tả trên `Example.prototype` ([chương 0 §10.1](00-prototype-and-this.md#101-vì-sao-method-decorator-nhận-prototype)). Viết đúng là:

```ts
Reflect.defineMetadata(
  "description",
  "Name of the person",
  Example.prototype,
  "name",
);
```

**Quy tắc chọn tham số thứ ba** — chỉ có hai vế:

| Thứ được mô tả                          | `target` đúng     | Ai dán trong dự án                           |
| --------------------------------------- | ----------------- | -------------------------------------------- |
| Field của instance (`name: string`)     | `X.prototype`     | `@IsString()`, `@Expose()`, `@ApiProperty()` |
| Method của instance (`createRole() {}`) | `X.prototype`     | (rồi Nest dán tiếp lên `descriptor.value`)   |
| Field / method `static`                 | `X` (constructor) | không dùng                                   |
| Cả class                                | `X` (constructor) | `@Controller()`, `@Injectable()`             |

```ts
class Example {
  name: string; // instance  → Example.prototype
  static label = "…"; // static    → Example
}

Reflect.defineMetadata(
  "description",
  "Name of the person",
  Example.prototype,
  "name",
);
Reflect.defineMetadata("info", "Nhãn tĩnh", Example, "label");
```

Vì sao lặng lẽ hỏng: `defineMetadata` nhận **bất kỳ object nào** làm target
([phụ lục A §3](appendix-a-reflect-metadata-internals.md#3-vì-sao-là-weakmap)). Nó không biết `"name"` có tồn tại trên
object đó hay không, và cũng không cần biết — nó chỉ `Map.set`. Nên ghi sai địa chỉ không ra lỗi, chỉ ra `undefined`
ở phía người đọc. Trong dự án, triệu chứng sẽ là: `ValidationPipe` cho qua một field lẽ ra phải chặn, hoặc Swagger
không hiện field — không có dòng log nào nói vì sao.

**Cách tránh hẳn: đừng gọi `defineMetadata` bằng tay.** Viết decorator, vì decorator **được trao sẵn `target` đúng**:

```ts
import "reflect-metadata";

const Description = (text: string) => Reflect.metadata("description", text);

class Example {
  @Description("Name of the person") name: string;
}

Reflect.getMetadata("description", Example.prototype, "name"); // 'Name of the person'
```

`Reflect.metadata(key, value)` trả về một decorator; khi TypeScript áp nó lên field `name`, nó nhận đúng cặp
`(Example.prototype, "name")` từ runtime — không có chỗ nào để gõ nhầm. Với metadata trên method/class thì Nest có
sẵn `SetMetadata` ([mục 7](#7-setmetadata--decorator-metadata-trong-một-dòng)), và dự án dùng đúng nó:
[require-permission.decorator.ts:12-13](../../src/shared/param-decorators/require-permission.decorator.ts#L12-L13).

Gọi `defineMetadata` trực tiếp chỉ nên xuất hiện trong **script thử nghiệm** và trong ruột thư viện. Trong `src/`
của dự án không có dòng nào.

### 6.7 Kế thừa: con đọc được nhãn của cha

Class con **thừa hưởng** ghi chú của class cha — `getMetadata` tự đi ngược lên:

```ts
class BaseAdminController {}
class UserController extends BaseAdminController {}

Reflect.defineMetadata(
  "required_permission",
  "user:read:any",
  BaseAdminController,
);
```

```
getMetadata(UserController)    = user:read:any   ← thấy, kế thừa từ cha
getOwnMetadata(UserController) = undefined       ← không thấy, chỉ nhìn chính nó
```

Con tự khai thì đè lên cha, và **cha không bị ảnh hưởng**:

```
sau khi UserController tự khai:
getMetadata(UserController)     = user:update:any
getMetadata(BaseAdminController) = user:read:any   ← cha không đổi
```

Khác biệt duy nhất giữa hai hàm: `getMetadata` trả lời _"hiệu lực thực tế là gì"_, `getOwnMetadata` trả lời
_"chính class này có tự khai không"_. Nest dùng `getMetadata`.

Trong dự án chưa có controller nào `extends` controller khác, nên chuyện này chưa xảy ra. Nhưng khi gặp một route có
quyền "từ trên trời rơi xuống", đây là chỗ đầu tiên nên nhìn.

### 6.8 Xem metadata thật trong dự án

Lý thuyết xong. Đây là **toàn bộ** ghi chú đang thật sự nằm trong sổ cho `RoleController`, đọc ra mà chưa boot Nest,
chưa có request nào (code ở [mục 13](#13-tự-kiểm-chứng)):

```
A. Trên CLASS RoleController:
    design:paramtypes      [[class RoleService]]
    __controller__         true
    path                   "roles"
    swagger/apiUseTags     ["Roles"]

B. Trên HÀM createRole:
    path                   "/"
    method                 1
    required_permission    "role:create:any"
    swagger/apiOperation   {"summary":"Create a new role"}
    __httpCode__           200

C. design:paramtypes của RoleService — DI đọc đúng mảng này:
    [[class RoleRepository], [class RolePermissionCacheService]]

D. Trên PROPERTY của DTO (dạng "một trang"):
    name            design:type, swagger/apiModelProperties
    permissionIds   design:type, swagger/apiModelProperties
    design:type của 'name'          = [class String]
    design:type của 'permissionIds' = [class Array]
```

Đọc bảng này là hiểu cả framework:

- `path`, `method`, `__httpCode__` — Nest dùng để dựng router. `method: 1` là **số**, không phải chuỗi: đó là
  `RequestMethod.POST` trong enum.
- `required_permission` — **của dự án**, do `@RequirePermission` dán. Nằm **ngang hàng** với nhãn của framework,
  không có gì đặc biệt hơn. Cùng một cuốn sổ, cùng một API.
- `swagger/*` — thư viện thứ ba, dùng tiền tố riêng để khỏi đụng tên.
- `design:paramtypes` trên `RoleService` — mảng class mà DI container đọc
  ([chương 6](06-modules-and-dependency-injection.md)).
- `design:type` của `permissionIds` là `[class Array]`, **không** phải `string[]` — giới hạn đã nói ở
  [mục 5](#5-hai-cờ-tsconfig-quyết-định-mọi-thứ): metadata kiểu không giữ được tham số generic. Vì thế
  `class-validator` cần `@IsArray()` **và** `{ each: true }` chứ không tự suy ra kiểu phần tử.

> **Bẫy khi tự viết script in metadata:** `JSON.stringify` biến function thành `null`, nên
> `JSON.stringify(Reflect.getMetadata("design:paramtypes", RoleService))` in ra `[null,null]` và trông như DI bị
> hỏng. Hãy in `.name` của từng phần tử. Tôi đã mắc đúng lỗi này khi soạn mục này.

### 6.9 Bảng tra API

Ba hàm ở [mục 6.3](#63-ba-hàm-đầu-tiên) là đủ dùng hằng ngày. Đây là danh sách đầy đủ để tra khi cần:

| Hàm                                          | Làm gì                             |
| -------------------------------------------- | ---------------------------------- |
| `defineMetadata(key, value, target[, prop])` | ghi (ghi đè im lặng nếu trùng key) |
| `getMetadata(key, target[, prop])`           | đọc, **đi ngược** lên class cha    |
| `getOwnMetadata(key, target[, prop])`        | đọc, chỉ chính nó                  |
| `hasMetadata` / `hasOwnMetadata`             | có hay không, không lấy giá trị    |
| `getMetadataKeys` / `getOwnMetadataKeys`     | liệt kê mọi key                    |
| `deleteMetadata(key, target[, prop])`        | xoá                                |

Hai điều về key:

- Key thường là **chuỗi**. Nest đặt theo quy ước để tránh đụng: `"path"`, `"method"`, `"__guards__"`,
  `"swagger/apiOperation"`. Dự án theo đúng quy ước —
  [require-permission.decorator.ts:5](../../src/shared/param-decorators/require-permission.decorator.ts#L5):

  ```ts
  export const PERMISSION_KEY = "required_permission";
  ```

  Đặt vào hằng số export ra là quan trọng: người **ghi** (decorator) và người **đọc** (guard, script quét) phải dùng
  đúng cùng một chuỗi. Gõ tay hai nơi thì sai một ký tự là im lặng hỏng.

- Key cũng có thể là **symbol**, khi đó không thể đụng tên với bất kỳ thư viện nào. Dự án không cần tới mức đó.

> `import "reflect-metadata"` chỉ cần **một lần** cho cả tiến trình — nó vá vào global `Reflect`. Trong dự án Nest
> đã import sẵn, nên bạn không thấy dòng này ở đâu trong `src/`. Nhưng script `ts-node` tự viết thì **phải** tự
> import, nếu không `Reflect.defineMetadata` sẽ báo `undefined is not a function`.

### 6.10 Hai điều nên nhớ

**Metadata gắn với hàm/class, không gắn với instance.** Mọi instance của `RoleController` dùng chung một
`RoleController.prototype.createRole`, nên dùng chung một bộ ghi chú. Đừng bao giờ lưu trạng thái theo-request vào
metadata — chỗ của nó là object `request`
([chương 3 §9](03-guards.md#9-truyền-dữ-liệu-từ-guard-xuống-handler)).

**Metadata chỉ là nơi cất, không phải cơ chế thi hành.** Dán `required_permission` lên một hàm **không** làm hàm đó
được bảo vệ — y như viết "phòng này cấm vào" lên giấy nhớ không khoá được cửa. Phải có ai đó đọc và hành động, và đó
là nội dung hai chương tiếp theo.

---

## 7. `SetMetadata` — decorator metadata trong một dòng

Đây là mã nguồn thật của `SetMetadata` trong `@nestjs/common` (rút gọn phần comment):

```js
const SetMetadata = (metadataKey, metadataValue) => {
  const decoratorFactory = (target, key, descriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(metadataKey, metadataValue, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(metadataKey, metadataValue, target);
    return target;
  };
  decoratorFactory.KEY = metadataKey;
  return decoratorFactory;
};
```

Đọc từng nhánh:

- Có `descriptor` → đang ở **method** → dán lên `descriptor.value`, tức **chính hàm method**.
- Không có `descriptor` → đang ở **class** → dán lên `target`, tức constructor.

Nên `@RequirePermission("product:read:own")` trên `getManageProducts` cuối cùng là:

```ts
Reflect.defineMetadata(
  "required_permission",
  "product:read:own",
  ManageProductController.prototype.getManageProducts,
);
```

Không hơn. Dán một nhãn lên hàm. Ai đọc, đọc lúc nào, làm gì với nó — là chuyện của [chương 2](02-reflector-execution-context-and-discovery.md) và 3.

Dòng `decoratorFactory.KEY = metadataKey` là tiện ích: về sau bạn có thể `reflector.get(RequirePermission.KEY, ...)`
thay vì import hằng số riêng. Dự án hiện export hằng `PERMISSION_KEY` riêng, cả hai cách đều được.

### Biến thể có kiểu: `Reflector.createDecorator`

Nest 10.2+ có thêm cách tạo decorator metadata **mang kiểu**, để lúc đọc không phải tự ép kiểu:

```ts
import { Reflector } from "@nestjs/core";

export const RequirePermission = Reflector.createDecorator<PermissionKey>();

// dùng:  @RequirePermission("product:read:own")
// đọc:   reflector.get(RequirePermission, context.getHandler())  // kiểu PermissionKey | undefined, không cần <T>
```

Dự án chọn `SetMetadata` + hằng số — đơn giản hơn, và kiểu đã được ép ở tham số `key: PermissionKey` của factory
nên typo vẫn bị compile bắt. Hai cách tương đương về hành vi; `createDecorator` gọn hơn khi có nhiều decorator.

---

## 8. `createParamDecorator` — loại decorator thứ hai, chạy mỗi request

Đến đây là ngã ba quan trọng nhất của chương. Trong thư mục `src/shared/param-decorators/` có **hai loại decorator
khác hẳn nhau về thời điểm chạy**:

|              | Decorator metadata                     | Param decorator                                   |
| ------------ | -------------------------------------- | ------------------------------------------------- |
| Tạo bằng     | `SetMetadata`                          | `createParamDecorator`                            |
| Dán lên      | method hoặc class                      | **tham số** của method                            |
| Chạy lúc nào | **Một lần**, khi class được định nghĩa | **Mỗi request**, ngay trước khi gọi handler       |
| Làm gì       | Dán nhãn để ai đó đọc sau              | **Tính ra giá trị** để truyền vào tham số         |
| Ví dụ dự án  | `@RequirePermission`, `@AuthApi`       | `@ActiveUser`, `@PermissionScope`, `@CurrentLang` |

`createParamDecorator` nhận một **hàm factory** `(data, context) => giá trị`:

```ts
const ActiveUser = createParamDecorator(
  (field: keyof AccessTokenPayload, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request[REQUEST_USER_KEY] as AccessTokenPayload;

    return field ? user[field] : user;
  },
);

export default ActiveUser;
```

([active-user.decorator.ts:7-16](../../src/shared/param-decorators/active-user.decorator.ts#L7-L16)) — để ý đây là
**default export**, nên import không có ngoặc nhọn: `import ActiveUser from "@/shared/param-decorators/active-user.decorator";`

- `data` (ở đây là `field`) là thứ bạn truyền khi dùng: `@ActiveUser("userId")` → `field = "userId"`.
  `@ActiveUser()` → `field = undefined` → trả cả payload.
- `context` là `ExecutionContext` — cửa sổ nhìn vào request hiện tại ([chương 2](02-reflector-execution-context-and-discovery.md)).
- Giá trị trả về **chính là giá trị tham số** handler nhận.

Vậy lúc định nghĩa class, `@ActiveUser("userId")` làm gì? Nó **cũng dán metadata** — nhưng là metadata kiểu
"tham số số 2 của method này lấy giá trị bằng hàm factory này với data là `userId`". Nest đọc metadata đó mỗi
request, gọi factory, lấy kết quả, ghép vào danh sách tham số. Nên nói cho đúng: **mọi decorator đều chạy lúc định
nghĩa; nhưng param decorator dán vào một hàm mà Nest sẽ gọi lại mỗi request.**

Param decorator còn nhận **pipe** làm tham số thêm:

```ts
@ActiveUser("userId", ParseUUIDPipe) userId: string
```

Giá trị factory trả về đi qua pipe trước khi vào handler. Dự án chưa cần, nhưng cơ chế có sẵn.

---

## 9. `applyDecorators` — ghép nhiều decorator thành một

Khi một handler cần 7 decorator Swagger giống nhau, viết lặp là mời lỗi. `applyDecorators(...)` gộp một mảng
decorator thành một:

```ts
export function ApiAuth({ type, options, statusCode = HttpStatus.OK }): MethodDecorator {
  const arrDecorator = [
    ApiUnauthorizedResponse({ ... }),
    ApiForbiddenResponse({ ... }),
    ApiInternalServerErrorResponse({ ... }),
    ApiBadRequestResponse({ ... }),
    ApiUnprocessableEntityResponse({ ... }),
    ApiNotFoundResponse({ ... }),
    ApiOperation({ summary: options?.summary }),
    ApiOkResponse({ type, description: options?.description ?? "OK", isArray: options?.isArray }),
  ];

  return applyDecorators(...arrDecorator, ApiHeaders(arrHeader), HttpCode(statusCode));
}
```

([http-decorator.ts:22-117](../../src/shared/param-decorators/http-decorator.ts#L22-L117), rút gọn)

`applyDecorators` trả về một decorator duy nhất; khi áp lên method, nó **lần lượt gọi từng decorator con** với cùng
`(target, key, descriptor)`. Không có gì khác một vòng `for`.

Điều đáng học từ file này: `ApiAuth`, `ApiPublic`, `ApiPageOkResponse` là ba composite khác nhau **vì ba nhóm route
có hợp đồng lỗi khác nhau**. Route public không thể trả 401/403, nên `ApiPublic` không khai hai mã đó. Composite
decorator là chỗ tốt để **mã hoá quy ước của dự án** thành một từ.

---

## 10. Decorator có sẵn của Nest cũng chỉ là metadata

Không có gì đặc biệt ở `@Get()` hay `@Controller()` so với `@RequirePermission()`. Chúng chỉ dùng key khác:

| Decorator               | Key (trong `@nestjs/common/constants`) | Gắn lên      | Giá trị                       |
| ----------------------- | -------------------------------------- | ------------ | ----------------------------- |
| `@Controller("brands")` | `PATH_METADATA`                        | class        | `"brands"`                    |
| `@Get(":id")`           | `PATH_METADATA` + `METHOD_METADATA`    | method       | `":id"` + `RequestMethod.GET` |
| `@UseGuards(X)`         | `GUARDS_METADATA`                      | method/class | `[X]`                         |
| `@UseInterceptors(X)`   | `INTERCEPTORS_METADATA`                | method/class | `[X]`                         |
| `@HttpCode(201)`        | `HTTP_CODE_METADATA`                   | method       | `201`                         |
| `@Injectable()`         | `INJECTABLE_WATERMARK`                 | class        | `true`                        |

Dự án tận dụng điều này ở
[collect-route-permissions.util.ts:57-61](../../src/shared/utils/collect-route-permissions.util.ts#L57-L61):

```ts
// Only methods Nest registered as routes carry PATH_METADATA; plain
// helper methods on a controller do not and are skipped.
if (Reflect.getMetadata(PATH_METADATA, handler) === undefined) {
  continue;
}
```

Muốn biết một method có phải route không? Hỏi xem nó có `PATH_METADATA` không. Không cần API riêng của Nest —
đọc thẳng bảng metadata. Đây là cách phân biệt `getManageProducts()` (route) với một hàm helper private trên
controller (không phải route).

---

## 11. Nâng cao: những chỗ dễ vấp

**Kế thừa controller.** Vì Nest dùng `getMetadata` (đi ngược prototype chain), decorator trên class cha được con
thừa hưởng. Có lợi khi bạn muốn `@RequirePermission` mặc định cho cả nhóm controller. Nhưng cũng có nghĩa: sửa
class cha là đổi hành vi mọi class con, và không nhìn thấy ở file con.

**Method viết dạng arrow-function property thì `@Get()` nổ ngay lúc định nghĩa class.**

```ts
@Get()
list = () => {};   // TypeError: Cannot read properties of undefined (reading 'value')
```

Lý do nằm ở [mục 7](#7-setmetadata--decorator-metadata-trong-một-dòng): property decorator **không nhận
`descriptor`**, mà `@Get()` (và mọi decorator route của Nest) dán metadata lên `descriptor.value`. Lỗi xuất hiện khi
file được import — trước cả khi Nest boot — với thông điệp không nói gì về route. Gặp thông điệp này trên một
controller, kiểm tra ngay có method nào viết bằng `=` không. Luôn dùng method thật `list() {}`.

**Tự gọi `Reflect.defineMetadata` với `target` là class thay vì `X.prototype`.** Không lỗi, không cảnh báo — chỉ là
người đọc tìm ở địa chỉ khác và thấy `undefined` ([mục 6.6](#66-sai-địa-chỉ-example-hay-exampleprototype)). Dùng
decorator thay vì gọi tay thì không vấp được chỗ này.

**Cùng key, hai decorator → cái trên cùng thắng** ([mục 4](#4-thứ-tự-chạy)). Với `SetMetadata` không có cảnh báo.

**Metadata dán lên hàm, không lên instance.** `this.foo` trong hai instance khác nhau trỏ đến cùng một hàm trên
prototype, nên metadata là **dùng chung** cho mọi instance. Đừng cố lưu trạng thái theo-request vào metadata — dùng
`request` ([chương 3](03-guards.md)).

**Không dùng decorator TC39 (chuẩn mới) trong dự án Nest.** Nếu một ngày `experimentalDecorators` bị tắt, decorator
của Nest sẽ báo lỗi kiểu rất khó hiểu về chữ ký `(value, context)`. Nguyên nhân luôn là cờ tsconfig.

**`design:paramtypes` chỉ emit khi class có decorator.** Service không có `@Injectable()` mà vẫn được inject
đôi khi chạy được — nếu nó không có dependency nào. Thêm dependency vào là vỡ. Luôn để `@Injectable()`.

**Circular import làm `design:paramtypes` thành `undefined`.** Nếu file A import B và B import A, lúc decorator
chạy một trong hai class có thể chưa được định nghĩa → mảng kiểu có lỗ hổng → Nest báo "cannot resolve dependency at
index N". Cách sửa là phá vòng import, hoặc `forwardRef`.

---

## 12. Trong dự án này

Toàn bộ decorator tự viết nằm trong `src/shared/param-decorators/`:

| File                                                                                                 | Loại      | Dán gì / tính gì                                                                      | Ai đọc                                                |
| ---------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [require-permission.decorator.ts](../../src/shared/param-decorators/require-permission.decorator.ts) | Metadata  | key quyền handler cần                                                                 | `AccessTokenGuard`, `collectRoutePermissions`         |
| [auth-api.decorator.ts](../../src/shared/param-decorators/auth-api.decorator.ts)                     | Metadata  | policy xác thực (`Bearer` / `ApiKey` / `None`, `AND`/`OR`); `@IsPublicApi()` = `None` | `AuthorizationHeaderGuard`, `collectRoutePermissions` |
| [active-user.decorator.ts](../../src/shared/param-decorators/active-user.decorator.ts)               | Param     | một trường của JWT payload trên `request`                                             | handler                                               |
| [permission-scope.decorator.ts](../../src/shared/param-decorators/permission-scope.decorator.ts)     | Param     | `own` / `any` tính từ tập quyền trên `request`                                        | handler → service                                     |
| [current-lang.decorator.ts](../../src/shared/param-decorators/current-lang.decorator.ts)             | Param     | mã ngôn ngữ từ `I18nContext` (middleware i18n đã đặt)                                 | handler                                               |
| [http-decorator.ts](../../src/shared/param-decorators/http-decorator.ts)                             | Composite | gom decorator Swagger + `HttpCode` theo ba hợp đồng                                   | Swagger generator, Nest (`HttpCode`)                  |

Một chi tiết kiểu dữ liệu: `request[REQUEST_USER_KEY]` và `request[REQUEST_GRANTED_PERMISSIONS_KEY]` compile được
trên kiểu `Request` của Express **vì [tsconfig.json:19](../../tsconfig.json#L19) đặt `noImplicitAny: false`**. Nếu
một ngày cờ này bật lên, hai chỗ ghi/đọc đó sẽ đỏ, và cách sửa đúng là khai báo `declare module "express"`
mở rộng `Request` với hai trường có kiểu.

---

## 13. Tự kiểm chứng

**1. Xem decorator chạy lúc định nghĩa, không phải lúc gọi.** Tạo file tạm ngoài `src/`:

```ts
// scratch-decorator.ts
import "reflect-metadata";

const Tag =
  (name: string): MethodDecorator =>
  (target, key, descriptor) => {
    console.log(`[định nghĩa] ${String(key)} ← ${name}`);
    Reflect.defineMetadata(
      "tag",
      name,
      (descriptor as PropertyDescriptor).value,
    );
  };

class Foo {
  @Tag("trên")
  @Tag("dưới")
  hello() {
    console.log("[gọi] hello");
  }
}

console.log("--- class đã định nghĩa, chưa gọi gì ---");
new Foo().hello();
console.log("tag cuối cùng:", Reflect.getMetadata("tag", Foo.prototype.hello));
```

```bash
npx ts-node --transpile-only scratch-decorator.ts
```

Kết quả mong đợi: hai dòng `[định nghĩa]` in ra **trước** dòng `---`, theo thứ tự `dưới` rồi `trên`; và
`tag cuối cùng: trên` — decorator trên cùng thắng.

**2. Đọc metadata thật của một handler trong dự án.**

```ts
// scratch-read.ts
import "reflect-metadata";
import { PATH_METADATA, METHOD_METADATA } from "@nestjs/common/constants";
import { ManageProductController } from "./src/routes/product/manage-product/manage-product.controller";

const handler = ManageProductController.prototype.getManageProducts;
console.log("path:", Reflect.getMetadata(PATH_METADATA, handler));
console.log("method:", Reflect.getMetadata(METHOD_METADATA, handler));
console.log("permission:", Reflect.getMetadata("required_permission", handler));
console.log(
  "controller path:",
  Reflect.getMetadata(PATH_METADATA, ManageProductController),
);
```

Chạy bằng `npx ts-node -r tsconfig-paths/register --transpile-only scratch-read.ts`. Kết quả:

```
path: /
method: 0
permission: product:read:own
controller path: manage-product/products
```

Hai giá trị đầu hé lộ cách Nest lưu route: `@Get()` không tham số được ghi là `"/"`, và `method` là **số** — `0` là
`RequestMethod.GET` trong enum. Dòng `permission` là đúng cái đã dán ở controller, đọc ra mà chưa boot Nest, chưa có
request nào.

**3. Làm vỡ DI để thấy `emitDecoratorMetadata` quan trọng.** Tạm xoá `@Injectable()` trên
`src/routes/role/role.service.ts`, chạy `pnpm types-check` (vẫn xanh — đây là lỗi runtime), rồi chạy app: Nest báo
`Nest can't resolve dependencies of the RoleService (?, ...)`. Khôi phục lại.

**4. In ra đúng những gì mỗi loại decorator nhận** (nguồn của output ở [mục 2.1](#21-nhìn-tận-mắt)).

```ts
// scratch-args.ts
import "reflect-metadata";

const show = (v: any) =>
  v === undefined
    ? "undefined"
    : typeof v === "string"
      ? `"${v}"`
      : typeof v === "function"
        ? `[Function ${v.name}]`
        : `[object ${v.constructor?.name}.prototype]`;

const ClassDec = (t: any) => console.log("CLASS     | target =", show(t));
const MethodDec = (t: any, k: any, d: any) =>
  console.log(
    "METHOD    | target =",
    show(t),
    "| key =",
    show(k),
    "| desc.value =",
    show(d.value),
  );
const PropDec = (t: any, k: any, d: any) =>
  console.log(
    "PROPERTY  | target =",
    show(t),
    "| key =",
    show(k),
    "| desc =",
    show(d),
  );
const ParamDec = (t: any, k: any, i: any) =>
  console.log(
    "PARAM     | target =",
    show(t),
    "| key =",
    show(k),
    "| index =",
    i,
  );

@ClassDec
class Foo {
  @PropDec name: string;
  constructor(@ParamDec dep: string) {}
  @MethodDec hello(@ParamDec a: number, @ParamDec b: string) {}
}

console.log(
  "\nFoo.prototype.hello === descriptor.value ?",
  typeof Foo.prototype.hello === "function",
);
```

Đối chiếu với bảng ở [mục 2.2](#22-bảng-tra). Chú ý ba chỗ: `target` là prototype trừ hai trường hợp, tham số
constructor có `key = undefined`, và tham số chạy **ngược** từ phải sang trái.

**5. Xem `descriptor` của một method** (nguồn của [mục 2.3](#23-descriptorvalue-chính-là-hàm-method)).

```ts
// scratch-desc.ts
class Plain {
  greet(name: string) {
    return `xin chào ${name}`;
  }
}
console.log(Object.getOwnPropertyDescriptor(Plain.prototype, "greet"));
console.log(
  "value === hàm?",
  Object.getOwnPropertyDescriptor(Plain.prototype, "greet")!.value ===
    Plain.prototype.greet,
);
```

**6. Dán và đọc nhãn, đúng những gì Nest làm** (nguồn của [mục 6.3](#63-ba-hàm-đầu-tiên)–[6.7](#67-kế-thừa-con-đọc-được-nhãn-của-cha)).

```ts
// scratch-meta.ts
import "reflect-metadata";

class RoleController {
  createRole() {}
}

console.log("1. chưa dán:", Reflect.getMetadata("path", RoleController));

Reflect.defineMetadata("path", "roles", RoleController); // đúng việc @Controller("roles") làm
console.log("2. sau khi dán:", Reflect.getMetadata("path", RoleController));

console.log(
  "3. class có đổi không?",
  Object.keys(RoleController),
  "path" in RoleController,
);

// dán lên HÀM, không phải lên class
const handler = RoleController.prototype.createRole;
Reflect.defineMetadata("required_permission", "role:create:any", handler);
Reflect.defineMetadata("method", 1, handler);
console.log("4. trên hàm  :", Reflect.getMetadataKeys(handler));
console.log("   trên class:", Reflect.getMetadataKeys(RoleController));

// dán lên MỘT PROPERTY (dạng 4 tham số)
class CreateRoleDto {
  name: string;
}
Reflect.defineMetadata("design:type", String, CreateRoleDto.prototype, "name");
console.log(
  "5. đúng chỗ :",
  Reflect.getMetadata("design:type", CreateRoleDto.prototype, "name")?.name,
);
console.log(
  "   sai chỗ  :",
  Reflect.getMetadata("design:type", CreateRoleDto.prototype),
);

// kế thừa
class BaseAdminController {}
class UserController extends BaseAdminController {}
Reflect.defineMetadata(
  "required_permission",
  "user:read:any",
  BaseAdminController,
);
console.log(
  "6. con đọc được nhãn cha:",
  Reflect.getMetadata("required_permission", UserController),
);
console.log(
  "   nhưng getOwnMetadata :",
  Reflect.getOwnMetadata("required_permission", UserController),
);
```

```bash
npx ts-node --transpile-only scratch-meta.ts
```

Sáu dòng output, sáu bài học: nhãn đọc lại được · object không đổi · class và hàm là hai chỗ cất riêng · thiếu tham
số thứ tư là tìm sai chỗ · con thừa hưởng nhãn của cha.

**7. Xem toàn bộ metadata thật của một controller trong dự án** (nguồn của [mục 6.8](#68-xem-metadata-thật-trong-dự-án)).

```ts
// scratch-real.ts
import "reflect-metadata";
import { RoleController } from "./src/routes/role/role.controller";
import { RoleService } from "./src/routes/role/role.service";
import { CreateRoleRequestDto } from "./src/dtos/role/role.dto";

// KHÔNG dùng JSON.stringify cho giá trị có thể là class — nó biến function thành null
const fmt = (v: any): string =>
  typeof v === "function"
    ? `[class ${v.name}]`
    : Array.isArray(v)
      ? "[" + v.map(fmt).join(", ") + "]"
      : v === undefined
        ? "undefined"
        : JSON.stringify(v);

for (const k of Reflect.getMetadataKeys(RoleController))
  console.log(
    "A.",
    String(k).padEnd(22),
    fmt(Reflect.getMetadata(k, RoleController)).slice(0, 60),
  );

const handler = RoleController.prototype.createRole;
for (const k of Reflect.getMetadataKeys(handler))
  console.log(
    "B.",
    String(k).padEnd(22),
    fmt(Reflect.getMetadata(k, handler)).slice(0, 60),
  );

console.log("C.", fmt(Reflect.getMetadata("design:paramtypes", RoleService)));

const proto = CreateRoleRequestDto.prototype;
for (const prop of ["name", "permissionIds"])
  console.log(
    "D.",
    prop.padEnd(15),
    Reflect.getMetadataKeys(proto, prop).map(String).join(", "),
    "| design:type =",
    fmt(Reflect.getMetadata("design:type", proto, prop)),
  );
```

```bash
npx ts-node -r tsconfig-paths/register --transpile-only scratch-real.ts
```

Đây là thí nghiệm đáng làm nhất cả chương: nó cho thấy nhãn của dự án (`required_permission`) nằm **ngang hàng**
với nhãn của framework (`path`, `method`) và của thư viện thứ ba (`swagger/*`) — không có gì đặc biệt hơn, cùng một
bảng, cùng một API.

Nhớ xoá các file `scratch-*.ts` sau khi xem.

---

**Tiếp theo:** [Chương 2 — Reflector, ExecutionContext và Discovery](02-reflector-execution-context-and-discovery.md):
ai đọc lại những nhãn vừa dán, đọc ở đâu, và đọc cả app một lượt bằng cách nào.
