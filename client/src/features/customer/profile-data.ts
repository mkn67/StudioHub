export function profilePayload(name: string, phone: string, details?: { date_of_birth: string; address: string }) {
  const full_name = name.trim();
  if ([...full_name].length < 2 || [...full_name].length > 100) throw new Error("Họ và tên cần từ 2 đến 100 ký tự.");
  if ([...phone.trim()].length > 20) throw new Error("Số điện thoại tối đa 20 ký tự.");
  if (details) {
    const date = details.date_of_birth;
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date > new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10))) throw new Error("Ngày sinh không hợp lệ hoặc ở tương lai.");
    if ([...details.address.trim()].length > 255) throw new Error("Địa chỉ tối đa 255 ký tự.");
  }
  return { full_name, phone: phone.trim(), ...(details ? { date_of_birth: details.date_of_birth || null, address: details.address.trim() || null } : {}) };
}
export function customerInitials(name: string) {
  return name.trim().split(/\s+/).slice(-2).map(word => [...word][0] ?? "").join("").toLocaleUpperCase("vi-VN") || "SH";
}
