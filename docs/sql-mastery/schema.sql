-- ============================================================
-- SQL Mastery · Schema mẫu "shop" (PostgreSQL 15+)
-- Chạy: psql -U postgres -d sql_mastery -f schema.sql
-- Tạo 12 bảng của một hệ thống bán hàng thu nhỏ và seed dữ liệu
-- đủ lớn để thấy sự khác biệt khi có / không có index.
-- ============================================================

DROP SCHEMA IF EXISTS shop CASCADE;
CREATE SCHEMA shop;
SET search_path TO shop, public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- index cho LIKE '%x%'

-- ---------- Người dùng & phân quyền ----------
CREATE TABLE roles (
  id          smallserial PRIMARY KEY,
  name        text NOT NULL UNIQUE               -- 'admin', 'seller', 'customer'
);

CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  name        text NOT NULL,
  avatar      text,                               -- NULL = chưa có ảnh
  status      text NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'inactive', 'blocked')),
  role_id     smallint NOT NULL REFERENCES roles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz                          -- soft delete
);
-- email chỉ unique trong số user chưa xoá
CREATE UNIQUE INDEX users_email_active_uq ON users (email) WHERE deleted_at IS NULL;

-- ---------- Danh mục & thương hiệu ----------
CREATE TABLE brands (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  deleted_at  timestamptz
);

CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  parent_id   uuid REFERENCES categories(id) ON DELETE SET NULL,   -- cây tự tham chiếu
  deleted_at  timestamptz
);
CREATE INDEX categories_parent_idx ON categories (parent_id);

-- ---------- Sản phẩm ----------
CREATE TABLE products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  brand_id      uuid NOT NULL REFERENCES brands(id),
  base_price    numeric(12,2) NOT NULL,           -- giá bán
  list_price    numeric(12,2) NOT NULL,           -- giá niêm yết (để tính % giảm)
  attributes    jsonb NOT NULL DEFAULT '{}',      -- {"color":["red","blue"],"size":["M","L"]}
  images        text[] NOT NULL DEFAULT '{}',
  published_at  timestamptz,                      -- NULL = nháp
  created_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);
CREATE INDEX products_brand_idx ON products (brand_id);

-- n-n product <-> category
CREATE TABLE product_categories (
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);
CREATE INDEX product_categories_category_idx ON product_categories (category_id);

-- 1-n product -> sku (biến thể có giá & tồn riêng)
CREATE TABLE skus (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku_code    text NOT NULL UNIQUE,
  price       numeric(12,2) NOT NULL,
  stock       int NOT NULL CHECK (stock >= 0),
  version     int NOT NULL DEFAULT 0,             -- cho optimistic lock
  deleted_at  timestamptz
);
CREATE INDEX skus_product_idx ON skus (product_id);

-- ---------- Đơn hàng ----------
CREATE TABLE orders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id),
  status      text NOT NULL
              CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'returned')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);
CREATE INDEX orders_user_idx ON orders (user_id);

-- snapshot tại thời điểm mua: giá & tên có thể đổi sau này
CREATE TABLE order_items (
  id            bigserial PRIMARY KEY,
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku_id        uuid REFERENCES skus(id) ON DELETE SET NULL,   -- nullable: sku có thể bị xoá cứng
  product_name  text NOT NULL,
  unit_price    numeric(12,2) NOT NULL,
  quantity      int NOT NULL CHECK (quantity > 0)
);
CREATE INDEX order_items_order_idx ON order_items (order_id);

CREATE TABLE cart_items (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sku_id      uuid NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
  quantity    int NOT NULL CHECK (quantity > 0),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sku_id)
);

-- ---------- Tương tác ----------
CREATE TABLE reviews (
  id          bigserial PRIMARY KEY,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id),
  rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_product_idx ON reviews (product_id);

