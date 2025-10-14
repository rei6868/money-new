# Drizzle Workspace

Thư mục `drizzle/` tập trung toàn bộ nội dung liên quan tới migration, schema và seed dữ liệu khi sử dụng Drizzle ORM.

- `migrations/`: chứa các script migrate được tạo bởi `drizzle-kit`. Không chỉnh sửa trực tiếp ngoài quy trình migrate.
- `schemas/`: đặt các định nghĩa table/schema TypeScript. Mỗi bảng nên tách thành một file riêng để dễ tái sử dụng.
- `seeds/`: chứa các script seed dữ liệu hoặc util hỗ trợ generate dữ liệu mẫu.

## Quick start

```bash
# Tạo migration mới
npx drizzle-kit generate --config drizzle.config.ts

# Áp dụng migration lên DB cục bộ hoặc dev
npx drizzle-kit push --config drizzle.config.ts
```

Xem thêm hướng dẫn chi tiết về workflow migrate tại `drizzle/migrations/README.md` và seed data tại từng script trong `drizzle/seeds/`.
