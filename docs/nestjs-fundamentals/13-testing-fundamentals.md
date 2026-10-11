# Chương 13 — Testing nền tảng

> Chọn test theo điều cần chứng minh: nghiệp vụ thuần, container DI hay HTTP contract.
> Các ví dụ dưới đây độc lập với AppModule và không cần PostgreSQL/Redis.

## 1. Ba mức test

| Mức                    | Dựng gì                    | Chứng minh gì                                      |
| ---------------------- | -------------------------- | -------------------------------------------------- |
| Unit                   | class + dependency giả     | thuật toán, nhánh lỗi, lời gọi collaborator        |
| DI integration         | `TestingModule` nhỏ        | token, imports/exports, scope, factory             |
| HTTP integration / e2e | Nest application + request | routing, guard, pipe, serializer, filter và status |

Gọi method controller trực tiếp không chứng minh `@Get`, `@Body`, `@UseGuards` hay global pipe hoạt động:
những thứ đó do Nest kích hoạt qua HTTP pipeline. Ngược lại, dựng cả AppModule để kiểm một phép tính đơn giản
kéo DB, Redis, env và boot-check vào một test không cần chúng.

## 2. Unit test service bằng dependency giả

```ts
interface CatalogReader {
  find(id: string): Promise<{ id: string; name: string } | null>;
}

class CatalogService {
  constructor(private readonly reader: CatalogReader) {}

  async detail(id: string) {
    const item = await this.reader.find(id);
    if (!item) throw new NotFoundException("Item not found");
    return item;
  }
}

it("ném 404 khi không có item", async () => {
  const reader = { find: jest.fn().mockResolvedValue(null) };
  const service = new CatalogService(reader);

  await expect(service.detail("missing")).rejects.toBeInstanceOf(
    NotFoundException,
  );
  expect(reader.find).toHaveBeenCalledWith("missing");
});
```

Đây là file spec minh hoạ, cần import `NotFoundException` từ Nest. Interface hoạt động ở đây vì tự `new` và
truyền dependency, không yêu cầu Nest tìm token runtime. Khi chuyển sang DI, khai token `@Inject(...)`
hoặc dùng class làm token như repo. Giả đúng boundary cần kiểm, không giả chính method đang test.

## 3. Dựng TestingModule nhỏ

```ts
const moduleRef = await Test.createTestingModule({
  providers: [
    PermissionResolverService,
    { provide: PrismaService, useValue: prismaFake },
    { provide: RolePermissionCacheService, useValue: cacheFake },
  ],
}).compile();

try {
  const service = moduleRef.get(PermissionResolverService);
  // Gọi service và assert kết quả với fake có phương thức đúng hợp đồng.
} finally {
  await moduleRef.close();
}
```

Đây là fragment theo [spec thật](../../src/shared/services/__tests__/permission-resolver.service.spec.ts).
`compile()` dựng container và provider; không tự bind HTTP routes hoặc gọi toàn bộ application lifecycle hooks.
`moduleRef.get()` lấy provider static; provider request/transient cần `resolve()` và context phù hợp.

`overrideProvider(Token).useValue(fake)` phải gọi trên builder **trước** `compile()`.
Token phải đúng identity mà constructor inject: hai Symbol có cùng mô tả vẫn là hai token khác nhau.
`jest.clearAllMocks()` xoá lịch sử lời gọi; không tự phục hồi tất cả implementation/state của fake.
Tạo fake mới mỗi test khi cần cách ly state.

## 4. Một HTTP test hoàn chỉnh

```ts
import { Body, Controller, Module, Post, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { IsString } from "class-validator";
import request from "supertest";

class CreateItemDto {
  @IsString()
  name: string;
}

@Controller("items")
class ItemsController {
  @Post()
  create(@Body() dto: CreateItemDto) {
    return dto;
  }
}

@Module({ controllers: [ItemsController] })
class TinyModule {}

it("validate body qua HTTP", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [TinyModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  try {
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    await request(app.getHttpServer())
      .post("/items")
      .send({ name: "Áo" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/items")
      .send({ name: 123 })
      .expect(400);
    await request(app.getHttpServer())
      .post("/items")
      .send({ name: "Áo", role: "admin" })
      .expect(400);
  } finally {
    await app.close();
  }
});
```

`app.init()` đủ để Supertest dùng HTTP server object; không cần `listen(3000)` hoặc giữ cổng cố định.
Đóng app trong `finally`, kể cả khi assertion lỗi, để connection/subscription không làm Jest treo.

