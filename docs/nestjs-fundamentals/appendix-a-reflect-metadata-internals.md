# Phụ lục A — `reflect-metadata` bên trong

> [Chương 1 §6](01-decorators-and-metadata.md#6-metadata-bảng-ẩn-của-reflect-metadata) gọi `reflect-metadata` là "bảng ẩn của thủ thư" và dừng ở cách dùng. Phụ lục này mở nắp: bảng ẩn đó là
> **cấu trúc dữ liệu gì**, `getMetadata` **đi ngược chain thế nào**, TypeScript **tự dán những gì**, và những chỗ
> hành vi thư viện quyết định hành vi của Nest. Đọc sau [chương 0](00-prototype-and-this.md) và
> chương 1; mọi trích dẫn mã nguồn lấy từ `reflect-metadata@0.2.2` đang cài trong
> dự án (`node_modules/reflect-metadata/Reflect.js`).

**Mục lục**

1. [Nó là gì, và vì sao phải `import` một lần](#1-nó-là-gì-và-vì-sao-phải-import-một-lần)
2. [Bảng ẩn là ba tầng `Map` lồng trong một `WeakMap`](#2-bảng-ẩn-là-ba-tầng-map-lồng-trong-một-weakmap)
3. [Vì sao là `WeakMap`](#3-vì-sao-là-weakmap)
4. [`getMetadata` đi ngược chain — đọc thẳng mã nguồn](#4-getmetadata-đi-ngược-chain--đọc-thẳng-mã-nguồn)
   - [4.1 Hệ quả với `SetMetadata`: dán lên hàm thì override là mất](#41-hệ-quả-với-setmetadata-dán-lên-hàm-thì-override-là-mất) · [4.2 Đọc từ instance vẫn được](#42-đọc-từ-instance-vẫn-được)
5. [Ba nhãn TypeScript tự dán: `design:type`, `design:paramtypes`, `design:returntype`](#5-ba-nhãn-typescript-tự-dán-designtype-designparamtypes-designreturntype)
   - [5.1 Chỉ dán khi có decorator ở đúng chỗ đó](#51-chỉ-dán-khi-có-decorator-ở-đúng-chỗ-đó) · [5.2 Kiểu nào ra hàm dựng nào](#52-kiểu-nào-ra-hàm-dựng-nào) · [5.3 Import vòng → `undefined`](#53-import-vòng--undefined)
6. [`Reflect.decorate` — thư viện cũng là người áp decorator](#6-reflectdecorate--thư-viện-cũng-là-người-áp-decorator)
7. [Registry: nhiều bản copy thư viện vẫn dùng chung một bảng](#7-registry-nhiều-bản-copy-thư-viện-vẫn-dùng-chung-một-bảng)
8. [Bảng tra API đầy đủ](#8-bảng-tra-api-đầy-đủ)
9. [Những điều hành vi thư viện quyết định cho Nest](#9-những-điều-hành-vi-thư-viện-quyết-định-cho-nest)
10. [Tự kiểm chứng](#10-tự-kiểm-chứng)

---

## 1. Nó là gì, và vì sao phải `import` một lần

`reflect-metadata` là **polyfill** cho một đề xuất chuẩn (Metadata Reflection API, của Ron Buckton — người cũng viết
phần decorator của TypeScript). Đề xuất chưa vào ECMAScript, nên thư viện tự cài API đó lên object toàn cục
`Reflect`:

```ts
import "reflect-metadata"; // không import tên gì — chỉ chạy file để nó vá Reflect

typeof Reflect.defineMetadata; // "function"  (trước import: "undefined")
typeof Reflect.getMetadata; // "function"
typeof Reflect.decorate; // "function"  ← mục 6
typeof Reflect.metadata; // "function"  ← decorator factory có sẵn
```

Ba điều đi kèm:

- **Một lần cho cả tiến trình.** `Reflect` là global; vá xong thì mọi file đều thấy. `@nestjs/core` import nó ở
  đầu, nên trong `src/` của dự án không có dòng này — nhưng script `ts-node` tự viết thì phải tự import, không thì
  `Reflect.defineMetadata is not a function`.
- **Ba bản build:** `Reflect.js` (đầy đủ, có polyfill `Map`/`Set`/`WeakMap` cho runtime cổ), `ReflectLite.js` (bỏ
  polyfill), `ReflectNoConflict.js` (export hàm riêng, **không** vá global — dùng khi sợ đụng thư viện khác). Nest
  dùng bản đầy đủ.
- **Nó không chạm vào object của bạn.** Không thêm property, không đổi prototype. Toàn bộ dữ liệu nằm ở nơi khác —
  [mục 2](#2-bảng-ẩn-là-ba-tầng-map-lồng-trong-một-weakmap).

---

## 2. Bảng ẩn là ba tầng `Map` lồng trong một `WeakMap`

Đây là đoạn tạo kho chứa, `Reflect.js:1013`:

```js
// [[Metadata]] internal slot
var metadata = new _WeakMap();
```

> **Một tầng gián tiếp nữa, nói trước cho khỏi bất ngờ.** `WeakMap` ở dòng 1013 **không** phải một biến toàn cục
> đứng một mình: nó nằm **bên trong** hàm `CreateMetadataProvider(registry)` (`Reflect.js:1010`). Mọi lệnh
> `defineMetadata` / `getMetadata` đều đi qua một **registry** để hỏi "ô dữ liệu này thuộc provider nào" rồi mới
> chạm tới `WeakMap` đó. Khi trong tiến trình chỉ có **một** bản `reflect-metadata` — trường hợp của dự án này —
> thì chỉ có đúng một provider, nên hình ba tầng dưới đây mô tả đúng cái bạn quan sát được. Vì sao phải có lớp
> registry: xem [mục 7](#7-registry-nhiều-bản-copy-thư-viện-vẫn-dùng-chung-một-bảng).

và đoạn tra/ tạo ô, `Reflect.js:1029-1051` (rút gọn):

```js
function GetOrCreateMetadataMap(O, P, Create) {
  var targetMetadata = metadata.get(O); //         tầng 1: theo TARGET
  if (IsUndefined(targetMetadata)) {
    if (!Create) return undefined;
    targetMetadata = new _Map();
    metadata.set(O, targetMetadata);
  }
  var metadataMap = targetMetadata.get(P); //      tầng 2: theo PROPERTY KEY (undefined = cả quyển)
  if (IsUndefined(metadataMap)) {
    if (!Create) return undefined;
    metadataMap = new _Map();
    targetMetadata.set(P, metadataMap);
  }
  return metadataMap; //                            tầng 3: metadataKey → value
}
```

Viết lại thành kiểu:

```ts
WeakMap<
  object, //                    target: class, prototype, hay hàm
  Map<
    string | symbol | undefined, // propertyKey; undefined = metadata của cả target
    Map<any, any> //              metadataKey → metadataValue
  >
>;
```

Hình dung với đúng dữ liệu của dự án:

```
metadata (WeakMap)
├── RoleController                          ← target là CLASS
│     └── undefined                          ← "cả quyển"
│           ├── "path"               → "roles"
│           ├── "__controller__"     → true
│           └── "design:paramtypes"  → [RoleService]
├── RoleController.prototype.createRole     ← target là HÀM (SetMetadata dán lên descriptor.value)
│     └── undefined
│           ├── "path"                → "/"
│           ├── "method"              → 1
│           └── "required_permission" → "role:create:any"
└── CreateRoleRequestDto.prototype          ← target là PROTOTYPE
      ├── "name"                             ← "một trang"
      │     ├── "design:type"                 → String
      │     └── "swagger/apiModelProperties"  → {...}
      └── "permissionIds"
            └── "design:type"                 → Array
```

Ba điều rút ra:

1. **"Cả quyển" trong [chương 1 §6.5](01-decorators-and-metadata.md#65-dán-cho-cả-quyển-hay-cho-một-trang) chính là hàng có key `undefined`** ở tầng 2. Không có phép màu — `Map` chấp nhận
   `undefined` làm key.
2. **Class, hàm, prototype là ba entry riêng** ở tầng 1, vì chúng là ba object khác nhau. Đó là toàn bộ nội dung
   [chương 1 §6.4](01-decorators-and-metadata.md#64-một-class-một-hàm--hai-quyển-sách-khác-nhau).
3. **`defineMetadata` hai lần cùng key là `Map.set` hai lần** → ghi đè im lặng, không cảnh báo. [Chương 1 §6.9](01-decorators-and-metadata.md#69-bảng-tra-api) ghi
   "ghi đè im lặng nếu trùng key" là từ đây.

---

## 3. Vì sao là `WeakMap`

`WeakMap` khác `Map` ở một điểm: **key phải là object, và không giữ object đó sống**. Khi không còn ai tham chiếu tới
target, garbage collector dọn target **và** dọn luôn hàng metadata của nó. Hệ quả cho người dùng:

| Nếu dùng…                          | Thì…                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| `Map` thường                       | mọi class từng được dán metadata sống mãi trong bộ nhớ, kể cả class tạo động rồi bỏ   |
| property ẩn trên object (`__meta`) | lộ ra khi `Object.getOwnPropertyNames`, đụng tên, và không dán được lên object frozen |
| **`WeakMap`**                      | vô hình với target, tự dọn, dán được lên bất kỳ object nào kể cả frozen               |

Đổi lại, **không có cách liệt kê mọi target đã dán metadata** — `WeakMap` không iterate được. Đó là lý do Nest phải
tự quét: `DiscoveryService` + `MetadataScanner` đi qua từng controller, từng method trên prototype rồi mới gọi
`getMetadata` từng cái ([chương 2](02-reflector-execution-context-and-discovery.md)). Không có hàm "cho tôi mọi
handler có `required_permission`" — vì kho chứa không hỗ trợ câu hỏi đó.

Còn một hệ quả từ "key phải là object": dán lên primitive là lỗi.

```ts
Reflect.defineMetadata("k", 1, "str"); // TypeError
Reflect.defineMetadata("k", 1, () => {}); // OK — hàm là object
```

---

## 4. `getMetadata` đi ngược chain — đọc thẳng mã nguồn

`Reflect.js:591-599` (giữ nguyên logic, chỉ gộp dòng `if` cho gọn):

```js
function OrdinaryGetMetadata(MetadataKey, O, P) {
  var hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
  if (hasOwn) return OrdinaryGetOwnMetadata(MetadataKey, O, P);
  var parent = OrdinaryGetPrototypeOf(O); //  ← Object.getPrototypeOf
  if (!IsNull(parent)) return OrdinaryGetMetadata(MetadataKey, parent, P); // đệ quy
  return undefined;
}
```

Đây là **đúng thuật toán tra property của JavaScript** ở [chương 0 §2](00-prototype-and-this.md#2-tìm-không-thấy-thì-đi-hỏi-chỗ-khác-prototype-chain), chỉ khác chỗ tra: thay vì tra bảng property của
`O`, nó tra `metadata.get(O).get(P)`. Cùng chain, cùng thứ tự dưới-lên, cùng dừng ở `null`.

`getOwnMetadata` là phiên bản không có hai dòng `parent` — chỉ tra `O`. `hasMetadata` / `hasOwnMetadata` cùng cặp.
`getMetadataKeys` gộp key của `O` **và** của mọi tầng trên, loại trùng; `getOwnMetadataKeys` chỉ `O`.

### 4.1 Hệ quả với `SetMetadata`: dán lên hàm thì override là mất

Chain đi theo `Object.getPrototypeOf(O)`. Vậy **O là gì** quyết định có kế thừa hay không:

| Nest / bạn dán lên…                                        | Chain của O                                   | Class con…                                                                                                                     |
| ---------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **class** (`@Controller`, `@SetMetadata` trên class)       | `Child → Base → Function.prototype`           | **đọc được** nhãn của cha — [chương 0 §8](00-prototype-and-this.md#8-extends-chỉ-là-nối-thêm-một-mắt-vào-chain), chain thứ hai |
| **hàm method** (`SetMetadata` dán lên `descriptor.value`)  | `hàm → Function.prototype → Object.prototype` | không override → cùng hàm → đọc được; **override → hàm mới, không có gì**                                                      |
| **`(prototype, tên)`** (`Reflect.metadata`, `design:type`) | `Child.prototype → Base.prototype`            | **đọc được** dù con có override, vì tra theo tên                                                                               |

Kiểm chứng:

```ts
class Base {
  @SetMetadata("perm", "a") hello() {}
  @SetMetadata("perm", "b") keep() {}
}
class Child extends Base {
  hello() {} // override
}

Child.prototype.keep === Base.prototype.keep; // true — cùng hàm, thừa hưởng qua chain
Reflect.getMetadata("perm", Child.prototype.keep); // "b"
Reflect.getMetadata("perm", Child.prototype.hello); // undefined — hàm mới, chưa ai dán

Reflect.defineMetadata("tag", "x", Base.prototype, "hello"); // dán theo (prototype, tên)
Reflect.getMetadata("tag", Child.prototype, "hello"); // "x" — vẫn đọc được dù override
```

Ý nghĩa thực tế: nếu ngày nào dự án có `BaseController` với `@RequirePermission` trên method, và controller con
**override** method đó, nhãn không đi theo. Guard sẽ không thấy `required_permission` →
`PermissionCoverageService` chặn app khởi động (fail-closed, [chương 3](03-guards.md)). Cách đúng là dán lại trên method con — hoặc
dán trên **class** nếu cả controller cùng một quyền, vì `getAllAndOverride([handler, class])` sẽ rơi xuống class.

### 4.2 Đọc từ instance vẫn được

Vì `getMetadata` đi `Object.getPrototypeOf`, mà `Object.getPrototypeOf(instance) === Class.prototype`:

```ts
Reflect.defineMetadata("tag", "x", Base.prototype, "hello");
Reflect.getMetadata("tag", new Base(), "hello"); // "x"     — đi từ instance lên prototype
Reflect.getOwnMetadata("tag", new Base(), "hello"); // undefined — instance không có gì của riêng nó
```

Nest không dùng cách này (Reflector nhận hàm handler và class), nhưng nó cho thấy bảng ẩn **không có khái niệm
riêng về kế thừa** — nó mượn hoàn toàn của prototype chain.

---

## 5. Ba nhãn TypeScript tự dán: `design:type`, `design:paramtypes`, `design:returntype`

Với cờ `emitDecoratorMetadata`, `tsc` chèn thêm vào mảng decorator ([chương 0 §5.3](00-prototype-and-this.md#53-bản-chất-của-syntax-sugar-nhìn-code-sau-khi-biên-dịch)):

```js
__decorate(
  [
    SetMetadata("k", "v"), //                         ← của bạn
    __metadata("design:type", Function), //           ← tsc thêm
    __metadata("design:paramtypes", [String]), //     ← tsc thêm
    __metadata("design:returntype", String), //       ← tsc thêm
  ],
  Foo.prototype,
  "hello",
  null,
);
```

`__metadata(k, v)` chỉ là `Reflect.metadata(k, v)` — decorator factory có sẵn của thư viện, `Reflect.js:189`:

```js
function metadata(metadataKey, metadataValue) {
  function decorator(target, propertyKey) {
    OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
  }
  return decorator;
}
```

Chú ý nó nhận `(target, propertyKey)` và **dán theo `(prototype, tên)`**, không dán lên hàm. Nên `design:*` nằm ở
hàng khác với `required_permission` (xem hình [mục 2](#2-bảng-ẩn-là-ba-tầng-map-lồng-trong-một-weakmap)), và kế thừa được dù override ([mục 4.1](#41-hệ-quả-với-setmetadata-dán-lên-hàm-thì-override-là-mất)).

| Nhãn                | Dán ở                           | Giá trị                                   | Ai đọc                                          |
| ------------------- | ------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| `design:type`       | property, method                | hàm dựng của kiểu (`String`, `Function`…) | `class-validator`, `class-transformer`, swagger |
| `design:paramtypes` | method, **class** (constructor) | mảng hàm dựng của từng tham số            | **DI container** (class), Nest pipes (method)   |
| `design:returntype` | method                          | hàm dựng của kiểu trả về                  | hầu như không ai — swagger có thể dùng          |

### 5.1 Chỉ dán khi có decorator ở đúng chỗ đó

`__metadata` là một phần tử **trong mảng `__decorate`**. Không có decorator nào ở chỗ đó → không có lời gọi
`__decorate` → không có `design:*`:

```ts
@C()
class Dto {
  constructor(dep: Dep) {}
}
class NoDeco {
  constructor(dep: Dep) {}
}

Reflect.getMetadata("design:paramtypes", Dto); // [Dep]
Reflect.getMetadata("design:paramtypes", NoDeco); // undefined
```

**Đây là toàn bộ lý do `@Injectable()` tồn tại.** Bản thân nó chỉ dán một cờ gần như vô dụng; việc thật của nó là
**ép `tsc` sinh `design:paramtypes` cho constructor**. Bỏ `@Injectable()` khỏi một service có dependency → mảng kiểu
không được dán → Nest báo `Nest can't resolve dependencies of the RoleService (?)` (thí nghiệm ở [chương 1 §13](01-decorators-and-metadata.md#13-tự-kiểm-chứng)).
Cùng lý do cho từng field DTO: `class-validator` cần `design:type` nên mỗi field phải có ít nhất một decorator.

### 5.2 Kiểu nào ra hàm dựng nào

Kiểu TypeScript bị xoá khi biên dịch; thứ còn lại để dán phải là **giá trị runtime**, và giá trị gần nhất là hàm dựng
([chương 0 §10.8](00-prototype-and-this.md#108-designtype-là-hàm-dựng-không-phải-tên-kiểu--hệ-quả-của-boxing)). Bảng ánh xạ đầy đủ, đo trực tiếp với `tsc 5.7.3`, `strict: true`:

| Annotation                       | Nhả ra      | Ghi chú                                                         |
| -------------------------------- | ----------- | --------------------------------------------------------------- |
| `string`, `"a" \| "b"`           | `String`    | literal union cùng kiểu gốc → kiểu gốc                          |
| `number`, enum số                | `Number`    |                                                                 |
| `boolean`                        | `Boolean`   |                                                                 |
| enum chuỗi                       | `String`    |                                                                 |
| `string[]`                       | `Array`     | **mất phần tử** — validator phải được bảo `{ each: true }`      |
| `Date`, class bất kỳ             | chính class | đây là thứ DI cần                                               |
| `name?: string`                  | `String`    | `?` không đổi kiểu                                              |
| `string \| null`                 | `Object`    | với `strictNullChecks`, `null` là kiểu riêng → union → `Object` |
| `string \| number`               | `Object`    | không có hàm dựng chung                                         |
| `interface`, `type` alias object | `Object`    | không tồn tại ở runtime                                         |
| `any`, `unknown`                 | `Object`    |                                                                 |
| `Promise<T>` (return)            | `Promise`   | **mất `T`**                                                     |
| `void` (return)                  | `undefined` |                                                                 |

Ba hậu quả cho dự án:

- **DI không inject được qua interface.** `constructor(private repo: IRoleRepository)` → `design:paramtypes` là
  `[Object]` → Nest không biết tìm provider nào. Phải dùng token + `@Inject(TOKEN)` — [chương 6](06-modules-and-dependency-injection.md).
- **`string | null` trong DTO làm validator mù.** `design:type` là `Object`; `@IsString()` vẫn chạy vì nó không dựa
  vào `design:type`, nhưng `class-transformer` không còn gì để dựa vào khi ép kiểu. Đây là một lý do nên viết
  `field?: string` + `@IsOptional()` thay vì `string | null` trong DTO.
- **Kiểu trả về `Promise<PageDto<T>>` chỉ còn `Promise`.** Swagger không tự suy ra response type — đó là lý do
  `@ApiPageOkResponse({ type: ... })` phải khai `type` tường minh.

### 5.3 Import vòng → `undefined`

`__metadata("design:paramtypes", [RoleService])` được **đánh giá lúc file load**. Nếu `a.ts` import `b.ts` và
`b.ts` import lại `a.ts`, thì tại thời điểm class trong `b.ts` được định nghĩa, binding `RoleService` từ `a.ts` có thể
**chưa được gán** (module `a` đang load dở) → mảng thành `[undefined]`:

```
Nest can't resolve dependencies of the X (?). Please make sure that the argument at index [0] is available
```

Dấu hiệu nhận biết là chữ `?` ở đúng vị trí. Cách sửa: phá vòng import (thường đúng hơn), hoặc
`@Inject(forwardRef(() => RoleService))` để hoãn việc đọc binding tới lúc gọi.

---

## 6. `Reflect.decorate` — thư viện cũng là người áp decorator

Nhìn lại helper `__decorate` mà `tsc` chèn vào đầu mỗi file ([chương 0 §5.3](00-prototype-and-this.md#53-bản-chất-của-syntax-sugar-nhìn-code-sau-khi-biên-dịch)):

```js
if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
  r = Reflect.decorate(decorators, target, key, desc);
else for (var i = decorators.length - 1; i >= 0; i--) ...
```

`reflect-metadata` **có** `Reflect.decorate`. Nên trong mọi tiến trình đã import nó — tức mọi app Nest — decorator
của bạn được áp bởi thư viện, không bởi vòng `for` dự phòng. Hai bản làm cùng một việc: duyệt mảng **từ cuối lên
đầu** (đó là "áp từ dưới lên" ở [chương 1 §4](01-decorators-and-metadata.md#4-thứ-tự-chạy)), với method thì truyền `descriptor` và cho phép decorator trả descriptor
mới để thay hàm; cuối cùng `Object.defineProperty(target, key, r)` ghi descriptor về prototype.

Điểm đáng nhớ: vì `__decorate` **ghi lại descriptor** sau khi áp, một decorator có thể **thay hẳn hàm method**
(`descriptor.value = wrapper`). Nest không làm vậy với `SetMetadata` (nó trả descriptor nguyên), nhưng nhiều thư viện
`@Retry()`, `@Cache()` thì có — và khi đó `context.getHandler()` trả về **wrapper**, không phải hàm gốc, nên metadata
dán lên hàm gốc **trước** wrapper sẽ mất. Thứ tự decorator lúc này có ý nghĩa.

---

## 7. Registry: nhiều bản copy thư viện vẫn dùng chung một bảng

`WeakMap metadata` ở [mục 2](#2-bảng-ẩn-là-ba-tầng-map-lồng-trong-một-weakmap) là biến **cục bộ trong closure** của file `Reflect.js`. Nếu trong `node_modules` có hai bản
`reflect-metadata` (hai phiên bản, hoặc bundle nhân đôi), mỗi bản có `WeakMap` riêng → decorator dán vào bản A,
Nest đọc bản B → `undefined` toàn tập. Phiên bản 0.2.x giải quyết bằng một **registry** treo trên chính `Reflect`,
`Reflect.js:83`, `994-1001`:

```js
var registrySymbol = Symbol.for("@reflect-metadata:registry");
// ...
metadataRegistry = root.Reflect[registrySymbol]; // đã có? dùng chung
// chưa có → tạo và Object.defineProperty(root.Reflect, registrySymbol, ...)
```

`Symbol.for` là symbol **toàn cục theo tên**, nên mọi bản copy đều tìm ra cùng một registry; registry giữ danh sách
provider, và mỗi lần đọc thư viện hỏi registry "ai đang giữ metadata của `(O, P)` này". Bạn nhìn thấy nó:

```ts
Object.getOwnPropertySymbols(Reflect).map(String);
// [ "Symbol(Symbol.toStringTag)", "Symbol(@reflect-metadata:registry)" ]
```

Dự án hiện chỉ có **một** bản (`node_modules/.pnpm/reflect-metadata@0.2.2`), nên registry chỉ có một provider. Nhưng
khi thêm thư viện kéo theo `reflect-metadata@0.1.x` (không có registry), hai bên **sẽ không thấy nhau** — triệu chứng
là decorator chạy mà `getMetadata` trả `undefined`. `pnpm why reflect-metadata` là lệnh đầu tiên nên gõ.

---

## 8. Bảng tra API đầy đủ

Tất cả đều có hai dạng: `(key, [value,] target)` cho "cả quyển" và `(key, [value,] target, propertyKey)` cho "một
trang".

| Hàm                                       | Đi ngược chain? | Trả về              | Ghi chú                                                               |
| ----------------------------------------- | --------------- | ------------------- | --------------------------------------------------------------------- |
| `defineMetadata(key, value, target[, p])` | —               | `void`              | `Map.set` — ghi đè im lặng                                            |
| `getMetadata(key, target[, p])`           | **có**          | value / `undefined` | thuật toán [mục 4](#4-getmetadata-đi-ngược-chain--đọc-thẳng-mã-nguồn) |
| `getOwnMetadata(key, target[, p])`        | không           | value / `undefined` |                                                                       |
| `hasMetadata(key, target[, p])`           | **có**          | `boolean`           | phân biệt được "không có" với "có, giá trị undefined"                 |
| `hasOwnMetadata(key, target[, p])`        | không           | `boolean`           |                                                                       |
| `getMetadataKeys(target[, p])`            | **có**          | `any[]`             | gộp own + cha, loại trùng, own đứng trước                             |
| `getOwnMetadataKeys(target[, p])`         | không           | `any[]`             |                                                                       |
| `deleteMetadata(key, target[, p])`        | không           | `boolean`           | chỉ xoá own                                                           |
| `metadata(key, value)`                    | —               | decorator           | dán theo `(target, p)`; là thứ `__metadata` gọi                       |
| `decorate(decorators, target[, p, desc])` | —               | class / descriptor  | áp mảng decorator từ cuối lên; là thứ `__decorate` gọi                |

Về `target`: phải là object (class, prototype, hàm, instance…). Về `key`: bất kỳ giá trị nào `Map` nhận — chuỗi là
phổ biến, `symbol` khi cần chắc chắn không đụng tên.

Nest bọc bốn hàm đầu trong `Reflector` và thêm ba hàm gộp — `getAll`, `getAllAndMerge`, `getAllAndOverride` —
chúng chỉ là vòng lặp `getMetadata` qua một mảng target rồi gộp kết quả ([chương 2 §2](02-reflector-execution-context-and-discovery.md)).

---

## 9. Những điều hành vi thư viện quyết định cho Nest

Tóm lại, năm quyết định thiết kế của `reflect-metadata` và hành vi Nest sinh ra từ đó:

| Thư viện làm…                                 | Nên Nest…                                                                                                                                             |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kho là `WeakMap`, không liệt kê được          | phải có `DiscoveryService` + `MetadataScanner` quét prototype từng controller ([chương 2](02-reflector-execution-context-and-discovery.md))           |
| Tầng 1 keyed theo **object**                  | metadata của class, hàm, prototype là ba nơi riêng; `getAllAndOverride([handler, class])` phải hỏi hai nơi                                            |
| `getMetadata` đi theo `Object.getPrototypeOf` | decorator trên class cha kế thừa được; trên method thì chỉ khi không override ([mục 4.1](#41-hệ-quả-với-setmetadata-dán-lên-hàm-thì-override-là-mất)) |
| `design:*` chỉ có khi có decorator tại chỗ    | `@Injectable()` bắt buộc dù không mang thông tin; mỗi field DTO cần ít nhất một decorator                                                             |
| Giá trị kiểu là **hàm dựng**                  | không inject qua interface; `string[]` chỉ còn `Array`; `Promise<T>` mất `T`                                                                          |

---

## 10. Tự kiểm chứng

Lưu `reflect-internals.ts` trong thư mục dự án, chạy `npx ts-node reflect-internals.ts` (tsconfig của dự án đã bật
hai cờ decorator).

```ts
import "reflect-metadata";
import { SetMetadata } from "@nestjs/common";

// 1. thư viện vá gì lên Reflect
console.log(
  "decorate:",
  typeof Reflect.decorate,
  "| metadata:",
  typeof Reflect.metadata,
);
console.log("registry:", Object.getOwnPropertySymbols(Reflect).map(String));

// 2. dán lên hàm (SetMetadata) vs dán theo (prototype, tên)
class Base {
  @SetMetadata("perm", "a") hello() {}
  @SetMetadata("perm", "b") keep() {}
}
class Child extends Base {
  hello() {}
}
console.log(
  "keep — không override:",
  Reflect.getMetadata("perm", Child.prototype.keep),
); // "b"
console.log(
  "hello — override:",
  Reflect.getMetadata("perm", Child.prototype.hello),
); // undefined
Reflect.defineMetadata("tag", "x", Base.prototype, "hello");
console.log(
  "(prototype, tên) — override vẫn đọc:",
  Reflect.getMetadata("tag", Child.prototype, "hello"),
); // "x"
console.log(
  "đọc từ instance:",
  Reflect.getMetadata("tag", new Child(), "hello"),
); // "x"
console.log(
  "getOwn từ instance:",
  Reflect.getOwnMetadata("tag", new Child(), "hello"),
); // undefined

// 3. "cả quyển" vs "một trang" là hai hàng khác nhau
console.log("keys cả quyển:", Reflect.getMetadataKeys(Base.prototype)); // []
console.log(
  "keys một trang:",
  Reflect.getMetadataKeys(Base.prototype, "hello"),
);
// ["design:returntype", "design:paramtypes", "design:type", "tag"]

// 4. ghi đè im lặng; key symbol; target phải là object
Reflect.defineMetadata("k", 1, Base);
Reflect.defineMetadata("k", 2, Base);
console.log("define 2 lần:", Reflect.getMetadata("k", Base)); // 2
const sym = Symbol("x");
Reflect.defineMetadata(sym, "v", Base);
console.log("key symbol:", Reflect.getMetadata(sym, Base)); // "v"
try {
  Reflect.defineMetadata("k", 1, "str" as never);
} catch (e) {
  console.log("target primitive:", (e as Error).constructor.name); // TypeError
}

// 5. design:paramtypes chỉ có khi class có decorator
const C = (): ClassDecorator => () => {};
class Dep {}
@C()
class WithDeco {
  constructor(dep: Dep) {}
}
class NoDeco {
  constructor(dep: Dep) {}
}
console.log(
  "có decorator:",
  Reflect.getMetadata("design:paramtypes", WithDeco)?.map((t: any) => t.name),
); // ["Dep"]
console.log(
  "không decorator:",
  Reflect.getMetadata("design:paramtypes", NoDeco),
); // undefined
```

Sau đó thử một việc trong dự án thật: chạy `pnpm why reflect-metadata` và đếm số phiên bản. Một là đúng. Hai là
[mục 7](#7-registry-nhiều-bản-copy-thư-viện-vẫn-dùng-chung-một-bảng) đang chờ bạn.
