# Quản lý Database PostgreSQL

Cách PostgreSQL được chạy trong repo này, có những database nào, ai tạo ra chúng, và các lỗi bạn
thực sự sẽ gặp bắt nguồn từ đâu trong mô hình đó.

**Stack:** PostgreSQL 15 (`postgres:15-alpine`) · Prisma 7.10.0 · Docker Compose
**Service:** [`docker-compose.yml`](../docker-compose.yml) — service `db`
**Liên quan:** [database-migration.vi.md](database-migration.vi.md) (đổi schema) ·
[database-seeding.vi.md](database-seeding.vi.md) (dữ liệu) ·
[database-rollback-recovery.vi.md](database-rollback-recovery.vi.md) (sự cố)

---

## 1. Một server, nhiều database

Ở local chỉ có **đúng một** PostgreSQL server — container `db`, publish ra `localhost:5432`. Bên
trong nó là nhiều database logic, cô lập hoàn toàn với nhau. Dự án này không bao giờ chạy nhiều hơn
một Postgres server.

```mermaid
flowchart TD
    subgraph SRV["PostgreSQL 15 server — container ecom-db-1, localhost:5432"]
        DEV[("ecom_db<br/><i>development</i>")]
        PROD[("ecom_prod<br/><i>production-mode / compose</i>")]
        E2E[("ecom_e2e<br/><i>e2e test — reset mỗi lần chạy</i>")]
        SHADOW[("ecom_shadow<br/><i>Prisma dùng tạm</i>")]
    end

    ENVD[".env.development"] --> DEV
    ENVP[".env"] --> PROD
    ENVT[".env.test"] --> E2E
    ENVD -.SHADOW_DATABASE_URL.-> SHADOW

    style E2E fill:#ffe9e9,stroke:#c00
    style SHADOW fill:#f0f0f0,stroke:#888,stroke-dasharray: 4 3
```

| Database      | File trỏ tới nó                            | Ai tạo                                        | Vòng đời                                  |
| ------------- | ------------------------------------------ | --------------------------------------------- | ----------------------------------------- |
| `ecom_db`     | `.env.development` → `DATABASE_URL`        | `POSTGRES_DB` lúc init đầu tiên, hoặc tạo tay | Lâu dài; dữ liệu bạn đang làm việc        |
| `ecom_prod`   | `.env` → `DATABASE_URL`                    | `POSTGRES_DB` lúc volume được tạo lần đầu     | Lâu dài                                   |
| `ecom_e2e`    | `.env.test` → `DATABASE_URL`               | `pnpm db:test:reset` / `test:e2e:setup`       | **Bị drop và tạo lại mỗi lần chạy e2e**   |
| `ecom_shadow` | `.env.development` → `SHADOW_DATABASE_URL` | Bạn, một lần (`CREATE DATABASE`)              | Prisma xoá/ghi lại khi chạy `migrate dev` |

Hai đặc điểm quan trọng của cách bố trí này:

- **Cô lập ở mức database, không phải mức server.** Một `DATABASE_URL` gõ sai là chạm tới dữ liệu
  thật chỉ qua một chuỗi kết nối. Đó là lý do [`scripts/prepare-e2e-database.sh`](../scripts/prepare-e2e-database.sh)
  từ chối chạy nếu URL không chứa đúng chữ `ecom_e2e` — thao tác reset của nó nếu không sẽ phá
  `ecom_db` hoặc `ecom_prod`.
- **Không file env nào kế thừa file khác.** [`src/constants/env-file.constant.ts`](../src/constants/env-file.constant.ts)
  map mỗi `NODE_ENV` tới đúng một file, không layering, nên mỗi file phải có `DATABASE_URL` đầy đủ
  của riêng nó.

> **`ecom_shadow` không phải database theo nghĩa thông thường.** Prisma tạo, migrate lên rồi xoá một
> shadow database để phát hiện drift khi chạy `migrate dev`. Nó không chứa dữ liệu nào đáng quan tâm,
> và chỉ cần cho lệnh development — `migrate deploy` không bao giờ dùng tới.

---

## 2. Service `db`, đọc từng dòng

