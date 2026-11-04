export function profilePayload(name: string, phone: string) {
  const full_name = name.trim();
  if ([...full_name].length < 2 || [...full_name].length > 100) throw new Error("Họ và tên cần từ 2 đến 100 ký tự.");
  if ([...phone.trim()].length > 20) throw new Error("Số điện thoại tối đa 20 ký tự.");
  return { full_name, phone: phone.trim() };
}
export function customerInitials(name: string) {
  return name.trim().split(/\s+/).slice(-2).map(word => [...word][0] ?? "").join("").toLocaleUpperCase("vi-VN") || "SH";
}
