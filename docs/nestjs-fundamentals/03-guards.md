# Chương 3 — Guard

> Guard là nơi kết quả của [chương 1](01-decorators-and-metadata.md) và 2 được **dùng để quyết định**. Chương này đi từ hợp đồng `CanActivate` đến
> guard ghép, guard kế thừa thư viện, và ba câu hỏi ai viết guard cũng phải trả lời: trả `false` hay `throw`, đăng
> ký kiểu nào để có DI, và khi hạ tầng hỏng thì mở hay đóng.

**Mục lục**

1. [Guard trả lời đúng một câu hỏi](#1-guard-trả-lời-đúng-một-câu-hỏi)
2. [`return false` hay `throw`?](#2-return-false-hay-throw)
3. [Guard tối giản trong dự án](#3-guard-tối-giản-trong-dự-án)
4. [Ba cách đăng ký, và vì sao dự án chọn `APP_GUARD`](#4-ba-cách-đăng-ký-và-vì-sao-dự-án-chọn-app_guard)
5. [Thứ tự chạy và short-circuit](#5-thứ-tự-chạy-và-short-circuit)
6. [Guard nhìn thấy gì — và không thấy gì](#6-guard-nhìn-thấy-gì--và-không-thấy-gì)
7. [Guard ghép: `AuthorizationHeaderGuard`](#7-guard-ghép-authorizationheaderguard)
8. [Guard kế thừa thư viện: `AppThrottlerGuard`](#8-guard-kế-thừa-thư-viện-appthrottlerguard)
9. [Truyền dữ liệu từ guard xuống handler](#9-truyền-dữ-liệu-từ-guard-xuống-handler)
10. [Fail-open hay fail-closed](#10-fail-open-hay-fail-closed)
11. [Test một guard](#11-test-một-guard)
12. [Nâng cao](#12-nâng-cao)
13. [Trong dự án này](#13-trong-dự-án-này)
14. [Tự kiểm chứng](#14-tự-kiểm-chứng)

---

## 1. Guard trả lời đúng một câu hỏi

_"Request này có được chạm tới handler không?"_ — có hoặc không. Không sửa request, không sửa response, không gọi
service nghiệp vụ. Hợp đồng:

```ts
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class MyGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return true;
  }
}
```

Một method, nhận `ExecutionContext` ([chương 2](02-reflector-execution-context-and-discovery.md)), trả về boolean — đồng bộ, Promise, hay Observable đều được. Nest
đợi kết quả rồi mới quyết định gọi handler hay không.

Vị trí trong dây chuyền: **sau middleware, trước interceptor và pipe**. Điều này quyết định guard thấy gì ([mục 6](#6-guard-nhìn-thấy-gì--và-không-thấy-gì)).

---

## 2. `return false` hay `throw`?

Hai cách chặn, hậu quả khác nhau:

| Cách                     | Nest làm gì                                             | Client nhận                       |
| ------------------------ | ------------------------------------------------------- | --------------------------------- |
| `return false`           | ném `ForbiddenException("Forbidden resource")` thay bạn | 403, thông điệp mặc định của Nest |
| `throw new XException()` | chuyển thẳng cho exception filter                       | mã và thông điệp **bạn** chọn     |

`return false` tiện cho guard chỉ có một lý do chặn. Nhưng xác thực có **ba** lý do khác hẳn nhau, và client cần
phân biệt để biết phải làm gì tiếp:

| Tình huống                           | Mã đúng | Client nên                             |
| ------------------------------------ | ------- | -------------------------------------- |
| Thiếu token / token hỏng / hết hạn   | **401** | đăng nhập lại hoặc refresh             |
| Có token hợp lệ nhưng thiếu quyền    | **403** | dừng, không thử lại                    |
| Không tra được quyền vì DB/Redis lỗi | **500** | thử lại sau — đây là sự cố phía server |

Vì thế guard của dự án **luôn `throw`**, qua một helper thống nhất —
[access-token.guard.ts:49-59](../../src/shared/guards/access-token.guard.ts#L49-L59):

```ts
if (error instanceof TokenExpiredError) {
  throwHttpException({
    type: "unauthorized",
    message: "Access token is expired.",
  });
}

throwHttpException({
  type: "unauthorized",
  message: "Access token is invalid.",
});
```

Và một quyết định đáng đọc kỹ ở [dòng 63-71](../../src/shared/guards/access-token.guard.ts#L63-L71): lỗi khi
_resolve_ quyền (hạ tầng) **được để nguyên cho lan lên** thành 500. Guard cũ bọc mọi thứ trong một `catch` và trả
"forbidden" — sự cố hạ tầng bị hoá trang thành chính sách, và người trực không bao giờ thấy.

> Quy tắc thực hành: guard chỉ bắt **những lỗi nó hiểu**. Lỗi không hiểu — cho đi.

---

## 3. Guard tối giản trong dự án

[api-key.guard.ts:13-29](../../src/shared/guards/api-key.guard.ts#L13-L29) là guard nhỏ nhất, đủ để thấy hình dạng:

```ts
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly appConfigService: AppConfigService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const headerApiKey = request.headers[SECRET_API_KEY];

    if (headerApiKey === "secretApiKey") {
      return true;
    }

    throw new UnauthorizedException("API key is invalid.");
  }
}
```

Ba bước kinh điển: **lấy request → kiểm → trả `true` hoặc ném**. Có DI (`AppConfigService`) dù dòng đọc config hiện
bị comment (dòng 21) và guard này chưa được route nào dùng — nó nằm đó làm nhánh `ApiKey` của guard ghép ở [mục 7](#7-guard-ghép-authorizationheaderguard).

---

## 4. Ba cách đăng ký, và vì sao dự án chọn `APP_GUARD`

| Cách                                  | Viết ở đâu | Phạm vi                  | Có DI không                                      |
| ------------------------------------- | ---------- | ------------------------ | ------------------------------------------------ |
| `@UseGuards(G)` trên method           | controller | một route                | Có                                               |
| `@UseGuards(G)` trên class            | controller | mọi route của controller | Có                                               |
| `app.useGlobalGuards(new G())`        | `main.ts`  | toàn app                 | **Không** — bạn `new` bằng tay, không ai tiêm gì |
| `{ provide: APP_GUARD, useClass: G }` | một module | toàn app                 | **Có** — Nest tạo instance qua container         |

Dòng cuối là lý do [base.module.ts:43-54](../../src/shared/modules/base.module.ts#L43-L54) trông như vậy:

```ts
const guards: Provider[] = [
  AccessTokenGuard,
  ApiKeyGuard,
  { provide: APP_GUARD, useClass: AppThrottlerGuard },
  { provide: APP_GUARD, useClass: AuthorizationHeaderGuard },
];
```

`AuthorizationHeaderGuard` cần `Reflector`, `AccessTokenGuard`, `ApiKeyGuard` tiêm vào. `AccessTokenGuard` lại cần
`TokenService`, `PermissionResolverService`. Với `useGlobalGuards(new ...)` bạn phải tự `new` cả cây đó — không
làm được. `APP_GUARD` để container làm.

Hai dòng đầu (`AccessTokenGuard`, `ApiKeyGuard`) là **provider thường**: có mặt trong container để được tiêm, nhưng
**không tự chạy** cho request nào. Chỉ hai dòng có `APP_GUARD` mới chạy. Nhầm điểm này là tưởng có bốn guard toàn
cục — thực ra là hai.

Dự án **không dùng `@UseGuards` ở đâu cả**. Mọi route đi qua cùng hai guard toàn cục; khác biệt giữa route nằm ở
**metadata** (`@RequirePermission`, `@AuthApi`, `@Throttle`), không ở việc gắn guard nào. Đó là mẫu đáng theo: guard
là hằng số, chính sách là dữ liệu.

---

## 5. Thứ tự chạy và short-circuit

Hai luật:

1. **Cấp:** guard toàn cục → guard cấp controller → guard cấp method.
2. **Trong một cấp:** theo thứ tự đăng ký / thứ tự trong `@UseGuards(A, B)`.

Mọi guard phải trả `true` thì handler mới chạy. Guard đầu tiên chặn (false hoặc throw) → **dừng ngay**, guard sau
không chạy. Đây là short-circuit, và nó là công cụ thiết kế:

```ts
// base.module.ts:39-42
// Order matters: Nest runs global guards in registration order, and rate
// limiting has to come first. Behind the auth guard it would never see the
// flood of unauthenticated requests it exists to stop, and every rejected
// request would still have paid for a token verification first.
```

`AppThrottlerGuard` đứng trước `AuthorizationHeaderGuard`. Nếu đảo lại: một cơn lũ request không token vẫn phải qua
verify JWT (tốn CPU) trước khi bị rate limit chặn — và rate limiter chỉ đếm những request đã qua auth, tức là không
đếm được đúng thứ nó sinh ra để chặn.

---

## 6. Guard nhìn thấy gì — và không thấy gì

Vì đứng **sau middleware, trước pipe**, guard có một góc nhìn cụ thể:

| Thấy                                                           | Không thấy                                                                          |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `request` đã qua body-parser → `req.body` là object thô        | body **chưa** qua `ValidationPipe` — chưa whitelist, chưa transform thành DTO class |
| header, query, params (chuỗi thô)                              | params đã parse — `ParseUUIDPipe` chưa chạy                                         |
| metadata của handler qua `Reflector`                           | kết quả handler (đó là việc của interceptor)                                        |
| những gì middleware đã gắn: `req.id` (pino), `req.i18nContext` | những gì param decorator sẽ tính (chúng chạy sau guard)                             |

Hệ quả thực hành:

- **Không validate DTO trong guard.** Body chưa sạch. `AppThrottlerGuard` của dự án đọc `req.body.email` để làm khoá
  rate-limit ([throttler-options.factory.ts:67-85](../../src/shared/utils/throttler-options.factory.ts#L67-L85)) — và
  vì thế phải tự phòng thủ: cắt độ dài, chuẩn hoá, không tin kiểu.
- **Metadata handler là siêu năng lực của guard.** Middleware không có. Đây là lý do duy nhất cần nhớ khi phân vân
  "viết guard hay middleware" — [chương 4](04-middleware.md).

---

## 7. Guard ghép: `AuthorizationHeaderGuard`

Route có thể cần Bearer, hoặc API key, hoặc không cần gì, hoặc **một trong hai**. Thay vì mỗi route gắn guard khác
nhau, dự án có **một guard điều phối** đọc nhãn rồi gọi guard con —
[authorization-header.guard.ts](../../src/shared/guards/authorization-header.guard.ts).

**Bảng tra guard con** (dòng 25-31):

```ts
private readonly authorizationTypeMapper = {
  [AuthorizationType.BEARER]: this.accessTokenGuard,
  [AuthorizationType.API_KEY]: this.apiKeyGuard,
  [AuthorizationType.NONE]: { canActivate: () => true },
};
```

`NONE` là một "guard" luôn cho qua — không cần class riêng, một object có `canActivate` là đủ vì Nest chỉ gọi method.

> Trông như bug: property initializer dùng `this.accessTokenGuard` **trước** constructor. Không sao — với
> `target: ES2021` trong tsconfig, TypeScript emit _parameter property_ (`this.accessTokenGuard = accessTokenGuard`)
> **trước** property initializer trong constructor. Đổi target lên ES2022 và bật `useDefineForClassFields` là thứ tự
> đổi, và dòng này thành `undefined`. Nếu một ngày guard này ném "cannot read canActivate of undefined", nhìn tsconfig.
>
> Tự kiểm chứng trong 30 giây — cùng một file, hai target (chạy ngoài repo cho output sạch):
>
> ```bash
> cat > /tmp/order.ts <<'EOF'
> class A {
>   private readonly map = { x: this.dep };
>   constructor(private readonly dep: string) {}
> }
> console.log(new A("có giá trị"));
> EOF
>
> npx tsc /tmp/order.ts --target ES2021 --types --outDir /tmp/a
> node /tmp/a/order.js
> #   → A { dep: 'có giá trị', map: { x: 'có giá trị' } }      ← parameter property gán trước
>
> npx tsc /tmp/order.ts --target ES2022 --useDefineForClassFields --types --outDir /tmp/b
> #   → error TS2729: Property 'dep' is used before its initialization.
> node /tmp/b/order.js
> #   → A { dep: 'có giá trị', map: { x: undefined } }          ← field khởi tạo trước, chưa có dep
> ```
>
> Hai lệnh `tsc` viết tách nhau, đừng nối bằng `&&`: ở target ES2022, `tsc` **báo lỗi và trả exit code 2**
> (nó tự phát hiện `dep` bị dùng trước khi khởi tạo — đúng cái ta muốn chứng minh), nhưng **vẫn emit file JS**,
> nên `node` chạy sau đó vẫn cho thấy `undefined`. Nối bằng `&&` thì `node` không bao giờ chạy.

**Đọc nhãn với mặc định đóng** (dòng 40-47, đã bàn ở [chương 2](02-reflector-execution-context-and-discovery.md)): không nhãn = `[BEARER]` + `AND`.

**Nhánh `OR`** (dòng 49-68):

```ts
for (const authorizationType of authorizationTypes) {
  const guardInstance = this.authorizationTypeMapper[authorizationType];
  try {
    const canActivate = await guardInstance.canActivate(context);
    if (canActivate) return true;
  } catch (error) {
    this.logger.error(error);
    continue; // guard con fail → thử guard tiếp theo
  }
}
throwHttpException({
  type: "unauthorized",
  message: "Authorization failed for all conditions.",
});
```

Thử lần lượt, ai cho qua đầu tiên là xong. **Nuốt lỗi của guard con** để thử tiếp — đúng với nghĩa "hoặc". Nhưng
để ý hai hệ quả:

1. Thông điệp lỗi chi tiết của guard con (401 "expired" vs "invalid") bị thay bằng một câu chung. Cái giá của OR.
2. Nếu `NONE` nằm trong danh sách OR cùng `BEARER`: token hỏng → `AccessTokenGuard` ném → bị nuốt → thử `NONE` → **qua
   luôn, không kiểm quyền**. Đây là lỗ hổng thật, và boot-check của dự án **từ chối khởi động** khi thấy hình dạng
   này ([permission-coverage.service.ts:44, 55-58](../../src/shared/services/permission-coverage.service.ts#L44)).
   `None` chỉ được đứng một mình.

**Nhánh `AND`** (dòng 70-77):

```ts
for (const authorizationType of authorizationTypes) {
  const guardInstance = this.authorizationTypeMapper[authorizationType];
  await guardInstance.canActivate(context); // guard con tự throw nếu fail
}
return true;
```

Mọi guard con phải qua. Không `try/catch` — guard con ném gì, client nhận đúng cái đó. Vì mặc định là `AND` với một
phần tử `[BEARER]`, **đường đi thường ngày** của một request là: vào nhánh này, gọi `AccessTokenGuard` một lần, xong.

Bài học từ guard ghép: khi gộp nhiều guard, bạn phải **quyết định rõ chuyện gì xảy ra khi một guard con fail**.
Nuốt hay lan? Câu trả lời khác nhau cho OR và AND, và nó ảnh hưởng đến cả bảo mật lẫn thông điệp lỗi.

---

## 8. Guard kế thừa thư viện: `AppThrottlerGuard`

Không phải guard nào cũng viết từ đầu. [app-throttler.guard.ts:18-44](../../src/shared/guards/app-throttler.guard.ts#L18-L44)
kế thừa `ThrottlerGuard` của `@nestjs/throttler` và chỉ **override một method**:

```ts
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const response = context.switchToHttp().getResponse<Response>();

    if (!response.headersSent) {
      response.header("Retry-After", String(detail.timeToBlockExpire));
    }

    throwHttpException({
      type: "tooManyRequests",
      message: "Too many requests. Please try again later.",
    });
  }
}
```

Toàn bộ logic đếm, lưu Redis, đọc `@Throttle()` — thư viện làm. Dự án chỉ đổi **cách báo lỗi**: dùng envelope lỗi
chung của API thay vì `ThrottlerException` của thư viện, và phát lại header `Retry-After` dưới tên chuẩn.

Guard này cũng là ví dụ tốt về **metadata của thư viện**: `@Throttle(AuthThrottle.LOGIN)` ở
[auth.controller.ts:89](../../src/routes/auth/auth.controller.ts#L89) là `SetMetadata` với key của
`@nestjs/throttler`; `ThrottlerGuard` đọc bằng `Reflector` — cùng cơ chế [chương 1](01-decorators-and-metadata.md)-2, chỉ khác người viết.

Nhớ dòng comment ở dòng 39-40: thông điệp **cố ý không nói** giới hạn nào bị chạm hay còn bao nhiêu — thông tin đó
là "oracle" miễn phí cho người đang dò rate limit.

---

## 9. Truyền dữ liệu từ guard xuống handler

Guard và handler không gọi nhau. Kênh duy nhất là **object `request`** — cả hai cùng cầm một tham chiếu.

Guard ghi hai lần, theo đúng thứ tự chạy:

```ts
// canActivate, dòng 123 — ngay sau khi verify token xong
request[REQUEST_USER_KEY] = payload; // "user"

// verifyPermission (được canActivate gọi ngay sau đó), dòng 99
request[REQUEST_GRANTED_PERMISSIONS_KEY] = granted; // "granted_permissions"
```

(Hai dòng nằm ở [123](../../src/shared/guards/access-token.guard.ts#L123) và
[99](../../src/shared/guards/access-token.guard.ts#L99) — số dòng nhỏ hơn lại chạy sau, vì `verifyPermission` được
định nghĩa phía trên `canActivate` trong file.)

Handler đọc qua param decorator ([chương 1, mục 8](01-decorators-and-metadata.md#8-createparamdecorator--loại-decorator-thứ-hai-chạy-mỗi-request)): `@ActiveUser("userId")`, `@PermissionScope([...])`.

Hai điểm kỹ thuật:

- Key là hằng số trong [auth.constant.ts:1-4](../../src/constants/auth.constant.ts#L1-L4), không phải chuỗi rải rác
  — đổi tên một chỗ.
- `request["granted_permissions"] = ...` compile được trên kiểu `Request` của Express **chỉ vì**
  `noImplicitAny: false` ([tsconfig.json:19](../../tsconfig.json#L19)). Cách chặt hơn là mở rộng kiểu:

```ts
// ví dụ minh hoạ — dự án chưa có
declare module "express" {
  interface Request {
    user?: AccessTokenPayload;
    granted_permissions?: ReadonlySet<PermissionKey>;
  }
}
```

Khi đó `request.user` có kiểu, và bật `noImplicitAny` sẽ không đỏ.

---

## 10. Fail-open hay fail-closed

Khi một thứ guard phụ thuộc bị hỏng, guard nên **mở** (cho qua) hay **đóng** (chặn)? Không có câu trả lời chung —
phải quyết từng phụ thuộc:

| Phụ thuộc                         | Hỏng thì                        | Vì sao                                                                    | Ở đâu                                                                                                        |
| --------------------------------- | ------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Redis cache tập quyền             | **Mở** — bỏ cache, đọc Postgres | Redis chỉ là tối ưu; mất nó app chậm, không sai                           | [role-permission-cache.service.ts:16-18](../../src/shared/services/role-permission-cache.service.ts#L16-L18) |
| Postgres (nguồn sự thật về quyền) | **Đóng** — 500                  | Không biết quyền thì không thể cho qua; và phải là 500 để người trực thấy | [permission-resolver.service.ts:19-21](../../src/shared/services/permission-resolver.service.ts#L19-L21)     |
| Route thiếu `@RequirePermission`  | **Đóng** — 500                  | Lỗi wiring, không phải lỗi client                                         | [access-token.guard.ts:81-93](../../src/shared/guards/access-token.guard.ts#L81-L93)                         |
| Redis của rate limiter            | (do `@nestjs/throttler` quyết)  | —                                                                         | `ThrottlerRedisStorage`                                                                                      |

Câu hỏi để tự kiểm mỗi lần viết `try/catch` trong guard: _"nếu tôi nuốt lỗi này, ai bị hại — người dùng hợp lệ hay
kẻ tấn công?"_ Nuốt lỗi Redis cache: người dùng hợp lệ vẫn vào được. Nuốt lỗi Postgres: kẻ tấn công có thể vào khi
DB chập chờn. Khác nhau hoàn toàn.

---

## 11. Test một guard

Guard chỉ cần một `ExecutionContext` — và `ExecutionContext` chỉ là object có vài method. Không cần boot Nest:

```ts
// hình dạng tối giản — dự án có bản đầy đủ ở src/shared/guards/__tests__/guards-test-harness.ts
const context = {
  getHandler: () => handlerFn, // hàm có (hoặc không có) metadata
  getClass: () => ControllerClass,
  switchToHttp: () => ({
    getRequest: () => request, // { headers: { authorization: "Bearer ..." } }
    getResponse: () => response,
  }),
} as unknown as ExecutionContext;

await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 401 });
```

Vì metadata nằm trên **hàm**, test có thể dán nhãn thật lên một hàm giả:
`Reflect.defineMetadata(PERMISSION_KEY, "product:read:own", handlerFn)`. Guard đọc ra đúng như production.

Bốn spec có sẵn để học cách viết: `access-token.guard.spec.ts`, `authorization-header.guard.spec.ts`,
`api-key.guard.spec.ts`, `app-throttler.guard.spec.ts` trong `src/shared/guards/__tests__/`.

---

## 12. Nâng cao

**Guard cho ngữ cảnh không phải HTTP.** `context.getType()` trả `"rpc"` hay `"ws"`; `switchToRpc()` /
`switchToWs()` thay `switchToHttp()`. Một guard có thể phục vụ nhiều loại transport nếu rẽ nhánh theo `getType()`.

**Guard cấp class và cấp method cùng chạy.** `@UseGuards(A)` trên class + `@UseGuards(B)` trên method → A rồi B.
Không phải "method đè class" như metadata — guard là **cộng dồn**.

**Không làm việc nặng hay ghi DB trong guard.** Guard chạy cho mọi request khớp, kể cả request sẽ bị pipe từ chối
ngay sau đó. Tra đọc có cache thì được (dự án làm vậy); ghi log audit vào DB thì không — để interceptor hoặc
service.

**Bỏ rate limit cho một route:** `@SkipThrottle()` của thư viện — cũng là metadata, `ThrottlerGuard` đọc và bỏ qua.

**Guard không sửa được response body khi trả `false`.** Muốn body riêng thì phải `throw` ([mục 2](#2-return-false-hay-throw)). Muốn thêm header
(như `Retry-After`) thì ghi vào `response` **trước** khi throw — đúng như `AppThrottlerGuard` làm, có kiểm
`headersSent`.

**Guard và `@Public()` kiểu phổ biến.** Nhiều dự án Nest viết `if (isPublic) return true` ở đầu guard auth. Dự án
này làm khác: public là một **loại xác thực** (`None`) trong guard điều phối, và boot-check ép mọi route phải chọn
rõ. Hai cách đều đúng; cách của dự án khó quên hơn.

---

## 13. Trong dự án này

| Guard                      | File                                                                                   | Kiểu                                     | Chạy khi                                  | Chặn bằng                               |
| -------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------- | --------------------------------------- |
| `AppThrottlerGuard`        | [app-throttler.guard.ts](../../src/shared/guards/app-throttler.guard.ts)               | Kế thừa thư viện, `APP_GUARD` thứ 1      | mọi request                               | 429 + `Retry-After`                     |
| `AuthorizationHeaderGuard` | [authorization-header.guard.ts](../../src/shared/guards/authorization-header.guard.ts) | Ghép / điều phối, `APP_GUARD` thứ 2      | mọi request                               | uỷ quyền guard con; OR fail → 401 chung |
| `AccessTokenGuard`         | [access-token.guard.ts](../../src/shared/guards/access-token.guard.ts)                 | Provider thường, được gọi bởi guard ghép | route có `Bearer` (mặc định)              | 401 / 403 / 500 phân biệt rõ            |
| `ApiKeyGuard`              | [api-key.guard.ts](../../src/shared/guards/api-key.guard.ts)                           | Provider thường, được gọi bởi guard ghép | route có `ApiKey` (hiện: không route nào) | 401                                     |

---

## 14. Tự kiểm chứng

**1. Ba mã lỗi từ một guard.** App đang chạy (`pnpm start:dev`), gọi:

```bash
# 401 — không token
curl -s -i localhost:3000/roles | head -1

# 401 — token rác
curl -s -i -H "Authorization: Bearer abc" localhost:3000/roles | head -1

# 403 — đăng nhập bằng tài khoản client rồi gọi route admin
TOKEN=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"<client-email>","password":"<password>"}' | jq -r .accessToken)
curl -s -i -H "Authorization: Bearer $TOKEN" localhost:3000/roles | head -1
```

Ba lần, ba mã khác nhau, cùng một guard.

**2. Xem short-circuit.** Gọi một route với token rác **thật nhanh nhiều lần** (vượt hạn mức) — bạn nhận 429, không
phải 401. Rate limiter đứng trước và dừng dây chuyền trước khi auth chạy.

**3. Chạy bộ test guard:**

```bash
npx jest src/shared/guards
```

Mở `authorization-header.guard.spec.ts` và tìm test về `OR` — nó chứng minh lỗi guard con bị nuốt và thử tiếp.

---

**Tiếp theo:** [Chương 4 — Middleware](04-middleware.md): tầng đứng **trước** guard, và vì sao nó không được giao
việc xác thực.