```yaml
db:
  image: postgres:15-alpine
  restart: unless-stopped
  environment:
    POSTGRES_DB: ecom_db # ← chỗ DUY NHẤT tên database được viết ra
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
  volumes:
    - postgres_data:/var/lib/postgresql/data # ← nơi dữ liệu thực sự nằm
  ports:
    - "5432:5432" # ← host:container
  healthcheck:
    test:
      [
        "CMD-SHELL",
        'psql -U postgres -d "$$POSTGRES_DB" -c ''SELECT 1'' >/dev/null || exit 1',
      ]
```

**`volumes`** là dòng quan trọng nhất. Dữ liệu nằm ở named volume `postgres_data`, _không_ nằm trong
container. Xoá container thì dữ liệu còn; xoá volume thì mất. Mọi bất ngờ ở §4 đều bắt nguồn từ đây.

**`ports: "5432:5432"`** publish port container ra host. Từ host — nơi `pnpm start:dev`, `prisma` và
GUI client của bạn chạy — địa chỉ là `localhost:5432`. Từ **bên trong** compose network, địa chỉ là
`db:5432`; `localhost` ở đó nghĩa là chính container đang gọi.

**`healthcheck`** chạy `SELECT 1` thật lên `$POSTGRES_DB`. Dấu `$$` nhân đôi để thoát cơ chế
substitution của Compose, nhờ đó shell trong container mới là bên expand — và tên database vẫn chỉ
khai báo một chỗ.

> **Vì sao không dùng `pg_isready`?** `pg_isready -d <tên>` trông như đang kiểm tra database, nhưng
> thực ra nó chỉ hỏi _server_ có nhận kết nối không, hoàn toàn không xác minh database tồn tại.
> Healthcheck cũ dùng nó và đã báo `healthy` suốt quãng thời gian `ecom_db` chưa hề tồn tại. Cả
> `migrate` lẫn `app` đều chờ `db` healthy, nên một tín hiệu không nhìn thấy database thiếu thì gần
> như vô dụng.

---

## 3. Còn ai nói chuyện với server này

```mermaid
flowchart LR
    HOST["Process ở host<br/>pnpm start:dev · prisma CLI · seed"] -->|localhost:5432| DB[("container db")]
    MIG["compose service <b>migrate</b>"] -->|db:5432| DB
    APP["compose service <b>app</b>"] -->|db:5432| DB
```

Service `migrate` apply schema đúng một lần trước khi `app` start; app image không thể migrate (đã bị
`pnpm prune --prod` gỡ mất Prisma CLI). Chi tiết ở
[database-migration.vi.md § 5](database-migration.vi.md), nằm ngoài phạm vi tài liệu này.

---

## 4. Luật khởi tạo — nguồn gốc của phần lớn nhầm lẫn

`POSTGRES_DB`, `POSTGRES_USER` và `POSTGRES_PASSWORD` chỉ được đọc **khi thư mục data còn rỗng.**

```mermaid
flowchart TD
    S["container start"] --> Q{"/var/lib/postgresql/data<br/>có file PG_VERSION không?"}
    Q -->|"KHÔNG — volume rỗng"| I["chạy initdb<br/>tạo POSTGRES_USER<br/>tạo POSTGRES_DB<br/>chạy /docker-entrypoint-initdb.d/*.sql"]
    Q -->|"CÓ — đã init rồi"| K["log: Skipping initialization<br/><b>bỏ qua cả ba biến</b>"]
    I --> R["server sẵn sàng"]
    K --> R

    style K fill:#fff3cd,stroke:#b8860b
```

Nên trên một volume đã tồn tại:

- đổi `POSTGRES_DB` sẽ **không tạo ra gì**;
- đổi `POSTGRES_PASSWORD` sẽ **không đổi gì**;
- thêm file vào `/docker-entrypoint-initdb.d/` sẽ **không chạy gì**.

`docker compose restart`, `up`, kể cả `up --force-recreate` đều rơi vào nhánh bên phải, vì chúng thay
_container_ nhưng giữ _volume_. Xem lần start vừa rồi đi nhánh nào:

```bash
docker compose logs db | grep -i "initialization\|initializing"
# → PostgreSQL Database directory appears to contain a database; Skipping initialization
```

Đây là thiết kế có chủ đích. Nếu mấy biến này được áp lại mỗi lần start, chỉ một lần gõ nhầm biến môi
trường là có thể âm thầm ghi đè credential của một database đang chứa dữ liệu thật.

