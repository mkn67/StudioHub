export async function compressImage(
  file: File,
  size = 1200,
  square = false,
): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Ảnh phải nhỏ hơn 5 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Không thể đọc ảnh. Chọn ảnh JPG, PNG hoặc WebP hợp lệ.");
  }
  const canvas = document.createElement("canvas");
  const ratio = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
  canvas.width = square ? size : Math.round(bitmap.width * ratio);
  canvas.height = square ? size : Math.round(bitmap.height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Không thể xử lý ảnh.");
  }
  if (square) {
    const side = Math.min(bitmap.width, bitmap.height);
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );
  } else ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.78);
}