Ví dụ này dùng filter mặc định của Nest. Để kiểm envelope của repo, đăng ký `APP_FILTER` với
`GlobalExceptionFilter` và pipe từ `createValidationPipe`; đừng assert hai hợp đồng lỗi như thể giống nhau.

## 5. Override global enhancer đúng token

Với `@UseGuards(DenyGuard)`, có thể `.overrideGuard(DenyGuard)`.
Với `APP_GUARD` + `useClass: DenyGuard`, Nest sinh application-provider token nội bộ;
`.overrideGuard(DenyGuard)` không tự thay global instance đó.

Để module test có thể thay global guard qua provider:

```ts
@Module({
  controllers: [ItemsController],
  providers: [DenyGuard, { provide: APP_GUARD, useExisting: DenyGuard }],
})
class TinyGuardModule {}

const moduleRef = await Test.createTestingModule({ imports: [TinyGuardModule] })
  .overrideProvider(DenyGuard)
  .useValue({ canActivate: () => true })
  .compile();
```

Fragment cần class guard và `APP_GUARD` import từ `@nestjs/core`. `useExisting` dùng cùng instance đã đăng ký,
khác với thêm một provider `useClass` mới. Quy tắc tương tự áp dụng cho pipe/interceptor/filter global.

Repo hiện giữ `APP_GUARD` + `useClass`; e2e đăng nhập thật để kiểm ma trận quyền. Tài liệu không đổi runtime
registration chỉ để đơn giản hoá test. Nếu fake guard gắn user/grants, phải tái tạo đúng state handler sử dụng.
Đừng tắt auth trong test có mục tiêu chứng minh auth hoạt động.

## 6. Test phải chia sẻ cấu hình production

Có hai nơi dễ lệch:

- `main.ts` thêm CORS, logger, trust proxy hoặc prefix; test tự create app không tự chạy `main.ts`.
- Global enhancer khai trong module thì test import module nhận được; enhancer khai riêng trong bootstrap
  thì test cần dùng cùng hàm setup trước `init()`.

Repo đã khai pipe/filter trong [BaseModule](../../src/shared/modules/base.module.ts) và dùng
[test app factory](../../test/e2e/support/create-test-app.ts).
AppModule kéo hạ tầng thật, nên e2e cần quy trình DB test riêng; mini probe dưới đây không thay thế e2e đó.

Env validation có thể chạy khi `ConfigModule.forRoot()` được import/evaluate, trước `beforeAll`.
Đặt env trước import module, hoặc override đúng provider theo [test harness hiện có](../../src/shared/services/__tests__/app-config-service-test-harness.ts).
Không suy ra gán `process.env` muộn luôn thay cấu hình đã load.

## 7. Kiểm Observable bằng subscription

`next.handle()` trả Observable lười; chỉ gọi `intercept()` rồi assert mock không chứng minh chiều về chạy.
Dùng `await lastValueFrom(interceptor.intercept(context, next))` khi return trực tiếp Observable;
nếu interceptor async, chờ Promise trước rồi subscribe.

Assert output/error và số lần handler effect chạy. `expect(next.handle).toHaveBeenCalledTimes(1)` chỉ đếm
lần lấy Observable; một Observable có thể bị subscribe nhiều lần, chẳng hạn do `retry`, làm handler chạy lại.
Không dùng retry quanh thao tác ghi DB nếu chưa có idempotency phù hợp.

## 8. Bộ kiểm chứng của tài liệu

```bash
node docs/nestjs-fundamentals/examples/foundation-probes.cjs
node scripts/build-nestjs-fundamentals.cjs --check
```

Lệnh đầu kiểm hành vi trên thư viện đã cài: mất metadata DI, global guard override, middleware error,
custom ValidationPipe, request body khác DTO, interceptor với `@Res()` và lifecycle hooks.
Lệnh sau kiểm HTML đồng bộ với Markdown và liên kết nội bộ. Cả hai không cần DB/Redis.

Khi sửa endpoint của app, chạy thêm test liên quan của repo. Không thay e2e đầy đủ bằng việc chỉ thấy
các probe foundation xanh; chúng có phạm vi nhỏ và rõ ràng.

Nguồn: [Nest testing](https://docs.nestjs.com/fundamentals/testing),
[TestingModuleBuilder trong phiên bản đã cài](../../node_modules/@nestjs/testing/testing-module.builder.js),
[Dependency scanner và application providers](../../node_modules/@nestjs/core/scanner.js).

**Tiếp theo:** [Chương 14 — Bootstrap, cấu hình và shutdown](14-bootstrap-configuration-and-shutdown.md).