**Vậy có hai cách để có database mới:**

| Mục tiêu                             | Lệnh                                                             | Cái giá                   |
| ------------------------------------ | ---------------------------------------------------------------- | ------------------------- |
| Thêm database, giữ nguyên mọi thứ    | `docker exec ecom-db-1 psql -U postgres -c 'CREATE DATABASE x;'` | Không mất gì              |
| Để `POSTGRES_DB` thực sự có hiệu lực | `docker compose down -v && docker compose up db -d`              | **Xoá sạch mọi database** |

---

## 5. Công thức thao tác

### Tạo database

```bash
docker exec ecom-db-1 psql -U postgres -c 'CREATE DATABASE ecom_db;'
docker exec ecom-db-1 psql -U postgres -c 'CREATE DATABASE ecom_shadow;'
```

### Xem đang có gì

```bash
docker exec ecom-db-1 psql -U postgres -l
```

### Đổi tên database development

Tên xuất hiện ở ba chỗ — sót một chỗ là healthcheck hoặc Prisma sẽ lệch với thực tế:

```bash
NEW_DB=ecom_local

# 1. không được còn kết nối nào mở (tắt app và GUI client trước)
docker exec ecom-db-1 psql -U postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='ecom_db';"

# 2. đổi tên — dữ liệu, schema và bảng _prisma_migrations đi theo
docker exec ecom-db-1 psql -U postgres -c "ALTER DATABASE ecom_db RENAME TO $NEW_DB;"

# 3. cập nhật cả hai file
sed -i "s/ecom_db/$NEW_DB/" .env.development docker-compose.yml

# 4. kiểm chứng — phải báo "up to date", không phải danh sách migration pending
pnpm prisma:migrate:status
```

Muốn một database trắng thay vì đổi tên? Bỏ bước rename, `CREATE DATABASE` với tên mới, sửa đúng hai
file đó, rồi `pnpm prisma:migrate:dev && pnpm db:seed`.

### Làm lại từ đầu hoàn toàn

```bash
docker compose down -v          # -v XOÁ volume và mọi database trong đó
docker compose up db -d         # volume rỗng → initdb chạy → POSTGRES_DB có hiệu lực
pnpm prisma:migrate:dev
pnpm db:seed
```

### Dựng môi trường development từ con số không

```bash
docker compose up db -d
docker exec ecom-db-1 psql -U postgres -c 'CREATE DATABASE ecom_shadow;'   # nếu chưa có
pnpm prisma:generate
pnpm prisma:migrate:dev
pnpm db:seed
pnpm seed:initial-scripts       # sync permission RBAC từ route của app
```

---

## 6. Prisma quyết định nối vào database nào bằng cách nào

Một bộ nạp, một file. Prisma 7 không tự đọc file env nào — cả CLI lẫn client — nên thứ duy nhất có
thể đưa `DATABASE_URL` vào một lệnh Prisma là [`prisma.config.ts`](../prisma.config.ts), file này nạp
đúng file mà `NODE_ENV` chọn qua cùng resolver app đang dùng (`src/constants/env-file.constant.ts`).

```mermaid
flowchart TD
    A["pnpm prisma:migrate:dev"] --> B["prisma.config.ts<br/>resolveEnvFilePath() → .env.development"]
    B --> C{"DATABASE_URL đã có trong process.env?"}
    C -->|Có| D["giữ nguyên — dotenv không ghi đè<br/><b>CI / Docker inject thắng</b>"]
    C -->|Không| E["lấy từ .env.development<br/><b>ecom_db</b>"]
    E --> F{"vẫn trống? (checkout mới, image builder)"}
    F -->|Có| G["bỏ qua datasource: generate/validate vẫn chạy,<br/>lệnh migrate báo lỗi rõ ràng"]

    style D fill:#e0f0e0,stroke:#2d7a2d
    style E fill:#e0f0e0,stroke:#2d7a2d
```

```
$ pnpm prisma:migrate:status
Loaded Prisma config from prisma.config.ts.
Datasource "db": PostgreSQL database "ecom_db", schema "public" at "localhost:5432"
```

