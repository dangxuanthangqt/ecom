# Chương 4 — Middleware

> Middleware là tầng **dưới** NestJS — nó thuộc về Express. Chương này giải thích nó chạy lúc nào, viết và đăng ký
> ra sao, khác guard chỗ nào, và trả lời câu hỏi mà người mới hay đặt: _"sao không làm auth bằng middleware cho
> gọn?"_ Dự án không viết middleware nào bằng tay, nhưng có **bốn** middleware đang chạy mỗi request — đến từ thư viện.

**Mục lục**

1. [Middleware là hàm `(req, res, next)` của Express](#1-middleware-là-hàm-req-res-next-của-express)
2. [Chạy lúc nào — và vì sao điều đó quyết định mọi thứ](#2-chạy-lúc-nào--và-vì-sao-điều-đó-quyết-định-mọi-thứ)
3. [Hai cách viết](#3-hai-cách-viết)
4. [Ba cách đăng ký](#4-ba-cách-đăng-ký)
5. [Middleware vs Guard vs Interceptor vs Pipe](#5-middleware-vs-guard-vs-interceptor-vs-pipe)
6. [Vì sao xác thực không phải middleware trong dự án](#6-vì-sao-xác-thực-không-phải-middleware-trong-dự-án)
7. [Bốn middleware đang chạy trong dự án](#7-bốn-middleware-đang-chạy-trong-dự-án)
8. [Nếu bạn cần viết một middleware](#8-nếu-bạn-cần-viết-một-middleware)
9. [Nâng cao](#9-nâng-cao)
10. [Trong dự án này](#10-trong-dự-án-này)
11. [Tự kiểm chứng](#11-tự-kiểm-chứng)

---

## 1. Middleware là hàm `(req, res, next)` của Express

Ứng dụng Nest HTTP của dự án chạy trên `@nestjs/platform-express`. Bên dưới mọi thứ là một Express app, và Express
xử lý request bằng **một chuỗi hàm** gọi nối tiếp:

```ts
function logRequest(req: Request, res: Response, next: NextFunction) {
  console.log(req.method, req.url);
  next(); // gọi hàm kế tiếp trong chuỗi; không gọi là request treo
}
```

Ba tham số, một quy tắc: **làm việc của mình rồi gọi `next()`**, hoặc tự trả response và không gọi `next()`. Không có
`ExecutionContext`, không có `Reflector`, không có khái niệm "handler" — vì đây chưa phải Nest.

Mọi middleware Express ngoài kia (`cors`, `helmet`, `compression`, `cookie-parser`, `body-parser`) dùng được nguyên
xi. Đây là lợi thế lớn của middleware: **hệ sinh thái**.

---

## 2. Chạy lúc nào — và vì sao điều đó quyết định mọi thứ

```
Request → [ Middleware ] → Guard → Interceptor → Pipe → Handler
            ↑ ở đây, Nest CHƯA chọn handler
```

Middleware chạy **trước khi Nest quyết định request sẽ rơi vào controller/method nào**. Express đã khớp path để biết
có chạy middleware này không (`forRoutes`), nhưng cái "handler" theo nghĩa Nest — hàm có metadata, có
`@RequirePermission` — **chưa tồn tại** trong ngữ cảnh của middleware.

Hệ quả, nói một lần cho rõ:

> **Middleware không đọc được metadata của handler.** Không `@RequirePermission`, không `@AuthApi`, không
> `@Throttle`. Bất kỳ quyết định nào cần biết "route này khai gì" **không thể** nằm ở middleware.

Ngược lại, vì chạy sớm, middleware là chỗ đúng cho việc **phải xảy ra với mọi request bất kể đích đến**: parse body,
gắn request id, mở CORS, đo thời gian, phát hiện ngôn ngữ.

---

## 3. Hai cách viết

**Hàm thuần** — không DI, gọn:

```ts
export function requestTiming(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () =>
    console.log(`${req.method} ${req.url} ${Date.now() - start}ms`),
  );
  next();
}
```

**Class `NestMiddleware`** — có DI, dùng khi cần service:

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

Chọn class khi cần tiêm gì đó; chọn hàm khi không. Cả hai nhận đúng `(req, res, next)` của Express.

---

## 4. Ba cách đăng ký

| Cách                               | Ở đâu                        | DI    | Chọn route                                      | Lỗi ném ra đi đâu                                          |
| ---------------------------------- | ---------------------------- | ----- | ----------------------------------------------- | ---------------------------------------------------------- |
| `app.use(fn)`                      | `main.ts`                    | Không | toàn app                                        | **Express** xử lý — `GlobalExceptionFilter` **không** thấy |
| `consumer.apply(M).forRoutes(...)` | `configure()` của một module | Có    | theo path / method / controller, có `exclude()` | Nest bọc proxy → **về exception filter** như lỗi handler   |
| Thư viện tự đăng ký                | trong module của thư viện    | Có    | thư viện quyết                                  | như dòng trên                                              |

Cách thứ hai — mẫu chuẩn:

```ts
@Module({ ... })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestTimingMiddleware)
      .exclude({ path: "health", method: RequestMethod.GET })   // giả định có route health
      .forRoutes("*path");        // Nest 11: wildcard có tên
  }
}
```

> **Nest 11 đổi cú pháp wildcard.** `path-to-regexp` v8 yêu cầu wildcard có tên: `"*path"` hoặc `"{*path}"`.
> Chuỗi `"*"` cũ vẫn được Nest tự chuyển đổi (kèm cảnh báo), `"/users/*"` phải viết thành `"/users/*path"`. Dự án
> chưa có middleware tự viết nên chưa chạm điểm này; thư viện (pino, i18n) đã cập nhật.

Điểm hay bị hiểu sai: middleware đăng ký trong `configure()` của **một module** **không** bị giới hạn vào route của
module đó. `forRoutes("*path")` áp cho **mọi** route toàn app. Module chỉ là nơi đặt code.

Cột cuối của bảng là chi tiết ít người biết nhưng quan trọng khi debug: lỗi ném từ middleware đăng ký qua
`consumer.apply` **vẫn đi qua `GlobalExceptionFilter`** và ra đúng envelope lỗi; lỗi từ `app.use` thuần thì Express
trả HTML/JSON mặc định của nó. Muốn envelope thống nhất, dùng `consumer.apply`.

---

## 5. Middleware vs Guard vs Interceptor vs Pipe

|                           | Middleware                     | Guard                   | Interceptor                            | Pipe                |
| ------------------------- | ------------------------------ | ----------------------- | -------------------------------------- | ------------------- |
| Biết handler nào sắp chạy | **Không**                      | Có                      | Có                                     | Có                  |
| Đọc metadata handler      | Không                          | **Có**                  | Có                                     | Có                  |
| Thấy body đã validate     | Không                          | Không                   | Có (sau pipe)                          | Chính nó validate   |
| Sửa response              | Có (thô, qua `res`)            | Header được, body không | **Có** (map kết quả)                   | Không               |
| Chạy khi handler ném lỗi  | Không liên quan                | Không liên quan         | Có (`catchError`)                      | Không               |
| DI                        | Class có / hàm không           | Có (qua `APP_GUARD`)    | Có                                     | Có                  |
| Dùng cho                  | log, id, CORS, parse, ngôn ngữ | **quyền vào cửa**       | serialize, cache, đo thời gian handler | validate, transform |

Câu hỏi để chọn nhanh: **"Việc này có cần biết route đích khai gì không?"** Có → guard/interceptor/pipe. Không →
middleware.

Một dòng trong bảng cần nói rõ: **"Sửa response" của guard**. Guard lấy được `res` qua
`context.switchToHttp().getResponse()`, nên **ghi header thì được** — `AppThrottlerGuard` của dự án ghi
`Retry-After` rồi mới ném 429 ([chương 3 §8](03-guards.md#8-guard-kế-thừa-thư-viện-appthrottlerguard)). Cái guard
**không** làm được là _nhào nặn body thành công_ của handler: handler còn chưa chạy, chưa có gì để nhào. Việc đó là
của interceptor. Nói gọn: guard chạm được vào **vỏ** response, không chạm được vào **ruột**.

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

Nói gọn: **middleware trả lời "request này là gì"; guard trả lời "request này được làm gì".** Auth là câu thứ hai.

---

## 7. Bốn middleware đang chạy trong dự án

Không có file nào trong `src/` implement `NestMiddleware`. Nhưng mỗi request vẫn đi qua bốn middleware trước khi tới
guard, tất cả từ thư viện:

### 7.1 Body parser — mặc định của Nest

`NestFactory.create()` tự đăng ký `body-parser` `json` và `urlencoded`. Vì thế `req.body` trong guard đã là object
([mục 6](#6-vì-sao-xác-thực-không-phải-middleware-trong-dự-án), [chương 3](03-guards.md)). Tắt bằng `NestFactory.create(AppModule, { bodyParser: false })`; giữ body thô để verify chữ ký
webhook bằng `{ rawBody: true }`. Dự án dùng mặc định.

### 7.2 CORS — [main.ts:27-32](../../src/main.ts#L27-L32)

```ts
app.enableCors({
  origin: "http://localhost:3000",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
});
```

`enableCors` gói gọn gói `cors` của Express và `app.use` nó. Request `OPTIONS` (preflight) được trả lời **ngay tại
đây** với 204 — không bao giờ tới guard. Đó là lý do preflight không bị 401 dù không có token.

### 7.3 Log request + request id — `nestjs-pino`

`LoggerModule.forRootAsync` ở [base.module.ts:86-89](../../src/shared/modules/base.module.ts#L86-L89) làm hai việc:
cung cấp `Logger` cho DI, **và** trong `configure()` của chính nó `consumer.apply(pinoHttp).forRoutes("*")`. Cấu hình
ở [setup-logger.util.ts](../../src/shared/utils/setup-logger.util.ts):

- [dòng 39-48](../../src/shared/utils/setup-logger.util.ts#L39-L48): `genReqId` — lấy `X-Request-Id` client gửi,
  không có thì sinh UUID, và **ghi ngược lại header response**. Mọi tầng sau (guard, filter) đọc `req.id` để gắn vào
  log và vào body lỗi (`requestId` trong envelope).
- [dòng 9-17](../../src/shared/utils/setup-logger.util.ts#L9-L17): `redact` — che `authorization`, `password`, `email`…
  trước khi ghi log. Việc này **phải** ở middleware: nó cần thấy request thô, trước khi bất kỳ ai xử lý.
- [dòng 19-37](../../src/shared/utils/setup-logger.util.ts#L19-L37): ba mẫu message cho lúc nhận, lúc xong, lúc lỗi.

Đây là ví dụ hoàn hảo về việc **đúng tầng**: log và request id không cần biết handler, cần chạy cho cả request bị
401 và 404 → middleware.

### 7.4 Phát hiện ngôn ngữ — `nestjs-i18n`

[i18n.module.ts:26-30](../../src/shared/modules/i18n.module.ts#L26-L30) khai hai resolver: header `Accept-Language`
và header tuỳ chỉnh `x-lang`. `I18nModule` của thư viện đăng ký `I18nMiddleware` cho mọi route; middleware này chạy
resolver, gắn `req.i18nContext`, và mở một `AsyncLocalStorage` để `I18nContext.current(ctx)` ở
[current-lang.decorator.ts:6](../../src/shared/param-decorators/current-lang.decorator.ts#L6) đọc được — dù param
decorator chạy sau nhiều tầng.

Một quan hệ ngầm đáng ghi: **`@CurrentLang()` (param decorator, tầng Nest) phụ thuộc vào một middleware (tầng
Express) đã chạy trước**. Tắt `I18nModule` là decorator này ném lỗi.

### Một cấu hình ảnh hưởng tới middleware: `trust proxy`

[main.ts:24](../../src/main.ts#L24) — `app.set("trust proxy", trustProxyHops)`. Không phải middleware, nhưng quyết
định `req.ip` là gì, mà `req.ip` là khoá rate-limit của `AppThrottlerGuard`. Comment ở dòng 20-23 giải thích vì sao
mặc định là "không tin ai": tin thừa một hop là kẻ tấn công giả `X-Forwarded-For` để có budget mới mỗi request.

### Thứ tự thực tế

```
body-parser + CORS  →  pino-http (req.id)  →  I18nMiddleware (req.i18nContext)  →  [Nest] AppThrottlerGuard → ...
   (lúc tạo app / enableCors)     (đăng ký lúc app.init(), theo thứ tự module)
```

Hai middleware từ module (pino, i18n) được Nest bind trong `app.init()`, sau những gì đã `app.use` trước đó.

---

## 8. Nếu bạn cần viết một middleware

Ví dụ hợp lệ: chế độ bảo trì — trả 503 cho mọi request trừ một route health check (dự án hiện **chưa có** route
này; ví dụ giả định có), **không cần biết route đích**.

```ts
// src/shared/middlewares/maintenance-mode.middleware.ts — minh hoạ, chưa tồn tại
@Injectable()
export class MaintenanceModeMiddleware implements NestMiddleware {
  constructor(private readonly appConfigService: AppConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (!this.appConfigService.appConfig.maintenanceMode) {
      return next();
    }

    // Ném HttpException — vì đăng ký qua consumer.apply, GlobalExceptionFilter
    // sẽ bắt và trả đúng envelope lỗi của API, không phải body thô.
    throw new ServiceUnavailableException("Service is under maintenance.");
  }
}

// app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MaintenanceModeMiddleware)
      .exclude({ path: "health", method: RequestMethod.GET })
      .forRoutes("*path");
  }
}
```

Checklist trước khi viết:

- [ ] Việc này có cần biết handler/metadata không? → Có thì **không** viết middleware.
- [ ] Có cần chạy cho cả request sẽ bị 401/404 không? → Có thì middleware là đúng.
- [ ] Cần DI? → class `NestMiddleware` + `consumer.apply`.
- [ ] Muốn lỗi ra đúng envelope? → `consumer.apply`, không `app.use`.
- [ ] Nhớ `next()` ở mọi nhánh không trả response.

---

## 9. Nâng cao

**`res.on("finish")` để đo sau khi response đi.** Middleware chạy _trước_, nhưng có thể đăng ký callback chạy _sau_ —
đây là cách pino-http đo `responseTime`. Đừng đo bằng cách `await next()` — `next()` của Express không trả Promise.

**Lỗi async trong middleware hàm thuần.** `async (req, res, next) => { throw ... }` — Express 4 **không** bắt Promise
reject; request treo. Hoặc `try/catch` rồi `next(err)`, hoặc dùng class `NestMiddleware` (Nest bọc và chuyển cho
filter). Express 5 (Nest 11 dùng) bắt được, nhưng thói quen `next(err)` vẫn an toàn hơn.

**`exclude()` khớp path sau global prefix.** Nếu app có `setGlobalPrefix("api")`, `exclude("status")` vẫn viết không
có `api/`.

**Middleware cho route không tồn tại.** `forRoutes("*path")` chạy cả với path không có controller nào → rồi mới 404.
Đó là lý do log của pino có cả dòng cho request 404.

**Không dùng middleware để "gắn user vào request" rồi guard đọc.** Bạn sẽ có hai chỗ hiểu về token, và middleware
không biết route có public không nên phải nuốt lỗi → auth im lặng thất bại. Để guard làm cả hai việc.

---

## 10. Trong dự án này

| Middleware                              | Nguồn                     | Đăng ký ở                                                                                                                                     | Gắn gì lên request                         | Ai dùng sau đó                                    |
| --------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| `body-parser` json/urlencoded           | Nest mặc định             | `NestFactory.create`                                                                                                                          | `req.body`                                 | `AppThrottlerGuard` (email key), `ValidationPipe` |
| `cors`                                  | Express, qua `enableCors` | [main.ts:27-32](../../src/main.ts#L27-L32)                                                                                                    | header CORS; trả lời preflight             | trình duyệt                                       |
| `pino-http`                             | `nestjs-pino`             | [base.module.ts:86-89](../../src/shared/modules/base.module.ts#L86-L89) + [setup-logger.util.ts](../../src/shared/utils/setup-logger.util.ts) | `req.id`, `req.log`; header `X-Request-Id` | `GlobalExceptionFilter` (`requestId`), mọi log    |
| `I18nMiddleware`                        | `nestjs-i18n`             | [i18n.module.ts:16-32](../../src/shared/modules/i18n.module.ts#L16-L32)                                                                       | `req.i18nContext`, `AsyncLocalStorage`     | `@CurrentLang()`, `I18nService`                   |
| _(không phải middleware)_ `trust proxy` | Express setting           | [main.ts:24](../../src/main.ts#L24)                                                                                                           | quyết định `req.ip`                        | `AppThrottlerGuard`                               |

Tự viết: **0**. Đó không phải thiếu — mọi việc cross-cutting cần thiết đã có thư viện làm, và mọi việc cần biết
handler đã đúng chỗ ở guard/pipe/interceptor.

---

## 11. Tự kiểm chứng

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

**3. Ngôn ngữ được middleware quyết:** gọi một route trả về bản dịch với `-H "x-lang: vi"` rồi `-H "x-lang: en"`.
Handler không đọc header nào — `@CurrentLang()` chỉ hỏi context mà `I18nMiddleware` đã đặt.

**4. Redact hoạt động:** đăng nhập với body có `password`, nhìn log — trường đó hiện `**GDPR COMPLIANT**`. Log được
ghi bởi middleware pino với request thô, nên redact phải xảy ra ở đây, không thể muộn hơn.

---

**Tiếp theo:** [Chương 5 — Vòng đời một request trong dự án](05-request-lifecycle-in-this-project.md): ráp bốn
chương lại thành một đường đi duy nhất, từng tầng, từng file.
