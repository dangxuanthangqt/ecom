# Chương 2 — Reflector, ExecutionContext và Discovery

> [Chương 1](01-decorators-and-metadata.md) dán nhãn. Chương này trả lời **ai đọc lại nhãn, đọc ở đâu, và đọc cả ứng dụng một lượt bằng cách nào**.
> Ba công cụ: `Reflector` (đọc nhãn của một handler, mỗi request), `ExecutionContext` (cho biết handler nào đang
> được gọi), `DiscoveryService` (liệt kê mọi controller lúc boot).

**Mục lục**

1. [Reflector — bốn hàm, một bảng ẩn](#1-reflector--bốn-hàm-một-bảng-ẩn)
2. [Thứ tự `targets` là một hợp đồng](#2-thứ-tự-targets-là-một-hợp-đồng)
3. [ExecutionContext — cửa sổ nhìn vào request đang chạy](#3-executioncontext--cửa-sổ-nhìn-vào-request-đang-chạy)
4. [Mắt xích khép kín: decorator dán lên đúng cái `getHandler()` trả về](#4-mắt-xích-khép-kín-decorator-dán-lên-đúng-cái-gethandler-trả-về)
5. [Đọc cả ứng dụng một lượt: DiscoveryService + MetadataScanner](#5-đọc-cả-ứng-dụng-một-lượt-discoveryservice--metadatascanner)
6. [Chạy lúc nào: lifecycle hooks](#6-chạy-lúc-nào-lifecycle-hooks)
7. [Nâng cao](#7-nâng-cao)
8. [Trong dự án này](#8-trong-dự-án-này)
9. [Tự kiểm chứng](#9-tự-kiểm-chứng)

---

## 1. Reflector — bốn hàm, một bảng ẩn

`Reflector` là một service của `@nestjs/core`, tiêm được vào bất kỳ đâu. Bên trong nó **không có gì ngoài**
`Reflect.getMetadata` — cái bảng ẩn của [chương 1](01-decorators-and-metadata.md). Giá trị của nó nằm ở bốn hàm tiện ích:

```ts
import { Reflector } from "@nestjs/core";

reflector.get(key, target); // đọc một chỗ
reflector.getAll(key, [t1, t2]); // đọc nhiều chỗ, trả mảng thô
reflector.getAllAndOverride(key, [t1, t2]); // đọc nhiều chỗ, lấy CÁI ĐẦU TIÊN có giá trị
reflector.getAllAndMerge(key, [t1, t2]); // đọc nhiều chỗ, GỘP lại
```

Ví dụ với một decorator `Roles` dán ở cả class và method:

```ts
const Roles = (...roles: string[]) => SetMetadata("roles", roles);

@Roles("admin")
class UserController {
  @Roles("seller")
  list() {}

  plain() {}
}
```

| Gọi                                                   | Kết quả               | Vì sao                                        |
| ----------------------------------------------------- | --------------------- | --------------------------------------------- |
| `get("roles", list)`                                  | `["seller"]`          | đọc đúng hàm `list`                           |
| `get("roles", plain)`                                 | `undefined`           | `plain` không có nhãn                         |
| `get("roles", UserController)`                        | `["admin"]`           | đọc class                                     |
| `getAllAndOverride("roles", [list, UserController])`  | `["seller"]`          | `list` có giá trị → lấy, dừng                 |
| `getAllAndOverride("roles", [plain, UserController])` | `["admin"]`           | `plain` là `undefined` → nhìn tiếp sang class |
| `getAllAndMerge("roles", [list, UserController])`     | `["seller", "admin"]` | hai mảng nối lại                              |

Mã nguồn thật của hai hàm quan trọng (rút gọn), để thấy chúng đơn giản đến mức nào:

```js
getAllAndOverride(key, targets) {
  for (const target of targets) {
    const result = this.get(key, target);
    if (result !== undefined) return result;
  }
  return undefined;
}

getAllAndMerge(key, targets) {
  const values = this.getAll(key, targets).filter(v => v !== undefined);
  // ...một giá trị → trả nó; nhiều giá trị → mảng thì concat, object thì spread
}
```

Chọn hàm nào:

- **Override** khi nhãn là một **quyết định**: quyền cần, có public hay không, mã HTTP trả về. Method nói gì thì
  nghe method, không thì nghe class.
- **Merge** khi nhãn là một **danh sách cộng dồn**: nhiều role được phép, nhiều tag.

Dự án dùng **override** cho mọi nhãn tự viết — vì `@RequirePermission` là quyết định, không phải danh sách.

---

## 2. Thứ tự `targets` là một hợp đồng

Đây là dòng quan trọng nhất trong cả hệ phân quyền —
[access-token.guard.ts:77-79](../../src/shared/guards/access-token.guard.ts#L77-L79):

```ts
const required = this.reflector.getAllAndOverride<PermissionKey | undefined>(
  PERMISSION_KEY,
  [context.getHandler(), context.getClass()],
);
```

`[handler, class]` — **handler trước**. Với `getAllAndOverride`, thứ tự mảng là thứ tự ưu tiên. Nghĩa là:

- Method có `@RequirePermission` → dùng nó.
- Method không có, class có → dùng của class (một "mặc định cho cả controller").
- Cả hai không có → `undefined` → guard trả 500 ([chương 3](03-guards.md)).

Nếu ai đó "dọn code" thành `[context.getClass(), context.getHandler()]`, hệ thống vẫn compile, test vẫn chạy nếu
không có controller nào dán ở cấp class — nhưng ngày controller đầu tiên dán nhãn cấp class xuất hiện, **mọi method
bên trong bị ghi đè** bởi nhãn của class. Không có lỗi, chỉ có 403 khó hiểu.

Cùng thứ tự đó ở guard điều phối —
[authorization-header.guard.ts:40-47](../../src/shared/guards/authorization-header.guard.ts#L40-L47):

```ts
const authorizationMetadata = this.reflector.getAllAndOverride<
  AuthorizationHeaderMetadata | undefined
>(AUTHORIZATION_HEADER_KEY, [context.getHandler(), context.getClass()]);

const {
  authorizationTypes = [AuthorizationType.BEARER], // Default value is BEARER
  combinedCondition = CombinedAuthorizationCondition.AND, // Default value is AND
} = authorizationMetadata ?? {};
```

Hai dòng cuối là mẫu hay để học: **`undefined` từ Reflector được biến thành mặc định ngay tại chỗ đọc**, và mặc định
là **đóng** (`BEARER`). Route không dán gì = route cần đăng nhập. Không ai phải nhớ dán `@AuthApi([BEARER])`.

---

## 3. ExecutionContext — cửa sổ nhìn vào request đang chạy

Guard, interceptor và param decorator đều nhận một `ExecutionContext`. Nó trả lời hai loại câu hỏi:

**"Request này là gì?"** — thừa kế từ `ArgumentsHost`:

```ts
context.getType(); // "http" | "rpc" | "ws"
context.switchToHttp().getRequest(); // Express Request
context.switchToHttp().getResponse(); // Express Response
context.switchToHttp().getNext(); // Express next()
context.getArgs(); // [req, res, next] thô
```

**"Request này sẽ rơi vào đâu?"** — chỉ `ExecutionContext` mới có:

```ts
context.getClass(); // constructor của controller, ví dụ ManageProductController
context.getHandler(); // hàm method, ví dụ ManageProductController.prototype.getManageProducts
```

Ai nhận cái nào:

| Nơi                                       | Nhận                 | Biết handler?                                       |
| ----------------------------------------- | -------------------- | --------------------------------------------------- |
| Guard `canActivate(context)`              | `ExecutionContext`   | Có                                                  |
| Interceptor `intercept(context, next)`    | `ExecutionContext`   | Có                                                  |
| Param decorator factory `(data, context)` | `ExecutionContext`   | Có                                                  |
| Exception filter `catch(exception, host)` | `ArgumentsHost`      | **Không** — lỗi có thể ném từ nơi chưa chọn handler |
| Middleware `use(req, res, next)`          | Không có context nào | **Không** — [chương 4](04-middleware.md)            |

Dự án dùng `getType()` ở [global-exception.filter.ts:36](../../src/shared/filters/global-exception.filter.ts#L36)
để phòng ngày có gateway WebSocket — lúc đó `switchToHttp()` sẽ trả về thứ không có `.status()`.

---

## 4. Mắt xích khép kín: decorator dán lên đúng cái `getHandler()` trả về

Đây là chỗ hai chương nối vào nhau. Nhìn lại:

- [Chương 1, mục 7](01-decorators-and-metadata.md#7-setmetadata--decorator-metadata-trong-một-dòng): `SetMetadata` dán lên **`descriptor.value`** — chính là hàm method trên prototype.
- Chương này: `context.getHandler()` trả về **hàm method trên prototype**.

Cùng một object. Vì thế `reflector.get(KEY, context.getHandler())` tìm thấy đúng cái decorator đã dán. Không có
đăng ký, không có bảng tra riêng của Nest — chỉ là hai bên cùng chỉ vào một hàm.

```
Lúc định nghĩa class                          Lúc có request
──────────────────────────                    ───────────────────────────────
@RequirePermission("x")                       context.getHandler()
  → SetMetadata(KEY, "x")                       → ManageProductController.prototype.getManageProducts
  → Reflect.defineMetadata(                   reflector.get(KEY, ↑)
      KEY, "x",                                 → Reflect.getMetadata(KEY, ↑)
      ManageProductController                   → "x"
        .prototype.getManageProducts)
```

Hệ quả thực tế: **không bao giờ bind hay wrap method controller** kiểu `this.list = this.list.bind(this)` trong
constructor. Hàm mới không mang metadata của hàm cũ.

---

## 5. Đọc cả ứng dụng một lượt: DiscoveryService + MetadataScanner

Reflector đọc nhãn của **một** handler đang được gọi. Hai việc trong dự án cần đọc nhãn của **mọi** handler mà
không có request nào:

1. Lúc boot: có route nào quên `@RequirePermission` không?
2. Lúc seed: tập hợp mọi key đã khai để ghi vào bảng `Permission`.

Ba mảnh ghép, đều từ `@nestjs/core`:

| Mảnh               | Cho bạn                                                        | Cách lấy                                                                                          |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `DiscoveryModule`  | quyền dùng hai thứ dưới                                        | `imports: [DiscoveryModule]` — [base.module.ts:104](../../src/shared/modules/base.module.ts#L104) |
| `DiscoveryService` | `getControllers()`, `getProviders()` → mảng `InstanceWrapper`  | inject                                                                                            |
| `MetadataScanner`  | `getAllMethodNames(prototype)` → tên mọi method, kể cả kế thừa | inject                                                                                            |

`InstanceWrapper` là vỏ bọc Nest giữ cho mỗi provider/controller: `.metatype` (class), `.instance` (object đã
tạo), `.name`. Bạn cần `.metatype` để lấy `.prototype` rồi đọc metadata.

Hàm dùng chung của dự án —
[collect-route-permissions.util.ts:34-87](../../src/shared/utils/collect-route-permissions.util.ts#L34-L87).
Bản dưới đây **đã rút gọn và thêm chú thích đánh số** để đọc theo từng bước; file gốc không có mấy dòng `// 1.`,
`// 2.` này:

```ts
for (const wrapper of discoveryService.getControllers()) {         // 1. mọi controller
  const controllerClass = wrapper.metatype as Type<unknown> | undefined;
  if (!controllerClass) continue;

  const prototype = controllerClass.prototype as Record<string, unknown>;

  for (const methodName of metadataScanner.getAllMethodNames(prototype)) {   // 2. mọi method
    const handler = prototype[methodName];
    if (typeof handler !== "function") continue;

    if (Reflect.getMetadata(PATH_METADATA, handler) === undefined) continue;  // 3. chỉ giữ route

    const key = reflector.getAllAndOverride<PermissionKey | undefined>(      // 4. đọc nhãn, đúng thứ tự
      PERMISSION_KEY,
      [handler, controllerClass],
    );

    const authorization = reflector.getAllAndOverride<...>(
      AUTHORIZATION_HEADER_KEY,
      [handler, controllerClass],
    );

    // 5. suy ra isPublic / mixesPublicWithAuth, đẩy vào mảng kết quả
  }
}
```

Điểm đáng chú ý ở bước 4: **cùng `getAllAndOverride`, cùng `[handler, controllerClass]`** như trong guard. Đây là
cố ý — nếu quét dùng thứ tự khác guard, boot-check sẽ nói "route này có nhãn" trong khi guard lại đọc ra nhãn khác.
Một hàm, hai nơi gọi, không thể lệch.

---

## 6. Chạy lúc nào: lifecycle hooks

Quét toàn app chỉ có nghĩa khi **toàn app đã dựng xong**. Nest cho bốn móc theo thứ tự:

| Hook                                                                            | Chạy khi                                 | Dùng để                                  |
| ------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| `onModuleInit()`                                                                | module **đó** đã resolve xong dependency | khởi tạo nội bộ một module               |
| `onApplicationBootstrap()`                                                      | **mọi** module đã init                   | việc cần nhìn toàn app — quét controller |
| `onModuleDestroy()` / `beforeApplicationShutdown()` / `onApplicationShutdown()` | tắt app                                  | đóng kết nối                             |

[permission-coverage.service.ts:20-29](../../src/shared/services/permission-coverage.service.ts#L20-L29) implement
`OnApplicationBootstrap`, không phải `OnModuleInit`. Nếu dùng `onModuleInit`, lúc `BaseModule` init thì
`RouteModule` có thể chưa — `getControllers()` trả về danh sách thiếu, check xanh giả.

Một chi tiết vận hành: các hook này chạy trong **`app.init()`**, không cần `app.listen()`. Script seed tận dụng điều
đó — [create-permission.ts:22-23](../../initial-scripts/create-permission.ts#L22-L23):

```ts
const app = await NestFactory.create(AppModule);
await app.init(); // ← chú thích của tài liệu: hook chạy, controller có mặt, nhưng không bind port
```

Boot-check chạy ngay trong bước `init()` này, nên **script seed cũng bị chặn** nếu có route thiếu nhãn. Danh mục
không thể được ghi từ một app không nhất quán.

---

## 7. Nâng cao

**Decorator mang kiểu cho cả Reflector và Discovery (Nest 10.2+, có trong 11).**

```ts
// Reflector.createDecorator: thay SetMetadata + hằng số
export const RequirePermission = Reflector.createDecorator<PermissionKey>();
reflector.get(RequirePermission, context.getHandler()); // đã có kiểu PermissionKey | undefined

// DiscoveryService.createDecorator: đánh dấu provider để lọc lúc quét
export const Job = DiscoveryService.createDecorator<{ cron: string }>();
discoveryService.getProviders({ metadataKey: Job.KEY }); // chỉ provider có @Job
discoveryService.getMetadataByDecorator(Job, wrapper); // đọc { cron } ra
```

Dự án chưa dùng, nhưng đây là hướng đi khi bạn thêm loại metadata thứ ba, thứ tư.

**Điểm mù: module lazy.** `DiscoveryService` chỉ thấy những gì DI container **đã** tạo. Controller nạp qua
`LazyModuleLoader` sau `onApplicationBootstrap` sẽ thoát boot-check. Comment ở
[permission-coverage.service.ts:13-17](../../src/shared/services/permission-coverage.service.ts#L13-L17) ghi rõ,
và guard vẫn trả 500 cho route thiếu nhãn — điểm mù ồn ào, không im lặng.

**Kế thừa và override.** `Reflect.getMetadata` đi ngược prototype chain, nên `getAllAndOverride(KEY, [handler, class])`
với `handler` là method **kế thừa từ controller cha** vẫn đọc được nhãn dán ở cha. Bạn có thể tận dụng để làm
`BaseAdminController` dán `@RequirePermission` cấp class; nhưng nhớ [mục 2](#2-thứ-tự-targets-là-một-hợp-đồng) — method con không dán gì sẽ lấy nhãn cha.

**Đọc metadata ở interceptor và pipe cũng được.** Cả hai nhận `ExecutionContext`. `ClassSerializerInterceptor` của
Nest đọc `@SerializeOptions()` đúng bằng cách này. Nếu bạn cần "route này trả về cache 60s", một interceptor +
`SetMetadata("cache-ttl", 60)` là đủ.

**Không cần cache kết quả Reflector.** Bên dưới là `WeakMap.get` — nhanh hơn bất kỳ cache nào bạn tự viết. Đừng tối ưu
chỗ này.

---

## 8. Trong dự án này

| Việc                             | File                                                                                                                                      | Công cụ                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Đọc quyền handler cần            | [access-token.guard.ts:77-79](../../src/shared/guards/access-token.guard.ts#L77-L79)                                                      | `Reflector.getAllAndOverride`                        |
| Đọc policy xác thực, có mặc định | [authorization-header.guard.ts:40-47](../../src/shared/guards/authorization-header.guard.ts#L40-L47)                                      | `Reflector.getAllAndOverride`                        |
| Đọc `@Throttle` của thư viện     | `ThrottlerGuard` (trong `@nestjs/throttler`), nhãn dán ở [auth.controller.ts:71,89,114,...](../../src/routes/auth/auth.controller.ts#L71) | `Reflector`                                          |
| Lấy payload JWT xuống handler    | [active-user.decorator.ts:9-10](../../src/shared/param-decorators/active-user.decorator.ts#L9-L10)                                        | `ExecutionContext.switchToHttp().getRequest()`       |
| Lấy ngôn ngữ xuống handler       | [current-lang.decorator.ts:6](../../src/shared/param-decorators/current-lang.decorator.ts#L6)                                             | `I18nContext.current(ctx)` — thư viện đọc từ context |
| Phòng non-HTTP trong filter      | [global-exception.filter.ts:36](../../src/shared/filters/global-exception.filter.ts#L36)                                                  | `ArgumentsHost.getType()`                            |
| Quét mọi route                   | [collect-route-permissions.util.ts:34-87](../../src/shared/utils/collect-route-permissions.util.ts#L34-L87)                               | `DiscoveryService` + `MetadataScanner` + `Reflector` |
| Chạy quét sau khi app dựng xong  | [permission-coverage.service.ts:29](../../src/shared/services/permission-coverage.service.ts#L29)                                         | `onApplicationBootstrap`                             |
| Quét từ script ngoài             | [sync-permission-catalog.ts:34-38](../../initial-scripts/sync-permission-catalog.ts#L34-L38)                                              | `app.get(DiscoveryService)` sau `app.init()`         |

---

## 9. Tự kiểm chứng

**1. Bốn hàm Reflector, không cần boot Nest.** `Reflector` không có dependency, tạo bằng `new` được:

```ts
// scratch-reflector.ts
import "reflect-metadata";
import { SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

const Roles = (...roles: string[]) => SetMetadata("roles", roles);

@Roles("admin")
class UserController {
  @Roles("seller") list() {}
  plain() {}
}

const r = new Reflector();
const { list, plain } = UserController.prototype;

console.log("get list          :", r.get("roles", list));
console.log("get plain         :", r.get("roles", plain));
console.log(
  "override [list,C] :",
  r.getAllAndOverride("roles", [list, UserController]),
);
console.log(
  "override [plain,C]:",
  r.getAllAndOverride("roles", [plain, UserController]),
);
console.log(
  "override [C,list] :",
  r.getAllAndOverride("roles", [UserController, list]),
  "← đảo thứ tự",
);
console.log(
  "merge [list,C]    :",
  r.getAllAndMerge("roles", [list, UserController]),
);
```

```bash
npx ts-node --transpile-only scratch-reflector.ts
```

Dòng `override [C,list]` trả `["admin"]` dù `list` có nhãn riêng — đó chính là lỗi "đảo thứ tự" ở [mục 2](#2-thứ-tự-targets-là-một-hợp-đồng).

**2. Xem quét toàn app trả về gì.** Test có sẵn dựng `DiscoveryService` giả và kiểm tra từng nhánh lỗi:

```bash
npx jest src/shared/services/__tests__/permission-coverage.service.spec.ts
```

Đọc file spec đó — nó là tài liệu ngắn nhất về ba loại vi phạm mà boot-check bắt.

**3. Chứng minh `onApplicationBootstrap` chạy trong `app.init()`.** Chạy script seed ở môi trường có DB
(`pnpm seed:initial-scripts:create-permission`) và để ý dòng log `Permission coverage OK: N routes, M distinct
permission keys` xuất hiện **trước** dòng `Permission catalogue: ...`. Hook chạy xong rồi script mới quét.

---

**Tiếp theo:** [Chương 3 — Guard](03-guards.md): người dùng kết quả Reflector để quyết định cho qua hay chặn.
