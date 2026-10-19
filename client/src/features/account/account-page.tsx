"use client";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useApp, useMutation } from "@/providers/app-provider";
import { AccessGuard } from "@/features/auth/guard";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field, ErrorSummary } from "@/components/forms/field";
import { PageHeading, Badge, StudioImage } from "@/components/shared/common";
import { compressImage } from "@/lib/images";
import { dateTime } from "@/lib/format";
import { roleHome } from "@/domain/access";
import { useUnsaved } from "@/hooks/use-unsaved";
import { message } from "@/services/service";
const profileSchema = z.object({
  name: z.string().trim().min(2, "Tên cần ít nhất 2 ký tự."),
  phone: z.string().regex(/^(\+84|0)\d{9,10}$/, "Số điện thoại không hợp lệ."),
  avatar: z.string(),
});
function Profile() {
  const { user, db, service } = useApp(),
    mutation = useMutation();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      phone: user?.phone ?? "",
      avatar: user?.avatar ?? "",
    },
  });
  const avatar = useWatch({ control, name: "avatar" }) ?? "";
  useUnsaved(isDirty);
  if (!user) return null;
  const app = db?.applications.find((a) => a.userId === user.id);
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="container account-page narrow"
    >
      <PageHeading
        title="Tài khoản của tôi"
        description="Thông tin liên hệ cho trải nghiệm StudioHub."
      />
      <div className="surface">
        <form
          onSubmit={handleSubmit(async (values) => {
            const r = await mutation(
              () => service.updateProfile(values),
              "Đã lưu thông tin tài khoản.",
            );
            if (r.ok) reset(values);
          })}
          noValidate
        >
          <ErrorSummary
            error={
              error ||
              Object.values(errors)
                .map((e) => e.message)
                .join(" ")
            }
          />
          <div className="profile-avatar">
            <span className="avatar avatar-lg">
              {avatar ? (
                <StudioImage key={avatar} src={avatar} alt="Ảnh đại diện" />
              ) : (
                user.name.slice(0, 1)
              )}
            </span>
            <Field label="Ảnh đại diện" id="profile-avatar">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setValue("avatar", await compressImage(file, 256, true), {
                      shouldDirty: true,
                    });
                    setError(null);
                  } catch (error) {
                    setError(message(error));
                  }
                }}
              />
            </Field>
            {avatar && (
              <Button
                variant="ghost"
                onClick={() => setValue("avatar", "", { shouldDirty: true })}
              >
                Xóa ảnh
              </Button>
            )}
          </div>
          <Field
            label="Họ và tên"
            id="profile-name"
            error={errors.name?.message}
          >
            <Input autoComplete="name" {...register("name")} />
          </Field>
          <Field
            label="Email"
            id="profile-email"
            hint="Email được giữ cố định trong bản demo."
          >
            <Input type="email" value={user.email} readOnly />
          </Field>
          <Field
            label="Số điện thoại"
            id="profile-phone"
            error={errors.phone?.message}
          >
            <Input autoComplete="tel" inputMode="tel" {...register("phone")} />
          </Field>
          <p>
            Vai trò:{" "}
            <Badge>
              {user.role === "customer"
                ? "Khách hàng"
                : user.role === "host"
                  ? "Chủ Studio"
                  : "Quản trị viên"}
            </Badge>
          </p>
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            Lưu thay đổi
          </Button>
        </form>
      </div>
      {app && (
        <section className="surface">
          <h2>Hồ sơ Chủ Studio</h2>
          <h3>{app.studioName}</h3>
          <p>{app.description}</p>
          {user.approvedAt && <p>Đã duyệt: {dateTime(user.approvedAt)}</p>}
          <Button asChild variant="outline">
            <Link href="/host/studio/settings">Quản lý Studio</Link>
          </Button>
        </section>
      )}
    </main>
  );
}
export function AccountPage() {
  return (
    <AccessGuard>
      <Profile />
    </AccessGuard>
  );
}
function StatusContent() {
  const { user, db, service } = useApp(),
    mutation = useMutation();
  const app = db?.applications.find((a) => a.userId === user?.id);
  const [name, setName] = useState(user?.name ?? ""),
    [phone, setPhone] = useState(user?.phone ?? ""),
    [studioName, setStudioName] = useState(app?.studioName ?? ""),
    [description, setDescription] = useState(app?.description ?? ""),
    [busy, setBusy] = useState(false);
  if (!user) return null;
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="container narrow account-page"
    >
      <PageHeading
        title={
          user.locked
            ? "Tài khoản bị khóa"
            : user.approval === "pending"
              ? "Hồ sơ đang chờ duyệt"
              : user.approval === "rejected"
                ? "Hồ sơ cần cập nhật"
                : "Tài khoản đang hoạt động"
        }
      />
      <div className="surface">
        {user.locked ? (
          <>
            <Badge tone="danger">Bị khóa</Badge>
            <h2>Lý do</h2>
            <p>{user.lockReason}</p>
            <p className="muted">
              Các đơn thuê đã tạo vẫn được lưu. Tài khoản chưa thể thực hiện
              thao tác mới.
            </p>
          </>
        ) : app && user.approval !== "approved" ? (
          <>
            <Badge tone="warning">
              {user.approval === "pending" ? "Chờ duyệt" : "Từ chối"}
            </Badge>
            <h2>{app.studioName}</h2>
            <p>{app.description}</p>
            <dl className="definition-list">
              <div>
                <dt>Người đăng ký</dt>
                <dd>{user.name}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Gửi ngày</dt>
                <dd>{dateTime(app.submittedAt)}</dd>
              </div>
            </dl>
            {app.reason && (
              <div className="notice notice-error">{app.reason}</div>
            )}
            {user.approval === "rejected" && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (busy) return;
                  setBusy(true);
                  await mutation(
                    () =>
                      service.resubmitApplication({
                        name,
                        phone,
                        studioName,
                        description,
                      }),
                    "Đã gửi lại hồ sơ.",
                  );
                  setBusy(false);
                }}
              >
                <Field label="Họ và tên" id="resubmit-name">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Số điện thoại" id="resubmit-phone">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Tên Studio đề xuất" id="resubmit-studio">
                  <Input
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    required
                  />
                </Field>
                <Field
                  label="Mô tả Studio"
                  id="resubmit-description"
                  hint={`${description.length}/500 ký tự`}
                >
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    required
                  />
                </Field>
                <Button type="submit" disabled={busy}>
                  Cập nhật và gửi lại
                </Button>
              </form>
            )}
            <h3>Lịch sử hồ sơ</h3>
            <ol className="timeline">
              {app.history.map((event, index) => (
                <li key={index}>
                  <strong>{event.action}</strong>
                  <small>{dateTime(event.at)}</small>
                  {event.reason && <p>{event.reason}</p>}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
            <p>Tài khoản đã sẵn sàng sử dụng.</p>
            <Button asChild>
              <Link href={roleHome(user)}>Vào khu vực của tôi</Link>
            </Button>
          </>
        )}
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => service.logout()}
        >
          Đăng xuất
        </Button>
      </div>
    </main>
  );
}
export function AccountStatusPage() {
  return (
    <AccessGuard>
      <StatusContent />
    </AccessGuard>
  );
}
