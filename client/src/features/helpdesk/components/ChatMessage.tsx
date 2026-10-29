import Link from "next/link";
import { safeHelpdeskHref, type HelpdeskMessage } from "../types/helpdesk.types";
import styles from "../styles/helpdesk.module.css";

export function ChatMessage({ message, confirmTicket, pending = false }: { message: HelpdeskMessage; confirmTicket?: (id: string) => Promise<void>; pending?: boolean }) {
  const response = message.response;
  return <article className={`${styles.message} ${message.role === "user" ? styles.userMessage : styles.assistantMessage}`}>
    <span className={styles.speaker}>{message.role === "user" ? "Bạn" : response?.operatorMessage ? "Nhân viên hỗ trợ" : "StudioHub AI"}</span>
    <p>{message.text}</p>
    {response?.ticketProposal && <div className={styles.card}>
      <strong>Xem lại trước khi gửi</strong>
      <p>{response.ticketProposal.description}</p>
      <small>Đích đề xuất: {response.ticketProposal.suggestedDestination === "relevant_host_unverified" ? "Host liên quan, chưa xác minh" : response.ticketProposal.suggestedDestination === "authorized_escalation" ? "Bộ phận xử lý tranh chấp" : "StudioHub Support"}. Chưa có ticket được lưu.</small>
      <button type="button" className={styles.actionLink} disabled={pending || !confirmTicket} onClick={() => void confirmTicket?.(response.ticketProposal!.id)}>Xác nhận tạo phiếu hỗ trợ</button>
    </div>}
    {response?.sources?.length ? <ul className={styles.sources} aria-label="Tài liệu tham chiếu">
      {response.sources.map((source, index) => <li key={index}>
        {source.href && safeHelpdeskHref(source.href) ? <a href={safeHelpdeskHref(source.href)} target="_blank" rel="noopener noreferrer">{source.title}</a> : <span>{source.title}</span>}
        {source.reference && <small>{source.reference}</small>}
      </li>)}
    </ul> : null}
    {response?.cards?.map((card, index) => <div className={styles.card} key={index}>
      <strong>{card.title}</strong>
      {card.kind === "room" && <p>{card.description} · Phòng {card.roomId}</p>}
      {card.kind === "availability" && <p>{card.description}<br />Kiểm tra lúc: {card.checkedAt}</p>}
      {card.kind === "booking" && <dl><dt>Đơn thuê</dt><dd>{card.bookingStatus}</dd><dt>Thanh toán</dt><dd>{card.paymentStatus}</dd><dt>Hoàn cọc</dt><dd>{card.refundStatus}</dd></dl>}
      {card.kind === "ticket" && <p>{card.ticketId} · {card.status}</p>}
    </div>)}
    {response?.links?.map((link, index) => {
      const href = safeHelpdeskHref(link.href);
      return href ? <Link className={styles.actionLink} key={index} href={href}>{link.label} <span aria-hidden="true">↗</span></Link> : null;
    })}
    {message.createdAt && <time className={styles.time} dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</time>}
  </article>;
}
