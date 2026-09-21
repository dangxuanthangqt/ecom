# Kiểm thử E2E

Đây là e2e test thật: một `INestApplication` được khởi động thật, một database Postgres riêng, và Redis
thật — không bypass guard, không mock Prisma, không fake in-memory. Mỗi spec cần xác thực đều lấy token
bằng cách gọi `POST /auth/login` thật, nên toàn bộ chuỗi
`AuthorizationHeaderGuard → AccessTokenGuard → RolePermissionCacheService` chạy đúng y như ở production.

## Chạy ở local

```bash
docker compose up -d db redis
cp .env.test.example .env.test   # once per checkout; already gitignored
pnpm test:e2e
```

`pnpm test:e2e` chạy `pretest:e2e` trước (alias của `pnpm test:e2e:setup`) — bước này reset và
migrate `ecom_e2e`, seed fixture, đồng bộ permission catalogue và các quyền của system role, rồi flush
Redis DB dùng cho test — sau đó mới chạy suite thật qua `jest --config ./test/jest-e2e.json --runInBand`.

Muốn debug riêng bước setup, không chạy suite, thì chạy:

```bash
pnpm test:e2e:setup
```

Nếu một lần chạy có vẻ bị treo, thêm `--detectOpenHandles` vào lệnh jest
(`pnpm exec jest --config ./test/jest-e2e.json --runInBand --detectOpenHandles`) để tìm ra
handle đang giữ process sống (thường là client Prisma hoặc ioredis mà spec quên đóng).

**Không chạy hai lệnh `pnpm test:e2e` cùng lúc trên cùng một `.env.test`.** Suite cố tình chạy
serial (`--runInBand`) trên một database `ecom_e2e` dùng chung và một Redis logical DB dùng chung — chạy
thêm một lệnh song song sẽ reset cùng database đó và flush cùng cache đó giữa chừng, gây ra 403 giả
xuyên process và test flaky chẳng liên quan gì đến code đang test. Vấn đề này đã được nêu ra và kiểm tra
kỹ khi thiết kế harness này rồi; cách xử lý là quy trình (đừng bao giờ chạy hai lần cùng lúc), không phải
sửa code.

## Chiến lược cô lập

| Concern      | Choice                                                                                                                                                                                                                                                     | Why                                                                                                                                                                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database     | Một database `ecom_e2e` riêng, nằm trên cùng instance Postgres mà `docker-compose.yml` đã chạy sẵn, được rebuild bằng `prisma migrate reset --force --skip-seed` trước mỗi lần chạy.                                                                       | Không cần testcontainers, không cần thêm compose service — tái dùng luôn container `db` có sẵn. `scripts/prepare-e2e-database.sh` từ chối chạy nếu `DATABASE_URL` không chứa `ecom_e2e`, nên một env cũ hay gõ nhầm không bao giờ có thể khiến lệnh reset đụng vào data dev/prod. |
| Redis        | Logical DB 1 (`redis://localhost:6379/1`), `FLUSHDB` trước mỗi lần chạy.                                                                                                                                                                                   | `RolePermissionCacheService` cache tập permission key của từng role (`role-permission:{roleId}`); một cache entry cũ từ lần chạy trước, hoặc từ local dev (DB 0), là rủi ro 403 xuyên lần chạy có thật, không phải chuyện lý thuyết.                                              |
| Env layering | `.env.test` chỉ chứa các override cho e2e (`NODE_ENV`, `DATABASE_URL`, `REDIS_URL`, `RESEND_API_KEY`); phần còn lại lấy từ `.env` vì `ConfigModule.forRoot` đọc `.env.${NODE_ENV}` rồi mới đến `.env`, và dotenv không bao giờ ghi đè một key đã được set. | Giữ file override gọn và rõ ràng là dành riêng cho e2e, thay vì lặp lại toàn bộ `.env`.                                                                                                                                                                                           |

## Pattern xác thực bằng login thật

Không spec nào tự dựng JWT bằng tay hay bypass guard. Mỗi request cần xác thực đều đi qua đúng hai bước
mà một client thật sẽ làm:

1. Gọi `POST /auth/login` với credential fixture đã seed sẵn, đọc lại đúng cặp `accessToken` /
   `refreshToken` thật từ response.
2. Dùng lại `accessToken` đó làm `Authorization: Bearer <token>` cho request đang test.

Nghĩa là một spec pass chính là bằng chứng cả chuỗi guard — parse header, verify token,
resolve permission (`@RequirePermission` trên handler, tập key của role lấy từ Redis hoặc Postgres, quy tắc `any` bao gồm `own`) —
chạy đúng từ đầu đến cuối, chứ không chỉ chứng minh logic nghiệp vụ của handler đúng khi test riêng lẻ.

## Phần chưa cover, và lý do