Không còn dòng "loaded from .env", và không còn bộ nạp thứ hai nào có thể mâu thuẫn với dòng
**Datasource**. Dưới Prisma 6, cả CLI lẫn client đều tự nạp `.env` ở project root (file production)
trước bộ nạp của ta — đó chính là lý do `pnpm db:seed` từng đòi `ecom_prod`; xem
[prisma-7-migration.vi.md](prisma-7-migration.vi.md).

**Các script hướng deploy** — `db:migrate`, `db:backup`, `db:restore` — kiểm tra `DATABASE_URL` trong
shell trước khi làm bất cứ gì, vì chúng được thiết kế để chạy ở nơi platform inject biến đó (image
`migrator`, workflow migration). Chúng fail ngay:

```
[db-migrate] ERROR: DATABASE_URL is not set.
```

Dòng guard đó chạy ở tầng shell, **trước** khi Prisma kịp tự nạp `.env`. Nhờ vậy một lệnh
`pnpm db:migrate` trần không bao giờ âm thầm chạm vào database ghi trong `.env`.

---

## 7. Các lỗi bạn thực sự sẽ gặp

### `P1003: Database "X" does not exist on the database server`

Server trả lời được; database bên trong nó không tồn tại.

```bash
docker exec ecom-db-1 psql -U postgres -l          # tên đó có không?
docker exec ecom-db-1 psql -U postgres -c 'CREATE DATABASE X;'
```

Gần như luôn xảy ra sau khi sửa `DATABASE_URL` (hoặc `POSTGRES_DB`) và tưởng rằng restart sẽ tạo
database — xem §4.

### `P1001: Can't reach database server at ...`

Không có gì lắng nghe ở đó. Nguyên nhân khác nhau tuỳ ngữ cảnh:

| Lệnh chạy ở đâu             | Host đúng        | Lỗi hay gặp                                      |
| --------------------------- | ---------------- | ------------------------------------------------ |
| Host (`pnpm …`, GUI client) | `localhost:5432` | dùng `db:5432` — host không resolve được tên này |
| Bên trong container compose | `db:5432`        | dùng `localhost` — trỏ vào chính container đó    |

Cũng kiểm tra container có chạy và port publish có khớp không: `docker compose ps db`. Nếu `ports:`
là `"5433:5432"` thì địa chỉ từ host là `localhost:5433`.

### Container báo `healthy` nhưng database không tồn tại

Đúng với healthcheck `pg_isready -d` cũ; đã sửa ở §2. Nếu copy block service này sang nơi khác, nhớ
mang theo dạng `psql -c 'SELECT 1'`.

### Đã đổi `POSTGRES_DB` mà không thấy database mới

§4. Hoặc `CREATE DATABASE` bằng tay, hoặc `docker compose down -v` và chấp nhận mất sạch.

### `Error: P3014` / lỗi shadow database khi chạy `migrate dev`

`SHADOW_DATABASE_URL` không kết nối được, hoặc trỏ đi nơi khác so với `DATABASE_URL` — rất dễ bị bỏ
quên khi chỉ sửa mỗi URL chính. Cả hai nằm trong [`.env.development`](../.env.development); giữ host,
port, user, password giống hệt nhau và chỉ khác tên database.

`migrate deploy` không dùng shadow database, nên lỗi này chỉ xảy ra ở development.

### `database "X" is being accessed by other users`

`ALTER DATABASE … RENAME` và `DROP DATABASE` yêu cầu không còn kết nối nào mở. Tắt app, đóng GUI
client và Prisma Studio, rồi:

```bash
docker exec ecom-db-1 psql -U postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='X';"
```

### `[db-migrate] ERROR: DATABASE_URL is not set.`

