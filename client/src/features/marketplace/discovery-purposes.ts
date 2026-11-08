/** Curated customer intents. Resolve names against the live catalog; never pin numeric IDs here. */
export const discoveryPurposes = [
  { id: "product-photo", label: "Chụp ảnh sản phẩm", detail: "Phông nền và ánh sáng dễ kiểm soát", typeNames: ["Cyclorama Studio"] },
  { id: "podcast", label: "Ghi podcast", detail: "Micro và không gian trò chuyện", typeNames: ["Podcast & Livestream Hub"] },
  { id: "music-recording", label: "Thu âm nhạc", detail: "Booth và thiết bị thu âm", typeNames: ["Music Recording Studio"] },
  { id: "workshop", label: "Workshop & sự kiện", detail: "Không gian linh hoạt theo quy mô", typeNames: ["Workshop & Event Studio"] },
  { id: "live-commerce", label: "Livestream bán hàng", detail: "Khu trưng bày và thiết bị phát sóng", typeNames: ["Livestream & E-commerce"] },
] as const;

export function typesForPurpose<T extends { name: string }>(types: T[], typeNames: readonly string[]) {
  return typeNames.flatMap(name => {
    const type = types.find(item => item.name === name);
    return type ? [type] : [];
  });
}