| Area                              | Why deferred                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `review`                          | Phụ thuộc vào một order đã delivered; sẽ làm ở pass sau khi coverage e2e cho order đã chứng minh ổn định. |
| `media`                           | Cần credential S3 thật hoặc một bucket giả lập — đây là quyết định hạ tầng, không phải quyết định test.   |
| `GET /auth/google/callback`       | Cần trao đổi token Google thật.                                                                           |
| Concurrent checkout / stock races | `--runInBand` chủ ý cấm chạy song song; xem `docs/race-conditions-analysis.md`.                           |

Unit suite của các phần đó vẫn là coverage duy nhất cho đến khi có pass tiếp theo xử lý chúng.

`brand`, `brand-translation`, `category`, `category-translation`, `permission`, `role`, `language`
và `profile` giờ đã được cover (xem `test/e2e/brand/`, `test/e2e/category/`, `test/e2e/permission/`,
`test/e2e/role/`, `test/e2e/language/`, `test/e2e/profile/`). Mối lo về cô lập giữa `permission`/`role`
mà một bản trước của doc này từng nêu, hoá ra chỉ là lo hão trong thực tế: khi mutate chúng thì gọi
`RolePermissionCacheService.invalidateAll()`, việc này chỉ ép request tiếp theo fallback về
Postgres — nó không hề làm sai lệch assertion của spec khác, và `--runInBand` đảm bảo không có
request nào của spec khác đang chạy dở khi mutation này xảy ra.

## Lỗi trong code production phát hiện được qua việc này (chưa fix ở đây)

Viết flow thật, không mock, chạy trên guard thật và database thật đã lộ ra sáu lỗi trong
code production hiện có. Không lỗi nào do việc làm e2e gây ra hay được fix ở đây — chúng được ghi lại ở đây
làm ticket follow-up, ngoài phạm vi task này:

1. **`POST /auth/2fa/disable` thành công dù body rỗng.** Không có gì được verify khi cả
   `totpCode` lẫn `code` đều thiếu trong request — endpoint này lẽ ra phải trả về lỗi validation
   thay vì tắt 2FA mà không xác thực bằng yếu tố thứ hai.
2. **Gọi `POST /auth/logout` lần hai với refresh token đã dùng rồi trả về `500` thay vì `404`
   gọn gàng.** `RefreshTokenRepository.delete` không kiểm tra
   `isRecordNotFoundPrismaError` trước khi để lỗi "record to delete does not exist" của Prisma
   lan ra ngoài.
3. **`POST /auth/refresh-token` với token rác/không parse được trả về `500` thay vì
   `401`/`400`.** `TokenService.verifyRefreshToken` không có `try/catch` bọc quanh lệnh verify
   JWT, và route cũng không có guard nào bắt token hỏng trước khi nó tới được service.
4. **`IsUniqueVariantConstraint` / `IsValidSKUsConstraint`** (`src/dtos/product/product.validation.ts`)
   crash với `500` khi thiếu field `variants`/`skus` thay vì trả về lỗi validation `400`
   gọn gàng — các custom validator này giả định field luôn có mặt thay vì kiểm tra
   `undefined`.
5. **`GET /brands/:id` trả `400` cho mọi request, kể cả brand id hợp lệ thật sự.**
   `BrandController.getBrandById(@Param("id") param: BrandIdParamDto)` chỉ bind chuỗi `id` thô
   vào một parameter được khai kiểu là _cả_ DTO, nên `ValidationPipe` toàn cục không bao giờ
   điền được `param.id`, khiến `@IsUUID` validate `undefined` và fail. Các handler cùng
   controller (`updateBrand`/`deleteBrand`) dùng `@Param() param: BrandIdParamDto` (nhận cả
   object params) nên không dính lỗi này — `getBrandById` là trường hợp ngoại lệ.
6. **`GET /brands/:id` vẫn đòi authentication dù mang tag Swagger `@ApiPublic` và summary
   ("Get a brand by ID").** `ApiPublic` (`src/shared/param-decorators/http-decorator.ts`) chỉ thêm
   metadata response cho Swagger — nó không áp `@IsPublicApi()` — nên route này vẫn nằm sau
   guard auth mặc định như mọi route khác, khác với `GET /brands` (list), route này có
   `@IsPublicApi()` nên thật sự public.

## CI

Job `test-e2e` trong `.github/workflows/ci.yml` chạy đúng các lệnh như trên cho mỗi
pull request không phải draft: nó khởi động `db` và `redis` qua `docker compose up -d --wait` (không
dùng khối `services:` gốc của GitHub Actions, vì `scripts/prepare-e2e-database.sh` gọi lệnh
`docker compose ps -q redis` để flush cache — job cần đúng container do compose quản lý
giống như dev chạy ở local), ghi `.env`/`.env.test` từ các file `.example` đã commit,
rồi mới chạy `pnpm test:e2e`. Test đỏ thì job fail như mọi CI check khác.