Đúng thiết kế — §6. Cung cấp URL tường minh:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecom_db?schema=public" pnpm db:migrate
```

Ở development nên dùng `pnpm prisma:migrate:dev`, nó đã ghim sẵn `.env.development`.

### `docker compose ps` không thấy `migrate`

Nó đã exit — đúng thiết kế. `migrate` là job chạy một lần, không phải service chạy mãi. Dùng
`docker compose ps -a` và `docker compose logs migrate`.

---

## 8. Quy tắc an toàn

1. **`docker compose down -v` xoá mọi database trong volume.** `-v` không phải cờ verbose. Không có
   nó, `down` chỉ gỡ container và dữ liệu vẫn còn.
2. **Đừng bao giờ để `.env.test` trỏ vào thứ gì khác ngoài `ecom_e2e`.** Bộ setup e2e drop và tạo lại
   database của nó mỗi lần chạy; guard trong `prepare-e2e-database.sh` là thứ duy nhất đứng giữa một
   file `.env.test` cũ và dữ liệu development của bạn.
3. **Đừng bao giờ chạy `prisma migrate reset` hay `prisma migrate dev` lên database đã deploy.** Cả
   hai đều chỉ dành cho development và có thể xoá dữ liệu. Database đã deploy dùng
   `prisma migrate deploy`, qua `pnpm db:migrate`.
4. **Mọi lệnh Prisma chỉ đọc đúng một file env — file mà `NODE_ENV` chọn** (`prisma.config.ts`, mặc
   định `development`). Prisma 7 không còn tự nạp `.env`, cả ở CLI lẫn client, nên một lệnh development
   không thể vô tình lấy nhầm URL production nữa. Biến môi trường thật của process vẫn thắng file — đó
   là cách Docker và CI đưa giá trị của họ vào.

---

## 9. Lệnh Docker — giải thích cho người mới

Mục này mổ xẻ từng lệnh đã dùng ở trên. Nếu bạn mới dùng Docker, đọc 9.1 trước — phần lớn nhầm lẫn
không nằm ở cú pháp mà ở chỗ không phân biệt được image / container / volume.

### 9.1 Bốn khái niệm nền

```mermaid
flowchart LR
    IMG["<b>Image</b><br/>postgres:15-alpine<br/><i>bản thiết kế, chỉ đọc</i>"]
      -->|"tạo ra"| CT["<b>Container</b><br/>ecom-db-1<br/><i>tiến trình đang chạy</i>"]
    CT <-->|"đọc/ghi"| VOL["<b>Volume</b><br/>postgres_data<br/><i>ổ đĩa, sống lâu hơn container</i>"]
    CT <-->|"nói chuyện"| NET["<b>Network</b><br/>ecom-network<br/><i>mạng nội bộ</i>"]

    style VOL fill:#e0f0e0,stroke:#2d7a2d
