# Deploy StudioHub staging lên VPS bằng Podman

## Luồng deploy

Push vào `main` chỉ phát hành sau khi bốn job CI đều đạt. Job Container Images build ba image production và đẩy lên GHCR theo commit SHA. Job Deploy Staging dùng SSH để gửi Compose/Caddy config, đăng nhập GHCR trên VPS, kéo đúng SHA, chạy migration SQL bổ sung và khởi động lại service. Cuối cùng workflow gọi HTTPS frontend/API để xác nhận staging hoạt động.

Deploy chỉ chạy khi các GitHub repository variables bên dưới đã khai báo. Nếu chưa có VPS/domain, job deploy được bỏ qua; CI và build image PR vẫn chạy bình thường. Không có deploy production.

## Chuẩn bị VPS

- Ubuntu/Debian có Podman, `podman-compose`, OpenSSH server và `curl`.
- Deploy user riêng, rootless Podman, được phép chạy `podman-compose` và tạo thư mục `/opt/studiohub`.
- Bật linger cho user deploy để container tiếp tục chạy sau khi SSH logout.
- DNS `STAGING_FRONTEND_HOST` và `STAGING_API_HOST` cùng trỏ về VPS. Mở TCP 80/443 và UDP 443 để Caddy lấy/gia hạn TLS.
- Nếu Podman chạy rootless, cấu hình máy để container Caddy được bind cổng 80/443 hoặc dùng reverse proxy host đã có. Database không được mở cổng ra Internet.
- Tạo deploy-only SSH key, thêm public key cho deploy user, giữ private key trong GitHub Environment secret. Ghim host key SSH đã xác minh vào `STAGING_KNOWN_HOSTS`.
- Tạo GitHub PAT chỉ có quyền `read:packages` cho VPS pull các GHCR package private. Không dùng PAT này để publish; GitHub Actions dùng `GITHUB_TOKEN` riêng.

## GitHub repository variables

Vào **Settings → Secrets and variables → Actions → Variables**. Các giá trị URL/domain phải là HTTPS và không có dấu `/` cuối.

| Variable | Ví dụ / mặc định |
|---|---|
| `STAGING_HOST` | IP hoặc hostname SSH của VPS |
| `STAGING_USER` | `studiohub-deploy` |
| `STAGING_SSH_PORT` | `22` |
| `STAGING_DEPLOY_PATH` | `/opt/studiohub` |
| `STAGING_GHCR_USER` | GitHub username có quyền pull package |
| `STAGING_FRONTEND_HOST` | `studio.example.com` |
| `STAGING_API_HOST` | `api.studio.example.com` |
| `STAGING_FRONTEND_ORIGIN` | `https://studio.example.com` |
| `STAGING_API_URL` | `https://api.studio.example.com` |
| `STAGING_DB_NAME` | `studiohub` |
| `STAGING_DB_USER` | `studiohub` |

`STAGING_API_URL` phải là repository variable vì job build frontend đọc giá trị này trước khi chọn GitHub Environment. Đây là URL công khai, không phải secret.

## GitHub Environment secrets

Tạo Environment tên `staging` trong **Settings → Environments**, rồi thêm:

| Secret | Nội dung |
|---|---|
| `STAGING_SSH_KEY` | Private key deploy-only của VPS |
| `STAGING_KNOWN_HOSTS` | Dòng host key SSH đã xác minh; với port khác 22 dùng dạng `[host]:port` |
| `STAGING_REGISTRY_TOKEN` | GitHub PAT chỉ có `read:packages` |
| `STAGING_DB_PASSWORD` | Password riêng của user MySQL ứng dụng |
| `STAGING_DB_ROOT_PASSWORD` | Password riêng của MySQL root |
| `STAGING_JWT_SECRET` | Secret ngẫu nhiên dài tối thiểu 32 ký tự |
| `STAGING_HELPDESK_BRIDGE_SECRET` | Secret bridge riêng, tối thiểu 32 ký tự |

Tạo các secret dạng hex để có thể đặt an toàn trong file Compose `.env`, ví dụ `openssl rand -hex 32`. Không gửi private key hay secret vào chat, issue, commit hoặc log.

## Lần deploy đầu tiên

Sau khi variables/secrets, DNS, firewall và VPS sẵn sàng, push commit đã qua CI lên `main`. Workflow sẽ build/publish ba image, chạy Compose và bootstrap schema khi DB còn rỗng. `APP_ENV=production` bỏ qua tài khoản và dữ liệu mẫu; các role cần thiết vẫn được khởi tạo. Những lần sau, `db-init` không seed hoặc reset DB; `db-upgrade` chỉ chạy các migration SQL chưa có.

Tạo tài khoản qua trang đăng ký trước. Để cấp quyền Admin ban đầu, đăng nhập MySQL trên VPS và nâng role cho đúng email đã đăng ký bằng câu lệnh kiểm tra email cụ thể; không đưa tài khoản Admin/mật khẩu mặc định vào seed.

Caddy phục vụ hai host đã cấu hình. Frontend dùng `STAGING_API_URL` được nhúng lúc build; đổi domain API cần build/publish image mới. Dữ liệu MySQL, uploads, tài liệu riêng, Helpdesk SQLite và chứng chỉ Caddy nằm trong named volumes.

## Migration và rollback

Staging chạy migration SQL additive tự động trước khi API start. Migration DDL không đảm bảo rollback transaction, vì vậy không dùng tự động hóa staging này làm production deployment. Với production cần backup/restore đã diễn tập, phê duyệt migration, GitHub Environment riêng và kiểm tra tương thích schema trước khi release.

Các image được tag theo SHA. Nếu cần khôi phục staging thủ công, đặt `IMAGE_TAG` trong `/opt/studiohub/.env` về SHA trước đó rồi chạy:

```sh
podman-compose -f docker-compose.staging.yml pull
podman-compose -f docker-compose.staging.yml up -d
```

Rollback ứng dụng không hoàn tác migration; chỉ dùng khi schema vẫn tương thích. Workflow hiện không tự khôi phục khi health check thất bại, nên người phụ trách phải kiểm tra log và chọn rollback hoặc forward fix.
