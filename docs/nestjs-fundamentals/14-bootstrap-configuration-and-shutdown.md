# Chương 14 — Bootstrap, cấu hình và shutdown

> Trước request đầu tiên, Nest phải dựng module/provider, gắn middleware/routes và chạy init hooks.
> Khi dừng app, HTTP server và tài nguyên ngoài phải được đóng. Chương này nối entry point với vòng đời DI.

## 1. Chuẩn bị để đọc và chạy repo

Đọc [package.json](../../package.json), [tsconfig.json](../../tsconfig.json) và `.env.example` nếu có trong checkout
trước khi dựng môi trường. Phiên bản thư viện của bộ tài liệu: NestJS 11.0.1, TypeScript 5.7.3,
class-validator 0.14.1, class-transformer 0.5.1. Node/package manager thực tế phải theo cấu hình dự án.

Không cần DB để đọc foundation hoặc chạy [probes](examples/foundation-probes.cjs).
Chạy AppModule thật cần các env đã validate, Prisma generated client, DB/Redis và hạ tầng tương ứng.
Không dùng secret production hoặc reset DB thật để thử thí nghiệm nền tảng.

TypeScript của repo dùng legacy decorators với `experimentalDecorators` và `emitDecoratorMetadata`.
Vì vậy ví dụ constructor DI/DTO phụ thuộc metadata runtime, không thể chuyển nguyên sang cấu hình
standard decorators mới mà mặc định hành vi vẫn giống nhau. Xem [chương 1](01-decorators-and-metadata.md).

## 2. `create`, `init`, `listen` và application context

| Lời gọi                                           | Công việc chính                                              |
| ------------------------------------------------- | ------------------------------------------------------------ |
| `NestFactory.create(AppModule)`                   | scan module, tạo container/provider static và app HTTP       |
| `await app.init()`                                | gắn parser/middleware/routes, chạy init/bootstrap hooks      |
| `await app.listen(port)`                          | tự `init()` nếu cần, rồi mở cổng HTTP                        |
| `NestFactory.createApplicationContext(AppModule)` | app DI cho script/worker, tự init context, không HTTP server |
| `await app.close()`                               | chạy shutdown lifecycle và đóng tài nguyên adapter           |

Provider constructor có thể chạy trong `create()`, trước `onModuleInit()`.
Đừng cho rằng `create()` xong nghĩa mọi module đã connect DB hoặc boot-check đã hoàn tất.
Trong test dùng `TestingModule.compile()`, gọi `app.init()` để kích hoạt HTTP setup và init hooks.

```ts
import { NestFactory } from "@nestjs/core";
import { Module, Controller, Get } from "@nestjs/common";

@Controller("ping")
class PingController {
  @Get()
  ping() {
    return { ok: true };
  }
}

@Module({ controllers: [PingController] })
class TinyModule {}

async function bootstrap() {
  const app = await NestFactory.create(TinyModule);
  app.setGlobalPrefix("api");
  app.enableShutdownHooks();
  await app.listen(3000);
}

void bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Đây là mini entry point độc lập; không sửa [main.ts](../../src/main.ts) của repo.
Request của ví dụ là `GET /api/ping`; request của repo không có global `/api` prefix hiện tại.

## 3. Thứ tự bootstrap trong dự án

[main.ts](../../src/main.ts) tạo app với `bufferLogs: true`, lấy logger từ DI, lấy `AppConfigService`,
đặt trust proxy, bật CORS, dựng Swagger trong development, rồi listen.
Pipe/filter/serializer global được khai trong [BaseModule](../../src/shared/modules/base.module.ts).

`enableCors()` gắn middleware ngay khi gọi; parser mặc định được gắn trong init. Vì main gọi CORS trước listen,
CORS đứng trước parser. Middleware đăng ký thêm bằng `app.use()` cũng phụ thuộc thời điểm đó.
Lỗi trước middleware gắn `req.id` có thể vẫn về global filter nhưng chưa có request ID.
Xem [chương 5](05-request-lifecycle-in-this-project.md).

`SwaggerModule.setup("api", ...)` mở trang mô tả HTTP; không tự validate request, xác thực route hoặc
thêm prefix nghiệp vụ. Swagger decorator khai hợp đồng tài liệu; validator/guard mới thi hành hợp đồng.

## 4. Env là chuỗi: validate và convert sớm

`process.env.PORT` là chuỗi hoặc undefined, không tự là số. Đừng dùng `Boolean(process.env.FLAG)` để parse
cờ: `"false"` vẫn truthy. Env sai phải làm bootstrap thất bại rõ ràng, không chờ request đầu tiên mới lỗi.

```ts
function parsePort(value: string | undefined): number {
  const raw = value ?? "3000";
  if (!/^\d+$/.test(raw)) throw new Error("PORT must be an integer");
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT is out of range");
  }
  return port;
}
```

Repo gom các group config qua [AppConfigService](../../src/shared/services/app-config.service.ts)
và type [config.type.ts](../../src/types/config.type.ts). Khi thêm cờ mới, thêm vào schema/validation và typed API
thay vì gọi method private `get()` hoặc dùng field chưa tồn tại.

Ví dụ maintenance ở chương 3/4 dùng `ConfigService` trong mini module. Đó là minh hoạ;
`AppConfigService.appConfig` hiện chưa có `maintenanceMode`.

Load/validate env có thể xảy ra lúc module file được import, trước khi `NestFactory.create()` chạy.
Test cần thiết lập env đủ sớm hoặc override provider; DI không quay ngược thời gian để evaluate lại
`ConfigModule.forRoot()`. Không log toàn bộ env hoặc object config chứa credential khi debug.

## 5. Lifecycle hooks

```text
app.init()/listen()
  → onModuleInit()
  → onApplicationBootstrap()
