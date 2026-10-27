"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Trash2 } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { suggestedQuestions } from "../data/demoFaq";
import { useHelpdeskChat } from "../hooks/useHelpdeskChat";
import { helpdeskClient } from "../services/helpdeskClient";
import type { HelpdeskContext, HelpdeskTransport } from "../types/helpdesk.types";
import { ChatMessage } from "./ChatMessage";
import { ChatComposer } from "./ChatComposer";
import { TypingIndicatorBubble } from "./TypingIndicatorBubble";
import styles from "../styles/helpdesk.module.css";

gsap.registerPlugin(useGSAP);

export function HelpdeskWidget({ transport = helpdeskClient }: { transport?: HelpdeskTransport }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const path = usePathname();
  const surface: HelpdeskContext["surface"] = path.startsWith("/host") ? "host" : path.startsWith("/admin") ? "admin" : /^\/(my-bookings|payment|profile)(\/|$)/.test(path) ? "customer" : "public";
  const chat = useHelpdeskChat(transport, { surface });
  function send(text: string) {
    const accepted = chat.send(text);
    if (accepted) setDraft("");
    return accepted;
  }
  const last = chat.messages.at(-1);
  const roomDetail = /^\/rooms\/[^/]+\/?$/.test(path);
  const suggestionLabels = ["Cách đặt phòng", "Hủy & hoàn cọc", "Tìm phòng"];

  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      root.current?.style.setProperty("--helpdesk-height", `${viewport?.height ?? window.innerHeight}px`);
      root.current?.style.setProperty("--helpdesk-top", `${(viewport?.offsetTop ?? 0) + 12}px`);
      if (root.current) root.current.dataset.compact = String((viewport?.height ?? window.innerHeight) < 520);
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => { viewport?.removeEventListener("resize", update); viewport?.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const adapt = () => {
      const dialog = panel.current;
      if (!dialog?.open) return;
      const focused = document.activeElement as HTMLElement | null;
      dialog.close();
      if (media.matches) dialog.showModal(); else dialog.show();
      if (focused && dialog.contains(focused)) focused.focus({ preventScroll: true });
    };
    media.addEventListener("change", adapt);
    return () => media.removeEventListener("change", adapt);
  }, []);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      if (launcher.current) gsap.fromTo(launcher.current, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: .22, clearProps: "opacity,transform" });
    });
    return () => media.revert();
  }, { scope: root });

  useGSAP(() => {
    const dialog = panel.current;
    if (!dialog) return;
    // This callback creates no GSAP objects; its owning tween is cleaned up by useGSAP.
    const finishClose = () => {
      dialog.close();
      if (!document.querySelector("dialog[open]")) launcher.current?.focus({ preventScroll: true });
    };
    if (open) {
      if (!dialog.open) {
        if (window.matchMedia("(max-width: 639px)").matches) dialog.showModal(); else dialog.show();
      }
      dialog.querySelector<HTMLTextAreaElement>("textarea")?.focus({ preventScroll: true });
    } else if (!dialog.open) return;
    const media = gsap.matchMedia();
    media.add({ reduce: "(prefers-reduced-motion: reduce)", animate: "(prefers-reduced-motion: no-preference)" }, context => {
      if (context.conditions?.reduce) { if (!open) finishClose(); return; }
      if (open) gsap.fromTo(dialog, { opacity: 0, y: 12, scale: .985 }, { opacity: 1, y: 0, scale: 1, duration: .22, ease: "power2.out", clearProps: "opacity,transform" });
      else gsap.to(dialog, { opacity: 0, y: 8, duration: .16, onComplete: finishClose });
    });
    return () => media.revert();
  }, { scope: root, dependencies: [open], revertOnUpdate: true });

  useLayoutEffect(() => {
    if (!open || !list.current) return;
    // Scroll only the transcript, never the underlying marketplace.
    if (followLatest.current) list.current.scrollTop = list.current.scrollHeight;
  }, [chat.messages, chat.pending, open, draft]);

  return <div ref={root} className={`${styles.widget} ${roomDetail ? styles.aboveBooking : ""}`} data-helpdesk={transport.mode}>
    <button ref={launcher} type="button" className={styles.launcher} aria-label="Trò chuyện với StudioHub AI"
      aria-expanded={open} aria-controls="studiohub-helpdesk" aria-haspopup="dialog" onClick={() => setOpen(value => !value)}>
      <MessageCircle size={25} aria-hidden="true" /><span className={styles.launcherTag}>AI</span>
    </button>
    <dialog ref={panel} id="studiohub-helpdesk" className={styles.panel} aria-labelledby="helpdesk-title" aria-describedby="helpdesk-mode"
      onCancel={event => { event.preventDefault(); setOpen(false); }} onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); }
        if (event.key === "Tab" && event.currentTarget.matches(":modal")) {
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), textarea:not(:disabled), a[href], [tabindex='0']"))
            .filter(node => node.getClientRects().length > 0);
          const first = controls[0], last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus(); }
        }
      }}>
      <div className={styles.panelBody}>
        <header className={styles.header}>
          <span className={styles.brandIcon}><MessageCircle size={17} aria-hidden="true" /></span>
          <div className={styles.heading}><h2 id="helpdesk-title">StudioHub AI</h2><p>Trợ lý hỗ trợ</p></div>
          <button type="button" disabled={chat.pending || chat.handoff} onClick={chat.clear} aria-label="Xóa cuộc trò chuyện" title="Xóa cuộc trò chuyện" className={`${styles.iconButton} ${styles.secondaryAction}`}><Trash2 size={15} aria-hidden="true" /></button>
          <button type="button" aria-label="Đóng trò chuyện" title="Đóng trò chuyện" className={styles.iconButton} onClick={() => setOpen(false)}><X size={18} aria-hidden="true" /></button>
        </header>
        <div id="helpdesk-mode" className={styles.mode}>
          <span>{transport.mode === "demo" ? "Chế độ demo" : chat.status === "connecting" ? "Đang kết nối" : chat.status === "unavailable" ? "Chưa sẵn sàng" : chat.status === "received" ? "PHP Helpdesk" : "Kênh PHP Helpdesk"}</span>
          <small title={transport.mode === "demo" ? "FAQ định sẵn · Chưa kết nối AI / API" : chat.handoff ? undefined : "Dữ liệu riêng cần xác thực · Chính sách cần duyệt"}>{transport.mode === "demo" ? "FAQ định sẵn · Chưa kết nối AI / API" : chat.handoff ? chat.handoffState === "human_active" ? "Nhân viên đang phụ trách · Trợ lý tự động đã dừng" : chat.handoffState === "resolved" ? "Nhân viên đã đánh dấu xử lý xong" : "Chờ tiếp nhận · Chưa có nhân viên kết nối" : "Cần xác thực · Chính sách chờ duyệt"}</small>
        </div>
        <div ref={list} className={styles.transcript} role="log" aria-label="Nội dung trò chuyện" aria-live="off" tabIndex={0} onScroll={event => {
          const node = event.currentTarget;
          followLatest.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48;
        }}>
          {chat.messages.map(message => <ChatMessage key={message.id} message={message} confirmTicket={chat.confirmTicket} pending={chat.pending} />)}
          {chat.pending && <TypingIndicatorBubble />}
        </div>
        <div className={styles.suggestions} aria-label="Câu hỏi gợi ý">
          {suggestedQuestions.slice(0, 3).map((question, index) => <button type="button" key={question} aria-label={question} title={question} disabled={chat.pending || chat.handoff} onClick={() => send(question)}>{suggestionLabels[index]}</button>)}
        </div>
        {chat.error && <p className={styles.error} role="alert">{chat.error}{chat.failedMessage && <button type="button" className={styles.retry} disabled={chat.pending} onClick={chat.retry}>Thử lại tin nhắn</button>}</p>}
        <ChatComposer pending={chat.pending} handoff={chat.handoff} connected={transport.mode === "connected"} send={send} draft={draft} setDraft={setDraft} />
      </div>
    </dialog>
    <span className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{chat.pending ? "StudioHub AI đang nhập phản hồi" : last?.role === "assistant" && last.id !== "welcome" ? last.text : ""}</span>
  </div>;
}
