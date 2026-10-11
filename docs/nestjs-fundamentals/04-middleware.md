# Chương 4 — Middleware

> Middleware là tầng **dưới** NestJS — nó thuộc về Express. Chương này giải thích nó chạy lúc nào, viết và đăng ký
> ra sao, khác guard chỗ nào, và trả lời câu hỏi mà người mới hay đặt: _"sao không làm auth bằng middleware cho
> gọn?"_ Dự án không viết middleware nào bằng tay, nhưng có **bốn** middleware đang chạy mỗi request — đến từ thư viện.
> Nửa sau chương là một **bộ sưu tập tám middleware mẫu** viết theo đúng quy ước của dự án, kèm cách test.

**Mục lục**

1. [Middleware là hàm `(req, res, next)` của Express](#1-middleware-là-hàm-req-res-next-của-express)
2. [Chạy lúc nào — và vì sao điều đó quyết định mọi thứ](#2-chạy-lúc-nào--và-vì-sao-điều-đó-quyết-định-mọi-thứ)
3. [Bốn cách viết](#3-bốn-cách-viết)
4. [Ba cách đăng ký — và mọi biến thể của `forRoutes`](#4-ba-cách-đăng-ký--và-mọi-biến-thể-của-forroutes)
5. [Middleware vs Guard vs Interceptor vs Pipe](#5-middleware-vs-guard-vs-interceptor-vs-pipe)
6. [Vì sao xác thực không phải middleware trong dự án](#6-vì-sao-xác-thực-không-phải-middleware-trong-dự-án)
7. [Bốn middleware đang chạy trong dự án](#7-bốn-middleware-đang-chạy-trong-dự-án)
8. [Bộ sưu tập: tám middleware mẫu](#8-bộ-sưu-tập-tám-middleware-mẫu)
9. [Test một middleware](#9-test-một-middleware)
10. [Nâng cao](#10-nâng-cao)
11. [Trong dự án này](#11-trong-dự-án-này)
12. [Tự kiểm chứng](#12-tự-kiểm-chứng)

---

## 1. Middleware là hàm `(req, res, next)` của Express

Ứng dụng Nest HTTP của dự án chạy trên `@nestjs/platform-express` (Express **5.0.1**). Bên dưới mọi thứ là một
Express app, và Express xử lý request bằng **một chuỗi hàm** gọi nối tiếp — gọi là _stack_:

```ts
function logRequest(req: Request, res: Response, next: NextFunction) {
  console.log(req.method, req.url);
  next(); // gọi hàm kế tiếp trong chuỗi; không gọi là request treo
}
```

Ba tham số, một quy tắc: **làm việc của mình rồi gọi `next()`**, hoặc tự trả response và không gọi `next()`. Không có
`ExecutionContext`, không có `Reflector`, không có khái niệm "handler" — vì đây chưa phải Nest.

### 1.1 Chuỗi gọi nhìn từ Express thuần

Bỏ Nest đi một phút. Đây là toàn bộ mô hình mà mọi thứ trong chương này xây lên:

```ts
import express from "express";

const app = express();

app.use((req, res, next) => {
  console.log("1. mọi request đi qua đây");
  next();
});

app.use("/admin", (req, res, next) => {
  console.log("2. chỉ request bắt đầu bằng /admin");
  next();
});

app.use((req, res, next) => {
  if (req.headers["x-blocked"]) {
    // Tự trả response và KHÔNG gọi next(): chuỗi dừng ở đây.
    return res.status(403).json({ message: "blocked" });
  }
  next();
});

app.get("/admin/users", (req, res) => {
  console.log("4. handler");
  res.json([]);
});
```

`GET /admin/users` in ra `1 → 2 → 4`. `GET /products` chỉ in ra `1` rồi 404: hàm 2 không khớp path, hàm 3 chạy nhưng
im lặng, và không có handler nào cho `/products`. Thêm header `x-blocked` vào là dừng ở hàm 3, handler không bao giờ chạy.

Ba điều rút ra, dùng lại suốt chương:

- **Thứ tự stack = thứ tự gọi `.use()`.** Không có cơ chế "ưu tiên" nào khác.
- **Một middleware có ba lối ra:** `next()` (đi tiếp), `next(err)` (nhảy tới error handler), hoặc tự `res.send`
  (kết thúc). Quên cả ba là request treo cho tới khi client timeout.
- **Khớp path xảy ra ở tầng Express**, bằng chuỗi/regex — không phải bằng decorator `@Get()` của Nest.

### 1.2 `next(err)` — lối ra thứ ba

```ts
app.use((req, res, next) => {
  if (!req.headers["content-type"]?.includes("json")) {
    return next(new Error("only JSON")); // nhảy thẳng tới error handler
  }
  next();
});

// error handler của Express: 4 tham số
app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});
```

Trong Nest bạn hầu như không viết error handler kiểu bốn tham số này. Nhưng cần biết nó tồn tại, vì [mục 4](#4-ba-cách-đăng-ký--và-mọi-biến-thể-của-forroutes)
sẽ cho thấy: middleware đăng ký qua module thì Nest **tự bọc** để `next(err)` (hoặc `throw`) đi về
`GlobalExceptionFilter`. `app.use` đăng ký trước `app.init()` cũng có thể chuyển lỗi tới error-middleware cuối của Nest; khác nhau ở cơ chế proxy và thứ tự stack, không phải luôn bị tách khỏi filter.

### 1.3 Hệ sinh thái

Mọi middleware Express ngoài kia dùng được nguyên xi, vì Nest không thay đổi chữ ký:

| Gói              | Làm gì                                      | Cách vào app                                          |
| ---------------- | ------------------------------------------- | ----------------------------------------------------- |
| `cors`           | header CORS, trả lời preflight              | `app.enableCors()` — dự án đang dùng                  |
| `body-parser`    | parse JSON / form thành `req.body`          | Nest tự đăng ký — dự án đang dùng                     |
| `pino-http`      | log request, sinh `req.id`                  | `nestjs-pino` đăng ký qua module — dự án đang dùng    |
| `helmet`         | bộ header bảo mật (`X-Frame-Options`, CSP…) | `app.use(helmet())`                                   |
| `compression`    | gzip/brotli response                        | `app.use(compression())`                              |
| `cookie-parser`  | `req.cookies`                               | `app.use(cookieParser())`                             |
| `express-static` | phục vụ file tĩnh                           | `app.useStaticAssets()` trên `NestExpressApplication` |

Đây là lợi thế lớn của middleware: **không phải viết lại**. Khi một việc đã có gói Express làm tốt, câu hỏi chỉ là
"đăng ký ở đâu" ([mục 4](#4-ba-cách-đăng-ký--và-mọi-biến-thể-của-forroutes)), không phải "viết thế nào".

---

## 2. Chạy lúc nào — và vì sao điều đó quyết định mọi thứ

```
Request → [ Middleware ] → Guard → Interceptor → Pipe → Handler
            ↑ ở đây, Nest CHƯA chọn handler
```

Middleware chạy **trước khi Nest quyết định request sẽ rơi vào controller/method nào**. Express đã khớp path để biết
có chạy middleware này không (`forRoutes`), nhưng cái "handler" theo nghĩa Nest — hàm có metadata, có
`@RequirePermission` — **chưa tồn tại** trong ngữ cảnh của middleware.

### 2.1 Lúc đó `req` có gì, chưa có gì

Cụ thể hoá bằng một request `POST /brands` có body JSON và header `Authorization`, tới lúc middleware tự viết của bạn
chạy (giả sử đăng ký qua module, xem [thứ tự ở mục 7](#thứ-tự-thực-tế)):

| Trên `req`                             | Đã có?                  | Ai đặt                                                                      |
| -------------------------------------- | ----------------------- | --------------------------------------------------------------------------- |
| `req.method`, `req.url`, `req.headers` | Có                      | Node `http`                                                                 |
| `req.ip`                               | Có                      | Express, theo `trust proxy`                                                 |
| `req.body`                             | Có                      | `body-parser` (Nest đăng ký trong `init()`)                                 |
| `req.id`                               | Có                      | `pino-http` (nếu middleware của bạn đứng sau)                               |
| `req.i18nContext`                      | Có                      | `I18nMiddleware` (nếu đứng sau)                                             |
| `req.params`                           | Theo pattern middleware | Có thể có params từ `forRoutes("brands/:id")`; chưa phải params của handler |
| `req.route`                            | **Không**               | Express chỉ gán khi vào router                                              |
| Handler / controller                   | **Không**               | chưa chọn                                                                   |
| Metadata `@RequirePermission`          | **Không**               | không có handler thì không có gì để đọc                                     |
| `req.user`                             | **Không**               | guard chưa chạy                                                             |

Hàng `req.params` đáng dừng lại: `forRoutes("brands/:id")` khiến Express khớp được path, nhưng `:id` đó là của
**pattern middleware**, không phải của `@Get(":id")` — Nest bind middleware bằng `app.use(pattern, fn)` riêng, nên
`req.params` trong middleware là của pattern bạn viết trong `forRoutes`, và `req.params` khi vào handler là của
decorator. Hai thứ khác nhau, đừng trông chờ chúng khớp.

### 2.2 Hệ quả

Nói một lần cho rõ:

> **Middleware không đọc được metadata của handler.** Không `@RequirePermission`, không `@AuthApi`, không
> `@Throttle`. Bất kỳ quyết định nào cần biết "route này khai gì" **không thể** nằm ở middleware.

Thử ép cũng không được. Đây là đoạn code người mới hay viết, và vì sao nó vô nghĩa:

```ts
use(req: Request, res: Response, next: NextFunction) {
  // ??? handler nào? Không có tham chiếu nào tới controller/method ở đây.
  const perm = Reflect.getMetadata(PERMISSION_KEY, ???);
  next();
}
```

`Reflect.getMetadata` cần một **target** — hàm hoặc class. Middleware không có tham chiếu tới hàm handler, vì router
còn chưa chạy để chọn nó. Guard có `context.getHandler()` chính là vì guard chạy **sau** router
([chương 2](02-reflector-execution-context-and-discovery.md)).

Ngược lại, vì chạy sớm, middleware là chỗ đúng cho việc **phải xảy ra với mọi request bất kể đích đến**: parse body,
gắn request id, mở CORS, đo thời gian, phát hiện ngôn ngữ — và cả request sẽ bị 401, 404 sau đó.

---

## 3. Bốn cách viết

### 3.1 Hàm thuần — không DI, gọn

```ts
export function requestTiming(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () =>
    console.log(`${req.method} ${req.url} ${Date.now() - start}ms`),
  );
  next();
}
```

Dùng khi không cần tiêm gì và logic vài dòng. Nest gọi là _functional middleware_. Đăng ký được cả bằng `app.use` và
`consumer.apply`.

### 3.2 Class `NestMiddleware` — có DI

```ts
@Injectable()
export class RequestTimingMiddleware implements NestMiddleware {
  constructor(private readonly logger: PinoLogger) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on("finish", () =>
      this.logger.info({ ms: Date.now() - start }, "request done"),
    );
    next();
  }
}
```

Dùng khi cần service (config, Redis, logger). Interface `NestMiddleware` chỉ đòi một method `use(req, res, next)`.
Class này phải nằm trong `providers` của module đăng ký nó — hoặc các dependency của nó phải resolve được từ module đó
([chương 6](06-modules-and-dependency-injection.md)).

### 3.3 Factory — hàm nhận option, trả middleware

Khi cùng một logic cần vài cấu hình khác nhau ở vài chỗ:

```ts
export function requireHeader(
  name: string,
  message = `Missing header ${name}`,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers[name.toLowerCase()]) {
      throw new BadRequestException(message);
    }
    next();
  };
}

// đăng ký
consumer.apply(requireHeader("x-tenant-id")).forRoutes("orders", "cart");
consumer
  .apply(requireHeader("x-api-key", "API key required"))
  .forRoutes("media");
```

Đây chính là hình dạng của `cors(options)`, `helmet(options)`, `pinoHttp(options)`: gọi factory một lần lúc boot,
nhận về hàm `(req, res, next)`.

### 3.4 Async

```ts
@Injectable()
export class FeatureFlagMiddleware implements NestMiddleware {
  constructor(private readonly redis: Redis) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const frozen = await this.redis.get("flags:write-freeze");
      if (frozen === "1" && req.method !== "GET") {
        throw new ServiceUnavailableException("Writes are temporarily frozen.");
      }
      next();
    } catch (err) {
      next(err); // KHÔNG throw sau await trong hàm thuần — xem §10
    }
  }
}
```

Hai điều cần nhớ với async: (1) `next()` **không** trả Promise, nên `await next()` vô nghĩa — muốn chạy gì _sau_
handler thì dùng `res.on("finish")`; (2) lỗi sau `await` phải qua `next(err)` hoặc dựa vào việc Nest bọc class
middleware. Chi tiết ở [mục 10](#10-nâng-cao).

### Chọn cách nào

| Cần…                             | Chọn                   |
| -------------------------------- | ---------------------- |
| Vài dòng, không tiêm gì          | Hàm thuần              |
| Service từ DI                    | Class `NestMiddleware` |
| Cùng logic, khác option, vài chỗ | Factory                |
| Gọi I/O (Redis, DB)              | Class + `async use`    |

---

## 4. Ba cách đăng ký — và mọi biến thể của `forRoutes`

| Cách                               | Ở đâu                        | DI    | Chọn route                                      | Lỗi ném ra đi đâu                                             |
| ---------------------------------- | ---------------------------- | ----- | ----------------------------------------------- | ------------------------------------------------------------- |
| `app.use(fn)`                      | `main.ts`                    | Không | toàn app                                        | Qua error-middleware cuối của Nest nếu đăng ký trước `init()` |
| `consumer.apply(M).forRoutes(...)` | `configure()` của một module | Có    | theo path / method / controller, có `exclude()` | Nest bọc proxy → **về exception filter** như lỗi handler      |
| Thư viện tự đăng ký                | trong module của thư viện    | Có    | thư viện quyết                                  | như dòng trên                                                 |

### 4.1 `app.use` — nhanh, toàn app, ngoài Nest

```ts
// main.ts
const app = await NestFactory.create<NestExpressApplication>(AppModule);
app.use(helmet());
app.use(compression());
```

Thích hợp cho middleware thư viện (helmet, compression). Với
middleware cần DI hoặc chọn route theo controller; khi đó `consumer.apply` diễn đạt rõ hơn. `app.use` trước `init()` vẫn có đường tới global filter qua error-middleware cuối của Nest.

### 4.2 `consumer.apply` — mẫu chuẩn

```ts
@Module({ providers: [RequestTimingMiddleware] })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestTimingMiddleware)
      .exclude({ path: "health", method: RequestMethod.GET }) // giả định có route health
      .forRoutes("*path"); // Nest 11: wildcard có tên
  }
}
```

`configure()` chạy trong `app.init()`, sau khi mọi provider đã được tạo — nên class middleware ở đây được resolve
từ DI như provider bình thường.

> **Nest 11 đổi cú pháp wildcard.** `path-to-regexp` v8 yêu cầu wildcard có tên: `"*path"` hoặc `"{*path}"`.
> Chuỗi `"*"` cũ vẫn được Nest tự chuyển đổi (kèm cảnh báo) — `nestjs-pino` và `nestjs-i18n` trong dự án đang dùng
> `"*"` và chạy được là nhờ đó. `"/users/*"` phải viết thành `"/users/*path"`. Dự án chưa có middleware tự viết nên
> chưa chạm điểm này.

### 4.3 Mọi biến thể của `forRoutes`

`forRoutes` nhận ba kiểu đối số, trộn tuỳ ý:

```ts
configure(consumer: MiddlewareConsumer) {
  // Đây là các cách đăng ký độc lập; chọn cách phù hợp, không chain forRoutes().
  // (a) Chuỗi path, mọi method:
  consumer.apply(TenantMiddleware).forRoutes("orders");

  // (b) RouteInfo, có thể truyền nhiều đối số:
  consumer.apply(TenantMiddleware).forRoutes(
    { path: "brands", method: RequestMethod.POST },
    { path: "brands/:id", method: RequestMethod.PATCH },
  );

  // (c) Mọi route trong controller:
  consumer.apply(TenantMiddleware).forRoutes(BrandController, CategoryController);

  // (d) Trộn các loại đối số:
  consumer.apply(TenantMiddleware)
    .forRoutes("cart", { path: "orders", method: RequestMethod.ALL }, ReviewController);
}
```

Chọn (c) khi middleware gắn với **một nhóm nghiệp vụ** — refactor đổi path của controller thì middleware đi theo, không
cần sửa hai chỗ. Chọn (a)/(b) khi gắn với **hình dạng URL** (ví dụ `"*path"`, hay `"webhooks/*path"`).

### 4.4 Nhiều middleware, thứ tự, và nhiều chuỗi `apply`

```ts
configure(consumer: MiddlewareConsumer) {
  // Chạy theo đúng thứ tự khai: A → B → C, cho cùng một tập route.
  consumer.apply(A, B, C).forRoutes("*path");

  // Chuỗi apply thứ hai — bind SAU chuỗi thứ nhất.
  consumer.apply(D).forRoutes(OrderController);
}
```

Trộn hàm và class trong cùng `apply` là hợp lệ: `consumer.apply(helmet(), TenantMiddleware, requireHeader("x-tenant-id"))`.

Thứ tự **giữa các module** có `configure()` = thứ tự Nest duyệt module — thường là thứ tự `imports`, module cha
trước. Nếu hai middleware ở hai module có phụ thuộc thứ tự (B cần `req.tenantId` mà A đặt), **đặt cả hai vào một
`apply(A, B)`** thay vì dựa vào thứ tự import. Rõ ràng hơn, và không vỡ khi ai đó đảo `imports`.

### 4.5 `exclude()`

```ts
consumer
  .apply(MaintenanceModeMiddleware)
  .exclude(
    "health", // chuỗi: mọi method
    { path: "auth/login", method: RequestMethod.POST }, // RouteInfo
    "webhooks/*path", // wildcard cũng được
  )
  .forRoutes("*path");
```

Hai điều dễ vấp:

- `exclude` khớp path **đã tính global prefix** cho bạn. Nếu có `setGlobalPrefix("api")`, vẫn viết `"health"`,
  không phải `"api/health"`.
- `exclude` chỉ hoạt động với chuỗi/`RouteInfo`, **không nhận class controller**. Muốn "trừ cả controller X" thì liệt
  kê path của nó, hoặc đảo lại: `forRoutes` liệt kê đúng những controller cần.

### 4.6 Đăng ký ở module nào thì áp cho route nào?

Điểm hay bị hiểu sai: middleware đăng ký trong `configure()` của **một module** **không** bị giới hạn vào route của
module đó. `forRoutes("*path")` viết trong `BrandModule` áp cho **mọi** route toàn app. Module chỉ là nơi đặt code
và nơi resolve DI cho class middleware.

Quy ước đề xuất cho dự án nếu bắt đầu có middleware tự viết:

- Middleware **toàn app** → `configure()` của `AppModule` (hiện `AppModule` chưa `implements NestModule`; thêm vào).
- Middleware **cho một nhóm route** → `configure()` của module sở hữu controller đó, `forRoutes(ControllerClass)`.

### 4.7 Lỗi đi đâu — vì sao cột cuối của bảng quan trọng

Với `consumer.apply`, Nest không đưa thẳng `instance.use` cho Express. Nó bọc bằng một proxy có sẵn exception handler
(`MiddlewareModule.createProxy` trong `@nestjs/core`):

```
Express gọi → proxy(req, res, next)
                 └─ try { await instance.use(req, res, next) }
                    catch (err) { exceptionsHandler.next(err, host) }   ← chính là đường vào filter
```

Nghĩa là `throw new ServiceUnavailableException()` trong middleware class **ra đúng envelope lỗi** của
`GlobalExceptionFilter`. `app.use(fn)` trước `init()` không có proxy này nhưng lỗi vẫn tới global filter qua error-middleware cuối của Nest. Middleware thêm **sau** error-middleware không thể chuyển ngược stack tới nó. `requestId` chỉ có nếu middleware gắn ID đã chạy trước khi lỗi phát sinh; không phụ thuộc riêng vào cách đăng ký.

---

## 5. Middleware vs Guard vs Interceptor vs Pipe

|                           | Middleware                     | Guard                   | Interceptor                            | Pipe                |
| ------------------------- | ------------------------------ | ----------------------- | -------------------------------------- | ------------------- |
| Biết handler nào sắp chạy | **Không**                      | Có                      | Có                                     | Không               |
| Đọc metadata handler      | Không                          | **Có**                  | Có                                     | Không               |
| Thấy body đã validate     | Không                          | Không                   | Có (sau pipe)                          | Chính nó validate   |
| Sửa response              | Có (thô, qua `res`)            | Header được, body không | **Có** (map kết quả)                   | Không               |
| Chạy khi handler ném lỗi  | Không liên quan                | Không liên quan         | Có (`catchError`)                      | Không               |
| Chạy cho request 404      | **Có**                         | Không                   | Không                                  | Không               |
| DI                        | Class có / hàm không           | Có (qua `APP_GUARD`)    | Có                                     | Có                  |
| Dùng thư viện Express     | **Nguyên xi**                  | Không                   | Không                                  | Không               |
| Dùng cho                  | log, id, CORS, parse, ngôn ngữ | **quyền vào cửa**       | serialize, cache, đo thời gian handler | validate, transform |

Câu hỏi để chọn nhanh: **"Việc này có cần biết route đích khai gì không?"** Có → guard/interceptor/pipe. Không →
middleware.

Một dòng trong bảng cần nói rõ: **"Sửa response" của guard**. Guard lấy được `res` qua
`context.switchToHttp().getResponse()`, nên **ghi header thì được** — `AppThrottlerGuard` của dự án ghi
`Retry-After` rồi mới ném 429 ([chương 3 §8](03-guards.md#10-guard-kế-thừa-thư-viện-appthrottlerguard)). Cái guard
**không** làm được là _nhào nặn body thành công_ của handler: handler còn chưa chạy, chưa có gì để nhào. Việc đó là
của interceptor. Nói gọn: guard chạm được vào **vỏ** response, không chạm được vào **ruột**.

### Cùng một việc, hai tầng, khác kết quả

"Đo thời gian request" là ví dụ tốt vì đặt được ở cả hai tầng và cho hai con số **khác nhau**:

| Đặt ở       | Đo được gì                                   | Bao gồm                                     | Bỏ lỡ                                                       |
| ----------- | -------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------- |
| Middleware  | Từ lúc vào Express tới `res` `finish`        | guard, pipe, handler, serialize, ghi socket | thời gian parse body trước nó                               |
| Interceptor | Từ lúc `intercept()` tới khi observable emit | handler + interceptor sau nó                | guard, pipe, filter, ghi socket; **không chạy cho 401/404** |

pino-http của dự án đo kiểu thứ nhất (`responseTime` trong log). Nếu muốn "handler này mất bao lâu" để tối ưu
query, đó là việc của interceptor — không phải sửa middleware.

---

## 6. Vì sao xác thực không phải middleware trong dự án

Nhiều framework (Express thuần, Koa) làm auth bằng middleware. Dự án này **cố ý không**, vì ba lý do đều xuất phát
từ [mục 2](#2-chạy-lúc-nào--và-vì-sao-điều-đó-quyết-định-mọi-thứ):

1. **Route public và route cần token trộn nhau trong cùng controller** (`brand.controller.ts`: `GET /brands` public,
   `POST /brands` cần `brand:create:any`). Middleware không biết request sắp rơi vào route nào → phải tự khớp path
   bằng tay, tức là viết lại router. Guard đọc `@IsPublicApi()` / `@AuthApi()` là xong.
2. **Phân quyền cần `@RequirePermission` trên handler.** Middleware không đọc được. Nếu ép, bạn sẽ có một bảng
   `path → permission` bên ngoài — chính là thiết kế cũ mà lần refactor vừa rồi bỏ đi vì bốn lỗ hổng.
3. **Boot-check** ([permission-coverage.service.ts](../../src/shared/services/permission-coverage.service.ts)) chỉ có
   thể tồn tại vì chính sách nằm trên handler dưới dạng metadata. Với middleware, không có gì để quét.

### Nhìn cái "auth middleware" đó sẽ trông thế nào

Để thấy rõ vì sao nó tệ, hãy viết thử:

```ts
// ĐỪNG LÀM THẾ NÀY — minh hoạ vấn đề
const PUBLIC_ROUTES = [
  { method: "GET", pattern: /^\/brands(\/[^/]+)?$/ },
  { method: "GET", pattern: /^\/products/ },
  { method: "POST", pattern: /^\/auth\/login$/ },
  // ... 40 dòng nữa, phải cập nhật mỗi khi thêm route
];

const ROUTE_PERMISSIONS: Record<string, string> = {
  "POST /brands": "brand:create:any",
  "PATCH /brands/:id": "brand:update:any", // ":id" — bạn tự parse hay tự regex?
  // ...
};

export function authMiddleware(req, res, next) {
  const isPublic = PUBLIC_ROUTES.some(
    (r) => r.method === req.method && r.pattern.test(req.path),
  );
  if (isPublic) return next();

  const user = verifyToken(req.headers.authorization); // ném 401 nếu hỏng
  const key = `${req.method} ${normalize(req.path)}`; // normalize: đổi UUID → ":id"…
  const needed = ROUTE_PERMISSIONS[key];
  if (needed && !user.permissions.includes(needed))
    throw new ForbiddenException();

  req.user = user;
  next();
}
```

Bốn lỗ hổng lộ ra ngay:

- **Thêm route mới quên khai** → mặc định là… gì? Public thì lộ dữ liệu; cần token thì route public mới bị 401.
  Không có đường nào an toàn. Guard + `@IsPublicApi()` mặc định là _cần token_, và boot-check bắt route quên
  `@RequirePermission`.
- **`normalize(req.path)`** là bạn tự viết lại router — `/brands/abc` là `:id` hay là sub-route `/brands/abc`?
- **Hai nguồn sự thật**: controller nói một điều, bảng nói điều khác, không có gì ép chúng khớp.
- **Không test theo đơn vị được**: muốn biết `POST /brands` cần quyền gì phải chạy cả middleware với URL thật.

Nói gọn: **middleware trả lời "request này là gì"; guard trả lời "request này được làm gì".** Auth là câu thứ hai.

---

## 7. Bốn middleware đang chạy trong dự án

Không có file nào trong `src/` implement `NestMiddleware`. Nhưng mỗi request vẫn đi qua bốn middleware trước khi tới
guard, tất cả từ thư viện:

### 7.1 Body parser — mặc định của Nest

`NestFactory.create()` tự đăng ký `body-parser` `json` và `urlencoded` bên trong `app.init()`
(`registerParserMiddleware`). Vì thế `req.body` trong guard đã là object ([chương 3](03-guards.md)). Tuỳ chọn liên quan:

```ts
// Tắt hẳn — bạn tự đăng ký parser mình muốn
NestFactory.create(AppModule, { bodyParser: false });

// Giữ body thô song song với body đã parse — cần cho verify chữ ký webhook (Stripe, GitHub)
NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
// rồi trong handler: req.rawBody (Buffer)

// Nâng giới hạn 100kb mặc định — ví dụ cho route nhận JSON lớn
const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  bodyParser: false,
});
app.useBodyParser("json", { limit: "10mb" });
app.useBodyParser("urlencoded", { extended: true });
```

Dự án dùng mặc định. Lưu ý: body vượt `limit` là **body-parser** ném `413` — lỗi này sinh ở tầng Express thuần,
vẫn tới `GlobalExceptionFilter` qua error-middleware cuối của Nest. Body lỗi thường **không** có `requestId` vì parser chạy trước pino-http (xem [chương 5 §5](05-request-lifecycle-in-this-project.md)).

### 7.2 CORS — [main.ts:27-32](../../src/main.ts#L27-L32)

```ts
app.enableCors({
  origin: "http://localhost:3000",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
});
```

`enableCors` gói gọn gói `cors` của Express và `app.use` nó **ngay lúc gọi** — trước cả `init()`. Request `OPTIONS`
(preflight) được trả lời **tại đây** với 204 — không bao giờ tới guard. Đó là lý do preflight không bị 401 dù không
có token.

Hai option đáng hiểu vì hay bị hỏi:

- `preflightContinue: false` — CORS **tự kết thúc** request OPTIONS. Nếu `true`, nó gọi `next()` và request đi tiếp
  vào Nest… rồi 404 vì không controller nào khai `@Options()`.
- `origin` là chuỗi cố định. Muốn nhiều origin theo môi trường: `origin: (origin, cb) => cb(null, ALLOWED.includes(origin))`
  — vẫn là một hàm chạy trong middleware, không cần biết route.

### 7.3 Log request + request id — `nestjs-pino`

`LoggerModule.forRootAsync` ở [base.module.ts:86-89](../../src/shared/modules/base.module.ts#L86-L89) làm hai việc:
cung cấp `Logger` cho DI, **và** trong `configure()` của chính nó
`consumer.apply(pinoHttp).forRoutes({ path: "*", method: RequestMethod.ALL })`. Đây là ví dụ thực của
[cách đăng ký thứ ba](#4-ba-cách-đăng-ký--và-mọi-biến-thể-của-forroutes): một module thư viện `implements NestModule`
và tự bind middleware cho toàn app. Cấu hình ở [setup-logger.util.ts](../../src/shared/utils/setup-logger.util.ts):

- [dòng 39-48](../../src/shared/utils/setup-logger.util.ts#L39-L48): `genReqId` — lấy `X-Request-Id` client gửi,
  không có thì sinh UUID, và **ghi ngược lại header response**. Mọi tầng sau (guard, filter) đọc `req.id` để gắn vào
  log và vào body lỗi (`requestId` trong envelope —
  [global-exception.filter.ts:112-114](../../src/shared/filters/global-exception.filter.ts#L112-L114)).
- [dòng 9-17](../../src/shared/utils/setup-logger.util.ts#L9-L17): `redact` — che `authorization`, `password`, `email`…
  trước khi ghi log. Việc này **phải** ở middleware: nó cần thấy request thô, trước khi bất kỳ ai xử lý.
- [dòng 19-37](../../src/shared/utils/setup-logger.util.ts#L19-L37): ba mẫu message cho lúc nhận, lúc xong, lúc lỗi.

Đây là ví dụ hoàn hảo về việc **đúng tầng**: log và request id không cần biết handler, cần chạy cho cả request bị
401 và 404 → middleware. Và `res.setHeader("X-Request-Id")` trong `genReqId` là ví dụ về middleware **ghi header
response sớm** — trước khi có bất kỳ body nào.

### 7.4 Phát hiện ngôn ngữ — `nestjs-i18n`

[i18n.module.ts:26-30](../../src/shared/modules/i18n.module.ts#L26-L30) khai hai resolver: header `Accept-Language`
và header tuỳ chỉnh `x-lang`. `I18nModule` của thư viện đăng ký `I18nMiddleware` với `forRoutes("*")`; middleware
này chạy resolver, gắn `req.i18nContext`, và mở một `AsyncLocalStorage` để `I18nContext.current(ctx)` ở
[current-lang.decorator.ts:6](../../src/shared/param-decorators/current-lang.decorator.ts#L6) đọc được — dù param
decorator chạy sau nhiều tầng.

Một quan hệ ngầm đáng ghi: **`@CurrentLang()` (param decorator, tầng Nest) phụ thuộc vào một middleware (tầng
Express) đã chạy trước**. Tắt `I18nModule` là decorator này ném lỗi. Đây là mẫu chung của nhiều thư viện: middleware
**gắn ngữ cảnh** lên `req` (hoặc vào `AsyncLocalStorage`), tầng Nest **tiêu thụ** ngữ cảnh đó.

### Một cấu hình ảnh hưởng tới middleware: `trust proxy`

[main.ts:24](../../src/main.ts#L24) — `app.set("trust proxy", trustProxyHops)`. Không phải middleware, nhưng quyết
định `req.ip` là gì, mà `req.ip` là khoá rate-limit của `AppThrottlerGuard`. Comment ở dòng 20-23 giải thích vì sao
mặc định là "không tin ai": tin thừa một hop là kẻ tấn công giả `X-Forwarded-For` để có budget mới mỗi request.

### Thứ tự thực tế

```
enableCors()          init(): body-parser      init(): module middleware theo thứ tự module        router
   cors          →    json → urlencoded    →   pino-http (req.id) → I18nMiddleware (req.i18nContext) → [Nest] guard → ...
(main.ts:27,           (Nest tự đăng ký)         (BaseModule)          (SharedModule → I18nModule)
 gọi trước listen)
```

Ba mốc thời gian, một nguyên tắc: **gọi `.use()` trước thì đứng trước**. `enableCors` gọi ở dòng 27 nên đứng đầu;
body-parser gắn khi `init()` chạy (bên trong `listen()` dòng 47); hai middleware module gắn trong cùng `init()`
nhưng sau body-parser. [Chương 5](05-request-lifecycle-in-this-project.md) có snippet in ra stack Express để tự
kiểm chứng thứ tự này.

---

## 8. Bộ sưu tập: tám middleware mẫu

Tất cả đều **chưa tồn tại** trong dự án. Mỗi ví dụ viết theo quy ước dự án (class `@Injectable`, `throw HttpException`
để đi qua `GlobalExceptionFilter`, đăng ký qua `consumer.apply`), kèm câu trả lời cho "vì sao là middleware chứ
không phải guard".

### 8.1 Chế độ bảo trì — trả 503 trừ health check

_Vì sao middleware:_ áp cho mọi request, kể cả route không tồn tại; không cần biết handler. Ví dụ dùng `ConfigService` từ `@nestjs/config`; module phải import `ConfigModule`. Repo chưa có cờ maintenance trong `AppConfigService`, nên tích hợp thực tế cần bổ sung schema env tương ứng.

```ts
// src/shared/middlewares/maintenance-mode.middleware.ts — minh hoạ
@Injectable()
export class MaintenanceModeMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (this.config.get("MAINTENANCE_MODE") !== "true") {
      return next();
    }

    res.setHeader("Retry-After", "600");
    // Đăng ký qua consumer.apply nên GlobalExceptionFilter bắt được → envelope chuẩn.
    throw new ServiceUnavailableException("Service is under maintenance.");
  }
}

// app.module.ts
@Module({
  imports: [SharedModule, BaseModule, RouteModule],
  providers: [MaintenanceModeMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MaintenanceModeMiddleware)
      .exclude({ path: "health", method: RequestMethod.GET })
      .forRoutes("*path");
  }
}
```

### 8.2 Tenant id từ header — gắn ngữ cảnh lên `req` (kèm khai báo kiểu)

_Vì sao middleware:_ là "request này là gì", không phải "được làm gì". Guard, service phía sau chỉ **đọc**.

```ts
// src/types/express.d.ts — mở rộng kiểu Request của Express
import "express-serve-static-core"; // module augmentation, không thay thế khai báo gốc

declare module "express-serve-static-core" {
  interface Request {
    tenantId?: string;
  }
}

// src/shared/middlewares/tenant.middleware.ts
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const raw = req.headers["x-tenant-id"];
    const tenantId = Array.isArray(raw) ? raw[0] : raw;

    if (!tenantId || !/^[a-z0-9-]{3,32}$/.test(tenantId)) {
      throw new BadRequestException("Missing or malformed X-Tenant-Id header.");
    }

    req.tenantId = tenantId;
    next();
  }
}

// order.module.ts — chỉ các route cần tenant
export class OrderModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes(OrderController, CartController);
  }
}

// đọc lại ở tầng Nest bằng param decorator
export const TenantId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<Request>().tenantId,
);
```

Đây đúng là mẫu của `I18nMiddleware` + `@CurrentLang()` trong dự án, viết tay. Lưu ý **không** gắn `req.user` theo
cách này — [mục 10](#10-nâng-cao) giải thích.

### 8.3 Ép `Content-Type: application/json` cho request có body

_Vì sao middleware:_ kiểm Content-Type trước guard và handler, không phụ thuộc metadata route. Middleware đăng ký qua `consumer.apply` chạy sau parser mặc định; ví dụ này không ngăn parser đọc body. Muốn kiểm trước parser phải đăng ký `app.use` trước `init()` và chủ động sắp thứ tự parser.

```ts
const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH"]);

export function requireJsonBody(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!METHODS_WITH_BODY.has(req.method)) return next();

  const length = Number(req.headers["content-length"] ?? 0);
  if (length === 0 && !req.headers["transfer-encoding"]) return next(); // không body; chunked có thể không có Content-Length

  if (!req.is("application/json")) {
    throw new UnsupportedMediaTypeException("Body must be application/json.");
  }
  next();
}

// exclude route upload multipart
consumer
  .apply(requireJsonBody)
  .exclude({ path: "media/*path", method: RequestMethod.POST })
  .forRoutes("*path");
```

Vì sao cần: `body-parser` **bỏ qua** body có Content-Type lạ và để `req.body = {}`. Không có middleware này,
client gửi `text/plain` sẽ nhận lỗi validation "field X is required" — đúng nhưng gây hiểu nhầm. 415 rõ hơn.

### 8.4 Header `Deprecation` cho một nhóm route cũ

_Vì sao middleware:_ chỉ ghi header, không cần metadata; gắn theo controller để refactor path không vỡ.

```ts
export function deprecated(sunset: string, successor: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Deprecation", "true");
    res.setHeader("Sunset", sunset);
    res.setHeader("Link", `<${successor}>; rel="successor-version"`);
    next();
  };
}

consumer
  .apply(deprecated("Sat, 31 Jan 2027 00:00:00 GMT", "/v2/brand-translations"))
  .forRoutes(BrandTranslationController);
```

Header phải set **trước** khi body được ghi — middleware đứng trước handler nên luôn thoả. (Đặt cùng logic vào
`res.on("finish")` sẽ **không** hoạt động: lúc đó header đã đi rồi.)

### 8.5 Đo thời gian và cảnh báo request chậm

_Vì sao middleware:_ muốn đo cả 401/404/429; muốn tính cả thời gian guard và pipe.

```ts
@Injectable()
export class SlowRequestMiddleware implements NestMiddleware {
  private readonly thresholdMs = 1_000;

  constructor(
    @InjectPinoLogger(SlowRequestMiddleware.name)
    private readonly logger: PinoLogger,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint();

    res.once("finish", () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      if (ms > this.thresholdMs) {
        this.logger.warn(
          {
            requestId: req.id,
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            ms,
          },
          "slow request",
        );
      }
    });

    next();
  }
}
```

`finish` bắn khi byte cuối được đưa cho OS. Có thêm `close` — bắn kể cả khi client ngắt giữa chừng; nếu muốn đếm
request bị huỷ thì nghe cả hai và dùng cờ để không đếm đôi.

### 8.6 Chặn danh sách IP đen

_Vì sao middleware:_ càng sớm càng rẻ — không parse body, không chạy guard cho request đằng nào cũng bị chặn. Nếu
cần "route nào được miễn" theo metadata thì chuyển thành guard đứng trước throttler.

```ts
@Injectable()
export class IpBlocklistMiddleware implements NestMiddleware {
  constructor(private readonly redis: Redis) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // req.ip đã tôn trọng `trust proxy` (main.ts:24) — cùng khoá với AppThrottlerGuard
      const blocked = await this.redis.sismember("ip:blocklist", req.ip ?? "");
      if (blocked) {
        throw new ForbiddenException("Forbidden.");
      }
      next();
    } catch (err) {
      next(err);
    }
  }
}
```

Đăng ký **trước** pino-http? Không được từ `AppModule` — `BaseModule` import trước nên pino bind trước. Chấp nhận:
request bị chặn vẫn có một dòng log và `X-Request-Id`, và đó thường là điều bạn muốn.

### 8.7 Bỏ dấu `/` cuối URL — chuẩn hoá path

_Vì sao middleware:_ là việc của URL, xảy ra trước routing; Express 5 mặc định coi `/brands` và `/brands/` là một
rồi, nhưng nếu muốn client thấy **một** URL canonical thì redirect ở đây.

```ts
export function stripTrailingSlash(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.method === "GET" && req.path.length > 1 && req.path.endsWith("/")) {
    const query = req.url.slice(req.path.length); // giữ ?a=b
    return res.redirect(308, req.path.slice(0, -1) + query);
  }
  next();
}
```

Ví dụ này **tự trả response** (`res.redirect`) và không gọi `next()` — lối ra thứ ba ở [mục 1](#1-middleware-là-hàm-req-res-next-của-express).

### 8.8 Giữ body thô cho webhook — cấu hình thay vì viết

_Vì sao ở đây:_ nhu cầu "verify chữ ký HMAC trên body thô" là nhu cầu middleware (phải chạm vào byte trước khi
parse), nhưng câu trả lời **không phải viết middleware** — bật cờ có sẵn:

```ts
// main.ts
const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  bufferLogs: true,
  rawBody: true, // body-parser giữ Buffer ở req.rawBody song song với req.body
});

// webhook.controller.ts
@Post("webhooks/payment")
@IsPublicApi()
handle(@Req() req: RawBodyRequest<Request>, @Headers("x-signature") signature: string) {
  verifyHmac(req.rawBody!, signature); // ném 401 nếu sai
  ...
}
```

Bài học: trước khi viết middleware, kiểm tra xem `NestFactory.create` options, `enableCors`, `useBodyParser`,
`useStaticAssets` đã có cờ cho việc đó chưa.

### Checklist trước khi viết

- [ ] Việc này có cần biết handler/metadata không? → Có thì **không** viết middleware.
- [ ] Có cần chạy cho cả request sẽ bị 401/404 không? → Có thì middleware là đúng.
- [ ] Đã có cờ cấu hình sẵn (`rawBody`, `useBodyParser`, `enableCors` option) chưa?
- [ ] Cần DI? → class `NestMiddleware` + `consumer.apply`. Không → hàm thuần hoặc factory.
- [ ] Lỗi tới global filter chưa? Kiểm thứ tự stack và middleware gắn request ID; `app.use` trước `init()` cũng có đường tới filter.
- [ ] Nhớ `next()` ở mọi nhánh không trả response. Async → `try/catch` + `next(err)`.
- [ ] Ghi header response? → phải trước `next()`, không phải trong `finish`.
- [ ] Gắn gì lên `req`? → khai báo kiểu qua `declare module "express-serve-static-core"`.

---

## 9. Test một middleware

### 9.1 Unit — không cần Nest

Middleware chỉ là hàm nhận ba đối số, nên test đơn vị là gọi nó với object giả:

```ts
// tenant.middleware.spec.ts
describe("TenantMiddleware", () => {
  const middleware = new TenantMiddleware();

  const call = (headers: Record<string, string>) => {
    const req = { headers } as unknown as Request;
    const res = {} as Response;
    const next = jest.fn();
    const run = () => middleware.use(req, res, next);
    return { req, next, run };
  };

  it("gắn tenantId và gọi next khi header hợp lệ", () => {
    const { req, next, run } = call({ "x-tenant-id": "acme-vn" });
    run();
    expect(req.tenantId).toBe("acme-vn");
    expect(next).toHaveBeenCalledWith(); // không có đối số = không lỗi
  });

  it("ném 400 khi thiếu header", () => {
    const { next, run } = call({});
    expect(run).toThrow(BadRequestException);
    expect(next).not.toHaveBeenCalled();
  });
});
```

Với middleware có DI (`AppConfigService`, `Redis`), truyền mock qua constructor — không cần `Test.createTestingModule`.

### 9.2 e2e — chứng minh lỗi đi qua filter

Đây là test cho khẳng định ở [§4.7](#47-lỗi-đi-đâu--vì-sao-cột-cuối-của-bảng-quan-trọng): ném từ middleware đăng
ký qua module thì ra envelope chuẩn.

```ts
// maintenance-mode.e2e-spec.ts
@Controller("ping")
class PingController {
  @Get() ping() {
    return { ok: true };
  }
}

@Module({
  controllers: [PingController],
  providers: [{ provide: ConfigService, useValue: { get: () => "true" } }],
})
class TinyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MaintenanceModeMiddleware).forRoutes("*path");
  }
}

it("503 từ middleware mang envelope của GlobalExceptionFilter", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [TinyModule],
    providers: [{ provide: APP_FILTER, useClass: GlobalExceptionFilter }],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();

  const res = await request(app.getHttpServer()).get("/ping");

  expect(res.status).toBe(503);
  expect(res.body).toMatchObject({
    statusCode: 503,
    message: "Service is under maintenance.",
  });
  // TinyModule không có pino-http, nên không assert requestId.
  // Muốn kiểm ID, thêm middleware gắn req.id trước middleware bảo trì.

  await app.close();
});
```

Để đối chiếu, bỏ đăng ký bảo trì trong `configure()`, rồi gọi
`app.use((req, res, next) => new MaintenanceModeMiddleware(config).use(req, res, next))`
**trước** `app.init()`: lỗi vẫn tới global filter. Nếu thêm middleware sau error-middleware cuối của Nest,
lỗi không thể đi ngược stack tới filter đó.

### 9.3 Kiểm tra thứ tự stack

```ts
const express = app.getHttpAdapter().getInstance();
console.log(express.router.stack.map((l) => l.name)); // Express 5: app.router
// [ 'corsMiddleware', 'jsonParser', 'urlencodedParser', 'bound ', 'bound ', ... 'router' ]
```

Các entry `bound ` là proxy của Nest bọc middleware module (pino, i18n) — tên bị mất vì đã `bind`. Đủ để xác nhận
cors đứng trước body-parser và cả hai đứng trước middleware module.

---

## 10. Nâng cao

**`res.on("finish")` để đo sau khi response đi.** Middleware chạy _trước_, nhưng có thể đăng ký callback chạy _sau_ —
đây là cách pino-http đo `responseTime`. Đừng đo bằng cách `await next()` — `next()` của Express không trả Promise.
Và **không set header trong `finish`**: header đã gửi rồi, `setHeader` ném `ERR_HTTP_HEADERS_SENT`.

**Lỗi async trong middleware hàm thuần.** `async (req, res, next) => { throw ... }` — Express 4 **không** bắt Promise
reject; request treo. Hoặc `try/catch` rồi `next(err)`, hoặc dùng class `NestMiddleware` (Nest bọc và chuyển cho
filter). Express 5 (Nest 11 dùng) bắt reject và chuyển xuống error handler; với `app.use` trước `init()`, đường này tới global filter cuối của Nest. Lỗi trong callback tách rời như timer vẫn cần bắt rồi `next(err)`; Express không theo dõi callback đó.

**`exclude()` khớp path sau global prefix.** Nếu app có `setGlobalPrefix("api")`, `exclude("health")` vẫn viết không
có `api/`. Ngược lại, middleware `app.use` thuần **không** biết global prefix — `app.use("/health", fn)` phải tự viết
`/api/health`.

**Middleware cho route không tồn tại.** `forRoutes("*path")` chạy cả với path không có controller nào → rồi mới 404.
Đó là lý do log của pino có cả dòng cho request 404, và lý do bảng ở [mục 5](#5-middleware-vs-guard-vs-interceptor-vs-pipe)
có dòng "Chạy cho request 404: Có" — guard/interceptor/pipe không bao giờ thấy những request này.

**Không dùng middleware để "gắn user vào request" rồi guard đọc.** Bạn sẽ có hai chỗ hiểu về token, và middleware
không biết route có public không nên phải nuốt lỗi → auth im lặng thất bại. Để guard làm cả hai việc. Gắn **ngữ
cảnh không cần xác minh** (tenant id, ngôn ngữ, request id) thì ngược lại là việc đúng của middleware — khác nhau ở
chỗ: ngữ cảnh đó **không quyết định quyền**.

**Middleware `Scope.REQUEST`.** Class middleware có thể `@Injectable({ scope: Scope.REQUEST })` hoặc phụ thuộc vào
provider request-scoped; Nest sẽ tạo instance mới mỗi request (nhánh `contextId` trong `MiddlewareModule.bindHandler`).
Hiếm khi cần, và trả giá y như mọi provider request-scoped — [chương 8](08-request-and-provider-instances.md).

**Versioning.** Nếu app bật `app.enableVersioning()`, `RouteInfo` nhận thêm `version`:
`forRoutes({ path: "brands", method: RequestMethod.ALL, version: "2" })`. Dự án chưa bật versioning.

**`req.body` là `{}` khi không parse được — không phải `undefined`.** Với body-parser 1.x mà `@nestjs/platform-express`
11 kéo theo, request không có body hoặc có Content-Type lạ đều cho `req.body = {}`. Đây là lý do
[§8.3](#83-ép-content-type-applicationjson-cho-request-có-body) tồn tại, và lý do guard đọc `req.body.email` không
cần check `undefined` ở tầng object.

**Fastify.** Đổi adapter sang Fastify thì chữ ký middleware Nest vẫn là `(req, res, next)` nhưng `req`/`res` là của
Fastify (qua `@fastify/middie`), và gói Express (`cors`, `helmet`) phải thay bằng plugin Fastify tương ứng. Đây là
cái giá thật của "middleware thuộc tầng dưới Nest": nó **gắn với platform**. Guard/interceptor/pipe thì không.

---

## 11. Trong dự án này

| Middleware                              | Nguồn                     | Đăng ký ở                                                                                                                                     | Gắn gì lên request                         | Ai dùng sau đó                                    |
| --------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| `body-parser` json/urlencoded           | Nest mặc định             | `NestFactory.create` → `init()`                                                                                                               | `req.body`                                 | `AppThrottlerGuard` (email key), `ValidationPipe` |
| `cors`                                  | Express, qua `enableCors` | [main.ts:27-32](../../src/main.ts#L27-L32)                                                                                                    | header CORS; trả lời preflight             | trình duyệt                                       |
| `pino-http`                             | `nestjs-pino`             | [base.module.ts:86-89](../../src/shared/modules/base.module.ts#L86-L89) + [setup-logger.util.ts](../../src/shared/utils/setup-logger.util.ts) | `req.id`, `req.log`; header `X-Request-Id` | `GlobalExceptionFilter` (`requestId`), mọi log    |
| `I18nMiddleware`                        | `nestjs-i18n`             | [i18n.module.ts:16-32](../../src/shared/modules/i18n.module.ts#L16-L32)                                                                       | `req.i18nContext`, `AsyncLocalStorage`     | `@CurrentLang()`, `I18nService`                   |
| _(không phải middleware)_ `trust proxy` | Express setting           | [main.ts:24](../../src/main.ts#L24)                                                                                                           | quyết định `req.ip`                        | `AppThrottlerGuard`                               |

Tự viết: **0**. Đó không phải thiếu — mọi việc cross-cutting cần thiết đã có thư viện làm, và mọi việc cần biết
handler đã đúng chỗ ở guard/pipe/interceptor. Khi cần cái đầu tiên, [mục 8](#8-bộ-sưu-tập-tám-middleware-mẫu) là
khuôn: đặt ở `src/shared/middlewares/`, đăng ký qua `configure()` của `AppModule` (toàn app) hoặc module sở hữu
controller (nhóm route).

---

## 12. Tự kiểm chứng

App đang chạy (`pnpm start:dev`).

**1. Request id đi vòng qua middleware rồi ra header:**

```bash
curl -s -D - -o /dev/null localhost:3000/products | grep -i x-request-id
curl -s -D - -o /dev/null -H "X-Request-Id: thu-nghiem-123" localhost:3000/products | grep -i x-request-id
```

Lần một: một UUID do server sinh. Lần hai: `thu-nghiem-123` được **giữ nguyên** — đúng logic `genReqId`.

**2. Preflight CORS không tới guard:**

```bash
curl -s -i -X OPTIONS localhost:3000/roles -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" | head -1
```

`204`, không phải `401` — dù `/roles` cần token. Middleware CORS trả lời trước khi guard chạy.

**3. Middleware chạy cả cho route không tồn tại:**

```bash
curl -s -D - localhost:3000/khong-ton-tai | grep -i -E "^HTTP|x-request-id"
```

`404` **và** vẫn có `X-Request-Id`, và trong log server có một dòng cho request này. Guard không chạy (không có 401),
nhưng pino-http thì có.

**4. Ngôn ngữ được middleware quyết:** gọi một route trả về bản dịch với `-H "x-lang: vi"` rồi `-H "x-lang: en"`.
Handler không đọc header nào — `@CurrentLang()` chỉ hỏi context mà `I18nMiddleware` đã đặt.

**5. Redact hoạt động:** đăng nhập với body có `password`, nhìn log — trường đó hiện `**GDPR COMPLIANT**`. Log được
ghi bởi middleware pino với request thô, nên redact phải xảy ra ở đây, không thể muộn hơn.

**6. Lỗi tầng Express thuần không có `requestId`:**

```bash
curl -s -X POST localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email": "a@b.c",'
```

JSON hỏng → `body-parser` ném trước pino. Error-middleware cuối của Nest đổi lỗi thành 400 rồi gọi global filter, nên vẫn có envelope; thường thiếu `requestId` vì pino chưa chạy. So với 400 từ `ValidationPipe`, khác biệt này cho biết lỗi sinh trước hay sau tầng gắn ID.

---

**Tiếp theo:** [Chương 5 — Vòng đời một request trong dự án](05-request-lifecycle-in-this-project.md): ráp bốn
chương lại thành một đường đi duy nhất, từng tầng, từng file.
