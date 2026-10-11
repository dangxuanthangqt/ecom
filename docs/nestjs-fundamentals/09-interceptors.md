# Chương 9 — Interceptor

> Interceptor là tầng duy nhất trong dây chuyền **bọc được cả hai chiều** của một handler: chạy trước nó, và chạy
> tiếp _sau khi_ nó trả về. Chương này đi từ hợp đồng `NestInterceptor`, qua cái `Observable` mà nhiều người né,
> đến hai interceptor dự án đang chạy thật (`ClassSerializerInterceptor` và `FileInterceptor` của multer), một
> interceptor viết tay đang nằm không (`TransformInterceptor`), và những chỗ interceptor **không** với tới được.
>
> **Cần đọc trước:** [chương 2](02-reflector-execution-context-and-discovery.md) (`ExecutionContext`),
> [chương 3 §4](03-guards.md#6-ba-cách-đăng-ký-và-vì-sao-dự-án-chọn-app_guard) (ba cách đăng ký, `APP_*`),
> [chương 7 §6](07-dto-validation-transformation-serialization.md#6-serialization-chiều-ra) (serialization — chương
> này không lặp lại, chỉ chỉ ra _vì sao nó là interceptor_).

**Mục lục**

1. [Interceptor bọc handler, không đứng trước nó](#1-interceptor-bọc-handler-không-đứng-trước-nó)
2. [Hợp đồng `NestInterceptor` và `CallHandler`](#2-hợp-đồng-nestinterceptor-và-callhandler)
3. [Vì sao là `Observable`, và bạn cần biết bao nhiêu RxJS](#3-vì-sao-là-observable-và-bạn-cần-biết-bao-nhiêu-rxjs)
4. [Đọc mã nguồn: Nest xếp các interceptor lồng nhau thế nào](#4-đọc-mã-nguồn-nest-xếp-các-interceptor-lồng-nhau-thế-nào)
5. [Ba cách đăng ký, và thứ tự chạy](#5-ba-cách-đăng-ký-và-thứ-tự-chạy)
6. [Interceptor thứ nhất của dự án: `ClassSerializerInterceptor`](#6-interceptor-thứ-nhất-của-dự-án-classserializerinterceptor)
7. [Interceptor thứ hai: `FileInterceptor` — chạy multer rồi mới `handle()`](#7-interceptor-thứ-hai-fileinterceptor--chạy-multer-rồi-mới-handle)
8. [Interceptor viết tay đang nằm không: `TransformInterceptor`](#8-interceptor-viết-tay-đang-nằm-không-transforminterceptor)
9. [Interceptor nhìn thấy gì — và không thấy gì](#9-interceptor-nhìn-thấy-gì--và-không-thấy-gì)
10. [Lỗi và interceptor: `catchError` không thay được filter](#10-lỗi-và-interceptor-catcherror-không-thay-được-filter)
11. [`@Res()` bỏ qua kết quả trả về, interceptor vẫn chạy](#11-res-bỏ-qua-kết-quả-trả-về-interceptor-vẫn-chạy)
12. [Test một interceptor](#12-test-một-interceptor)
13. [Nâng cao](#13-nâng-cao)
14. [Trong dự án này](#14-trong-dự-án-này)
15. [Tự kiểm chứng](#15-tự-kiểm-chứng)

---

## 1. Interceptor bọc handler, không đứng trước nó

Guard, pipe, middleware đều là những **trạm** request đi qua rồi đi tiếp. Interceptor khác về hình: nó là một cái
**vỏ** bọc quanh handler.

```
                 ┌─────────────── Interceptor ────────────────┐
request  ──────▶ │ (code trước)  ──▶  handler  ──▶ (code sau) │ ──────▶ response
                 └────────────────────────────────────────────┘
```

Cùng một hàm `intercept()` có cả hai nửa. Nửa trước chạy trước khi handler được gọi; nửa sau nhận **giá trị handler
trả về** và có quyền thay nó bằng thứ khác. Không tầng nào khác làm được vế thứ hai:

- Middleware và guard chạy xong là **hết**, không được gọi lại khi handler trả về.
- Pipe chỉ chạm vào **tham số** vào handler.
- Filter chỉ chạy khi **có lỗi**.

Vì thế mọi việc thuộc loại "sửa cái handler trả về" — serialize, bọc envelope, cache, đo thời gian, log kết quả —
đều là interceptor. Dự án dùng đúng hai việc trong danh sách đó: serialize ([mục 6](#6-interceptor-thứ-nhất-của-dự-án-classserializerinterceptor))
và đọc multipart trước handler ([mục 7](#7-interceptor-thứ-hai-fileinterceptor--chạy-multer-rồi-mới-handle)).

---

## 2. Hợp đồng `NestInterceptor` và `CallHandler`

```ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";

@Injectable()
export class MyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // (1) code trước handler
    return next.handle(); // (2) gọi tiếp — trả về Observable của kết quả handler
  }
}
```

Hai tham số, một giá trị trả về:

| Thứ            | Là gì                                                                                                                                                                                                                     | Bạn làm gì với nó                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `context`      | `ExecutionContext` — cùng loại context và cùng HTTP request với guard, không đảm bảo cùng instance ([chương 2 §3](02-reflector-execution-context-and-discovery.md#3-executioncontext--cửa-sổ-nhìn-vào-request-đang-chạy)) | `getHandler()` để đọc metadata, `switchToHttp()` để lấy `req` / `res`             |
| `next`         | `CallHandler` — một object có đúng một method `handle()`                                                                                                                                                                  | **Gọi** để phần còn lại của dây chuyền chạy; **không gọi** thì handler không chạy |
| giá trị trả về | `Observable` hoặc `Promise<Observable>` — luồng kết quả sẽ đi ra client                                                                                                                                                   | Trả nguyên `next.handle()`, hoặc `.pipe(...)` để biến đổi                         |

Hai điều rút ra ngay từ hợp đồng:

1. **`next.handle()` là ranh giới giữa "trước" và "sau".** Code viết _trước_ dòng đó chạy trước handler. Code
   trong `.pipe(map(...))` _sau_ dòng đó chạy khi handler đã trả về.
2. **Không gọi `next.handle()` là một quyết định.** Interceptor có thể trả về một `Observable` khác — ví dụ `of(cachedValue)` — và handler không bao giờ chạy. Đây là cách viết cache interceptor.

---

## 3. Vì sao là `Observable`, và bạn cần biết bao nhiêu RxJS

Guard trả `boolean | Promise<boolean> | Observable<boolean>`; interceptor trả
`Observable<T> | Promise<Observable<T>>`. Ví dụ multer dùng `async intercept()` rồi trả `next.handle()`.
Promise có cả nhánh thành công lẫn lỗi; Observable bổ sung luồng nhiều giá trị, subscription và các operator.
Nest chuẩn hoá kết quả handler để interceptor xử lý Observable.

Bạn không cần học RxJS để viết interceptor. Bốn operator đủ cho 95% trường hợp:

| Operator         | Chạy khi                           | Dùng để                                    | Ví dụ                                                   |
| ---------------- | ---------------------------------- | ------------------------------------------ | ------------------------------------------------------- |
| `map(fn)`        | handler trả về thành công          | **thay** giá trị bằng `fn(giá trị)`        | `map((data) => ({ data }))` — bọc envelope              |
| `tap(fn)`        | handler trả về thành công          | **nhìn** giá trị, không đổi                | `tap(() => log(Date.now() - start))` — đo thời gian     |
| `catchError(fn)` | handler (hoặc interceptor sau) ném | đổi lỗi thành lỗi khác, hoặc thành giá trị | `catchError((e) => throwError(() => new XException()))` |
| `timeout(ms)`    | quá `ms` mà chưa có giá trị        | huỷ và ném `TimeoutError`                  | `timeout(5000)`                                         |

Ba mẫu viết, đủ dùng cả sự nghiệp:

```ts
// (a) chỉ làm việc TRƯỚC handler — không cần RxJS
intercept(context, next) {
  doSomethingWith(context.switchToHttp().getRequest());
  return next.handle();
}

// (b) biến đổi kết quả — map
intercept(context, next) {
  return next.handle().pipe(map((result) => transform(result)));
}

// (c) làm việc cả hai chiều — tap
intercept(context, next) {
  const start = Date.now();
  return next.handle().pipe(tap(() => this.logger.log(`${Date.now() - start}ms`)));
}
```

Hai điều về `Observable` cần nhớ, vì chúng gây bug thật:

- **Lười.** `next.handle()` trả về ngay một `Observable`, nhưng handler **chưa chạy** cho tới khi có ai
  _subscribe_ — và người subscribe là Nest, sau khi `intercept()` return. Nên `const r = next.handle(); console.log("đã chạy handler")`
  in ra **trước** khi handler chạy. Đừng suy luận thứ tự từ vị trí dòng code; suy từ operator.
- **Nest lấy giá trị cuối.** Sau khi mọi interceptor xong, Nest gọi `lastValueFrom(observable)` — xem
  [`router-response-controller.js`](../../node_modules/@nestjs/core/router/router-response-controller.js) hàm
  `transformToResult`. Với handler HTTP thường, luồng chỉ có một giá trị, nên "cuối" = "duy nhất".

---

## 4. Đọc mã nguồn: Nest xếp các interceptor lồng nhau thế nào

Toàn bộ cơ chế nằm trong 20 dòng của
[`interceptors-consumer.js`](../../node_modules/@nestjs/core/interceptors/interceptors-consumer.js):

```js
async intercept(interceptors, args, instance, callback, next, type) {
  if (isEmpty(interceptors)) return next();            // không có interceptor → gọi handler thẳng

  const context = this.createContext(args, instance, callback);
  context.setType(type);

  const nextFn = async (i = 0) => {
    if (i >= interceptors.length) {                    // hết interceptor → tới handler
      return defer(AsyncResource.bind(() => this.transformDeferred(next)));
    }
    const handler = {
      handle: () => defer(AsyncResource.bind(() => nextFn(i + 1))).pipe(mergeAll()),
    };
    return interceptors[i].intercept(context, handler); // interceptor i nhận "next" = interceptor i+1
  };

  return defer(() => nextFn()).pipe(mergeAll());
}
```

Đọc ra ba điều:

**(1) `CallHandler` chỉ là một object có `handle`.** Dòng `const handler = { handle: () => ... }` — không class,
không DI. Đó là lý do test interceptor dễ ([mục 12](#12-test-một-interceptor)): tự dựng `{ handle: () => of(x) }` là đủ.

**(2) `handle()` của interceptor `i` gọi `intercept()` của interceptor `i+1`.** Với ba interceptor A, B, C và
handler H, cấu trúc chạy là:

```
A.intercept(ctx, { handle: () =>
  B.intercept(ctx, { handle: () =>
    C.intercept(ctx, { handle: () =>
      H()
    })
  })
})
```

Nên **chiều đi** là A → B → C → H, và **chiều về** (khi H trả về, giá trị đi qua các `.pipe(map)`) là C → B → A.
Interceptor đăng ký **đầu tiên** là lớp **ngoài cùng**: nó nhìn thấy request sớm nhất và response muộn nhất.

**(3) `defer` là lý do handler lười.** `defer(() => nextFn(i + 1))` không chạy gì cho tới khi được subscribe. Ba
lần `defer` lồng nhau → toàn bộ chuỗi chỉ "nổ" khi Nest subscribe ở cuối.

Còn `transformDeferred(next)`: handler có thể trả về giá trị thường, `Promise`, hoặc `Observable`. Hàm này bọc cả
ba thành `Observable` — đó là chỗ "Nest tự bọc kết quả handler vào Observable cho bạn" ở [mục 3](#3-vì-sao-là-observable-và-bạn-cần-biết-bao-nhiêu-rxjs).

Và cái tên `args` / `instance` / `callback` ở tham số đầu: `args` là `[req, res, next]` của Express, `instance` là
controller singleton ([chương 8](08-request-and-provider-instances.md)), `callback` là hàm handler — đúng bộ ba
`ExecutionContextHost` cần để `getHandler()` trả về hàm có metadata ([chương 2 §4](02-reflector-execution-context-and-discovery.md#4-mắt-xích-khép-kín-decorator-dán-lên-đúng-cái-gethandler-trả-về)).

---

## 5. Ba cách đăng ký, và thứ tự chạy

Y hệt guard ([chương 3 §4](03-guards.md#6-ba-cách-đăng-ký-và-vì-sao-dự-án-chọn-app_guard)):

| Cách                                                  | Phạm vi                  | Có DI không                                 | Dự án dùng                                                                           |
| ----------------------------------------------------- | ------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| `@UseInterceptors(I)` trên method                     | một route                | Có (truyền class) / Không (truyền instance) | [media.controller.ts:74](../../src/routes/media/media.controller.ts#L74) — multer    |
| `@UseInterceptors(I)` trên class                      | mọi route của controller | như trên                                    | —                                                                                    |
| `app.useGlobalInterceptors(new I())`                  | toàn app                 | **Không**                                   | —                                                                                    |
| `{ provide: APP_INTERCEPTOR, useClass / useFactory }` | toàn app                 | **Có**                                      | [base.module.ts:57-65](../../src/shared/modules/base.module.ts#L57-L65) — serializer |

`@UseInterceptors` nhận **class hoặc instance**. Truyền class (`@UseInterceptors(LoggingInterceptor)`) → Nest tạo
qua container, có DI. Truyền instance (`@UseInterceptors(new LoggingInterceptor())`) → không DI, nhưng truyền được
tham số. `FileInterceptor("image")` thuộc trường hợp thứ ba: nó **trả về một class** được sinh động
([mục 7](#7-interceptor-thứ-hai-fileinterceptor--chạy-multer-rồi-mới-handle)).

Bên dưới, `@UseInterceptors` chỉ là metadata — key `__interceptors__` dán lên hàm hoặc class bằng `extendArrayMetadata`
([`use-interceptors.decorator.js`](../../node_modules/@nestjs/common/decorators/core/use-interceptors.decorator.js)).
Gọi hai lần trên cùng method thì **nối mảng**, không đè. Cùng cơ chế [chương 1](01-decorators-and-metadata.md).

**Thứ tự** ([`context-creator.js`](../../node_modules/@nestjs/core/helpers/context-creator.js), hàm `createContext`):

```js
return [
  ...globalMetadata, // APP_INTERCEPTOR, theo thứ tự đăng ký
  ...classMetadata, // @UseInterceptors trên controller
  ...methodMetadata, // @UseInterceptors trên method
];
```

Ghép với [mục 4](#4-đọc-mã-nguồn-nest-xếp-các-interceptor-lồng-nhau-thế-nào): **global là lớp ngoài cùng**. Với
dự án, trên route upload:

```
chiều đi:   ClassSerializerInterceptor (global)  →  FileInterceptor (method)  →  pipe  →  handler
chiều về:   handler  →  FileInterceptor (không làm gì)  →  ClassSerializerInterceptor (serialize)
```

Đúng ý: multer phải đọc xong multipart **trước** pipe và handler; serialize phải là việc **cuối cùng** trước khi
ra client.

> **Vì sao interceptor chạy trước pipe?** Nhìn [`router-execution-context.js`](../../node_modules/@nestjs/core/router/router-execution-context.js):
>
> ```js
> const handler = (args, req, res, next) => async () => {
>   fnApplyPipes && (await fnApplyPipes(args, req, res, next));   // pipe nằm TRONG handler
>   return callback.apply(instance, args);
> };
> return async (req, res, next) => {
>   fnCanActivate && (await fnCanActivate([req, res, next]));      // guard trước hết
>   const result = await this.interceptorsConsumer.intercept(interceptors, ..., handler(...));
>   await fnHandleResponse(result, res, req);
> };
> ```
>
> Guard chạy trần. Pipe được **gói vào trong** cái `handler` mà interceptor bọc. Nên từ góc nhìn interceptor,
> "handler" = pipe + param decorator + method controller — cả cụm. Đây là lý do `@UploadedFile()` (param decorator,
> chạy trong cụm đó) đọc được `req.file` mà multer interceptor vừa gắn.

---

## 6. Interceptor thứ nhất của dự án: `ClassSerializerInterceptor`

[base.module.ts:57-65](../../src/shared/modules/base.module.ts#L57-L65):

```ts
const serializerInterceptor: Provider = {
  provide: APP_INTERCEPTOR,
  useFactory: (reflector: Reflector) => {
    return new ClassSerializerInterceptor(reflector, {
      excludeExtraneousValues: true,
    });
  },
  inject: [Reflector],
};
```

[Chương 7 §6](07-dto-validation-transformation-serialization.md#6-serialization-chiều-ra) đã nói kỹ nó _làm gì_
và cái bẫy lộ dữ liệu khi trả object thô. Ở đây chỉ nhìn nó **như một interceptor**, theo mã nguồn
[`class-serializer.interceptor.js`](../../node_modules/@nestjs/common/serializer/class-serializer.interceptor.js):

```js
intercept(context, next) {
  const contextOptions = this.getContextOptions(context);    // (a) đọc metadata — TRƯỚC handler
  const options = { ...this.defaultOptions, ...contextOptions };
  return next
    .handle()
    .pipe(map((res) => this.serialize(res, options)));        // (b) biến đổi kết quả — SAU handler
}
getContextOptions(context) {
  return this.reflector.getAllAndOverride(CLASS_SERIALIZER_OPTIONS, [
    context.getHandler(),
    context.getClass(),
  ]);
}
```

Đây là mẫu (b) ở [mục 3](#3-vì-sao-là-observable-và-bạn-cần-biết-bao-nhiêu-rxjs), cộng một bước đọc metadata bằng
`Reflector` — chính xác thứ interceptor có mà middleware không có. `@SerializeOptions({...})` trên một handler là
`SetMetadata` với key `CLASS_SERIALIZER_OPTIONS`; `getAllAndOverride` với thứ tự `[handler, class]` nghĩa là **method
đè class** ([chương 2 §2](02-reflector-execution-context-and-discovery.md#2-thứ-tự-targets-là-một-hợp-đồng)). Dự án
chưa dùng `@SerializeOptions` ở đâu, nhưng cửa đã mở: một route muốn `groups` riêng chỉ cần dán nhãn.

Vì sao phải `useFactory` thay vì `useClass`: constructor cần **hai** tham số, `Reflector` (container có) và một object
options (container không có). `useFactory` + `inject: [Reflector]` là cách nói "tiêm cái thứ nhất, tôi tự đưa cái
thứ hai" — [chương 6 §2.3](06-modules-and-dependency-injection.md#23-usefactory--tính-ra-rồi-mới-đưa).

Ba chi tiết nhỏ trong `serialize()` đáng biết vì chúng quyết định hành vi ở biên:

- `!isObject(response)` → trả nguyên. Handler trả `string`, `number`, `null` thì interceptor **không chạm**.
- `response instanceof StreamableFile` → trả nguyên. Stream file không bị serialize.
- Mảng → `map` từng phần tử. Nên `PageDto.data` là mảng instance DTO thì từng phần tử được serialize đúng; là mảng
  object thô thì từng phần tử **lộ nguyên** — kết quả 4 trong bảng thực nghiệm của chương 7.

---

## 7. Interceptor thứ hai: `FileInterceptor` — chạy multer rồi mới `handle()`

[media.controller.ts:72-82](../../src/routes/media/media.controller.ts#L72-L82):

```ts
@RequirePermission("media:upload:own")
@Post("upload/image")
@UseInterceptors(createSingleImageDiskInterceptor("image"))
async uploadLargeImageFromDisk(@UploadedFile() image: Express.Multer.File) {
  const result = await this.mediaService.uploadLargeImageFromDisk(image);
  return new UploadFileResponseDto(result);
}
```

`createSingleImageDiskInterceptor` ([single-image-interceptor.util.ts:164-179](../../src/shared/utils/files/single-image-interceptor.util.ts#L164-L179))
chỉ là `FileInterceptor(fieldName, multerOptions)` với options của dự án (giới hạn 5 MB, `fileFilter` kiểm mime và
đuôi file, `diskStorage` vào thư mục tạm). Còn `FileInterceptor` của `@nestjs/platform-express` là mẫu (a) ở
[mục 3](#3-vì-sao-là-observable-và-bạn-cần-biết-bao-nhiêu-rxjs) — **toàn bộ việc nằm trước `next.handle()`**
([`file.interceptor.js`](../../node_modules/@nestjs/platform-express/multer/interceptors/file.interceptor.js)):

```js
function FileInterceptor(fieldName, localOptions) {
  let MixinInterceptor = class MixinInterceptor {
    constructor(options = {}) {
      this.multer = multer({ ...options, ...localOptions });
    }
    async intercept(context, next) {
      const ctx = context.switchToHttp();
      await new Promise((resolve, reject) =>
        this.multer.single(fieldName)(
          ctx.getRequest(),
          ctx.getResponse(),
          (err) => {
            if (err) return reject(transformException(err));
            resolve();
          },
        ),
      );
      return next.handle(); // multer xong mới cho handler chạy
    }
  };
  return mixin(MixinInterceptor);
}
```

Bốn điều đáng nhìn:

**Nó là một middleware Express được bọc thành interceptor.** `this.multer.single(fieldName)` trả về đúng một hàm
`(req, res, next)` của Express ([chương 4 §1](04-middleware.md#1-middleware-là-hàm-req-res-next-của-express)).
`FileInterceptor` gọi hàm đó bằng tay, đợi callback, rồi mới `next.handle()`. Multer ghi kết quả vào `req.file`
— và `@UploadedFile()` chỉ là param decorator đọc `req.file` ra.

**Vì sao là interceptor chứ không phải middleware thật?** Vì cần biết **route nào** cần multer, với **field nào**,
**giới hạn nào**. Middleware không biết handler ([chương 4 §2](04-middleware.md#2-chạy-lúc-nào--và-vì-sao-điều-đó-quyết-định-mọi-thứ));
interceptor đọc được `@UseInterceptors` trên đúng method. Cùng lý do "auth là guard, không phải middleware", chỉ khác
đối tượng.

**`mixin()` sinh class mới mỗi lần gọi.** `FileInterceptor("image")` và `FileInterceptor("avatar")` là **hai class
khác nhau**, mỗi class có `localOptions` riêng đóng trong closure. Nest vẫn tạo instance qua container (nên
`@Inject(MULTER_MODULE_OPTIONS)` với `@Optional()` hoạt động), nhưng bạn không thể tiêm gì _thêm_ vào — options
phải đi qua tham số, đúng như [single-image-interceptor.util.ts](../../src/shared/utils/files/single-image-interceptor.util.ts) làm.

**Lỗi của multer thành `HttpException` ở `transformException`.** Quá `limits.fileSize` → `PayloadTooLargeException`
(413); sai field → `BadRequestException`; lỗi trong `fileFilter` của dự án đã là `BadRequestException` nên đi nguyên.
`reject(...)` → `Observable` lỗi → **không** gọi `next.handle()` → handler không chạy → filter viết envelope. Đây là
ví dụ đầu tiên trong chương về "interceptor quyết định handler không chạy".

Và hệ quả về thứ tự đã nêu ở [chương 7 §8](07-dto-validation-transformation-serialization.md#8-pipe-tự-viết-và-luồng-upload-file):
pipe trên `@UploadedFile(...)` chạy **sau** multer, nên không ngăn được file lớn được ghi ra đĩa. Giới hạn kích thước
phải đặt ở interceptor (`limits.fileSize`), vì đó là tầng duy nhất chạy _trong lúc_ multer đọc stream.

---

## 8. Interceptor viết tay đang nằm không: `TransformInterceptor`

[transform.interceptor.ts](../../src/shared/interceptors/transform.interceptor.ts) là interceptor duy nhất dự án
tự viết:

```ts
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const response = context.switchToHttp().getResponse<T>() as ServerResponse;
    return next
      .handle()
      .pipe(map((data: T) => ({ data, statusCode: response.statusCode })));
  }
}
```

Mẫu (b): bọc mọi kết quả thành `{ data, statusCode }`. Nhưng **nó không được đăng ký ở đâu cả** — không có trong
`APP_INTERCEPTOR`, không có `@UseInterceptors` nào trỏ tới. Dấu vết duy nhất là một dòng comment ở
[auth.controller.ts:92](../../src/routes/auth/auth.controller.ts#L92). Response thành công của API hiện **không**
có lớp `{ data, ... }` bọc ngoài; `PageDto` tự có `data` + `pagination` là chuyện khác.

Giữ nó trong chương vì ba lý do:

1. Nó là ví dụ **ngắn nhất** về `map` trên `next.handle()` — đọc 5 dòng là hiểu mẫu (b).
2. Nó có spec đầy đủ ([transform.interceptor.spec.ts](../../src/shared/interceptors/__tests__/transform.interceptor.spec.ts))
   và một harness tái dùng được — [mục 12](#12-test-một-interceptor).
3. Nó minh hoạ một câu hỏi thiết kế thật: **nếu bật nó lên, đặt trước hay sau `ClassSerializerInterceptor`?** Nếu
   `TransformInterceptor` là global thứ hai (lớp trong), chiều về nó chạy **trước** serializer: bọc DTO vào
   `{ data: dto }` — object thô — rồi serializer nhận object thô, `excludeExtraneousValues` không có `@Expose()` để
   áp... nhưng `class-transformer` vẫn đi sâu vào `data` vì nó là instance DTO, nên vẫn lọc đúng. Ngược lại, nếu nó là
   lớp ngoài, serializer chạy trước, `data` đã là plain object, `TransformInterceptor` chỉ bọc thêm. Cả hai đều ra đúng
   JSON, nhưng chỉ cách thứ hai là _hiển nhiên đúng_ mà không cần suy luận về `class-transformer`. Bài học: khi thêm
   interceptor global, **đặt nó đâu trong mảng `providers` là quyết định có nghĩa**, không có quy tắc serializer luôn phải ngoài cùng. Với envelope/cache cần kết quả đã lọc, đặt chúng ngoài serializer.

Nếu một ngày bạn cần nó: đổi mọi `*ResponseDto` phía client, cập nhật Swagger (`@ApiOkResponse` sẽ sai hình), và
cân nhắc `PageDto` sẽ thành `{ data: { data, pagination } }`. Không phải việc bật một dòng.

---

## 9. Interceptor nhìn thấy gì — và không thấy gì

Đứng **sau guard, bọc quanh pipe + handler**, interceptor có góc nhìn riêng:

| Thấy                                                            | Không thấy                                                                                                            |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `req` sau guard: `req.user`, `req.granted_permissions` đã có    | body **đã validate** ở chiều đi — pipe nằm _trong_ `next.handle()`, chưa chạy khi code trước `handle()` chạy          |
| metadata handler qua `Reflector` (`getHandler()`, `getClass()`) | **tham số** handler nhận — pipe và param decorator tính ra chúng, nhưng interceptor không có đường lấy                |
| **giá trị handler trả về** (chiều về, qua `map`/`tap`)          | những gì handler ghi trực tiếp vào `res` bằng `@Res()` — [mục 11](#11-res-bỏ-qua-kết-quả-trả-về-interceptor-vẫn-chạy) |
| lỗi handler ném (qua `catchError`)                              | lỗi **guard** ném — guard đứng ngoài, chưa tới interceptor                                                            |
| `res` — ghi header được, đặt status được                        | lỗi từ **interceptor ngoài** nó (A không thấy lỗi của chính A; B thấy lỗi của C, không thấy của A)                    |

Hai hệ quả thực hành:

- **Muốn log body đã validate → không phải interceptor.** Đọc `req.body` trong interceptor chiều đi là đọc body
  thô như guard. Nếu cần DTO đã sạch, đọc trong handler hoặc service.
- **Đo thời gian bằng interceptor là đo "pipe + handler + interceptor trong"**, không tính guard. Muốn tính cả
  guard, đo ở middleware bằng `res.on("finish")` như pino-http ([chương 4 §9](04-middleware.md#10-nâng-cao)).

---

## 10. Lỗi và interceptor: `catchError` không thay được filter

Khi handler ném, `Observable` chuyển sang nhánh lỗi. Interceptor có thể chặn bằng `catchError`:

```ts
// ví dụ minh hoạ — dự án không có
intercept(context, next) {
  return next.handle().pipe(
    catchError((error) => {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        return throwError(() => new ConflictException("Already exists."));
      }
      return throwError(() => error); // không hiểu → cho đi
    }),
  );
}
```

Câu hỏi hay gặp: _"vậy sao dự án không map lỗi Prisma ở interceptor mà lại ở filter?"_ Vì ba giới hạn:

1. **Interceptor không thấy lỗi của guard** ([mục 9](#9-interceptor-nhìn-thấy-gì--và-không-thấy-gì)). Lỗi 401/403/429
   không bao giờ qua `catchError`. Filter thì thấy **tất cả**.
2. **Interceptor không quyết định được hình dạng response lỗi.** `catchError` chỉ đổi _exception_ này thành
   _exception_ khác; ai đó vẫn phải biến exception thành JSON — và đó là filter. Nếu đã có filter map Prisma
   ([prisma-error.mapper.ts](../../src/shared/filters/prisma-error.mapper.ts)), interceptor làm lại là thừa và
   là hai chỗ để lệch nhau.
3. **`catchError` trả về giá trị thường là bẫy.** `catchError(() => of(null))` biến lỗi thành response 200 rỗng —
   client không biết có lỗi. Đúng cho cache-miss, sai cho hầu hết mọi thứ khác.

Quy tắc dự án: **interceptor không bắt lỗi**. Lỗi chảy xuống `GlobalExceptionFilter`, nơi viết duy nhất
([chương 10](10-exception-filters.md)). `catchError` chỉ hợp lý khi bạn muốn _dịch_ một lỗi ngay tại route đó
thành một `HttpException` cụ thể mà filter không thể tự suy ra — và ngay cả khi đó, dự án chọn làm ở service bằng
`throwHttpException` để lỗi mang `code` nghiệp vụ.

---

## 11. `@Res()` bỏ qua kết quả trả về, interceptor vẫn chạy

[auth.controller.ts:190-198](../../src/routes/auth/auth.controller.ts#L190-L198):

```ts
@Get("google/callback")
@IsPublicApi()
async googleCallback(
  @Query("code") code: string,
  @Query("state") state: string,
  @Res() res: Response,
) {
  // ...
  return res.redirect(`${googleClientRedirectUri}?${queryParams}`);
}
```

Có `@Res()` trong tham số, Nest chuyển route sang **library-specific mode**: nó coi bạn tự chịu trách nhiệm ghi
response, nên `fnHandleResponse` bỏ qua giá trị trả về
([`router-execution-context.js`](../../node_modules/@nestjs/core/router/router-execution-context.js), cờ
`isResponseHandled`). Hệ quả với interceptor:

- Chiều đi và chiều về vẫn chạy; `map`, `tap`, `finalize` còn có thể thực hiện công việc hữu ích.
- Kết quả đã biến đổi bị Nest bỏ qua khi ghi HTTP body. Trong Express, `res.redirect()` trả `undefined`,
  không trả chính `res`; interceptor sẽ xử lý giá trị handler trả, thường là `undefined` ở ví dụ này.

Route OAuth chủ động gửi redirect nên serializer không quyết định body trên đường truyền.
Filter vẫn xử lý lỗi trước khi gửi header; sau khi response đã gửi, filter không thể thay bằng envelope mới.

Nếu chỉ cần đặt header hay status mà vẫn muốn Nest ghi body, dùng `@Res({ passthrough: true })`, hoặc `@Header()`
/ `@HttpCode()` là metadata.

---

## 12. Test một interceptor

Từ [mục 4](#4-đọc-mã-nguồn-nest-xếp-các-interceptor-lồng-nhau-thế-nào): `CallHandler` chỉ là `{ handle }`, và
`ExecutionContext` chỉ là object có vài method. Không cần boot Nest. Dự án có harness sẵn —
[interceptor-test-harness.ts](../../src/shared/interceptors/__tests__/interceptor-test-harness.ts):

```ts
export const makeCallHandler = (responseData: unknown) => {
  const handleObservable = new Observable((subscriber) => {
    subscriber.next(responseData);
    subscriber.complete();
  });
  const handle = jest.fn().mockReturnValue(handleObservable);
  return { handler: { handle }, handle, handleObservable };
};

export const makeInterceptorExecutionContext = (
  statusCode = 200,
): ExecutionContext =>
  ({
    switchToHttp: jest.fn(() => ({
      getResponse: jest.fn(() => ({ statusCode })),
    })),
  }) as unknown as ExecutionContext;
```

Và cách dùng trong [transform.interceptor.spec.ts:18-35](../../src/shared/interceptors/__tests__/transform.interceptor.spec.ts#L18-L35):

```ts
const result$ = interceptor.intercept(context, handler);
const result = await firstValueFrom(result$);
expect(result).toEqual({ data: responseData, statusCode: 200 });
expect(handle).toHaveBeenCalledTimes(1);
```

Ba điều cần có trong mọi spec interceptor:

1. **`firstValueFrom` (hoặc `lastValueFrom`)** để subscribe — không subscribe thì `map` không chạy, assert gì cũng
   qua vì chưa có gì chạy.
2. **Assert `handle` được gọi đúng một lần** — kiểm số lần lấy Observable; để chứng minh handler effect chỉ chạy một lần, đếm cả subscription/effect. Không suy ra từ mock handle nếu có retry hoặc subscribe lại. Hai lần subscribe vào luồng lạnh có thể thực hiện lại thao tác ghi DB.
3. **Một test cho nhánh lỗi**, nếu interceptor có `catchError`: `handle` trả `throwError(() => new Error())`, assert
   `rejects`.

Muốn test có cả Nest thật (metadata, thứ tự với pipe) thì dùng e2e — [e2e-testing.md](../e2e-testing.md) — vì thứ
tự interceptor/pipe là việc của `router-execution-context`, không mô phỏng được bằng harness.

---

## 13. Nâng cao

**`ExecutionContext` là chung, nhưng `next.handle()` không phải.** Guard và interceptor nhận cùng kiểu `context`,
nhưng mỗi interceptor nhận `CallHandler` **riêng** — closure trỏ tới interceptor kế tiếp ([mục 4](#4-đọc-mã-nguồn-nest-xếp-các-interceptor-lồng-nhau-thế-nào)).
Không lưu `next` ra ngoài để gọi sau.

**Interceptor + metadata = cache theo route.** Cache hit có thể `return of(cached)` và không gọi handler.
Nếu muốn cache **kết quả đã serialize**, cache phải đứng **ngoài** serializer (đăng ký trước):
`Cache → Serializer → Handler`, chiều về `Handler → Serializer → Cache`.
Đăng ký sau serializer sẽ khiến cache nhìn thấy kết quả chưa lọc, có thể chứa mật khẩu.

Chỉ dùng cache key chung theo route cho dữ liệu public giống nhau với mọi người. Response phụ thuộc user,
tenant, quyền, ngôn ngữ hoặc query cần key chứa đầy đủ các yếu tố đó, hoặc không cache.
`tap(async data => redis.set(...))` không chờ Promise: nếu cần chờ lưu cache và xử lý lỗi, dùng
`mergeMap(data => from(redis.set(key, data)).pipe(map(() => data)))` với chính sách lỗi rõ ràng.

**`AsyncResource.bind` trong mã nguồn.** Mỗi `defer` được bọc `AsyncResource.bind(...)` để `AsyncLocalStorage`
(cái `nestjs-i18n` dùng — [chương 8 §9.2](08-request-and-provider-instances.md#92-asynclocalstorage)) không mất
context khi qua ranh giới RxJS. Nếu tự viết thứ gì đó "lưu context theo request" và thấy nó mất trong interceptor,
đó là chỗ để nhìn.

**Interceptor cho ngữ cảnh không HTTP.** `context.getType()` và `switchToRpc()` / `switchToWs()` như guard.
`ClassSerializerInterceptor` chạy được cho cả microservice vì nó chỉ dùng `getHandler()` / `getClass()`.

**Handler trả `Observable` nhiều giá trị.** Với `@Sse()`, Nest không `lastValueFrom` mà stream từng giá trị. `map`
trong interceptor khi đó chạy **mỗi giá trị**. Dự án không có SSE; biết để không ngạc nhiên.

**`timeout()` là interceptor, nhưng không phải cách dừng handler.** `timeout(5000)` làm client nhận 408/500 sau 5
giây, nhưng handler **vẫn chạy tiếp** đến hết trong nền — RxJS huỷ subscription, không huỷ được `await prisma.…`.
Muốn dừng thật thì phải truyền `AbortSignal` xuống tận query.

---

## 14. Trong dự án này

| Interceptor                     | Ở đâu                                                                               | Đăng ký                          | Việc trước `handle()`                                  | Việc sau `handle()`                    |
| ------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------ | -------------------------------------- |
| `ClassSerializerInterceptor`    | [base.module.ts:57-65](../../src/shared/modules/base.module.ts#L57-L65)             | `APP_INTERCEPTOR` + `useFactory` | đọc `@SerializeOptions` (chưa route nào dùng)          | `instanceToPlain`, chỉ giữ `@Expose()` |
| `FileInterceptor("image")`      | [media.controller.ts:74](../../src/routes/media/media.controller.ts#L74)            | `@UseInterceptors` trên method   | chạy multer, ghi đĩa, gắn `req.file`; 413 nếu quá 5 MB | không                                  |
| `FilesInterceptor("files", 10)` | [media.controller.ts:104](../../src/routes/media/media.controller.ts#L104)          | `@UseInterceptors` trên method   | multer mảng, bộ nhớ, gắn `req.files`                   | không                                  |
| `FileFieldsInterceptor([...])`  | [media.controller.ts:141-151](../../src/routes/media/media.controller.ts#L141-L151) | `@UseInterceptors` trên method   | multer nhiều field, gắn `req.files` dạng object        | không                                  |
| `TransformInterceptor`          | [transform.interceptor.ts](../../src/shared/interceptors/transform.interceptor.ts)  | **không đăng ký**                | —                                                      | bọc `{ data, statusCode }` (nếu bật)   |

---

## 15. Tự kiểm chứng

**1. Chứng minh interceptor bọc pipe.** Thêm tạm một interceptor global in log ở cả hai chiều:

```ts
// ví dụ minh hoạ — thêm vào providers của base.module.ts, xoá sau khi xem
{
  provide: APP_INTERCEPTOR,
  useValue: {
    intercept: (ctx, next) => {
      console.log("[I] trước handler, body =", ctx.switchToHttp().getRequest().body);
      return next.handle().pipe(tap((r) => console.log("[I] sau handler, kết quả =", r?.constructor?.name)));
    },
  },
},
```

Gọi `POST /roles` với token admin và body **sai kiểu**. Kỳ vọng: thấy dòng `[I] trước handler` với body thô, rồi
**400** — và **không** thấy dòng `[I] sau handler`. Pipe ném bên trong `next.handle()`, nên `tap` không chạy.
Gọi lại với body đúng: thấy cả hai dòng, dòng sau in tên DTO class.

**2. Chứng minh thứ tự global → method.** Trên route `POST /media/upload/image`, đổi interceptor thí nghiệm ở trên để
in `[I] trước` và thêm `console.log("[multer] xong")` tạm vào `fileFilter` của
`single-image-interceptor.util.ts`. Kỳ vọng thứ tự: `[I] trước` → `[multer] xong` → handler. Global là lớp ngoài.

**3. Chứng minh `@Res()` tắt chiều về.** Với interceptor thí nghiệm còn đó, gọi `GET /auth/google/callback?code=x&state=y`.
Kỳ vọng: `[I] trước` có, `[I] sau` có nhưng `kết quả` là `ServerResponse` — không phải DTO — và client nhận redirect,
không phải JSON.

**4. Chạy spec:**

```bash
npx jest src/shared/interceptors
```

Mở `transform.interceptor.spec.ts`, đổi `firstValueFrom(result$)` thành chỉ `interceptor.intercept(context, handler)`
không await: test "calls next.handle()" vẫn qua (vì `handle` được gọi lúc `intercept()` chạy), nhưng test về `data`
sẽ không có gì để assert — `map` chưa chạy vì chưa ai subscribe. Đó là "lười" ở [mục 3](#3-vì-sao-là-observable-và-bạn-cần-biết-bao-nhiêu-rxjs).

Nhớ xoá interceptor thí nghiệm và dòng log tạm.

---

**Tiếp theo:** [Chương 10 — Exception Filter](10-exception-filters.md): tầng duy nhất chạy khi _có lỗi_, thấy được
cả lỗi mà interceptor không thấy, và là người viết response lỗi duy nhất trong dự án.
