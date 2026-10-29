import { useEffect, useLayoutEffect, useRef } from "react";
import { Send } from "lucide-react";
import { MAX_MESSAGE_LENGTH } from "../types/helpdesk.types";
import styles from "../styles/helpdesk.module.css";

function fitTextarea(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  const style = getComputedStyle(element);
  const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
  const limit = parseFloat(style.maxHeight) || 112;
  const height = element.scrollHeight + border;
  element.style.height = `${Math.min(height, limit)}px`;
  element.style.overflowY = height > limit ? "auto" : "hidden";
}

export function ChatComposer({ pending, handoff, connected = false, send, draft, setDraft }: { pending: boolean; handoff: boolean; connected?: boolean; send: (text: string) => boolean; draft: string; setDraft: (value: string) => void }) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (textarea.current) fitTextarea(textarea.current);
  }, [draft]);
  useEffect(() => {
    const element = textarea.current;
    if (!element) return;
    let width = element.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const nextWidth = element.getBoundingClientRect().width;
      if (nextWidth !== width) { width = nextWidth; fitTextarea(element); }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  function submit() {
    if (!pending && !handoff && draft.trim()) send(draft);
  }
  return <form className={styles.composer} onSubmit={event => { event.preventDefault(); void submit(); }}>
    <label className={styles.srOnly} htmlFor="helpdesk-message">Tin nhắn của bạn</label>
    <div className={styles.inputRow}>
      <textarea ref={textarea} id="helpdesk-message" rows={1} maxLength={MAX_MESSAGE_LENGTH} value={draft}
        placeholder="Bạn muốn tìm hiểu điều gì?" disabled={handoff}
        aria-describedby="helpdesk-data-note" onChange={event => setDraft(event.target.value)}
        onKeyDown={event => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault(); if (!pending && !handoff) void submit();
          }
        }} />
      <button type="submit" aria-label="Gửi tin nhắn" disabled={pending || handoff || !draft.trim()}><Send size={17} aria-hidden="true" /></button>
    </div>
    <small id="helpdesk-data-note">{handoff ? "Tự động tạm dừng · Xem trạng thái tiếp nhận ở trên." : connected ? "Lịch sử lưu tại Helpdesk · Tránh thông tin nhạy cảm." : "Chỉ lưu trong phiên · Không tạo đơn, chuyển tiền hay ticket."}</small>
  </form>;
}
