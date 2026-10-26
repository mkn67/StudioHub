"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useStore, useSession } from "./store";
import { Empty, PageHeading } from "./ui";
export function Auth({
  register = false,
  host = false,
}: {
  register?: boolean;
  host?: boolean;
}) {
  const { state, dispatch, notice } = useStore(),
    router = useRouter(),
    user = useSession();
  const [persona, setPersona] = useState("customer"),
    [step, setStep] = useState(1),
    [name, setName] = useState(""),
    [address, setAddress] = useState(""),
    [description, setDescription] = useState(""),
    [signupName, setSignupName] = useState(""),
    [signupEmail, setSignupEmail] = useState(""),
    [signupPhone, setSignupPhone] = useState("");
  return (
    <div className="auth-page">
      <Image width={1400} height={1000} src="/images/daylight.jpg" alt="" />
      <div className="auth-panel">
        <Link className="brand" href="/">
          StudioHub<span>®</span>
        </Link>
        <h1>
          {host
            ? "Đưa không gian của bạn lên StudioHub."
            : register
              ? "Bắt đầu hành trình sáng tạo."
              : "Chào mừng trở lại."}
        </h1>
        <p className="muted">
          {host
            ? `Bước ${step}/3 · Hồ sơ đối tác`
            : "Chọn tài khoản để khám phá bản mô phỏng."}
        </p>
        {host ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (step < 3) {
                setStep(step + 1);
                return;
              }
              if (!user) {
                notice("Đăng nhập tài khoản khách trước khi gửi hồ sơ.");
                return;
              }
              const s = dispatch({
                type: "application",
                studioName: name,
                address,
                description,
              });
              if (s) {
                notice("Đã gửi hồ sơ. Bạn có thể theo dõi tại trang hồ sơ.");
                router.push("/profile");
              }
            }}
          >
            {step === 1 && (
              <>
                <label>
                  Tài khoản liên hệ
                  <select
                    value={state.sessionId ?? ""}
                    onChange={(e) =>
                      dispatch({
                        type: "login",
                        userId: e.target.value || null,
                      })
                    }
                    required
                  >
                    <option value="">Chọn tài khoản</option>
                    {state.users
                      .filter((u) => u.role === "customer")
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} · {u.email}
                        </option>
                      ))}
                  </select>
                </label>
                <p className="small-text muted">
                  Thông tin liên hệ lấy từ hồ sơ khách. Đây là đăng ký đối tác
                  trong môi trường mô phỏng.
                </p>
              </>
            )}
            {step === 2 && (
              <>
                <label>
                  Tên Studio
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  Địa chỉ
                  <input
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </label>
                <label>
                  Giới thiệu
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>
              </>
            )}
            {step === 3 && (
              <div className="note">
                <h3>{name}</h3>
                <p>{address}</p>
                <p>{description}</p>
                <p>
                  Hồ sơ sẽ được Admin xét duyệt trước khi bạn mở nhận đặt thuê.
                </p>
              </div>
            )}
            <div className="actions">
              {step > 1 && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setStep(step - 1)}
                >
                  Quay lại
                </button>
              )}
              <button className="btn" type="submit">
                {step === 3 ? "Gửi hồ sơ" : "Tiếp tục"}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        ) : register ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                dispatch({
                  type: "register",
                  name: signupName,
                  email: signupEmail,
                  phone: signupPhone,
                })
              ) {
                notice("Đã tạo tài khoản mô phỏng.");
                router.push("/profile");
              }
            }}
          >
            <label>
              Họ tên
              <input
                required
                autoComplete="name"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />
            </label>
            <label>
              Số điện thoại
              <input
                required
                type="tel"
                pattern="0[0-9]{9}"
                autoComplete="tel"
                value={signupPhone}
                onChange={(e) => setSignupPhone(e.target.value)}
              />
            </label>
            <p className="small-text muted">
              Tài khoản chỉ được lưu trong trình duyệt để mô phỏng. Không nhập
              mật khẩu hoặc thông tin nhạy cảm.
            </p>
            <button className="btn full">
              Tạo tài khoản mô phỏng
              <ArrowRight size={17} />
            </button>
            <p className="small-text" style={{ marginTop: 20 }}>
              Đã có tài khoản?{" "}
              <Link className="text-link" href="/login">
                Đăng nhập
              </Link>
            </p>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (dispatch({ type: "login", userId: persona })) {
                const u = state.users.find((u) => u.id === persona)!;
                router.push(
                  u.role === "host"
                    ? "/host"
                    : u.role === "admin"
                      ? "/admin"
                      : "/my-bookings",
                );
              }
            }}
          >
            <label>
              Tài khoản minh họa
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
              >
                {state.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.role}
                  </option>
                ))}
              </select>
            </label>
            <div className="note">
              <strong>Xác thực mô phỏng</strong>
              <p>
                Không nhập mật khẩu thật. Các tài khoản mẫu cho phép bạn trải
                nghiệm từng vai trò trong cùng bộ dữ liệu.
              </p>
            </div>
            <button className="btn full" type="submit">
              Đăng nhập bản demo
              <ArrowRight size={17} />
            </button>
            <p className="small-text">
              {register ? "Bạn đã có tài khoản?" : "Bạn là chủ Studio?"}{" "}
              <Link
                className="text-link"
                href={register ? "/login" : "/register/host"}
              >
                {register ? "Đăng nhập" : "Đăng ký đối tác"}
              </Link>
            </p>
            <Link className="text-link" href="/register">
              Tạo tài khoản khách hàng
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
export function Profile() {
  const { state, dispatch, notice } = useStore(),
    user = useSession();
  const [name, setName] = useState(user?.name ?? ""),
    [phone, setPhone] = useState(user?.phone ?? "");
  if (!user)
    return (
      <Empty
        title="Đăng nhập để xem hồ sơ"
        text="Thông tin và các đơn đã đặt được lưu theo tài khoản minh họa."
        href="/login"
        label="Đăng nhập"
      />
    );
  return (
    <div className="container account-page">
      <PageHeading
        title="Hồ sơ của bạn"
        description="Thông tin liên hệ và trạng thái tài khoản."
      />
      <div className="profile-grid">
        <aside>
          <strong>Thông tin cá nhân</strong>
          <Link href="/my-bookings">Đơn của tôi</Link>
          <Link href="/register/host">Đăng ký đối tác</Link>
          <span className="small-text muted">Vai trò: {user.role}</span>
        </aside>
        <div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                dispatch({
                  type: "profile",
                  name: name || user.name,
                  phone: phone || user.phone,
                })
              )
                notice("Đã lưu thông tin.");
            }}
          >
            <label>
              Họ tên
              <input
                required
                value={name || user.name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Email
              <input type="email" disabled value={user.email} />
            </label>
            <label>
              Số điện thoại
              <input
                required
                pattern="0[0-9]{9}"
                value={phone || user.phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <button className="btn">Lưu thông tin</button>
          </form>
          <section className="detail-section">
            <h2>Quyền đặt thuê</h2>
            <p>
              {user.restricted
                ? "Đang tạm ngưng tạo đơn và đổi lịch. Bạn vẫn sử dụng các đơn đã xác nhận."
                : "Tài khoản có thể tạo đơn và yêu cầu đổi lịch hợp lệ."}
            </p>
            <p className="mono">
              {user.strikes.filter((s) => s.active).length}/3 vi phạm hiệu lực
            </p>
            {user.restricted && (
              <Link className="text-link" href="/support">
                Gửi yêu cầu hỗ trợ
              </Link>
            )}
          </section>
          <section className="detail-section">
            <h2>Thông báo</h2>
            {state.notifications
              .filter((n) => n.userId === user.id)
              .slice(-10)
              .reverse()
              .map((n, i) => (
                <p key={i}>{n.text}</p>
              ))}
            {!state.notifications.some((n) => n.userId === user.id) && (
              <p className="muted">Chưa có thông báo mới.</p>
            )}
          </section>
          {state.applications
            .filter((a) => a.userId === user.id)
            .map((a) => (
              <div className="note" key={a.id}>
                <strong>Hồ sơ {a.studioName}</strong>
                <p>
                  {a.status === "pending"
                    ? "Đang chờ xét duyệt"
                    : a.status === "approved"
                      ? "Đã được duyệt"
                      : "Bị từ chối: " + a.reason}
                </p>
                {a.status === "approved" && (
                  <Link className="btn" href="/host/studios">
                    Thiết lập Studio
                  </Link>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
export function Support() {
  const { state, dispatch, notice } = useStore(),
    user = useSession();
  const [reason, setReason] = useState("");
  if (!user)
    return (
      <Empty
        title="Đăng nhập để gửi yêu cầu"
        text="Yêu cầu mở lại quyền đặt thuê được gắn với tài khoản của bạn."
        href="/login"
        label="Đăng nhập"
      />
    );
  return (
    <div className="container account-page">
      <PageHeading
        title="Hỗ trợ tài khoản"
        description="Admin xét duyệt thủ công yêu cầu khôi phục quyền đặt thuê."
      />
      {user.restricted ? (
        <form
          className="policy-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (dispatch({ type: "request_restore", reason })) {
              setReason("");
              notice("Đã gửi yêu cầu đến Admin.");
            }
          }}
        >
          <label>
            Lý do đề nghị khôi phục
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button className="btn">Gửi yêu cầu xét duyệt</button>
        </form>
      ) : (
        <p>
          Quyền đặt thuê của bạn đang hoạt động. Đây là bản mô phỏng, chưa có
          kênh hỗ trợ khách hàng trực tuyến.
        </p>
      )}
      {state.supportRequests
        ?.filter((r) => r.userId === user.id)
        .map((r) => (
          <div className="note" key={r.id}>
            <strong>
              {r.status === "pending" ? "Đang chờ xét duyệt" : "Đã được xử lý"}
            </strong>
            <p>{r.reason}</p>
          </div>
        ))}
      <Link className="text-link" href="/profile">
        Quay lại hồ sơ
      </Link>
    </div>
  );
}
