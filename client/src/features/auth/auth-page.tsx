"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { useApp } from "@/providers/app-provider";
import { roleHome, resolveAccess, safeReturnUrl } from "@/domain/access";
import { demoPassword } from "@/services/seed/data";
import { message } from "@/services/service";
import { Logo } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field, ErrorSummary } from "@/components/forms/field";
import { Badge } from "@/components/shared/common";
export function AuthPage({ mode }: { mode: "login" | "customer" | "host" }) {
  const { service, db, user } = useApp(),
    router = useRouter(),
    params = useSearchParams();
  const [show, setShow] = useState(false),
    [error, setError] = useState<string | null>(null);
  const schema = z.object({
    email: z.email("Email không hợp lệ."),
    password: z
      .string()
      .min(
        mode === "login" ? 1 : 8,
        mode === "login" ? "Điền mật khẩu." : "Mật khẩu cần ít nhất 8 ký tự.",
      ),
    name:
      mode === "login"
        ? z.string()
        : z.string().trim().min(2, "Điền họ và tên."),
    phone:
      mode === "login"
        ? z.string()
        : z.string().regex(/^(\+84|0)\d{9,10}$/, "Số điện thoại không hợp lệ."),
    studioName:
      mode === "host"
        ? z.string().trim().min(2, "Điền tên studio đề xuất.")
        : z.string(),
    description:
      mode === "host"
        ? z
            .string()
            .trim()
            .min(10, "Mô tả cần ít nhất 10 ký tự.")
            .max(500, "Tối đa 500 ký tự.")
        : z.string(),
  });
  type Values = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    setValue,
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      phone: "",
      studioName: "",
      description: "",
    },
  });
  const description = useWatch({ control, name: "description" }) ?? "";
  function destination(account: NonNullable<typeof user>) {
    const target = safeReturnUrl(params.get("returnTo"));
    if (account.role !== "customer" && target?.startsWith("/booking"))
      return roleHome(account);
    return target && resolveAccess(account, target.split("?")[0]) === "allowed"
      ? target
      : roleHome(account);
  }
  async function submit(values: Values) {
    setError(null);
    try {
      if (mode === "login") {
        const account = await service.login(values.email, values.password);
        router.push(destination(account));
      } else {
        const account = await service.register({ ...values, role: mode });
        router.push(mode === "host" ? "/account/status" : destination(account));
      }
    } catch (e) {
      setError(message(e));
    }
  }
  const title =
    mode === "login"
      ? "Đăng nhập"
      : mode === "host"
        ? "Đăng ký Chủ Studio"
        : "Tạo tài khoản";
  return (
    <main id="main-content" tabIndex={-1} className="auth-page">
      <Logo />
      <div className="auth-panel">
        <h1>{title}</h1>
        <p className="muted">
          {mode === "login"
            ? "Đăng nhập để tiếp tục công việc của bạn."
            : "Dùng mật khẩu mẫu. Không sử dụng mật khẩu thật trong bản demo."}
        </p>
        {user && (
          <div className="notice">
            Bạn đang đăng nhập bằng {user.email}.{" "}
            <Link href={roleHome(user)}>Về khu vực của tôi</Link>
            <Button variant="ghost" onClick={() => service.logout()}>
              Đăng xuất
            </Button>
          </div>
        )}
        <form onSubmit={handleSubmit(submit)} noValidate>
          <ErrorSummary
            error={
              error ||
              (Object.keys(errors).length
                ? "Kiểm tra các trường được đánh dấu bên dưới."
                : null)
            }
          />
          {mode !== "login" && (
            <>
              <Field
                label="Họ và tên"
                id="auth-name"
                error={errors.name?.message}
              >
                <Input autoComplete="name" {...register("name")} />
              </Field>
            </>
          )}
          <Field label="Email" id="auth-email" error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...register("email")} />
          </Field>
          {mode !== "login" && (
            <Field
              label="Số điện thoại"
              id="auth-phone"
              error={errors.phone?.message}
            >
              <Input
                inputMode="tel"
                autoComplete="tel"
                {...register("phone")}
              />
            </Field>
          )}
          <Field
            label="Mật khẩu"
            id="auth-password"
            error={errors.password?.message}
          >
            <div className="password-field">
              <Input
                id="auth-password"
                type={show ? "text" : "password"}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                aria-describedby={
                  errors.password ? "auth-password-error" : undefined
                }
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          {mode === "host" && (
            <fieldset className="form-section">
              <legend>Studio đề xuất</legend>
              <Field
                label="Tên Studio"
                id="auth-studio"
                error={errors.studioName?.message}
              >
                <Input {...register("studioName")} />
              </Field>
              <Field
                label="Mô tả ngắn"
                id="auth-description"
                error={errors.description?.message}
                hint={`${description.length}/500 ký tự`}
              >
                <Textarea maxLength={500} {...register("description")} />
              </Field>
            </fieldset>
          )}
          <Button type="submit" className="full-width" disabled={isSubmitting}>
            {isSubmitting ? "Đang xử lý…" : title}
          </Button>
        </form>
        <p className="auth-cross-link">
          {mode === "login" ? (
            <>
              Chưa có tài khoản?{" "}
              <Link
                href={`/register${params.get("returnTo") ? `?returnTo=${encodeURIComponent(params.get("returnTo")!)}` : ""}`}
              >
                Đăng ký
              </Link>
            </>
          ) : (
            <>
              Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
            </>
          )}
        </p>
        <Link
          className="text-link"
          href={mode === "host" ? "/register" : "/register/host"}
        >
          {mode === "host"
            ? "Đăng ký tài khoản khách hàng"
            : "Đăng ký cho Chủ Studio"}
        </Link>
      </div>
      {mode === "login" && process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
        <section className="demo-accounts">
          <h2>Tài khoản demo</h2>
          <p>
            Mật khẩu mẫu: <code>{demoPassword}</code>. Chọn tài khoản để điền
            thông tin, sau đó đăng nhập.
          </p>
          <div>
            {db?.users
              .filter((u) => u.demo)
              .map((account) => (
                <button
                  className="demo-persona"
                  key={account.id}
                  type="button"
                  onClick={() => {
                    setValue("email", account.email);
                    setValue("password", demoPassword);
                  }}
                >
                  <span>
                    <strong>
                      {account.role === "customer"
                        ? "Khách hàng"
                        : account.role === "host"
                          ? "Chủ Studio"
                          : "Quản trị viên"}
                    </strong>
                    <small>{account.email}</small>
                  </span>
                  <Badge
                    tone={
                      account.locked
                        ? "danger"
                        : account.approval === "approved"
                          ? "success"
                          : "warning"
                    }
                  >
                    {account.locked
                      ? "Bị khóa"
                      : account.approval === "pending"
                        ? "Chờ duyệt"
                        : account.approval === "rejected"
                          ? "Từ chối"
                          : "Hoạt động"}
                  </Badge>
                </button>
              ))}
          </div>
        </section>
      )}
    </main>
  );
}
