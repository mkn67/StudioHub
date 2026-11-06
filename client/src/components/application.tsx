"use client";
import { Presence, PublicTransition, MotionSurface } from "./motion/system";
import { Suspense, useState } from "react";
import Link from "./motion/navigation-link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Menu, X, ArrowRight } from "lucide-react";
import { useSession, useStore, DemoTools } from "./store";
import { Home, SearchRooms, RoomDetail } from "./marketplace";
import { Auth, Profile, Support } from "./accounts";
import { CustomerBookings, Payment, BookingDetail } from "./bookings";
import { Operations } from "./operations";
import { Empty, Modal } from "./ui";
import { backendEnabled } from "@/services/api/client";
import { useApiSession } from "./api-session";
import { ApiAuth, ApiProfile } from "./api-accounts";
import { ApiMessage, Unavailable } from "./api-ui";
import { BackendSearchResults, BackendRoomDetail } from "@/features/marketplace/backend-pages";
import { BackendBookingWizard, BackendBookings, BackendBookingDetail } from "@/features/booking/backend-booking";
import { BackendOperations } from "@/features/host/backend-host";
import { CustomerAccountMenu } from "@/features/customer/account-menu";
import { demoMode } from "@/data/api";
export default function Application() {
  const apiSession = useApiSession();
  const demoUser = useSession();
  const path = usePathname(),
    segments = path.split("/").filter(Boolean),
    router = useRouter(),
    user = backendEnabled ? (apiSession.user ? { name: apiSession.user.full_name, id: String(apiSession.user.user_id), role: apiSession.user.role } : undefined) : demoUser,
    { ready, dispatch } = useStore();
  const [menu, setMenu] = useState(false);
  const accountHref = backendEnabled && (user?.role === "host" || user?.role === "admin") ? `/${user.role}/settings` : "/profile";
  const ops = segments[0] === "host" || segments[0] === "admin";
  const hero = path === "/";
  let content;
  if (!segments.length) content = <Home />;
  else if (segments[0] === "rooms")
    content = segments[1] ? (
      <RoomDetail key={segments[1]} id={segments[1]} />
    ) : (
      <SearchRooms key={path} />
    );
  else if (segments[0] === "my-bookings")
    content =
      segments[1] && segments[1] !== "history" ? (
        <div className="container account-page">
          <BookingDetail id={segments[1]} />
        </div>
      ) : (
        <CustomerBookings history={segments[1] === "history"} />
      );
  else if (segments[0] === "payment")
    content = (
      <Payment id={segments[1] ?? ""} result={segments[2] === "result"} />
    );
  else if (segments[0] === "login" || segments[0] === "register")
    content = (
      <Auth
        register={segments[0] === "register"}
        host={segments[1] === "host"}
      />
    );
  else if (segments[0] === "profile")
    content = <Profile key={user?.id ?? "guest"} />;
  else if (ops)
    content = (
      <Operations
        role={segments[0] as "host" | "admin"}
        segments={segments.slice(1)}
      />
    );
  else if (segments[0] === "support") content = <Support />;
  else if (segments[0] === "support-info")
    content = (
      <div className="container account-page">
        <h1>Hỗ trợ đặt thuê</h1>
        <p>Đây là môi trường demo, chưa có kênh hỗ trợ trực tuyến.</p>
        <p>
          Để minh họa việc khôi phục tài khoản, đăng nhập tài khoản Admin và mở
          Tài khoản. Admin phải nhập lý do, lịch sử vi phạm vẫn được giữ.
        </p>
        <Link className="btn secondary" href="/profile">
          Quay lại hồ sơ
        </Link>
      </div>
    );
  else
    content = (
      <Empty
        title="Trang này không tồn tại"
        text="Quay về marketplace để tìm không gian của bạn."
        href="/rooms"
      />
    );
  if (backendEnabled) {
    if (!segments.length) content = <Home />;
    else if (segments[0] === "rooms" && !segments[1]) content = <BackendSearchResults key={path} />;
    else if (segments[0] === "rooms") content = segments[2] === "book" ? <BackendBookingWizard key={segments[1]} id={segments[1]} /> : <BackendRoomDetail key={segments[1]} id={segments[1]} />;
    else if (["login", "register"].includes(segments[0])) content = <ApiAuth key={path} register={segments[0] === "register"} host={segments[1] === "host"} />;
    else if (segments[0] === "profile") content = <ApiProfile key={user?.id ?? "guest"} />;
    else if (ops) content = <BackendOperations key={user?.id ?? "guest"} role={segments[0] as "host" | "admin"} segments={segments.slice(1)} />;
    else if (["my-bookings", "payment"].includes(segments[0])) content = <div className="container account-page">{!apiSession.ready ? <ApiMessage loading /> : apiSession.user?.role !== "customer" ? <Empty title="Đơn thuê của khách hàng" text="Đăng nhập bằng tài khoản khách hàng để tiếp tục." href="/login" label="Đăng nhập" /> : segments[1] && segments[1] !== "history" ? <BackendBookingDetail key={`${user?.id}:${segments[1]}`} id={segments[1]} payment={segments[0] === "payment"} /> : <BackendBookings key={`${user?.id}:${segments[1] === "history" ? "history" : "current"}`} history={segments[1] === "history"} />}</div>;
    else if (segments[0] === "checkout") content = <div className="container account-page checkout-guide"><p className="booking-eyebrow">Đặt thuê studio</p><h1>Chọn phòng và lịch trước khi thanh toán</h1><p>StudioHub kiểm tra lịch và báo giá trong trang đặt thuê của từng phòng. Sau khi tạo đơn, bạn sẽ đến trang thanh toán sandbox.</p><div className="actions"><Link className="btn" href="/rooms">Khám phá phòng</Link>{apiSession.user?.role === "customer" && <Link className="btn secondary" href="/my-bookings">Xem đơn của tôi</Link>}</div></div>;
    else content = <div className="container account-page"><Unavailable>Trang này chưa có luồng tương ứng trong API hiện tại. Vui lòng quay lại danh sách phòng hoặc đơn thuê.</Unavailable></div>;
  }
  return (
    <>
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      {!ops && <header className={`site-header ${hero ? "over-hero" : ""}`}>
        <Link className="brand" href="/">
          StudioHub<span>®</span>
        </Link>
        <nav className="public-nav" aria-label="Điều hướng chính">
          <Link
            href="/rooms"
            className={segments[0] === "rooms" ? "active" : ""}
            aria-current={segments[0] === "rooms" ? "page" : undefined}
          >
            Khám phá Studio
          </Link>
          <Link
            href="/my-bookings"
            className={segments[0] === "my-bookings" ? "active" : ""}
            aria-current={segments[0] === "my-bookings" ? "page" : undefined}
          >
            Đơn của tôi
          </Link>
          {user?.role === "host" ? (
            <Link href="/host">
              Quản lý Studio
              <ArrowUpRight size={13} />
            </Link>
          ) : user?.role === "admin" ? (
            <Link href="/admin">
              Quản trị
              <ArrowUpRight size={13} />
            </Link>
          ) : null}
        </nav>
        <div className="header-end">
          {backendEnabled && apiSession.ready && apiSession.user?.role === "customer" ? <CustomerAccountMenu/> : user ? (
            <>
              <Link className="account-link" href={accountHref}>
                {user.name.split(" ").at(-1)}
              </Link>
              <button
                className="text-button logout"
                onClick={async () => {
                  if (backendEnabled) await apiSession.logout();
                  else await dispatch({ type: "login", userId: null });
                  router.push("/");
                }}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <Link className="nav-login" href="/login">
              Đăng nhập
              <ArrowUpRight size={15} />
            </Link>
          )}
          <button
            className="icon-button menu-button"
            aria-label={menu ? "Đóng điều hướng" : "Mở điều hướng"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>}
      {backendEnabled && !ops && apiSession.error && <div className="container"><ApiMessage error={apiSession.error} /></div>}
      <Presence>{menu && !ops && (
        <Modal title="Điều hướng StudioHub" onClose={() => setMenu(false)} className="navigation-drawer">
        <nav
          className="mobile-nav"
          aria-label="Điều hướng di động"
          onClick={() => setMenu(false)}
        >
          <Link href="/rooms" aria-current={segments[0] === "rooms" ? "page" : undefined}>Khám phá Studio</Link>
          <Link href="/my-bookings" aria-current={segments[0] === "my-bookings" ? "page" : undefined}>Đơn của tôi</Link>
          {!ops && user?.role === "host" && <Link href="/host">Quản lý Studio</Link>}
          {!ops && user?.role === "admin" && <Link href="/admin">Quản trị</Link>}
          {!(backendEnabled && user?.role === "customer") && <Link href={user ? accountHref : "/login"}>
            {user ? "Hồ sơ" : "Đăng nhập"}
          </Link>}
        </nav>
        </Modal>
      )}</Presence>
      <Suspense
        fallback={
          <div className="loading" role="status">
            Đang chuẩn bị không gian…
          </div>
        }
      >
        {ready ? (
          ops ? (
            content
          ) : (
            <PublicTransition><main id="main-content" tabIndex={-1}><MotionSurface>{content}</MotionSurface></main></PublicTransition>
          )
        ) : (
          <div className="loading" role="status">
            Đang chuẩn bị không gian…
          </div>
        )}
      </Suspense>
      {!ops && !["login", "register"].includes(segments[0]) && (
        <footer>
          <div className="footer-top container">
            <Link className="brand" href="/">
              StudioHub<span>®</span>
            </Link>
            <p>
              Không gian cho những điều
              <br />
              chưa từng được tạo ra.
            </p>
            <address className="footer-agency-address">StudioHub · 123 Đường Lê Văn Việt<br/>Quận 9, TP. Hồ Chí Minh · Địa chỉ minh họa</address>
            <div>
              <Link href="/rooms">
                Khám phá Studio
                <ArrowRight size={14} />
              </Link>
              <Link href="/register/host">
                Trở thành đối tác
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
          <div className="footer-bottom container">
            <span>© 2026 StudioHub</span>
            <span>
              {backendEnabled ? "Kết nối API · Thanh toán sandbox, không chuyển tiền thật" : demoMode ? "Môi trường demo · Dữ liệu minh họa · Không thanh toán thật" : "StudioHub · Đặt thuê không gian sáng tạo"}
            </span>
          </div>
        </footer>
      )}
      <DemoTools />
    </>
  );
}
