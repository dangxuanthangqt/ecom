# Chương 8 — Mỗi request có tạo instance mới không?

> Chương này trả lời đúng một câu hỏi mà gần như ai học NestJS cũng hỏi: **khi một request HTTP đến, Nest có
> `new` ra controller / service mới không?** Câu trả lời ngắn: **không, mặc định là không**. Câu trả lời dài là
> cả chương này — vì "không" kéo theo một loạt hệ quả về cách viết code, và vì Nest **có** một chế độ tạo instance
> theo request, chỉ là dự án này không dùng.
>
> **Cần đọc trước:** [chương 6 §8](06-modules-and-dependency-injection.md#8-scope-của-provider) đã nói ngắn về
> scope. Chương này đi sâu vào phần đó: cái gì được tạo lúc nào, bằng chứng trong mã nguồn Nest, và cách dự án
> truyền dữ liệu theo-request mà không cần instance theo-request.

**Mục lục**

1. [Câu trả lời trong ba dòng](#1-câu-trả-lời-trong-ba-dòng)
2. [Hai thời điểm khác nhau: boot và request](#2-hai-thời-điểm-khác-nhau-boot-và-request)
3. [Cái gì được tạo mới cho mỗi request](#3-cái-gì-được-tạo-mới-cho-mỗi-request)
4. [Instance singleton được dùng như thế nào](#4-instance-singleton-được-dùng-như-thế-nào)
5. [Hệ quả: provider không được giữ trạng thái theo-request](#5-hệ-quả-provider-không-được-giữ-trạng-thái-theo-request)
6. [Ba scope của Nest](#6-ba-scope-của-nest)
7. [Nâng cao: Nest tạo instance theo request bằng cách nào](#7-nâng-cao-nest-tạo-instance-theo-request-bằng-cách-nào)
8. [Nâng cao: cái giá của `Scope.REQUEST`](#8-nâng-cao-cái-giá-của-scoperequest)
9. [Cách dự án này truyền dữ liệu theo-request](#9-cách-dự-án-này-truyền-dữ-liệu-theo-request)
10. [Khi nào thật sự cần `Scope.REQUEST`](#10-khi-nào-thật-sự-cần-scoperequest)
11. [Căn bản hay nâng cao?](#11-căn-bản-hay-nâng-cao)
12. [Tự kiểm chứng](#12-tự-kiểm-chứng)

---

## 1. Câu trả lời trong ba dòng

1. **Controller, service, repository, guard, interceptor, pipe, filter** trong dự án này được tạo **một lần duy
   nhất cho mỗi registration/module trong một app** lúc khởi động. Cùng class đăng ký ở hai module có thể có hai instance; mỗi registration được các request dùng chung. Đây là `Scope.DEFAULT`, còn gọi là
   **singleton**.
2. Thứ được tạo mới cho mỗi request là **`req` và `res`** (do Node/Express tạo) và một vài object phụ trợ nhỏ của
   Nest (`ExecutionContext`, DTO đã validate, kết quả của param decorator). Không có class nào của bạn bị `new` lại.
3. Nest **có** chế độ `Scope.REQUEST` để tạo instance riêng cho mỗi request. Dự án không dùng, và phần lớn dự án
   Nest cũng không nên dùng. §7–§8 giải thích tại sao.

Nếu chỉ nhớ một điều: **class của bạn là singleton, dữ liệu theo-request nằm trên object `request`.**

---

## 2. Hai thời điểm khác nhau: boot và request

Mọi nhầm lẫn về chủ đề này đến từ việc gộp hai thời điểm vào một. Tách chúng ra:

```text
BOOT (một lần trên mỗi app):
  NestFactory.create(AppModule)
    → scan module và tạo provider/controller static
  app.init() (listen tự gọi nếu app chưa init)
    → gắn parser, middleware và routes
    → onModuleInit() rồi onApplicationBootstrap()
  app.listen(port)
    → mở cổng HTTP

REQUEST (nhiều lần):
  Node nhận HTTP request, tạo req/res
    → middleware → guard → interceptor chiều đi
    → resolve tham số và pipe → controller/service
    → interceptor chiều về → response
  Các method dùng provider đã có sẵn khi cây dependency static.

```

Bên trái là `bootstrap()` trong [main.ts](../../src/main.ts). Dòng `NestFactory.create(AppModule, ...)` là lúc
provider static được dựng; init còn gắn routes và chạy hooks. `listen()` tự init khi cần, rồi mới mở cổng. Các provider REQUEST/TRANSIENT được resolve theo scope/context riêng nếu có.

Bên phải là những gì lặp lại cho mỗi request. Hãy để ý: **không có chữ `new` nào trước tên class của bạn**. Nest
chỉ _gọi method_ trên các object đã có sẵn từ bên trái.

Bằng chứng nhanh: thêm `console.log` vào constructor của bất kỳ service nào, ví dụ
[product.service.ts](../../src/routes/product/product.service.ts):

```ts
@Injectable()
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {
    console.log("ProductService constructor", Date.now());
  }
}
```

Chạy `pnpm start:dev`, gọi `GET /products` mười lần. Dòng log xuất hiện **một lần**, lúc boot, trước cả dòng
"Nest application successfully started". Mười request sau đó không in gì thêm.

---

## 3. Cái gì được tạo mới cho mỗi request

"Không tạo instance" không có nghĩa là không có gì mới. Mỗi request vẫn sinh ra các object sau — và đây chính là
nơi dữ liệu theo-request sống:

| Object                          | Ai tạo                                      | Sống bao lâu                           | Dự án dùng để làm gì                                                                                                                                                      |
| ------------------------------- | ------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `req` (`IncomingMessage`)       | Node `http` → Express bọc lại               | từ khi socket nhận đến khi `res.end()` | Guard gắn `req.user`, `req.granted_permissions`; pino gắn `req.id`                                                                                                        |
| `res` (`ServerResponse`)        | Node `http` → Express bọc lại               | như trên                               | `TransformInterceptor` đọc `statusCode`; pino set header `X-Request-Id`                                                                                                   |
| `ExecutionContext`              | Nest, trong router-proxy                    | trong một lần đi qua pipeline          | Guard, interceptor, param decorator gọi `switchToHttp().getRequest()`                                                                                                     |
| Instance DTO                    | `ValidationPipe` (`class-transformer`)      | đến khi handler trả về                 | `ProductPaginationQueryDto` là object mới cho mỗi request                                                                                                                 |
| Giá trị param decorator         | Nest gọi factory của `createParamDecorator` | tức thời                               | `@ActiveUser()`, `@CurrentLang()` chạy lại cho mỗi request ([chương 1 §8](01-decorators-and-metadata.md#8-createparamdecorator--loại-decorator-thứ-hai-chạy-mỗi-request)) |
| Observable của interceptor      | RxJS                                        | tức thời                               | `next.handle().pipe(map(...))` trong `TransformInterceptor`                                                                                                               |
| Context của `AsyncLocalStorage` | `nestjs-i18n`                               | trong async chain của request          | `I18nContext.current(ctx)` lấy ngôn ngữ đúng của request đang chạy                                                                                                        |

Nhìn bảng và thấy quy luật: **mọi thứ theo-request đều là dữ liệu hoặc wrapper mỏng, không phải "đối tượng nghiệp
vụ" của bạn.** Controller nhận chúng qua tham số (`@Query()`, `@ActiveUser()`), xử lý, trả về, rồi quên.

---

## 4. Instance singleton được dùng như thế nào

Hãy đi bộ với một request cụ thể: `GET /products?page=2` với header `Accept-Language: vi`.

1. **Express** tạo `req`, `res`, chạy middleware. `pino-http` gọi `genReqId` trong
   [setup-logger.util.ts](../../src/shared/utils/setup-logger.util.ts#L39-L48): lấy `x-request-id` từ header
   hoặc sinh UUID mới, gán vào `req.id`, set header trả về. Đây là dữ liệu theo-request đầu tiên, nằm trên `req`.
2. **Router của Express** khớp `GET /products` với hàm mà Nest đã đăng ký lúc boot. Hàm này là một
   **closure** Nest tạo sẵn, bên trong đã tham chiếu tới **instance `ProductController` duy nhất** và method
   `getProducts` của nó.
3. Nest tạo `ExecutionContext` bọc `[req, res, next]` và chạy **guard toàn cục** (`APP_GUARD`). Guard là singleton.
   `AppThrottlerGuard` đếm theo `req.ip`, `AuthorizationHeaderGuard` thấy `@IsPublicApi()` nên cho qua. Không guard
   nào lưu gì vào `this`; chúng đọc `req` và ghi vào `req`.
4. **Interceptor** `ClassSerializerInterceptor` (singleton, đăng ký qua `APP_INTERCEPTOR`) gọi `next.handle()`.
   (`TransformInterceptor` trong `src/shared/interceptors/` **không** được đăng ký ở đâu — [chương 9 §8](09-interceptors.md#8-interceptor-viết-tay-đang-nằm-không-transforminterceptor).)
5. **Pipe** `ValidationPipe` (singleton) nhận `req.query`, tạo **một `ProductPaginationQueryDto` mới**, validate,
   trả về.
6. **Param decorator** `@CurrentLang()` chạy factory, hỏi `I18nContext.current(ctx)` → `"vi"`.
7. Nest gọi `productController.getProducts(dto, "vi")`. `this` bên trong là **instance duy nhất**.
   `this.productService` cũng là instance duy nhất, `this.productService.productRepository` cũng vậy, và
   `PrismaService` bên dưới giữ **một** connection pool cho toàn app.
8. Handler trả về, `map` của `ClassSerializerInterceptor` gọi `instanceToPlain` giữ lại field có `@Expose()`, Express
   ghi ra socket.

Cùng lúc đó, một request thứ hai `GET /products?page=3` có thể đang ở bước 7. Nó đi qua **cùng những object đó**.
Hai request không đụng nhau vì mỗi request có `req`, `res`, DTO, `ExecutionContext` riêng, và vì các method của
service **chỉ dùng tham số và biến cục bộ**, không dùng field của `this` để lưu dữ liệu tạm.

Đó là toàn bộ mô hình: **instance = code + dependency cố định; request = dữ liệu chảy qua.**

### Vì sao Nest chọn singleton mặc định

Node.js chạy một thread. Một process phục vụ hàng nghìn request đồng thời bằng event loop. Nếu mỗi request phải
`new` lại cả chuỗi controller → service → repository (cộng thêm mọi guard, interceptor, pipe kèm theo), ta trả
chi phí cấp phát và garbage collection cho việc chẳng đem lại gì — vì code của các class đó không đổi giữa các
request. Singleton cũng là cách duy nhất để những thứ **phải** dùng chung tồn tại: connection pool của Prisma,
client Redis, cache role-permission trong bộ nhớ.

---

## 5. Hệ quả: provider không được giữ trạng thái theo-request

Đây là lỗi thực tế hay gặp nhất khi người mới hiểu sai chủ đề này. Code sau **sai**:

```ts
@Injectable()
export class OrderService {
  private currentUserId: string; // ← trạng thái theo-request trên singleton

  setUser(userId: string) {
    this.currentUserId = userId;
  }

  async createOrder(dto: CreateOrderDto) {
    // Giữa lúc setUser() và dòng này có `await`. Request khác có thể đã gọi setUser()
    // với id khác. Đơn hàng bị tạo cho nhầm người.
    return this.repo.create({ ...dto, userId: this.currentUserId });
  }
}
```

Vì `OrderService` là **một** object cho mọi request, `this.currentUserId` là **biến toàn cục trá hình**. Với hai
request đan xen nhau qua `await`, request B ghi đè giá trị của request A. Lỗi này không xuất hiện khi test một
mình, chỉ xuất hiện dưới tải — đúng loại bug khó tìm nhất.

Cách viết đúng, và là cách toàn dự án đang làm: **truyền qua tham số**.

```ts
async createOrder(userId: string, dto: CreateOrderDto) {
  return this.repo.create({ ...dto, userId });
}
```

Controller lấy `userId` từ `@ActiveUser("userId")` — tức từ `req.user`, nơi `AccessTokenGuard` đã đặt nó ở
[access-token.guard.ts:128](../../src/shared/guards/access-token.guard.ts#L128) — rồi đưa xuống service.

Quy tắc để tự kiểm tra một provider: **mọi field của `this` phải là thứ không đổi trong suốt đời app** —
dependency được inject, config, logger, cache có khóa rõ ràng. Nếu một field mang giá trị "của request hiện tại",
bạn đang có race condition.

Những field **được phép** trên singleton, ví dụ trong dự án:

| Field                              | Ở đâu                        | Vì sao an toàn                                    |
| ---------------------------------- | ---------------------------- | ------------------------------------------------- |
| `private readonly logger`          | hầu hết service, guard       | không đổi                                         |
| `private readonly tokenService`    | `AccessTokenGuard`           | dependency, không đổi                             |
| connection pool của `PrismaClient` | `PrismaService`              | **cần** dùng chung, thư viện tự quản lý đồng thời |
| cache role → permission            | `RolePermissionCacheService` | khóa theo `roleId`, không phải theo request       |

---

## 6. Ba scope của Nest

| Scope             | Tạo instance khi nào                            | Bao nhiêu instance                     | Khi nào dùng                                                         |
| ----------------- | ----------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| `Scope.DEFAULT`   | một lần, lúc boot                               | 1 mỗi registration/module/context tĩnh | Mặc định. Toàn dự án này.                                            |
| `Scope.REQUEST`   | mỗi request đến, tạo lại; request xong, bỏ      | = số request đang xử lý đồng thời      | Cần inject chính `REQUEST` xuống tầng sâu; multi-tenant theo request |
| `Scope.TRANSIENT` | riêng theo consumer và context khi được resolve | = số consumer                          | Provider cần "biết" ai đang dùng nó, ví dụ logger mang tên class chủ |

Khai báo:

```ts
@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  constructor(@Inject(REQUEST) private readonly request: Request) {}
}
```

Ghi chú về `TRANSIENT`: nó không đồng nghĩa với theo-request. Một logger **tự khai báo**
`@Injectable({ scope: Scope.TRANSIENT })` có thể giữ context riêng cho từng consumer. Nếu consumer là
request-scoped, logger đó cũng được resolve theo context tương ứng. Không suy ra `Logger` có sẵn của Nest
là transient hay tự inject được: cần provider registration cụ thể. Repo dùng `new Logger(X.name)` trực tiếp.

Chạy lệnh sau để xác nhận dự án không khai báo scope nào:

```bash
grep -rn "Scope\.\(REQUEST\|TRANSIENT\|DEFAULT\)\|@Inject(REQUEST)" src --include='*.ts'
```

Kết quả rỗng. Mọi kết quả `Scope.OWN` / `Scope.ANY` bạn thấy là hằng phân quyền trong
`permission.constant.ts`, không liên quan.

---

## 7. Nâng cao: Nest tạo instance theo request bằng cách nào

Phần này đọc mã nguồn của `@nestjs/core` 11 để thấy "mặc định singleton" không phải quy ước, mà là một nhánh
`if` cụ thể. Mở
[node_modules/@nestjs/core/router/router-explorer.js](../../node_modules/@nestjs/core/router/router-explorer.js).

### 7.1 Lúc boot: quyết định một lần cho mỗi route

```js
// router-explorer.js, applyCallbackToRouter
const isRequestScoped = !instanceWrapper.isDependencyTreeStatic();
const proxy = isRequestScoped
  ? this.createRequestScopedHandler(instanceWrapper, requestMethod, ...)
  : this.createCallbackProxy(instance, targetCallback, methodName, moduleKey, requestMethod);
```

`instanceWrapper` là hồ sơ Nest giữ cho mỗi provider/controller. `isDependencyTreeStatic()` trả về `true` khi
cây dependency không có dependency `REQUEST` buộc phải resolve theo request. Cây có provider `TRANSIENT` vẫn có thể static. Khi đó Nest đi nhánh dưới:
`createCallbackProxy(instance, ...)` — nhận **object `instance` đã tạo sẵn**, bọc thành một hàm Express và đăng ký.
Từ đây, mỗi request chỉ gọi hàm đó. Không còn bước nào đụng tới DI container.

Với dự án này, **mọi route** đi nhánh dưới.

### 7.2 Nếu có một provider `REQUEST` trong cây

Nhánh trên, `createRequestScopedHandler`, trả về hàm sau:

```js
return async (req, res, next) => {
  const contextId = this.getContextId(req, isTreeDurable);
  const contextInstance = await this.injector.loadPerContext(instance, moduleRef, collection, contextId);
  await this.createCallbackProxy(contextInstance, contextInstance[methodName], ...)(req, res, next);
};
```

Ba việc **cho mỗi request**:

1. `getContextId(req)` tạo một `contextId` — thực chất chỉ là `{ id: Math.random() }` (xem
   `helpers/context-id-factory.js`). Nó được gắn vào `req` dưới một Symbol không liệt kê được, và object `req`
   được đăng ký làm giá trị cho token `REQUEST` trong context đó.
2. `injector.loadPerContext(...)` **dựng lại controller và mọi dependency không-static** của nó, gắn với
   `contextId`. Nest lưu các instance này trong một `WeakMap` khóa bằng object `contextId`; khi request kết thúc
   và không ai giữ `contextId` nữa, garbage collector dọn sạch.
3. Tạo proxy **mới** (`ExecutionContext`, exception filter) cho instance vừa dựng, rồi mới gọi handler.

So với nhánh singleton, đây là ba bước thêm vào **đường nóng** của mọi request đi qua route đó.

### 7.3 Vì sao scope "lây" lên trên

`isDependencyTreeStatic()` không hỏi "class này là `DEFAULT` không?" mà hỏi "class này **và mọi thứ nó phụ thuộc**
có phụ thuộc `REQUEST` không?". Lý do đơn giản: nếu `ProductRepository` là `REQUEST` nhưng `ProductService` vẫn là
singleton, thì `ProductService` sẽ giữ **bản `ProductRepository` của request nào**? Không có câu trả lời hợp lệ.
Nên Nest ép `ProductService` cũng thành theo-request, rồi `ProductController` cũng vậy. Đó là "lây lên trên"
([chương 6 §8](06-modules-and-dependency-injection.md#vì-sao-scoperequest-đắt-hơn-người-ta-tưởng)).

Chiều ngược lại thì không lây: một provider `REQUEST` **được** phụ thuộc vào singleton (ví dụ inject
`PrismaService`). Đó chính là điều bạn muốn — connection pool vẫn là một.

---

## 8. Nâng cao: cái giá của `Scope.REQUEST`

Bốn cái giá, theo thứ tự từ dễ thấy đến khó thấy:

**1. CPU và bộ nhớ.** Mỗi request cấp phát lại cả nhánh cây. Với controller có 3 tầng (controller → service →
repository) và vài guard kèm theo, đó là hàng chục object mỗi request, sau đó là việc cho GC.

**2. Guard, interceptor, pipe trong nhánh đó cũng theo request.** Nếu `AccessTokenGuard` phải inject một provider
`REQUEST`, bản thân guard bị dựng lại cho mỗi request. Guard toàn cục qua `APP_GUARD` bị dựng lại cho **mọi**
route.

**3. Mất khả năng dùng `ModuleRef.get()` thường.** Instance theo-request không tồn tại lúc boot, nên
`app.get(RequestScopedThing)` ném lỗi. Phải dùng `moduleRef.resolve(Token, contextId)` và tự quản lý `contextId`.
Code trong `onModuleInit`, cron job, BullMQ worker — những nơi **không có request** — không thể dùng provider đó
một cách tự nhiên.

**4. Ẩn phụ thuộc vào HTTP.** Một service inject `REQUEST` chỉ chạy được trong ngữ cảnh HTTP. Muốn gọi lại logic
đó từ worker hay từ test thuần, phải giả `request`. Đó là lý do dự án giữ service **không biết gì về HTTP** — chúng
nhận `userId`, `languageId` như tham số thuần.

Nest có `durable provider` để giảm giá (1) cho trường hợp multi-tenant: gộp nhiều request cùng tenant vào một
"sub-tree" dùng chung. Đó là chủ đề riêng, ngoài phạm vi dự án này.

---

## 9. Cách dự án này truyền dữ liệu theo-request

Không có `Scope.REQUEST`, dự án vẫn cần đưa "ai đang gọi", "ngôn ngữ gì", "request id nào" xuống nơi cần. Ba kỹ
thuật đang dùng, tất cả đều **không** đụng vào scope:

### 9.1 Gắn lên object `request`

`AccessTokenGuard` sau khi verify token:

```ts
// src/shared/guards/access-token.guard.ts:128
request[REQUEST_USER_KEY] = payload;
// ...
request[REQUEST_GRANTED_PERMISSIONS_KEY] = granted;
```

`@ActiveUser()` ở [active-user.decorator.ts](../../src/shared/param-decorators/active-user.decorator.ts) đọc lại:

```ts
const user = request[REQUEST_USER_KEY] as AccessTokenPayload;
return field ? user[field] : user;
```

Object `request` sinh ra và chết đi cùng request, nên nó là **chỗ lưu trạng thái theo-request tự nhiên nhất**.
Guard (singleton) ghi, param decorator (chạy mỗi request) đọc, controller nhận qua tham số. Xem
[chương 3 §9](03-guards.md#11-truyền-dữ-liệu-từ-guard-xuống-handler).

### 9.2 `AsyncLocalStorage`

`nestjs-i18n` không gắn ngôn ngữ lên `request`; nó dùng `AsyncLocalStorage` của Node. Middleware của nó mở một
"store" cho async chain của request; ở bất kỳ đâu trong chain đó, `I18nContext.current()` trả về đúng store của
request đang chạy — kể cả trong service không nhận `ctx`. `@CurrentLang()` ở
[current-lang.decorator.ts](../../src/shared/param-decorators/current-lang.decorator.ts) chỉ là lối tắt.

Đây là cách rẻ nhất để có "dữ liệu theo-request ở tầng sâu" mà **không** đổi scope của provider nào. Nếu một ngày
dự án cần `createdBy` tự động ở tầng repository, đây là lời giải nên thử trước.

### 9.3 Truyền tham số

Cách nhàm chán nhất và đúng nhất: controller lấy từ `request` rồi **truyền xuống** service như tham số. Ví dụ
`getProducts({ query, languageId })`. Service không biết HTTP là gì, test unit không cần giả `request`, và gọi
lại từ worker dễ như gọi hàm.

Ba kỹ thuật này cộng lại **thay thế hoàn toàn** `Scope.REQUEST` cho mọi nhu cầu hiện tại của dự án.

---

## 10. Khi nào thật sự cần `Scope.REQUEST`

Rất hiếm, nhưng có:

- **Multi-tenant theo connection**: mỗi tenant một database, cần một `PrismaClient` riêng chọn theo header. Provider
  `REQUEST` (hoặc durable) chọn client đúng cho request. Dự án không multi-tenant.
- **Thư viện bên thứ ba yêu cầu**: một số thư viện GraphQL (DataLoader theo request) hoặc tracing thiết kế quanh
  instance theo-request.
- **Legacy code có trạng thái**: một class cũ ghi trạng thái vào `this` mà bạn chưa refactor được; đổi sang
  `REQUEST` là cách cách ly tạm thời.

Nếu lý do của bạn là "tôi muốn lấy `req.user` trong service", câu trả lời là §9, không phải `Scope.REQUEST`.

---

## 11. Căn bản hay nâng cao?

Chủ đề này có **hai tầng**, và cần biết mình đang ở tầng nào:

| Tầng         | Nội dung                                                                                                                                          | Mục        | Cần cho ai                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------- |
| **Căn bản**  | Provider là singleton; `req`/`res` mới mỗi request; **không lưu trạng thái theo-request vào `this`**; truyền qua tham số hoặc gắn lên `request`   | §1–§5, §9  | **Mọi người viết code trong dự án.** Không nắm là có race condition.                  |
| **Nâng cao** | Ba scope, `isDependencyTreeStatic`, `contextId`, `loadPerContext`, scope lây lên trên, `moduleRef.resolve`, durable provider, `AsyncLocalStorage` | §6–§8, §10 | Ai phải review kiến trúc, debug hiệu năng, hoặc tích hợp thư viện đòi `REQUEST` scope |

Phần căn bản là **kiến thức bắt buộc** — nó ngang hàng với "biết `await` là gì". Sai ở đây tạo bug dữ liệu thật,
âm thầm, chỉ lộ dưới tải. Phần nâng cao là kiến thức **có thì tốt**: bạn có thể làm việc trong dự án này nhiều
tháng mà không chạm vào nó, nhưng khi một PR đề xuất `Scope.REQUEST`, bạn cần §7–§8 để nói "không, dùng
`AsyncLocalStorage`" một cách có căn cứ.

---

## 12. Tự kiểm chứng

Mỗi thí nghiệm dưới 5 phút, làm trên nhánh tạm rồi bỏ.

**1. Đếm constructor.** Thêm `console.log` vào constructor của `ProductService` (§2). Gọi `GET /products` nhiều
lần. Đếm số dòng log. Kỳ vọng: 1.

**2. Thấy singleton bằng identity.** Trong `ProductController`, thêm một route tạm:

```ts
@Get("__whoami")
@IsPublicApi()
whoami() {
  return { controller: (this as any).__id ??= Math.random(), service: (this.productService as any).__id ??= Math.random() };
}
```

Gọi nhiều lần. Kỳ vọng: cùng hai số mỗi lần. Đổi `ProductService` thành `@Injectable({ scope: Scope.REQUEST })`,
khởi động lại, gọi lại. Kỳ vọng: cả **hai** số đổi mỗi lần — controller bị lây scope theo §7.3.

**3. Tái hiện race condition ở §5.** Viết một service có field `private value` và một route làm
`this.value = query.v; await sleep(200); return this.value`. Gửi hai request gần nhau với `v=1` và `v=2`. Kỳ vọng:
ít nhất một response trả về giá trị của request kia.

**4. Kiểm chứng `AsyncLocalStorage`.** Gửi `GET /products` với `Accept-Language: vi` và một request khác với
`Accept-Language: en` đồng thời (hai tab `curl &`). Log `languageId` trong service. Kỳ vọng: mỗi request nhận
đúng ngôn ngữ của mình, dù `ProductService` là singleton.

**5. Đọc mã nguồn Nest.** Đặt breakpoint tại dòng `const isRequestScoped = ...` trong `router-explorer.js`,
chạy `pnpm start:debug`. Kỳ vọng: breakpoint dừng lúc boot, một lần cho mỗi route, và **không bao giờ** dừng khi
có request đến.

---

Đọc tiếp: [chương 5 — Vòng đời một request](05-request-lifecycle-in-this-project.md) để thấy các singleton này
xếp hàng theo thứ tự nào, và [chương 6 §10](06-modules-and-dependency-injection.md#10-di-trong-test) để biết
`Test.createTestingModule` cũng dựng cây singleton y như boot thật.