CREATE TABLE messages (
  id            bigserial PRIMARY KEY,
  from_user_id  uuid NOT NULL REFERENCES users(id),
  to_user_id    uuid NOT NULL REFERENCES users(id),
  content       text NOT NULL,
  read_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SEED · ~50k đơn, ~150k order_items để test index có ý nghĩa
-- Lưu ý kỹ thuật: subquery `ORDER BY random() LIMIT 1` không tương quan
-- chỉ được tính MỘT lần cho cả câu INSERT, nên ở đây chọn ngẫu nhiên
-- bằng cách gom id vào mảng rồi bốc theo random() của từng dòng.
-- ============================================================
INSERT INTO roles (name) VALUES ('admin'), ('seller'), ('customer');

INSERT INTO users (email, name, avatar, role_id, created_at)
SELECT 'user' || g || '@example.com',
       'User ' || g,
       CASE WHEN g % 3 = 0 THEN NULL ELSE 'https://img.example.com/u/' || g || '.png' END,
       CASE WHEN g <= 5 THEN 1 WHEN g <= 50 THEN 2 ELSE 3 END,
       now() - (random() * 365)::int * interval '1 day'
FROM generate_series(1, 5000) g;

INSERT INTO brands (name) SELECT 'Brand ' || g FROM generate_series(1, 30) g;

-- cây danh mục 3 cấp: 5 gốc, mỗi gốc 4 con, mỗi con 3 cháu
INSERT INTO categories (name) SELECT 'Root ' || g FROM generate_series(1, 5) g;
INSERT INTO categories (name, parent_id)
SELECT r.name || ' / Sub ' || g, r.id FROM categories r, generate_series(1, 4) g WHERE r.parent_id IS NULL;
INSERT INTO categories (name, parent_id)
SELECT s.name || ' / Leaf ' || g, s.id FROM categories s, generate_series(1, 3) g
WHERE s.name LIKE '% / Sub %' AND s.name NOT LIKE '% / Leaf %';

WITH b AS (SELECT array_agg(id) AS ids FROM brands)
INSERT INTO products (name, brand_id, base_price, list_price, attributes, images, published_at, created_at)
SELECT 'Product ' || g,
       b.ids[1 + floor(random() * cardinality(b.ids))::int],
       x.p, x.p * (1 + (g % 5) * 0.1),           -- list_price = base_price + 0..40%
       jsonb_build_object('color', (ARRAY['red','blue','black'])[1:(g % 3 + 1)], 'size', ARRAY['S','M','L']),
       CASE WHEN g % 7 = 0 THEN '{}'::text[] ELSE ARRAY['https://img.example.com/p/' || g || '.png'] END,
       CASE WHEN g % 10 = 0 THEN NULL ELSE now() - (random() * 300)::int * interval '1 day' END,
       now() - (random() * 365)::int * interval '1 day'
FROM b, generate_series(1, 2000) g,
     LATERAL (SELECT (50 + (abs(hashtext('price' || g)) % 95000) / 100.0)::numeric(12,2) AS p) x;  -- tương quan với g để mỗi product một giá

-- mỗi product thuộc 2 category lá
WITH c AS (SELECT array_agg(id) AS ids FROM categories WHERE name LIKE '% / Leaf %')
INSERT INTO product_categories (product_id, category_id)
SELECT DISTINCT p.id, c.ids[1 + floor(random() * cardinality(c.ids))::int]
FROM c, products p, generate_series(1, 2) g;

-- mỗi product 1–4 sku; product có số thứ tự chia hết cho 13 không có sku (để test LEFT JOIN)
INSERT INTO skus (product_id, sku_code, price, stock)
SELECT p.id, 'SKU-' || substr(p.id::text, 1, 8) || '-' || g,
       p.base_price + g * 5, (random() * 50)::int
FROM products p
JOIN LATERAL (SELECT substr(p.name, 9)::int AS n) x ON true
JOIN LATERAL generate_series(1, (x.n % 4) + 1) g ON true
WHERE x.n % 13 <> 0;

-- 50k đơn rải đều cho các customer, 180 ngày gần nhất
WITH u AS (SELECT array_agg(id) AS ids FROM users WHERE role_id = 3)
INSERT INTO orders (user_id, status, created_at)
SELECT u.ids[1 + floor(random() * cardinality(u.ids))::int],
       (ARRAY['pending','paid','shipped','delivered','delivered','delivered','cancelled','returned'])[1 + floor(random() * 8)::int],
       now() - (random() * 180)::int * interval '1 day' - (random() * 86400)::int * interval '1 second'
FROM u, generate_series(1, 50000);

-- mỗi đơn 1–5 dòng, sku chọn theo hash của (đơn, số thứ tự) để mỗi dòng khác nhau
WITH s AS (SELECT array_agg(id) AS ids FROM skus)
INSERT INTO order_items (order_id, sku_id, product_name, unit_price, quantity)
SELECT o.id, sk.id, p.name, sk.price, 1 + floor(random() * 3)::int
FROM s CROSS JOIN orders o
JOIN LATERAL generate_series(1, 1 + abs(hashtext(o.id::text)) % 5) g ON true
JOIN skus sk ON sk.id = s.ids[1 + abs(hashtext(o.id::text || g)) % (cardinality(s.ids) * 9 / 10)]   -- ~10% sku chưa từng bán
JOIN products p ON p.id = sk.product_id;

WITH p AS (SELECT array_agg(id) AS ids FROM products), u AS (SELECT array_agg(id) AS ids FROM users)
INSERT INTO reviews (product_id, user_id, rating, content, created_at)
SELECT p.ids[1 + floor(random() * cardinality(p.ids))::int],
       u.ids[1 + floor(random() * cardinality(u.ids))::int],
       1 + floor(random() * 5)::int, 'Review ' || g, now() - (random() * 200)::int * interval '1 day'
FROM p, u, generate_series(1, 20000) g;

WITH u AS (SELECT array_agg(id) AS ids FROM users)
INSERT INTO messages (from_user_id, to_user_id, content, read_at, created_at)
SELECT a, b, 'Hello ' || g, CASE WHEN g % 2 = 0 THEN now() END, now() - g * interval '1 minute'
FROM u, generate_series(1, 5000) g,
     LATERAL (SELECT u.ids[1 + floor(random() * cardinality(u.ids))::int] AS a,
                     u.ids[1 + floor(random() * cardinality(u.ids))::int] AS b) pick
WHERE a <> b;

-- soft delete một ít để các bài về deleted_at có dữ liệu
UPDATE products SET deleted_at = now() WHERE id IN (SELECT id FROM products ORDER BY random() LIMIT 50);
UPDATE skus     SET deleted_at = now() WHERE id IN (SELECT id FROM skus ORDER BY random() LIMIT 100);
UPDATE users    SET deleted_at = now() WHERE id IN (SELECT id FROM users WHERE role_id = 3 ORDER BY random() LIMIT 100);

ANALYZE;