```

| Khái niệm     | Ví von                        | Xoá đi thì sao                                 |
| ------------- | ----------------------------- | ---------------------------------------------- |
| **Image**     | Bản thiết kế ngôi nhà         | Tải lại được từ Docker Hub                     |
| **Container** | Ngôi nhà dựng từ bản thiết kế | Dựng lại trong vài giây, **không mất dữ liệu** |
| **Volume**    | Nhà kho đứng riêng bên ngoài  | **Mất sạch dữ liệu** — không khôi phục được    |
| **Network**   | Con đường nối các ngôi nhà    | Tự tạo lại                                     |

Ý quan trọng nhất: **container và volume là hai thứ tách rời.** Xoá container mười lần, dữ liệu vẫn
còn nguyên trong volume. Đây là lý do `restart` không bao giờ "làm lại từ đầu" như nhiều người tưởng.

### 9.2 `docker compose up` — bật service lên

```bash
docker compose up db -d
│      │       │  │  └─ -d = detach: chạy nền, trả lại terminal cho bạn
│      │       │  └──── tên service trong docker-compose.yml (bỏ trống = tất cả)
│      │       └─────── "đảm bảo service đang chạy" — tạo mới nếu chưa có
│      └─────────────── đọc file docker-compose.yml ở thư mục hiện tại
└────────────────────── Docker CLI
```

Bỏ `-d` thì log đổ thẳng ra màn hình và **Ctrl+C sẽ dừng container** — đó là lý do hầu như lúc nào
cũng nên có `-d`.

`up` là lệnh **idempotent**: service đang chạy và config không đổi thì nó không làm gì cả. Config
trong `docker-compose.yml` có đổi thì nó tự tạo lại container cho khớp.

| Cờ thêm            | Khi nào dùng                                                             |
| ------------------ | ------------------------------------------------------------------------ |
| `--build`          | Service có `build:` và bạn vừa sửa code/Dockerfile — ép build lại image  |
| `--force-recreate` | Ép tạo lại container dù config không đổi (ví dụ để test healthcheck mới) |
| `--wait`           | Chặn cho tới khi healthcheck xanh rồi mới trả về — CI dùng cờ này        |
| `--no-deps`        | Chỉ bật đúng service đó, bỏ qua `depends_on`                             |

### 9.3 `docker compose down` — và cái bẫy `-v`

```bash
docker compose down       # dừng + XOÁ container, XOÁ network. Volume CÒN NGUYÊN
docker compose down -v    # ...và xoá luôn volume → MẤT HẾT DATABASE
```

`-v` ở đây là `--volumes`, **không phải** verbose. Đây là lệnh duy nhất trong tài liệu này có thể làm
mất dữ liệu ngoài ý muốn.

| Lệnh                     | Container      | Network | Volume (dữ liệu) |
| ------------------------ | -------------- | ------- | ---------------- |
| `docker compose stop`    | dừng, giữ      | giữ     | giữ              |
| `docker compose restart` | dừng + bật lại | giữ     | giữ              |
| `docker compose down`    | **xoá**        | **xoá** | giữ              |
| `docker compose down -v` | **xoá**        | **xoá** | **XOÁ**          |

Muốn dừng tạm thời thì dùng `stop`, không cần `down`.

### 9.4 Nhìn xem chuyện gì đang xảy ra

```bash
docker compose ps            # service đang chạy + port đang publish
docker compose ps -a         # ...kể cả container đã exit (migrate nằm ở đây)
docker compose logs db       # toàn bộ log của service db
docker compose logs -f db    # -f = follow, xem log chảy theo thời gian thực (Ctrl+C để thoát)
docker compose logs --tail=50 db   # chỉ 50 dòng cuối
```

`ps` không có `-a` sẽ **không** hiện `migrate`, vì service đó đã exit sau khi chạy xong — đúng thiết
kế, không phải lỗi.

Xem trạng thái healthcheck:

```bash
docker inspect --format '{{.State.Health.Status}}' ecom-db-1
# → starting | healthy | unhealthy
```

Xem file compose sau khi Docker đã xử lý biến và anchor — hữu ích để kiểm tra mình viết YAML đúng
chưa, mà không cần chạy thật:

```bash
docker compose config db
```

### 9.5 `docker exec` — chạy lệnh bên trong container đang chạy

```bash
docker exec -it ecom-db-1 psql -U postgres -d ecom_db
│      │    │   │         └─ lệnh sẽ chạy BÊN TRONG container
│      │    │   └─────────── tên CONTAINER (không phải tên service)
│      │    └─────────────── -i giữ stdin mở, -t cấp terminal → gõ tương tác được
│      └──────────────────── container phải ĐANG CHẠY
└─────────────────────────── Docker CLI
```

`-it` chỉ cần khi bạn muốn **ngồi gõ** bên trong. Lệnh chạy một phát rồi thoát thì bỏ đi:

```bash
docker exec ecom-db-1 psql -U postgres -l      # không cần -it
```

**Tên container từ đâu ra?** Compose ghép `<tên-project>-<tên-service>-<số>`. Project mặc định lấy
theo tên thư mục, nên ở đây là `ecom` + `db` + `1` = `ecom-db-1`. Xem danh sách bằng `docker ps`.

Tránh phải nhớ tên container thì dùng bản compose, nó nhận **tên service**:

```bash
docker compose exec db psql -U postgres -l     # tương đương, gọn hơn
```

> **`exec` khác `run`.** `exec` chạy lệnh trong container **đang có sẵn**. `docker compose run` tạo
> một container **mới**. Với database thì hầu như luôn dùng `exec` — `run` sẽ đẻ thêm container thừa.

### 9.6 Các cờ `psql` xuất hiện trong tài liệu

`psql` là client dòng lệnh của Postgres, chạy bên trong container.

| Cờ            | Nghĩa                                                   |
| ------------- | ------------------------------------------------------- |
| `-U postgres` | Đăng nhập bằng user `postgres`                          |
| `-d ecom_db`  | Nối vào database `ecom_db`                              |
| `-c "SQL"`    | Chạy đúng một câu lệnh rồi thoát                        |
| `-l`          | Liệt kê mọi database rồi thoát                          |
| `-t`          | Bỏ header và dòng đếm — tiện khi cắt output bằng script |

Vào shell tương tác rồi thì:

```
\l      liệt kê database
\c tên  chuyển sang database khác
\dt     liệt kê bảng
\d tên  xem cấu trúc một bảng
\q      thoát
```

### 9.7 Sửa cái gì thì cần chạy lại lệnh nào

Bảng này trả lời câu hỏi hay gặp nhất: "sửa xong rồi, giờ phải làm gì để nó ăn?"

| Bạn vừa sửa                           | Lệnh cần chạy                      | Ghi chú                                    |
| ------------------------------------- | ---------------------------------- | ------------------------------------------ |
| `ports`, `environment`, `healthcheck` | `docker compose up -d db`          | Compose tự phát hiện và tạo lại container  |
| `Dockerfile` hoặc code của app        | `docker compose up -d --build app` | Phải build lại image                       |
| `POSTGRES_DB` (tên database)          | **Không lệnh nào ăn** — xem §4     | Phải `CREATE DATABASE` tay, hoặc `down -v` |
| `.env.development`                    | Không cần lệnh Docker              | File này chỉ do process ở host đọc         |
| `prisma/schema.prisma`                | `pnpm prisma:migrate:dev`          | Không liên quan tới Docker                 |

### 9.8 Lỗi hay gặp khi gõ lệnh

**`Error: No such container: db`** — bạn đưa _tên service_ cho `docker exec`. Hoặc dùng tên container
đầy đủ (`ecom-db-1`), hoặc đổi sang `docker compose exec db`.

**Gõ `docker compose up` rồi terminal treo** — bạn quên `-d`. Log đang chiếm terminal. Ctrl+C sẽ dừng
container; muốn giữ nó chạy thì mở tab khác gõ `docker compose up -d`.

**`no configuration file provided`** — bạn không đứng ở thư mục chứa `docker-compose.yml`. `cd` về
thư mục gốc dự án.

**Chạy `down -v` rồi mất sạch database** — không khôi phục được. Dựng lại bằng
`docker compose up db -d && pnpm prisma:migrate:dev && pnpm db:seed`.

**`port is already allocated`** — có tiến trình khác đang giữ 5432 (thường là Postgres cài thẳng trên
máy). Tắt nó, hoặc đổi cổng publish thành `"5433:5432"` rồi sửa `DATABASE_URL` thành `localhost:5433`.

### 9.9 Cheat sheet

| Bạn muốn                         | Gõ                                                                |
| -------------------------------- | ----------------------------------------------------------------- |
| Bật database                     | `docker compose up db -d`                                         |
| Xem nó sống chưa                 | `docker compose ps db`                                            |
| Xem log lỗi                      | `docker compose logs --tail=50 db`                                |
| Liệt kê database                 | `docker compose exec db psql -U postgres -l`                      |
| Vào gõ SQL trực tiếp             | `docker compose exec -it db psql -U postgres -d ecom_db`          |
| Tạo một database mới             | `docker compose exec db psql -U postgres -c 'CREATE DATABASE x;'` |
| Tạm dừng, giữ dữ liệu            | `docker compose stop`                                             |
| Xoá container, giữ dữ liệu       | `docker compose down`                                             |
| Làm lại từ đầu (**mất dữ liệu**) | `docker compose down -v`                                          |

---

## 10. Tra cứu lệnh

| Lệnh                                                    | Tác dụng                                          |
| ------------------------------------------------------- | ------------------------------------------------- |
| `docker compose up db -d`                               | Khởi động container Postgres                      |
| `docker compose logs db`                                | Log server, gồm cả nhánh khởi tạo đã đi           |
| `docker compose ps db`                                  | Trạng thái và port đang publish                   |
| `docker compose down`                                   | Dừng container, **giữ** dữ liệu                   |
| `docker compose down -v`                                | Dừng container, **xoá** dữ liệu                   |
| `docker exec ecom-db-1 psql -U postgres -l`             | Liệt kê database                                  |
| `docker exec -it ecom-db-1 psql -U postgres -d ecom_db` | Mở shell tương tác trên database dev              |
| `pnpm prisma:migrate:status`                            | Migration đang pending (ghim `.env.development`)  |
| `pnpm prisma:migrate:dev`                               | Apply/tạo migration ở development                 |
| `pnpm db:seed`                                          | Nạp dữ liệu mẫu                                   |
| `pnpm db:test:reset`                                    | **Drop và tạo lại** `ecom_e2e`                    |
| `pnpm db:migrate`                                       | Migration hướng deploy; cần inject `DATABASE_URL` |
