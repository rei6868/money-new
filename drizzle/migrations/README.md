# Drizzle Migration Workflow

1. **Prepare schema changes**: cập nhật các file trong `drizzle/schemas/` tương ứng với bảng cần thay đổi.
2. **Generate migration**: chạy `npx drizzle-kit generate --config drizzle.config.ts` để Drizzle so sánh schema và tạo file SQL trong thư mục `migrations/`.
3. **Review migration**: kiểm tra nội dung file SQL mới sinh ra, đảm bảo đặt tên file rõ ràng và đúng thứ tự thời gian.
4. **Apply migration**: sử dụng `npx drizzle-kit push --config drizzle.config.ts` hoặc script CI/CD tương ứng để deploy lên môi trường mong muốn.
5. **Rollback nếu cần**: chạy `npx drizzle-kit drop --config drizzle.config.ts --dry-run` để kiểm tra, sau đó áp dụng lệnh rollback phù hợp với môi trường (ví dụ `drizzle-kit down` khi hỗ trợ).

### CI/CD

- Thêm bước `drizzle-kit generate` vào pipeline để xác minh không còn migration chưa commit.
- Sử dụng `drizzle-kit push` trong pipeline deploy để đảm bảo schema đồng bộ trước khi khởi động ứng dụng.
- Lưu ý rằng mọi migration đã deploy phải được giữ nguyên lịch sử để tránh xung đột giữa các môi trường.