app.close() hoặc signal đã đăng ký
  → onModuleDestroy()
  → beforeApplicationShutdown(signal?)
  → đóng connection của app/adapter
  → onApplicationShutdown(signal?)
```

Nest chờ Promise của hook async. Hook init phù hợp để connect tài nguyên hoặc kiểm invariant;
constructor không phải nơi tốt để khởi chạy Promise mà không được await.

`DiscoveryService` đã thấy controller đăng ký ở `onModuleInit()`. Chọn `onApplicationBootstrap()` cho
permission coverage để các module init hoàn tất, không phải vì controller chưa được discover ở hook trước.
Đọc [PermissionCoverageService](../../src/shared/services/permission-coverage.service.ts).

Request-scoped class không gắn với application lifecycle nên không nhận các lifecycle hook này như singleton.
Không đặt cleanup kết nối toàn app vào `onModuleDestroy()` của một request-scoped provider rồi kỳ vọng nó chạy
khi mỗi request kết thúc. Provider transient cũng cần kiểm ownership tài nguyên và context rõ ràng.

## 6. Shutdown và ownership tài nguyên

`app.close()` chủ động chạy lifecycle. Để signal như SIGTERM kích hoạt hooks, gọi
`app.enableShutdownHooks()`; repo hiện chưa gọi trong `main.ts`, nên không khẳng định signal tự chạy
mọi hook cleanup đã khai.

```ts
@Injectable()
class OwnedConnection implements OnModuleDestroy {
  constructor(private readonly client: ExternalClient) {}

  async onModuleDestroy() {
    await this.client.close();
  }
}
```

Fragment giả định provider này sở hữu client và `ExternalClient` có token DI cùng method `close()` async.
Với client dùng chung, chọn một owner đóng nó; đừng cho mỗi service inject client đều tự disconnect.
`app.close()` không tự biết đóng mọi Redis/DB SDK; provider/thư viện phải thực hiện cleanup đúng hợp đồng.

Khi deploy, cần cân nhắc readiness, dừng nhận việc mới, request đang chạy và timeout shutdown của nền tảng.
`enableShutdownHooks()` không tự giải quyết đầy đủ graceful drain mọi job/transaction.
Trong test, dùng `finally { await app.close(); }`; trong script context, cũng đóng context sau khi làm xong.

## 7. Adapter và giới hạn của ví dụ

Repo dùng Express 5 qua `@nestjs/platform-express`. Request/Response, middleware, multer, raw body,
trust proxy và cú pháp routing phụ thuộc adapter/version.

Fastify có lifecycle/plugin và request/reply khác; đừng copy middleware Express hoặc `@Res() Response`
rồi cho rằng chỉ đổi package adapter là đủ. Guard/interceptor HTTP nên dùng `switchToHttp()`;
code dùng cho RPC/WebSocket phải kiểm `context.getType()` và hợp đồng transport tương ứng.

Foundation này tập trung HTTP. Database transaction, auth strategy, queue, WebSocket, microservice và
production deployment có hướng dẫn riêng; khi học tiếp, dùng invariant về DI/scope/lifecycle làm nền,
không xem chúng đã được triển khai chỉ vì chương này giới thiệu thuật ngữ.

## 8. Tự kiểm chứng

1. Trong mini module, log constructor, init và bootstrap hook; `create()` chỉ chạy constructor,
   `init()` mới chạy init/bootstrap hooks.
2. Gọi `app.init()` rồi `listen()`; hooks không chạy lại lần hai trên cùng app đã init.
3. Gọi `app.close()` và kiểm cleanup được await.
4. Test port thiếu/sai/out of range, cờ `"false"` và config được load trước `beforeAll`.
5. Chạy bộ [foundation probes](examples/foundation-probes.cjs) để kiểm lifecycle không cần hạ tầng.

Nguồn: [Nest lifecycle events](https://docs.nestjs.com/fundamentals/lifecycle-events),
[Nest configuration](https://docs.nestjs.com/techniques/configuration),
[NestApplication trong phiên bản đã cài](../../node_modules/@nestjs/core/nest-application.js),
[NestApplicationContext](../../node_modules/@nestjs/core/nest-application-context.js).

Quay về [mục lục](README.md) để chọn lộ trình đọc hoặc cập nhật bản HTML.
