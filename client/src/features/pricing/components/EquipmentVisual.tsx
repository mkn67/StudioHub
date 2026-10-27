"use client";
import { useState } from "react";
import { AudioLines, Lightbulb, Boxes } from "lucide-react";
import type { Equipment } from "@/domain/models";
import styles from "../styles/rental.module.css";

export function equipmentImage(image: string) {
  return /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image) || (/^\/images\/equipment\/[\w./-]+$/.test(image) && !image.includes(".."));
}
export function equipmentDescription(item: Equipment) {
  return item.description || (/softbox/i.test(item.name) ? "Phụ kiện tán và làm mềm ánh sáng từ đèn." : item.category === "Ánh sáng" ? "Bổ sung ánh sáng cho buổi chụp hoặc quay." : item.category === "Âm thanh" ? "Thiết bị thu âm; hãy trao đổi với Host về nhu cầu sử dụng." : "Phụ kiện hỗ trợ bố trí thiết bị và không gian làm việc.");
}
export function EquipmentVisual({ item }: { item: Equipment }) {
  const [failedImage, setFailedImage] = useState("");
  const Icon = item.category === "Ánh sáng" ? Lightbulb : item.category === "Âm thanh" ? AudioLines : Boxes;
  return <span className={styles.equipmentVisual}>
    {equipmentImage(item.image) && failedImage !== item.image
      // Local mock uploads stay in browser storage; there is no backend media endpoint.
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={item.image} alt={item.name} onError={() => setFailedImage(item.image)} />
      : <><Icon size={27} aria-hidden="true" /><small>Minh họa</small></>}
  </span>;
}
