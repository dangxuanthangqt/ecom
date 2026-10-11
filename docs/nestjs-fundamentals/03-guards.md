# Chương 3 — Guard

> Guard là nơi kết quả của [chương 1](01-decorators-and-metadata.md) và 2 được **dùng để quyết định**. Chương này đi
> từ hợp đồng `CanActivate`, qua cách Nest gọi guard trong mã nguồn, bảy guard viết tay từ dễ đến khó, đến guard ghép
> và guard kế thừa thư viện của dự án — và ba câu hỏi ai viết guard cũng phải trả lời: trả `false` hay `throw`, đăng
> ký kiểu nào để có DI, và khi hạ tầng hỏng thì mở hay đóng.
>
> **Cần đọc trước:** [chương 1](01-decorators-and-metadata.md) (`SetMetadata`, `createParamDecorator`),
> [chương 2](02-reflector-execution-context-and-discovery.md) (`ExecutionContext`, `Reflector`).

**Mục lục**

1. [Guard trả lời đúng một câu hỏi](#1-guard-trả-lời-đúng-một-câu-hỏi)
2. [Đọc mã nguồn: Nest gọi guard thế nào](#2-đọc-mã-nguồn-nest-gọi-guard-thế-nào)
3. [`return false` hay `throw`?](#3-return-false-hay-throw)
4. [Guard tối giản trong dự án](#4-guard-tối-giản-trong-dự-án)
5. [Bảy guard viết tay, từ dễ đến khó](#5-bảy-guard-viết-tay-từ-dễ-đến-khó)
6. [Ba cách đăng ký, và vì sao dự án chọn `APP_GUARD`](#6-ba-cách-đăng-ký-và-vì-sao-dự-án-chọn-app_guard)
7. [Thứ tự chạy và short-circuit](#7-thứ-tự-chạy-và-short-circuit)
8. [Guard nhìn thấy gì — và không thấy gì](#8-guard-nhìn-thấy-gì--và-không-thấy-gì)
9. [Guard ghép: `AuthorizationHeaderGuard`](#9-guard-ghép-authorizationheaderguard)
10. [Guard kế thừa thư viện: `AppThrottlerGuard`](#10-guard-kế-thừa-thư-viện-appthrottlerguard)
11. [Truyền dữ liệu từ guard xuống handler](#11-truyền-dữ-liệu-từ-guard-xuống-handler)
12. [Fail-open hay fail-closed](#12-fail-open-hay-fail-closed)
13. [Test một guard](#13-test-một-guard)
14. [Những lỗi hay gặp](#14-những-lỗi-hay-gặp)
15. [Guard, middleware, interceptor hay pipe?](#15-guard-middleware-interceptor-hay-pipe)
16. [Nâng cao](#16-nâng-cao)
17. [Trong dự án này](#17-trong-dự-án-này)
18. [Tự kiểm chứng](#18-tự-kiểm-chứng)

---

## 1. Guard trả lời đúng một câu hỏi

_"Request này có được chạm tới handler không?"_ — có hoặc không. Guard có thể gắn identity/grants vào request hoặc header liên quan quyết định; nhiệm vụ chính là cho qua/chặn, không gọi
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

Một method, nhận `ExecutionContext` ([chương 2](02-reflector-execution-context-and-discovery.md)), trả về boolean.
Ba dạng trả về đều hợp lệ, và bạn chọn theo việc guard phải làm:

```ts
// (a) Đồng bộ — chỉ đọc header / metadata, không chờ gì
canActivate(context: ExecutionContext): boolean {
  const req = context.switchToHttp().getRequest<Request>();
  return req.headers["x-internal"] === "1";
}

// (b) Promise — phải hỏi DB, Redis, hoặc verify JWT (async)
async canActivate(context: ExecutionContext): Promise<boolean> {
  const req = context.switchToHttp().getRequest<Request>();
  const user = await this.users.findById(req.params.id);
  return user !== null && !user.bannedAt;
}

// (c) Observable — hiếm; hữu ích khi nguồn quyết định đã là stream (RxJS)
canActivate(context: ExecutionContext): Observable<boolean> {
  return this.featureFlags.isEnabled$("new-checkout").pipe(take(1));
}
```

Với (c), Nest lấy **giá trị cuối** của Observable (`lastValueFrom`) — Observable phải complete, nếu không request
treo mãi. Vì thế `take(1)` hoặc `first()` gần như luôn đi kèm. Trong thực tế 95% guard là dạng (a) hoặc (b); cả bốn
guard của dự án đều thế.

Vị trí trong dây chuyền: **sau middleware, trước interceptor và pipe**. Điều này quyết định guard thấy gì
([mục 8](#8-guard-nhìn-thấy-gì--và-không-thấy-gì)).

```
request ─▶ middleware ─▶ [ GUARD ] ─▶ interceptor(trước) ─▶ pipe ─▶ handler ─▶ interceptor(sau) ─▶ response
                            │
                            └── false / throw ──▶ exception filter ──▶ response lỗi
```

---

## 2. Đọc mã nguồn: Nest gọi guard thế nào

Toàn bộ cơ chế guard của Nest 11 nằm trong hai hàm ngắn. Đọc chúng một lần, mọi "luật" ở các mục sau trở thành hiển
nhiên thay vì phải nhớ.

**Hàm thứ nhất** — `GuardsConsumer.tryActivate` (`node_modules/@nestjs/core/guards/guards-consumer.js`):

```js
async tryActivate(guards, args, instance, callback, type) {
  if (!guards || isEmpty(guards)) {
    return true;                                   // (1) không có guard → qua
  }
  const context = this.createContext(args, instance, callback);
  context.setType(type);                           // (2) "http" | "rpc" | "ws"
  for (const guard of guards) {                    // (3) theo đúng thứ tự mảng
    const result = guard.canActivate(context);
    if (await this.pickResult(result)) {           // (4) await cả boolean, Promise, Observable
      continue;
    }
    return false;                                  // (5) guard đầu tiên trả false → dừng ngay
  }
  return true;
}

async pickResult(result) {
  if (result instanceof Observable) {
    return lastValueFrom(result);                  // Observable → đợi giá trị cuối
  }
  return result;                                   // boolean hoặc Promise<boolean> → await xử lý
}
```

**Hàm thứ hai** — `RouterExecutionContext.createGuardsFn`
(`node_modules/@nestjs/core/router/router-execution-context.js`):

```js
createGuardsFn(guards, instance, callback, contextType) {
  const canActivateFn = async (args) => {
    const canActivate = await this.guardsConsumer.tryActivate(guards, args, instance, callback, contextType);
    if (!canActivate) {
      throw new ForbiddenException(FORBIDDEN_MESSAGE);   // (6) false → 403 "Forbidden resource"
    }
  };
  return guards.length ? canActivateFn : null;
}
```

Bảy điều rút ra, mỗi điều là một mục phía dưới:

| Dòng | Điều rút ra                                                                                                | Mục                                                                 |
| ---- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| (1)  | Route không có guard nào thì không tốn gì — không có "guard rỗng" chạy ngầm                                | —                                                                   |
| (2)  | Một `ExecutionContext` **mới** cho mỗi request, gắn loại transport                                         | [16](#16-nâng-cao)                                                  |
| (3)  | Thứ tự chạy = thứ tự trong mảng `guards`; mảng này Nest ghép từ global → class → method                    | [7](#7-thứ-tự-chạy-và-short-circuit)                                |
| (4)  | Guard **chạy tuần tự**, không song song — guard sau chỉ chạy khi guard trước đã `await` xong và trả `true` | [7](#7-thứ-tự-chạy-và-short-circuit)                                |
| (5)  | `return false` dừng vòng lặp tức thì; guard sau không được gọi                                             | [7](#7-thứ-tự-chạy-và-short-circuit)                                |
| (6)  | `false` luôn thành 403 với thông điệp cố định; muốn mã khác phải `throw`                                   | [3](#3-return-false-hay-throw)                                      |
| —    | Không có `try/catch` nào: guard `throw` gì, lỗi đó bay thẳng lên exception filter                          | [3](#3-return-false-hay-throw), [12](#12-fail-open-hay-fail-closed) |

> Cái `guards` truyền vào là mảng **instance** đã được resolve sẵn lúc boot (qua `GuardsContextCreator`), không phải
> class. Nghĩa là guard không được tạo lại mỗi request — một instance dùng chung, đúng như provider singleton
> ([chương 8](08-request-and-provider-instances.md)). Đừng giữ state theo request trong field của guard.

---

## 3. `return false` hay `throw`?

Hai cách chặn, hậu quả khác nhau:

| Cách                     | Nest làm gì                                             | Client nhận                       |
| ------------------------ | ------------------------------------------------------- | --------------------------------- |
| `return false`           | ném `ForbiddenException("Forbidden resource")` thay bạn | 403, thông điệp mặc định của Nest |
| `throw new XException()` | chuyển thẳng cho exception filter                       | mã và thông điệp **bạn** chọn     |

Cùng một guard, hai cách viết, hai response khác nhau:

```ts
// Cách 1 — return false
canActivate(ctx: ExecutionContext) {
  return this.hasToken(ctx);
}
// → HTTP 403  { "statusCode": 403, "message": "Forbidden resource", "error": "Forbidden" }
//   Client đọc: "tôi không có quyền" — nhưng thực ra là chưa đăng nhập. Sai thông điệp.

// Cách 2 — throw
canActivate(ctx: ExecutionContext) {
  if (!this.hasToken(ctx)) {
    throw new UnauthorizedException("Access token is required.");
  }
  return true;
}
// → HTTP 401  { "statusCode": 401, "message": "Access token is required.", ... }
//   Client đọc: "đăng nhập đi". Đúng.
```

`return false` tiện cho guard chỉ có một lý do chặn và lý do đó thật sự là "cấm" (403). Nhưng xác thực có **ba** lý
do khác hẳn nhau, và client cần phân biệt để biết phải làm gì tiếp:

| Tình huống                           | Mã đúng | Client nên                             |
| ------------------------------------ | ------- | -------------------------------------- |
| Thiếu token / token hỏng / hết hạn   | **401** | đăng nhập lại hoặc refresh             |
| Có token hợp lệ nhưng thiếu quyền    | **403** | dừng, không thử lại                    |
| Không tra được quyền vì DB/Redis lỗi | **500** | thử lại sau — đây là sự cố phía server |

Vì thế guard của dự án **luôn `throw`**, qua một helper thống nhất —
[access-token.guard.ts:50-59](../../src/shared/guards/access-token.guard.ts#L50-L59):

```ts
if (error instanceof TokenExpiredError) {
  throwHttpException({
    type: "unauthorized",
    code: ErrorCode.ACCESS_TOKEN_EXPIRED,
    message: "Access token is expired.",
  });
}

throwHttpException({
  type: "unauthorized",
  code: ErrorCode.ACCESS_TOKEN_INVALID,
  message: "Access token is invalid.",
});
```

Để ý thêm trường `code`: client phân biệt "hết hạn" (nên gọi refresh) với "hỏng" (nên đăng xuất) bằng mã máy đọc
được, không phải bằng so chuỗi `message`. Cùng 401 nhưng hai hành động khác nhau phía client.

Và một quyết định đáng đọc kỹ ở [dòng 63-71](../../src/shared/guards/access-token.guard.ts#L63-L71): lỗi khi
_resolve_ quyền (hạ tầng) **được để nguyên cho lan lên** thành 500. Guard cũ bọc mọi thứ trong một `catch` và trả
"forbidden" — sự cố hạ tầng bị hoá trang thành chính sách, và người trực không bao giờ thấy.

> Quy tắc thực hành: guard chỉ bắt **những lỗi nó hiểu**. Lỗi không hiểu — cho đi.

**Ném lỗi không phải `HttpException` thì sao?** Nếu guard `throw new Error("boom")`, Nest không biết mã nào, filter
mặc định trả 500 và log stack. Đó là hành vi **đúng** cho lỗi hạ tầng — nhưng nếu bạn vô tình ném `Error` cho một
lý do nghiệp vụ ("thiếu header"), client nhận 500 vô nghĩa. Lỗi nghiệp vụ luôn là `HttpException` (hoặc helper bọc
nó như `throwHttpException`).

---

## 4. Guard tối giản trong dự án

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
bị comment (dòng 21) và guard này chưa được route nào dùng — nó nằm đó làm nhánh `ApiKey` của guard ghép ở
[mục 9](#9-guard-ghép-authorizationheaderguard).

Hai điểm nhỏ đáng học ngay từ guard nhỏ nhất:

- `SECRET_API_KEY` là `"x-api-key"` — **chữ thường**. Node hạ mọi tên header về chữ thường trong `req.headers`, nên
  `request.headers["X-Api-Key"]` luôn là `undefined`. Lỗi này im lặng: guard chỉ ném 401 đều đặn.
- `request.headers[...]` có kiểu `string | string[] | undefined`. So sánh `===` với chuỗi tự động loại trường hợp
  mảng (client gửi header hai lần). Nếu bạn viết `.startsWith(...)` thì phải kiểm kiểu trước.

---

## 5. Bảy guard viết tay, từ dễ đến khó

Mỗi guard dưới đây là một mẫu hoàn chỉnh, chạy được, và minh hoạ đúng **một** kỹ thuật mới so với guard trước nó.
Chúng không có trong repo — đây là bài tập tay; [mục 17](#17-trong-dự-án-này) là bảng những guard **có** trong repo.

### 5.1. `MaintenanceGuard` — guard không cần request

Kỹ thuật: guard có thể **không nhìn request** mà quyết định bằng trạng thái bên ngoài. Ví dụ dùng `ConfigService` từ `@nestjs/config`; module phải import `ConfigModule`. `AppConfigService` hiện không có API public `get()` hoặc trường maintenance; muốn tích hợp vào repo cần khai và validate cấu hình này.

```ts
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    if (this.config.get("MAINTENANCE_MODE") === "true") {
      throw new ServiceUnavailableException("Service is under maintenance.");
    }
    return true;
  }
}
```

Đăng ký làm `APP_GUARD` **đầu tiên**, mọi route trả 503 khi bật cờ — trước cả rate limit, trước cả verify token. Lưu
ý: cờ đọc mỗi request từ config đã load lúc boot, nên đổi env phải restart. Muốn bật/tắt nóng thì đọc từ Redis —
và lúc đó câu hỏi fail-open/fail-closed ở [mục 12](#12-fail-open-hay-fail-closed) xuất hiện ngay.

### 5.2. `InternalNetworkGuard` — guard đọc request thô

Kỹ thuật: header và IP là **chuỗi thô, chưa validate**; guard phải tự phòng thủ kiểu.

```ts
@Injectable()
export class InternalNetworkGuard implements CanActivate {
  private readonly allowed = new Set(["10.0.0.0/8", "127.0.0.1"]);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    // req.ip đã tôn trọng `trust proxy` nếu main.ts bật; nếu không, đây là IP của LB.
    const ip = req.ip ?? req.socket.remoteAddress ?? "";

    if (!this.isAllowed(ip)) {
      // 404 thay 403: không xác nhận với người ngoài rằng route này tồn tại
      throw new NotFoundException();
    }
    return true;
  }

  private isAllowed(ip: string): boolean {
    return this.allowed.has(ip) || ip.startsWith("10.");
  }
}
```

Dùng cho `/metrics`, `/admin/jobs`… Điểm đáng nhớ: **mã lỗi cũng là chính sách** — trả 404 thay 403 để không lộ
sự tồn tại của route. Cùng ý với `AppThrottlerGuard` cố ý không nói giới hạn nào bị chạm ([mục 10](#10-guard-kế-thừa-thư-viện-appthrottlerguard)).

### 5.3. `RolesGuard` — guard đọc metadata (mẫu kinh điển của Nest)

Kỹ thuật: **decorator dán nhãn + guard đọc nhãn qua `Reflector`**. Đây là mẫu trong tài liệu chính thức của Nest, và
là thứ dự án đã thay bằng permission ([mục 5.3b](#53b-vì-sao-dự-án-không-dùng-rolesguard)).

```ts
// roles.decorator.ts
export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true; // không dán nhãn = không giới hạn theo role
    }

    const req = context.switchToHttp().getRequest<Request>();
    const user = req[REQUEST_USER_KEY] as { roleName?: string } | undefined;

    if (!user) {
      throw new UnauthorizedException(); // RolesGuard chạy sau guard xác thực
    }

    return required.includes(user.roleName ?? "");
  }
}

// controller
@Roles("admin")
@Delete(":id")
remove(@Param("id") id: string) { ... }
```

Ba chi tiết:

- `getAllAndOverride([handler, class])`: nhãn trên method **đè** nhãn trên class. Có `@Roles("admin")` trên class
  và `@Roles("admin", "seller")` trên một method → method đó cho seller vào. Nếu muốn **gộp** thì dùng
  `getAllAndMerge`, cho `["admin", "admin", "seller"]`.
- Guard này **phụ thuộc thứ tự**: nó đọc `req.user` mà guard xác thực gắn. Đăng ký sai thứ tự → luôn 401. Xem
  [mục 7](#7-thứ-tự-chạy-và-short-circuit).
- `return true` khi không có nhãn là **fail-open theo thiết kế**: route quên `@Roles` thì ai đăng nhập cũng vào.
  Đây chính là điểm yếu dự án đóng lại bằng boot-check ([mục 12](#12-fail-open-hay-fail-closed)).

#### 5.3b. Vì sao dự án không dùng `RolesGuard`

`@Roles("admin")` khoá cứng **tên role** vào code. Thêm role "support" là phải sửa hàng chục controller. Dự án dán
**quyền** (`@RequirePermission("brand:delete:any")`) và tra bảng role→permission trong DB
([access-token.guard.ts:98-110](../../src/shared/guards/access-token.guard.ts#L98-L110)). Thêm role mới là thêm
dòng trong DB, không đụng code. Cơ chế guard **y hệt** `RolesGuard` — chỉ khác nhãn nói về "cần gì" thay vì "là
ai". Toàn bộ mô hình ở [authorization-guide.md](../authorization-guide.md).

### 5.4. `BannedUserGuard` — guard async hỏi DB

Kỹ thuật: guard **async** với phụ thuộc ngoài, và quyết định lỗi nào bắt, lỗi nào cho lan. Schema của repo có `User.status` (`ACTIVE`, `INACTIVE`, `BLOCKED`), không có `bannedAt`; ví dụ chỉ cho phép tài khoản ACTIVE. Đăng ký guard này sau guard xác thực.

```ts
@Injectable()
export class BannedUserGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req[REQUEST_USER_KEY] as AccessTokenPayload | undefined;

    if (!user) {
      return true; // route public — không có ai để kiểm
    }

    // Không try/catch: Prisma lỗi → 500, đúng bản chất. Xem mục 12.
    const row = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { status: true },
    });

    if (!row || row.status !== "ACTIVE") {
      throw new ForbiddenException("Account is suspended.");
    }
    return true;
  }
}
```

Vấn đề thật của guard này không phải code mà là **chi phí**: một query DB cho **mỗi** request đã đăng nhập. Ba cách
trả lời, theo thứ tự nên thử:

1. Đưa trạng thái tài khoản vào JWT payload → không cần query, nhưng ban chỉ có hiệu lực khi token hết hạn (15 phút?).
2. Cache trong Redis với TTL ngắn — đúng cách dự án làm với tập quyền
   ([redis-role-permission-cache.md](../redis-role-permission-cache.md)).
3. Chấp nhận query nếu DB nhẹ và yêu cầu ban tức thì là cứng.

Guard là nơi tốt để **quyết định**, không phải nơi tốt để **tính toán đắt** — [mục 16](#16-nâng-cao).

### 5.5. `RequireHeader(name)` — guard nhận tham số (mixin)

Kỹ thuật: `@UseGuards` chỉ nhận class hoặc instance, không nhận tham số. Muốn `@UseGuards(RequireHeader("x-tenant"))`
thì phải viết **hàm trả về class** — Nest gọi đây là _mixin_.

```ts
import { mixin, Type } from "@nestjs/common";

export const RequireHeader = (name: string): Type<CanActivate> => {
  @Injectable()
  class RequireHeaderGuard implements CanActivate {
    constructor(private readonly logger: PinoLogger) {} // vẫn có DI

    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest<Request>();
      if (typeof req.headers[name.toLowerCase()] !== "string") {
        this.logger.warn(`missing header ${name}`);
        throw new BadRequestException(`Header ${name} is required.`);
      }
      return true;
    }
  }
  return mixin(RequireHeaderGuard);
};

// dùng
@UseGuards(RequireHeader("x-tenant"))
@Get()
list() { ... }
```

`mixin()` đặt tên class ngẫu nhiên để hai lần gọi `RequireHeader("a")` và `RequireHeader("b")` không đụng nhau
trong container. Nếu không cần DI thì đơn giản hơn: truyền **instance** — `@UseGuards(new RequireHeaderGuard("x-tenant"))`
với constructor nhận `name`. Nest chấp nhận cả class lẫn instance trong `@UseGuards`.

So với cách dự án làm: `@AuthApi([...], "OR")` **không** tạo guard mới mỗi lần — nó chỉ dán metadata, và **một**
guard toàn cục đọc metadata rồi rẽ nhánh ([mục 9](#9-guard-ghép-authorizationheaderguard)). Mixin phù hợp khi mỗi
route cần guard **khác hẳn** nhau; metadata phù hợp khi mọi route cần **cùng một guard với tham số khác**. Dự án ở
trường hợp thứ hai.

### 5.6. `OwnershipGuard` — và vì sao nó thường là ý tồi

Kỹ thuật: guard đọc `params` — và bài học **khi nào không nên viết guard**.

Yêu cầu quen thuộc: "seller chỉ sửa được sản phẩm của mình". Viết thành guard:

```ts
@Injectable()
export class ProductOwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req[REQUEST_USER_KEY] as AccessTokenPayload;

    // params.id là CHUỖI THÔ — ParseUUIDPipe chưa chạy (mục 8)
    const id = req.params.id;
    if (!isUUID(id)) throw new NotFoundException();

    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { createdById: true },
    });

    if (!product) throw new NotFoundException();
    if (product.createdById !== user.userId) throw new ForbiddenException();
    return true;
  }
}
```

Chạy được, nhưng có bốn vấn đề:

1. **Query hai lần**: guard `findUnique` để kiểm chủ, rồi service `findUnique` lại để sửa. Chưa kể race: giữa hai
   lần, chủ sở hữu có thể đã đổi.
2. **Admin phải được đi vòng**: thêm `if (user.roleName === "admin") return true` — và tên role lại vào code.
3. **Không tái dụng**: `OrderOwnershipGuard`, `ReviewOwnershipGuard`… mỗi resource một guard gần giống nhau.
4. **Guard biết quá nhiều nghiệp vụ**: nó biết bảng `product` có cột `createdById`.

Dự án làm khác: guard chỉ xác định **phạm vi** (`own` hay `any`) rồi để service lo. `@PermissionScope(["product",
"update"])` ([permission-scope.decorator.ts](../../src/shared/param-decorators/permission-scope.decorator.ts)) trả
`"own"` hoặc `"any"`, service biến thành `where`:

```ts
// trong service — một query, làm cả kiểm chủ lẫn update
await this.prisma.product.update({
  where: {
    id,
    ...(scope === Scope.OWN ? { createdById: userId } : {}),
  },
  data,
});
// → Prisma ném "record not found" nếu không phải của mình → 404, không lộ sự tồn tại
```

Quy tắc: guard quyết định **"được vào cửa không"**; **"được chạm vào bản ghi nào"** là việc của tầng truy vấn, vì
chỉ ở đó câu hỏi và dữ liệu ở cùng một nơi.

### 5.7. `WsAuthGuard` — guard cho transport khác HTTP

Kỹ thuật: `context.getType()` và `switchToWs()`. Một guard có thể phục vụ nhiều transport.

```ts
@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== "ws") {
      return true; // hoặc throw — tuỳ bạn muốn guard này chặt đến đâu
    }

    const client = context.switchToWs().getClient<Socket>();
    const token = client.handshake.auth?.token as string | undefined;

    if (!token) {
      throw new WsException("Unauthorized"); // KHÔNG phải HttpException
    }

    client.data.user = await this.tokens.verifyAccessToken(token);
    return true;
  }
}
```

Hai khác biệt so với HTTP:

- Ném `WsException`, không `UnauthorizedException`. Filter WebSocket không hiểu mã HTTP.
- Không có `request` để gắn dữ liệu — gắn vào `client.data`. Cùng ý với [mục 11](#11-truyền-dữ-liệu-từ-guard-xuống-handler), khác object.

Với microservice (`"rpc"`): `switchToRpc().getData()` là payload message, `getContext()` là metadata transport
(header Kafka, properties RabbitMQ…). Dự án hiện chỉ có HTTP nên không có guard nào rẽ nhánh theo `getType()`.

---

## 6. Ba cách đăng ký, và vì sao dự án chọn `APP_GUARD`

| Cách                                  | Viết ở đâu | Phạm vi                  | Có DI không                                      |
| ------------------------------------- | ---------- | ------------------------ | ------------------------------------------------ |
| `@UseGuards(G)` trên method           | controller | một route                | Có                                               |
| `@UseGuards(G)` trên class            | controller | mọi route của controller | Có                                               |
| `app.useGlobalGuards(new G())`        | `main.ts`  | toàn app                 | **Không** — bạn `new` bằng tay, không ai tiêm gì |
| `{ provide: APP_GUARD, useClass: G }` | một module | toàn app                 | **Có** — Nest tạo instance qua container         |

Cả bốn cách trong code:

```ts
// (1) một route
@Controller("products")
export class ProductController {
  @UseGuards(InternalNetworkGuard)
  @Post("reindex")
  reindex() { ... }
}

// (2) cả controller — mọi route trong đây đều qua guard
@UseGuards(RolesGuard)
@Controller("admin")
export class AdminController { ... }

// (3) toàn app, KHÔNG có DI — chỉ được khi guard không cần gì
// main.ts
app.useGlobalGuards(new MaintenanceGuardWithoutDeps());

// (4) toàn app, CÓ DI — cách dự án dùng
@Module({
  providers: [{ provide: APP_GUARD, useClass: AuthorizationHeaderGuard }],
})
export class BaseModule {}
```

`@UseGuards` nhận nhiều guard, và nhận cả instance: `@UseGuards(RolesGuard, new RequireHeaderGuard("x-tenant"))`.
Instance thì không có DI, class thì có — cùng luật với cách (3) và (4).

Dòng cuối bảng là lý do [base.module.ts:43-54](../../src/shared/modules/base.module.ts#L43-L54) trông như vậy:

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

**Bẫy `APP_GUARD` "trong module con".** Đặt `{ provide: APP_GUARD, useClass: G }` trong `ProductModule` **không**
làm G chỉ chạy cho route của product. `APP_GUARD` luôn là **toàn app**, bất kể khai ở module nào — module chỉ quyết
định G được resolve dependency từ scope nào. Muốn phạm vi một module → `@UseGuards` trên từng controller của module
đó (hoặc một base controller chung).

**Vì sao `useGlobalGuards` vẫn tồn tại?** Cho trường hợp guard không cần DI, hoặc ứng dụng không dùng module Nest
đầy đủ. Nếu bạn thật sự cần vừa `useGlobalGuards` vừa DI, có cách lách: `app.useGlobalGuards(app.get(MyGuard))` —
lấy instance đã có từ container. Nhưng `APP_GUARD` gọn hơn và test được.

Dự án **không dùng `@UseGuards` ở đâu cả**. Mọi route đi qua cùng hai guard toàn cục; khác biệt giữa route nằm ở
**metadata** (`@RequirePermission`, `@AuthApi`, `@Throttle`), không ở việc gắn guard nào. Đó là mẫu đáng theo: guard
là hằng số, chính sách là dữ liệu.

---

## 7. Thứ tự chạy và short-circuit

Hai luật (đọc thẳng từ vòng `for` ở [mục 2](#2-đọc-mã-nguồn-nest-gọi-guard-thế-nào)):

1. **Cấp:** guard toàn cục → guard cấp controller → guard cấp method.
2. **Trong một cấp:** theo thứ tự đăng ký / thứ tự trong `@UseGuards(A, B)`.

Một ví dụ đủ để thấy cả hai luật và short-circuit:

```ts
// base.module.ts
{ provide: APP_GUARD, useClass: G1 },
{ provide: APP_GUARD, useClass: G2 },

// controller
@UseGuards(G3)
@Controller("x")
class XController {
  @UseGuards(G4, G5)
  @Get()
  get() { return "ok"; }
}
```

Mỗi guard `console.log(tên)` rồi trả `true`, riêng `G4` trả `false`:

```
G1
G2
G3
G4
→ 403 Forbidden resource        (G5 và handler không chạy)
```

Guard cấp method **cộng dồn** với cấp class và cấp global, không đè. Đây là khác biệt lớn với metadata
(`getAllAndOverride` cho method đè class).

Short-circuit là công cụ thiết kế, và dự án dùng nó có chủ đích:

```ts
// base.module.ts:40-43
// Order matters: Nest runs global guards in registration order, and rate
// limiting has to come first. Behind the auth guard it would never see the
// flood of unauthenticated requests it exists to stop, and every rejected
// request would still have paid for a token verification first.
```

`AppThrottlerGuard` đứng trước `AuthorizationHeaderGuard`. Nếu đảo lại: một cơn lũ request không token vẫn phải qua
verify JWT (tốn CPU) trước khi bị rate limit chặn — và rate limiter chỉ đếm những request đã qua auth, tức là không
đếm được đúng thứ nó sinh ra để chặn.

Nguyên tắc chung khi xếp guard: **rẻ trước, đắt sau; chặn nhiều trước, chặn ít sau; guard cung cấp dữ liệu trước
guard tiêu thụ dữ liệu**. Ví dụ đúng thứ tự cho một app có nhiều guard hơn dự án:

```
MaintenanceGuard      (đọc 1 cờ)              → chặn mọi thứ khi bảo trì
AppThrottlerGuard     (1 lệnh Redis INCR)     → chặn lũ
AuthorizationHeader   (verify JWT + tra quyền) → gắn req.user, req.granted_permissions
BannedUserGuard       (đọc req.user, 1 query) → cần req.user đã có
```

Đảo hai dòng cuối là `BannedUserGuard` luôn thấy `req.user === undefined`.

---

## 8. Guard nhìn thấy gì — và không thấy gì

Vì đứng **sau middleware, trước pipe**, guard có một góc nhìn cụ thể:

| Thấy                                                           | Không thấy                                                                          |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `request` đã qua body-parser → `req.body` là object thô        | body **chưa** qua `ValidationPipe` — chưa whitelist, chưa transform thành DTO class |
| header, query, params (chuỗi thô)                              | params đã parse — `ParseUUIDPipe` chưa chạy                                         |
| metadata của handler qua `Reflector`                           | kết quả handler (đó là việc của interceptor)                                        |
| những gì middleware đã gắn: `req.id` (pino), `req.i18nContext` | những gì param decorator sẽ tính (chúng chạy sau guard)                             |

Cụ thể với một request `GET /products/abc?limit=10` có `@Param("id", ParseUUIDPipe)` và `@Query() dto: PageQueryDto`:

```ts
canActivate(ctx) {
  const req = ctx.switchToHttp().getRequest<Request>();
  req.params.id;    // "abc"  — chuỗi, chưa bị ParseUUIDPipe từ chối (400 sẽ đến SAU guard)
  req.query.limit;  // "10"   — chuỗi, chưa thành number 10 của DTO
  req.body;         // {}     — body-parser đã chạy; với POST là JSON thô, chưa whitelist
}
```

Hệ quả thực hành:

- **Không validate DTO trong guard.** Body chưa sạch. `AppThrottlerGuard` của dự án đọc `req.body.email` để làm khoá
  rate-limit ([throttler-options.factory.ts:67-85](../../src/shared/utils/throttler-options.factory.ts#L67-L85)) — và
  vì thế phải tự phòng thủ: kiểm `typeof === "string"`, cắt độ dài, chuẩn hoá chữ thường. Đọc hàm `emailSubjectOf`
  đó như một bài mẫu về "đọc body trong guard đúng cách".
- **Guard đọc `params.id` phải tự kiểm định dạng** — như `OwnershipGuard` ở [mục 5.6](#56-ownershipguard--và-vì-sao-nó-thường-là-ý-tồi) gọi `isUUID`. Đưa chuỗi bất kỳ vào
  Prisma `where: { id }` với cột UUID sẽ ném lỗi Prisma → 500 thay vì 404.
- **Metadata handler là siêu năng lực của guard.** Middleware không có. Đây là lý do duy nhất cần nhớ khi phân vân
  "viết guard hay middleware" — [chương 4](04-middleware.md).
- **Guard chạy trước pipe** còn có nghĩa: request bị pipe từ chối (400) **vẫn đã tốn** một lần verify token và tra
  quyền. Không tránh được, và đó là lý do guard phải rẻ.

---

## 9. Guard ghép: `AuthorizationHeaderGuard`

Route có thể cần Bearer, hoặc API key, hoặc không cần gì, hoặc **một trong hai**. Thay vì mỗi route gắn guard khác
nhau, dự án có **một guard điều phối** đọc nhãn rồi gọi guard con —
[authorization-header.guard.ts](../../src/shared/guards/authorization-header.guard.ts).

Nhãn được dán bằng [auth-api.decorator.ts](../../src/shared/param-decorators/auth-api.decorator.ts):

```ts
export const AuthApi = (authorizationTypes?, combinedCondition?) =>
  SetMetadata(AUTHORIZATION_HEADER_KEY, {
    authorizationTypes,
    combinedCondition,
  });

export const IsPublicApi = () => AuthApi([AuthorizationType.NONE]);
```

Bốn cách dán, bốn hành vi:

```ts
@Get("brands")                                   // không nhãn → mặc định [BEARER], AND → phải có token hợp lệ
@IsPublicApi() @Get("brands")                    // [NONE]            → ai cũng vào
@AuthApi(["Bearer", "ApiKey"], "OR") @Post()     // token HOẶC api key → dịch vụ nội bộ hay người dùng đều gọi được
@AuthApi(["Bearer", "ApiKey"], "AND") @Post()    // token VÀ api key   → người dùng gọi qua một app đã đăng ký
```

Trong repo hiện chỉ dùng hai dòng đầu (`@IsPublicApi()` ở
[brand.controller.ts:53](../../src/routes/brand/brand.controller.ts#L53) là ví dụ), nhưng guard đã sẵn cho hai dòng
sau.

**Bảng tra guard con** (dòng 26-32):

```ts
private readonly authorizationTypeMapper = {
  [AuthorizationType.BEARER]: this.accessTokenGuard,
  [AuthorizationType.API_KEY]: this.apiKeyGuard,
  [AuthorizationType.NONE]: { canActivate: () => true },
};
```

`NONE` là một "guard" luôn cho qua — không cần class riêng, một object có `canActivate` là đủ vì Nest chỉ gọi method
(duck typing: `CanActivate` là interface, không phải class).

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
>
> Cách viết an toàn với mọi target: chuyển bảng tra vào trong constructor, hoặc thành getter.

**Đọc nhãn với mặc định đóng** (dòng 41-48, đã bàn ở [chương 2](02-reflector-execution-context-and-discovery.md)):
không nhãn = `[BEARER]` + `AND`. Quên dán nhãn là route **bị khoá**, không phải mở — đúng chiều an toàn.

**Nhánh `OR`** (dòng 50-70):

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
  code: ErrorCode.AUTHORIZATION_FAILED,
  message: "Authorization failed for all conditions.",
});
```

Thử lần lượt, ai cho qua đầu tiên là xong. **Nuốt lỗi của guard con** để thử tiếp — đúng với nghĩa "hoặc". Nhưng
để ý ba hệ quả:

1. Thông điệp lỗi chi tiết của guard con (401 "expired" vs "invalid") bị thay bằng một câu chung. Cái giá của OR.
2. Lỗi **hạ tầng** của guard con (Postgres sập khi `AccessTokenGuard` tra quyền) cũng bị nuốt và biến thành 401.
   Trong nhánh OR, fail-closed của guard con bị guard cha làm mờ đi — chấp nhận được vì cuối cùng vẫn **chặn**,
   nhưng mã lỗi sai (401 thay 500). Nếu OR được dùng nhiều, nên rẽ: `HttpException` thì `continue`, lỗi khác thì
   `throw` lại.
3. Nếu `NONE` nằm trong danh sách OR cùng `BEARER`: token hỏng → `AccessTokenGuard` ném → bị nuốt → thử `NONE` → **qua
   luôn, không kiểm quyền**. Đây là lỗ hổng thật, và boot-check của dự án **từ chối khởi động** khi thấy hình dạng
   này ([permission-coverage.service.ts:44, 55-58](../../src/shared/services/permission-coverage.service.ts#L44)).
   `None` chỉ được đứng một mình.

**Nhánh `AND`** (dòng 72-79):

```ts
for (const authorizationType of authorizationTypes) {
  const guardInstance = this.authorizationTypeMapper[authorizationType];
  await guardInstance.canActivate(context); // guard con tự throw nếu fail
}
return true;
```

Mọi guard con phải qua. Không `try/catch` — guard con ném gì, client nhận đúng cái đó. Vì mặc định là `AND` với một
phần tử `[BEARER]`, **đường đi thường ngày** của một request là: vào nhánh này, gọi `AccessTokenGuard` một lần, xong.

Để ý nhánh AND **bỏ qua giá trị trả về**: nó tin rằng guard con chặn bằng `throw`, không bằng `return false`. Với
`AccessTokenGuard` và `ApiKeyGuard` điều đó đúng. Nếu một ngày thêm guard con trả `false`, nhánh AND sẽ cho qua sai.
Cách chặt hơn:

```ts
const ok = await guardInstance.canActivate(context);
if (!ok) throwHttpException({ type: "unauthorized", ... });
```

Bài học từ guard ghép: khi gộp nhiều guard, bạn phải **quyết định rõ chuyện gì xảy ra khi một guard con fail**.
Nuốt hay lan? Câu trả lời khác nhau cho OR và AND, và nó ảnh hưởng đến cả bảo mật lẫn thông điệp lỗi.

---

## 10. Guard kế thừa thư viện: `AppThrottlerGuard`

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

`ThrottlerGuard` được thiết kế để kế thừa: nó lộ ra một loạt method `protected` như những **điểm móc**. Ba điểm
hay bị override nhất:

```ts
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  // (1) Khoá đếm là gì? Mặc định: IP. Dự án đổi qua options factory (keyed theo IP + email).
  protected async getTracker(req: Request): Promise<string> {
    return req.ip ?? "unknown";
  }

  // (2) Bỏ qua request nào? Ví dụ: health check từ load balancer.
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    return req.path === "/health";
  }

  // (3) Báo lỗi thế nào? — điểm dự án dùng.
  protected async throwThrottlingException(...) { ... }
}
```

Dự án chọn cấu hình `getTracker` và `skipIf` qua **options** ([throttler-options.factory.ts](../../src/shared/utils/throttler-options.factory.ts))
thay vì override, vì có **ba** throttler với ba khoá khác nhau — override một method thì chỉ có một khoá.
Hai đường (override hay options) đều đúng; chọn đường cho phép khai báo **từng throttler**.

Guard này cũng là ví dụ tốt về **metadata của thư viện**: `@Throttle(AuthThrottle.LOGIN)` ở
[auth.controller.ts:89](../../src/routes/auth/auth.controller.ts#L89) là `SetMetadata` với key của
`@nestjs/throttler`; `ThrottlerGuard` đọc bằng `Reflector` — cùng cơ chế [chương 1](01-decorators-and-metadata.md)-2,
chỉ khác người viết. `@SkipThrottle()` cũng vậy.

Nhớ dòng comment ở dòng 39-40: thông điệp **cố ý không nói** giới hạn nào bị chạm hay còn bao nhiêu — thông tin đó
là "oracle" miễn phí cho người đang dò rate limit. Toàn bộ chính sách ở [rate-limiting-guide.md](../rate-limiting-guide.md).

**Khi nào kế thừa, khi nào bọc?** Kế thừa khi thư viện **thiết kế cho** việc đó (method `protected`, tài liệu nói
"override to customize"). Bọc (guard của bạn giữ instance guard thư viện và gọi `canActivate` của nó — như guard ghép
ở [mục 9](#9-guard-ghép-authorizationheaderguard) làm với guard con) khi bạn chỉ cần đổi **điều kiện gọi**, không đổi
**cách chạy** bên trong.

---

## 11. Truyền dữ liệu từ guard xuống handler

Guard và handler không gọi nhau. Kênh duy nhất là **object `request`** — cả hai cùng cầm một tham chiếu.

Guard ghi hai lần, theo đúng thứ tự chạy:

```ts
// canActivate, dòng 128 — ngay sau khi verify token xong
request[REQUEST_USER_KEY] = payload; // "user"

// verifyPermission (được canActivate gọi ngay sau đó), dòng 102
request[REQUEST_GRANTED_PERMISSIONS_KEY] = granted; // "granted_permissions"
```

(Hai dòng nằm ở [128](../../src/shared/guards/access-token.guard.ts#L128) và
[102](../../src/shared/guards/access-token.guard.ts#L102) — số dòng nhỏ hơn lại chạy sau, vì `verifyPermission` được
định nghĩa phía trên `canActivate` trong file.)

Handler đọc qua param decorator ([chương 1, mục 8](01-decorators-and-metadata.md#8-createparamdecorator--loại-decorator-thứ-hai-chạy-mỗi-request)).
Toàn bộ đường đi của một giá trị, từ guard đến service:

```ts
// 1. Guard ghi
request[REQUEST_USER_KEY] = payload;

// 2. Param decorator đọc (active-user.decorator.ts)
const ActiveUser = createParamDecorator((field, ctx) => {
  const user = ctx.switchToHttp().getRequest()[REQUEST_USER_KEY];
  return field ? user[field] : user;
});

// 3. Handler nhận như tham số thường
@Get("me")
@RequirePermission("profile:read:own")
me(@ActiveUser("userId") userId: string) {
  return this.profileService.get(userId);
}
```

Handler **không biết** guard tồn tại. Đổi cách xác thực (JWT → session) chỉ sửa guard và decorator; handler và
service giữ nguyên. Đó là lợi ích của kênh `request` — nó là chỗ nối duy nhất.

Ví dụ thứ hai, dữ liệu tính toán thay vì sao chép: `@PermissionScope(["product", "update"])` đọc tập quyền guard đã
gắn rồi **suy ra** `"own"` hay `"any"` ([permission-scope.decorator.ts](../../src/shared/param-decorators/permission-scope.decorator.ts)).
Guard không cần biết handler sẽ hỏi resource nào — nó gắn cả tập, decorator lọc.

Hai điểm kỹ thuật:

- Key là hằng số trong [auth.constant.ts:1-4](../../src/constants/auth.constant.ts#L1-L4), không phải chuỗi rải rác
  — đổi tên một chỗ.
- `request["granted_permissions"] = ...` compile được trên kiểu `Request` của Express **chỉ vì**
  `noImplicitAny: false` ([tsconfig.json:19](../../tsconfig.json#L19)). Cách chặt hơn là mở rộng kiểu:

```ts
// src/types/express.d.ts — ví dụ minh hoạ, dự án chưa có
import { AccessTokenPayload } from "./jwt-payload.type";
import { PermissionKey } from "@/constants/permission.constant";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      granted_permissions?: ReadonlySet<PermissionKey>;
    }
  }
}
```

Khi đó `request.user` có kiểu, `request.usr` (gõ sai) là lỗi compile, và bật `noImplicitAny` sẽ không đỏ. Passport
dùng đúng kỹ thuật này để có `req.user` — nếu bạn dùng Passport song song, hai khai báo `user` phải cùng kiểu, nếu
không TypeScript báo xung đột.

**Không dùng field của guard để truyền dữ liệu.** Guard là singleton ([mục 2](#2-đọc-mã-nguồn-nest-gọi-guard-thế-nào)); `this.currentUser = payload` là
hai request đồng thời ghi đè nhau. Lỗi này không xuất hiện trong test đơn luồng và chỉ nổ trên production.

---

## 12. Fail-open hay fail-closed

Khi một thứ guard phụ thuộc bị hỏng, guard nên **mở** (cho qua) hay **đóng** (chặn)? Không có câu trả lời chung —
phải quyết từng phụ thuộc:

| Phụ thuộc                         | Hỏng thì                        | Vì sao                                                                    | Ở đâu                                                                                                        |
| --------------------------------- | ------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Redis cache tập quyền             | **Mở** — bỏ cache, đọc Postgres | Redis chỉ là tối ưu; mất nó app chậm, không sai                           | [role-permission-cache.service.ts:16-18](../../src/shared/services/role-permission-cache.service.ts#L16-L18) |
| Postgres (nguồn sự thật về quyền) | **Đóng** — 500                  | Không biết quyền thì không thể cho qua; và phải là 500 để người trực thấy | [permission-resolver.service.ts:19-21](../../src/shared/services/permission-resolver.service.ts#L19-L21)     |
| Route thiếu `@RequirePermission`  | **Đóng** — 500                  | Lỗi wiring, không phải lỗi client                                         | [access-token.guard.ts:84-96](../../src/shared/guards/access-token.guard.ts#L84-L96)                         |
| Redis của rate limiter            | (do `@nestjs/throttler` quyết)  | —                                                                         | `ThrottlerRedisStorage`                                                                                      |

Hai cách viết cùng một guard, một mở một đóng:

```ts
// FAIL-OPEN — chỉ đúng khi phụ thuộc là "tối ưu", không phải "sự thật"
async canActivate(ctx) {
  let cached: Set<string> | undefined;
  try {
    cached = await this.redis.getPermissions(roleId);
  } catch (e) {
    this.logger.warn("permission cache unavailable, falling back to DB", e);
    // không throw — đi tiếp xuống Postgres
  }
  const granted = cached ?? (await this.db.permissionsOf(roleId)); // DB lỗi → lan lên → 500
  ...
}

// FAIL-CLOSED — mặc định cho mọi thứ liên quan đến "ai được làm gì"
async canActivate(ctx) {
  const granted = await this.db.permissionsOf(roleId); // không try/catch
  if (!satisfies(granted, required)) throw new ForbiddenException();
  return true;
}
```

Và **anti-pattern** dự án đã từng có, để nhận diện:

```ts
// ĐỪNG — mọi lỗi thành 403, người trực mù
async canActivate(ctx) {
  try {
    const granted = await this.db.permissionsOf(roleId);
    return satisfies(granted, required);
  } catch {
    return false;   // Postgres sập → client thấy "Forbidden" → ticket "tôi mất quyền" thay vì alert "DB down"
  }
}
```

Câu hỏi để tự kiểm mỗi lần viết `try/catch` trong guard: _"nếu tôi nuốt lỗi này, ai bị hại — người dùng hợp lệ hay
kẻ tấn công?"_ Nuốt lỗi Redis cache: người dùng hợp lệ vẫn vào được. Nuốt lỗi Postgres: kẻ tấn công có thể vào khi
DB chập chờn. Khác nhau hoàn toàn.

**Fail-closed ở thời điểm boot** còn tốt hơn ở thời điểm request. Dòng "route thiếu `@RequirePermission` → 500" là
lưới cuối; lưới đầu là `PermissionCoverageService` ([permission-coverage.service.ts](../../src/shared/services/permission-coverage.service.ts))
quét mọi route lúc `onApplicationBootstrap` và **không cho app lên** nếu có route không public mà thiếu nhãn. Lỗi
cấu hình bị bắt lúc deploy, không phải lúc khách hàng gọi. Đây là mẫu đáng bắt chước cho bất kỳ guard nào dựa trên
metadata bắt buộc.

---

## 13. Test một guard

Guard chỉ cần một `ExecutionContext` — và `ExecutionContext` chỉ là object có vài method. Không cần boot Nest.

### 13.1. Unit test với context giả

```ts
// hình dạng tối giản — dự án có bản đầy đủ ở src/shared/guards/__tests__/guards-test-harness.ts
const context = {
  getHandler: () => handlerFn, // hàm có (hoặc không có) metadata
  getClass: () => ControllerClass,
  getType: () => "http",
  switchToHttp: () => ({
    getRequest: () => request, // { headers: { authorization: "Bearer ..." } }
    getResponse: () => response,
  }),
} as unknown as ExecutionContext;

await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 401 });
```

Vì metadata nằm trên **hàm**, test có thể dán nhãn thật lên một hàm giả:
`Reflect.defineMetadata(PERMISSION_KEY, "product:read:own", handlerFn)`. Guard đọc ra đúng như production. Hoặc mock
`Reflector` — cách harness của dự án chọn:

```ts
// guards-test-harness.ts — hai Reflector tách nhau, vì hai guard cùng gọi getAllAndOverride
accessTokenReflector: {
  getAllAndOverride: jest.fn().mockReturnValue("product:read:own" satisfies PermissionKey),
},
```

Một test đủ ba nhánh 401/403/200 của `AccessTokenGuard`:

```ts
it("returns 401 when there is no token", async () => {
  const ctx = buildContext({ headers: {} });
  await expect(guard.canActivate(ctx)).rejects.toMatchObject({ status: 401 });
});

it("returns 403 when the token is valid but the grant set lacks the key", async () => {
  mocks.tokenService.verifyAccessToken.mockResolvedValue({
    userId: "u1",
    roleId: "r1",
  });
  mocks.permissionResolverService.forRoles.mockResolvedValue(new Set()); // mặc định của harness
  const ctx = buildContext({ headers: { authorization: "Bearer ok" } });
  await expect(guard.canActivate(ctx)).rejects.toMatchObject({ status: 403 });
});

it("passes and attaches user + grants when the key is held", async () => {
  mocks.tokenService.verifyAccessToken.mockResolvedValue({
    userId: "u1",
    roleId: "r1",
  });
  mocks.permissionResolverService.forRoles.mockResolvedValue(
    new Set(["product:read:own"]),
  );
  const request = { headers: { authorization: "Bearer ok" } };
  const ctx = buildContext(request);

  await expect(guard.canActivate(ctx)).resolves.toBe(true);
  expect(request[REQUEST_USER_KEY]).toEqual({ userId: "u1", roleId: "r1" });
  expect(request[REQUEST_GRANTED_PERMISSIONS_KEY]).toEqual(
    new Set(["product:read:own"]),
  );
});
```

Test cuối kiểm cả **tác dụng phụ** (ghi vào request) — đó là hợp đồng với handler, không chỉ giá trị trả về.

Để ý harness mặc định `forRoles` trả **tập rỗng**: một test quên arrange sẽ ra 403, không phải pass ngẫu nhiên.
Mock cũng nên fail-closed.

### 13.2. Test một guard ghép

Với `AuthorizationHeaderGuard`, mock **guard con** thay vì mock sâu hơn — bạn test logic điều phối, không test lại
`AccessTokenGuard`:

```ts
it("tries the next guard when the first one throws under OR", async () => {
  mocks.reflector.getAllAndOverride.mockReturnValue({
    authorizationTypes: ["Bearer", "ApiKey"],
    combinedCondition: "OR",
  });
  jest
    .spyOn(accessTokenGuard, "canActivate")
    .mockRejectedValue(new UnauthorizedException());
  jest.spyOn(apiKeyGuard, "canActivate").mockResolvedValue(true);

  await expect(guard.canActivate(ctx)).resolves.toBe(true);
  expect(apiKeyGuard.canActivate).toHaveBeenCalledTimes(1);
});
```

Spec thật: `authorization-header.guard.spec.ts` có 12 test, trong đó "skips failed guard and continues with OR
condition to find passing guard" là bằng chứng cho hành vi nuốt lỗi ở [mục 9](#9-guard-ghép-authorizationheaderguard).

### 13.3. E2E: tắt hoặc thay guard

Với guard gắn bằng `@UseGuards(X)`, `.overrideGuard(X)` có thể thay instance theo class.
Nhưng repo dùng `APP_GUARD` + `useClass`: Nest sinh token application provider riêng,
nên `.overrideGuard(AuthorizationHeaderGuard)` **không tự thay global guard này**.

Trong module minh hoạ phục vụ test, dùng cùng một provider qua `useExisting`:

```ts
providers: [
  AuthorizationHeaderGuard,
  { provide: APP_GUARD, useExisting: AuthorizationHeaderGuard },
];

const moduleRef = await Test.createTestingModule({ imports: [TinyModule] })
  .overrideProvider(AuthorizationHeaderGuard)
  .useValue({
    canActivate: (ctx: ExecutionContext) => {
      const req = ctx.switchToHttp().getRequest();
      req[REQUEST_USER_KEY] = { userId: "u1", roleId: "admin" };
      req[REQUEST_GRANTED_PERMISSIONS_KEY] = new Set(["brand:read:any"]);
      return true;
    },
  })
  .compile();
```

Guard giả phải tái tạo state user và grants nếu handler đọc chúng. Ví dụ này yêu cầu module được
đăng ký như trên, **không phải** đoạn override có thể copy vào `AppModule` hiện tại.
Xem ví dụ hoàn chỉnh không cần DB ở [chương 13](13-testing-fundamentals.md).

Dự án **không** làm thế: bộ e2e (`test/e2e/**`) đăng nhập thật qua `/auth/login` rồi gửi Bearer, vì mục tiêu của
e2e ở đây là kiểm cả ma trận quyền (xem `manage-product-access.e2e-spec.ts`). Hai cách phục vụ hai mục tiêu; đừng
override guard khi thứ bạn muốn test **chính là** guard.

### 13.4. Test metadata được dán đúng

Guard đọc metadata; nhưng ai bảo đảm controller **đã dán**? Một test rẻ và hay bị bỏ qua:

```ts
it("requires brand:delete:any on remove()", () => {
  const key = Reflect.getMetadata(
    PERMISSION_KEY,
    BrandController.prototype.remove,
  );
  expect(key).toBe("brand:delete:any");
});
```

Dự án thay test này bằng boot-check ([mục 12](#12-fail-open-hay-fail-closed)) — mạnh hơn vì bắt cả route **chưa có**
test.

Bốn spec có sẵn để học cách viết: `access-token.guard.spec.ts`, `authorization-header.guard.spec.ts`,
`api-key.guard.spec.ts`, `app-throttler.guard.spec.ts` trong `src/shared/guards/__tests__/`.

---

## 14. Những lỗi hay gặp

Mỗi lỗi kèm triệu chứng để nhận ra nhanh.

**1. Quên `await` khi gọi guard con.**

```ts
// SAI — Promise luôn truthy → mọi request đều qua
if (this.accessTokenGuard.canActivate(ctx)) return true;

// ĐÚNG
if (await this.accessTokenGuard.canActivate(ctx)) return true;
```

Triệu chứng: route "bảo mật" cho mọi người vào; test unit vẫn xanh nếu test cũng quên `await`. Guard ghép của dự
án `await` đúng ở cả hai nhánh.

**2. Quên `@Injectable()`.** Nếu không còn metadata constructor, Nest có thể dựng guard với dependency
`undefined`, rồi lỗi lúc `canActivate()` dùng nó. Khi metadata có token nhưng thiếu provider mới có lỗi
`can't resolve dependencies` lúc dựng container.

**3. `useGlobalGuards(new G())` rồi thắc mắc DI không hoạt động.** Xem [mục 6](#6-ba-cách-đăng-ký-và-vì-sao-dự-án-chọn-app_guard). Chuyển sang `APP_GUARD`.

**4. Tưởng `APP_GUARD` trong module con là guard của module con.** Không — toàn app. Xem [mục 6](#6-ba-cách-đăng-ký-và-vì-sao-dự-án-chọn-app_guard).

**5. Đọc header với chữ hoa.** `req.headers["Authorization"]` luôn `undefined`. Node hạ chữ thường. Dùng
`req.headers.authorization`.

**6. Dùng guard để validate body.** Body chưa qua pipe; bạn đang viết lại `ValidationPipe` bằng tay và kém hơn.
Guard trả lời "ai", pipe trả lời "dữ liệu có đúng dạng". Xem [mục 15](#15-guard-middleware-interceptor-hay-pipe).

**7. Giữ state theo request trong field guard.** Singleton — hai request ghi đè nhau. Gắn vào `request`
([mục 11](#11-truyền-dữ-liệu-từ-guard-xuống-handler)).

**8. Nuốt mọi lỗi và `return false`.** Sự cố hạ tầng thành 403 im lặng. Xem [mục 12](#12-fail-open-hay-fail-closed).

**9. Không có nhãn thì `return true`.** Route quên decorator trở thành route mở. Mặc định phải là **đóng**, hoặc có
boot-check. Guard ghép của dự án mặc định `[BEARER]`; `AccessTokenGuard` thiếu `@RequirePermission` thì 500.

**10. Lấy `context.getHandler()` sai cấp cho `getAllAndOverride`.** Truyền `[getClass(), getHandler()]` (ngược
thứ tự) là class **đè** method — trái ý mọi người. Thứ tự đúng: `[context.getHandler(), context.getClass()]` —
phần tử đầu ưu tiên.

**11. Ném `HttpException` trong guard WebSocket / RPC.** Filter của transport đó không hiểu; client nhận lỗi
mơ hồ. Dùng `WsException` / `RpcException` ([mục 5.7](#57-wsauthguard--guard-cho-transport-khác-http)).

**12. Observable không complete.** `canActivate` trả `subject.asObservable()` không có `take(1)` → request treo vô
hạn, không log gì. Xem [mục 1](#1-guard-trả-lời-đúng-một-câu-hỏi).

---

## 15. Guard, middleware, interceptor hay pipe?

Bốn tầng đứng gần nhau và người mới hay chọn sai. Bảng tra theo **câu hỏi bạn muốn trả lời**:

| Bạn muốn…                                                       | Tầng            | Vì sao không phải tầng khác                                                                              |
| --------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------- |
| Quyết định request có được vào handler không, **dựa trên nhãn** | **Guard**       | Middleware không biết handler nào sẽ nhận request → không đọc được metadata                              |
| Gắn request id, đọc cookie, bật CORS, parse body                | Middleware      | Việc "chuẩn bị request" không cần biết handler; và cần chạy cho cả route 404                             |
| Kiểm tra / biến đổi **một tham số** (UUID, DTO, số nguyên)      | Pipe            | Guard chưa có tham số đã tách; pipe chạy đúng lúc tham số được bind                                      |
| Đo thời gian, bọc envelope, cache **kết quả handler**           | Interceptor     | Guard/middleware không được gọi lại khi handler trả về                                                   |
| Đọc file multipart rồi mới cho handler chạy                     | Interceptor     | Đó là `FileInterceptor` — cần cả "trước" (parse) và biết handler nào (metadata)                          |
| Rate limit theo IP                                              | Guard           | Có thể là middleware, nhưng guard đọc được `@Throttle()` / `@SkipThrottle()` theo route                  |
| Rate limit chung cho **mọi** route kể cả 404                    | Middleware      | Guard chỉ chạy khi route khớp — request đến đường không tồn tại không qua guard                          |
| Kiểm "bản ghi này có phải của tôi không"                        | Service (query) | Guard phải query hai lần và biết nghiệp vụ — [mục 5.6](#56-ownershipguard--và-vì-sao-nó-thường-là-ý-tồi) |

Điểm cuối trong bảng hay gây ngạc nhiên: **guard không chạy cho request không khớp route nào**. `GET /khong-ton-tai`
đi qua middleware, không qua guard nào, và ra 404. Nếu bạn muốn rate limit cả những request dò đường, middleware
mới với tới — nhưng lúc đó không đọc được metadata. Dự án chấp nhận guard vì chính sách rate limit của nó khai theo
route (`@Throttle(AuthThrottle.LOGIN)`).

Chi tiết từng tầng: [chương 4](04-middleware.md) (middleware), [chương 7](07-dto-validation-transformation-serialization.md)
(pipe), [chương 9](09-interceptors.md) (interceptor), và bức tranh chung ở [chương 5](05-request-lifecycle-in-this-project.md).

---

## 16. Nâng cao

**Guard cho ngữ cảnh không phải HTTP.** `context.getType()` trả `"rpc"` hay `"ws"`; `switchToRpc()` /
`switchToWs()` thay `switchToHttp()`. Một guard có thể phục vụ nhiều loại transport nếu rẽ nhánh theo `getType()`
— ví dụ đầy đủ ở [mục 5.7](#57-wsauthguard--guard-cho-transport-khác-http). Với GraphQL, `getType<GqlContextType>()`
trả `"graphql"` và cần `GqlExecutionContext.create(context).getContext().req` để lấy request.

**Guard cấp class và cấp method cùng chạy.** `@UseGuards(A)` trên class + `@UseGuards(B)` trên method → A rồi B.
Không phải "method đè class" như metadata — guard là **cộng dồn**. Không có cách "tắt" guard cấp class cho một
method; muốn thế, guard phải đọc một nhãn "skip" (như `@SkipThrottle()`).

**Không làm việc nặng hay ghi DB trong guard.** Guard chạy cho mọi request khớp, kể cả request sẽ bị pipe từ chối
ngay sau đó. Tra đọc có cache thì được (dự án làm vậy); ghi log audit vào DB thì không — để interceptor hoặc
service. Nếu buộc phải ghi (đếm lần đăng nhập sai), ghi **bất đồng bộ không await** vào queue, không chặn request.

**Bỏ rate limit cho một route:** `@SkipThrottle()` của thư viện — cũng là metadata, `ThrottlerGuard` đọc và bỏ qua.
Bỏ cho một throttler cụ thể: `@SkipThrottle({ credential: true })`.

**Guard không sửa được response body khi trả `false`.** Muốn body riêng thì phải `throw` ([mục 3](#3-return-false-hay-throw)).
Muốn thêm header (như `Retry-After`) thì ghi vào `response` **trước** khi throw — đúng như `AppThrottlerGuard` làm,
có kiểm `headersSent`.

**Guard và `@Public()` kiểu phổ biến.** Nhiều dự án Nest viết `if (isPublic) return true` ở đầu guard auth:

```ts
const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
  ctx.getHandler(),
  ctx.getClass(),
]);
if (isPublic) return true;
```

Dự án này làm khác: public là một **loại xác thực** (`None`) trong guard điều phối, và boot-check ép mọi route phải
chọn rõ. Hai cách đều đúng; cách của dự án khó quên hơn — và `@IsPublicApi()` trên **class** sẽ mở cả controller,
điều `getAllAndOverride` cho phép nhưng bạn nên cân nhắc trước khi dùng.

**Guard request-scoped.** Nếu guard tiêm một provider `Scope.REQUEST`, guard cũng thành request-scoped và được tạo
lại mỗi request — chậm hơn đáng kể. Thay bằng đọc `request` trực tiếp từ `ExecutionContext`, gần như luôn đủ.
[Chương 8](08-request-and-provider-instances.md) bàn kỹ.

**Guard trên `@Controller` kế thừa.** `@UseGuards` trên lớp cha **có** áp cho lớp con: Nest đọc bằng `Reflect.getMetadata(GUARDS_METADATA, constructor)` (`core/helpers/context-creator.js`), và `getMetadata` đi theo chuỗi prototype của constructor (`Object.getPrototypeOf(Child) === Parent`). Nhưng lớp con dán `@UseGuards` riêng thì metadata của con **đè** của cha, không cộng dồn — khác với luật class + method ở trên. Muốn cả hai, khai lại cả hai trên lớp con.

**`canActivate` ném đồng bộ vs bất đồng bộ.** Guard `async` ném → Promise reject → Nest `await` → filter. Guard
đồng bộ ném → exception lan thẳng. Cả hai đều đến filter; khác biệt chỉ là nếu bạn **tự** gọi `guard.canActivate()`
trong guard ghép mà không `await`, throw đồng bộ bạn bắt được bằng `try`, throw bất đồng bộ thì không.

---

## 17. Trong dự án này

| Guard                      | File                                                                                   | Kiểu                                     | Chạy khi                                  | Chặn bằng                               |
| -------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------- | --------------------------------------- |
| `AppThrottlerGuard`        | [app-throttler.guard.ts](../../src/shared/guards/app-throttler.guard.ts)               | Kế thừa thư viện, `APP_GUARD` thứ 1      | mọi request                               | 429 + `Retry-After`                     |
| `AuthorizationHeaderGuard` | [authorization-header.guard.ts](../../src/shared/guards/authorization-header.guard.ts) | Ghép / điều phối, `APP_GUARD` thứ 2      | mọi request                               | uỷ quyền guard con; OR fail → 401 chung |
| `AccessTokenGuard`         | [access-token.guard.ts](../../src/shared/guards/access-token.guard.ts)                 | Provider thường, được gọi bởi guard ghép | route có `Bearer` (mặc định)              | 401 / 403 / 500 phân biệt rõ            |
| `ApiKeyGuard`              | [api-key.guard.ts](../../src/shared/guards/api-key.guard.ts)                           | Provider thường, được gọi bởi guard ghép | route có `ApiKey` (hiện: không route nào) | 401                                     |

Metadata mà các guard này đọc:

| Decorator                                       | Key                       | Ai đọc                        | Mặc định khi thiếu                                                  |
| ----------------------------------------------- | ------------------------- | ----------------------------- | ------------------------------------------------------------------- |
| `@AuthApi(types, condition)` / `@IsPublicApi()` | `authorization_header`    | `AuthorizationHeaderGuard`    | `[Bearer]`, `AND` — **đóng**                                        |
| `@RequirePermission("res:act:scope")`           | `required_permission`     | `AccessTokenGuard`            | 500 lúc request; **app không boot** nhờ `PermissionCoverageService` |
| `@Throttle(...)` / `@SkipThrottle()`            | (của `@nestjs/throttler`) | `AppThrottlerGuard` (kế thừa) | dùng `GlobalThrottle`                                               |

Đường đi của một request `DELETE /brands/:id` có token hợp lệ của seller:

```
AppThrottlerGuard        đếm IP → dưới 120/phút → qua
AuthorizationHeaderGuard đọc @AuthApi → không có → [Bearer], AND
  └ AccessTokenGuard     tách "Bearer xxx" → verify → req.user = payload
                         đọc @RequirePermission → "brand:delete:any"
                         forRoles([seller]) → Set { "product:*:own", ... }  (Redis, hụt thì Postgres)
                         req.granted_permissions = Set
                         satisfies(Set, "brand:delete:any") → false → throw 403 PERMISSION_DENIED
→ HttpExceptionFilter → { statusCode: 403, code: "PERMISSION_DENIED", message: "You do not have permission..." }
```

Handler `remove()` không bao giờ được gọi; `ParseUUIDPipe` trên `:id` cũng chưa chạy.

---

## 18. Tự kiểm chứng

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

# 200 — route public, không cần gì
curl -s -i localhost:3000/brands | head -1
```

Ba lần đầu, ba mã khác nhau, cùng một guard. Lần thứ tư: guard ghép rẽ sang nhánh `None`.

**2. Xem short-circuit.** Gọi một route với token rác **thật nhanh nhiều lần** (vượt hạn mức) — bạn nhận 429, không
phải 401. Rate limiter đứng trước và dừng dây chuyền trước khi auth chạy.

```bash
for i in $(seq 1 130); do curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer abc" localhost:3000/roles; done | sort | uniq -c
#   120 401
#    10 429      ← từ request 121, AppThrottlerGuard chặn trước khi AccessTokenGuard chạy
```

**3. Xem guard chạy trước pipe.** Gửi `DELETE /brands/not-a-uuid` **không token**: bạn nhận 401, không phải 400.
`ParseUUIDPipe` chưa được chạy vì guard đã chặn.

**4. Xem boot-check fail-closed.** Xoá tạm `@RequirePermission(...)` khỏi một handler bất kỳ (ví dụ
`brand.controller.ts` dòng 71), chạy `pnpm start:dev`: app **không lên**, log in ra tên controller và handler thiếu
nhãn. Hoàn lại rồi chạy tiếp.

**5. Viết thêm một guard.** Thêm `MaintenanceGuard` từ [mục 5.1](#51-maintenanceguard--guard-không-cần-request) vào
đầu mảng `guards` trong `base.module.ts`, đặt `MAINTENANCE_MODE=true`, gọi bất kỳ route: 503 cho mọi thứ, kể cả
route public. Đổi vị trí nó xuống **sau** `AuthorizationHeaderGuard`: route không token giờ trả 401 thay 503 — bạn
vừa thấy thứ tự guard quyết định mã lỗi.

**6. Chạy bộ test guard:**

```bash
npx jest src/shared/guards
```

Mở `authorization-header.guard.spec.ts` và tìm test về `OR` — nó chứng minh lỗi guard con bị nuốt và thử tiếp.

---

**Tiếp theo:** [Chương 4 — Middleware](04-middleware.md): tầng đứng **trước** guard, và vì sao nó không được giao
việc xác thực.
