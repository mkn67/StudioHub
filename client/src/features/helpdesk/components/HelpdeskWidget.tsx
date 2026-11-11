"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useApiSession } from "@/components/api-session";
import Link from "next/link";
import { apiRequest } from "@/services/api/client";
import { MessageCircle, X, Trash2 } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useHelpdeskChat } from "../hooks/useHelpdeskChat";
import { helpdeskClient } from "../services/helpdeskClient";
import type { HelpdeskContext, HelpdeskTransport } from "../types/helpdesk.types";
import { ChatMessage } from "./ChatMessage";
import { ChatComposer } from "./ChatComposer";
import { TypingIndicatorBubble } from "./TypingIndicatorBubble";
import styles from "../styles/helpdesk.module.css";
import { shouldShowHelpdesk, helpdeskRoomId } from "./widgetVisibility";

gsap.registerPlugin(useGSAP);

export function HelpdeskWidget({ transport = helpdeskClient }: { transport?: HelpdeskTransport }) {
  const path = usePathname();
  const { user, ready } = useApiSession();
  return <HelpdeskWidgetContent key={ready ? user?.user_id ?? "guest" : "loading"} path={path} transport={transport} authenticated={ready && !!user} ready={ready} visible={shouldShowHelpdesk(path)} />;
}

function HelpdeskWidgetContent({ path, transport, authenticated, ready, visible }: { path: string; transport: HelpdeskTransport; authenticated: boolean; ready: boolean; visible: boolean }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const roomId = helpdeskRoomId(path);
  const [viewedRoom, setViewedRoom] = useState<{ id: number; name: string } | null>(null);
  const context: HelpdeskContext = { surface: "public", scope: "catalog", ...(roomId ? { roomId } : {}) };
  const chat = useHelpdeskChat(transport, context, authenticated);
  useEffect(() => () => transport.reset?.(), [transport]);
  useEffect(() => {
    if (!roomId || !authenticated) return;
    let cancelled = false;
    void apiRequest<{ name: string }>(`/api/rooms/${roomId}`).then(room => {
      if (!cancelled && typeof room.name === "string") setViewedRoom({ id: roomId, name: room.name });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [roomId, authenticated]);
  function send(text: string) {
    if (!authenticated) return false;
    const accepted = chat.send(text);
    if (accepted) setDraft("");
    return accepted;
  }
  const last = chat.messages.at(-1);
  const roomDetail = /^\/rooms\/[^/]+\/?$/.test(path);
  const suggestions = roomId ? [
    { label: "Thông tin phòng", question: "Giải thích thông tin phòng này giúp tôi" },
    { label: "Giá & tiện ích", question: "Giá thuê, tiện ích và thiết bị của phòng này thế nào?" },
    { label: "Tìm phòng khác", question: "Tôi muốn tìm phòng phù hợp" },
  ] : [
    { label: "Tìm phòng", question: "Tôi muốn tìm phòng phù hợp" },
    { label: "Chụp lookbook", question: "Tôi cần phòng chụp lookbook và thời trang" },
    { label: "Cách đặt phòng", question: "Làm sao để đặt Studio?" },
  ];

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
    if (!visible) { dialog.close(); return; }
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
  }, { scope: root, dependencies: [open, visible], revertOnUpdate: true });

  useLayoutEffect(() => {
    if (!open || !list.current) return;
    // Scroll only the transcript, never the underlying marketplace.
    if (followLatest.current) list.current.scrollTop = list.current.scrollHeight;
  }, [chat.messages, chat.pending, open, draft]);

  return <div ref={root} style={visible ? undefined : { display: "none" }} className={`${styles.widget} ${roomDetail ? styles.aboveBooking : ""}`} data-helpdesk={transport.mode}>
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
          <div className={styles.heading}><h2 id="helpdesk-title">StudioHub AI</h2><p>Trợ lý tìm và tìm hiểu phòng</p></div>
          <button type="button" disabled={!authenticated || chat.pending || chat.restoring || chat.handoff} onClick={chat.clear} aria-label="Xóa cuộc trò chuyện" title="Xóa cuộc trò chuyện" className={`${styles.iconButton} ${styles.secondaryAction}`}><Trash2 size={15} aria-hidden="true" /></button>
          <button type="button" aria-label="Đóng trò chuyện" title="Đóng trò chuyện" className={styles.iconButton} onClick={() => setOpen(false)}><X size={18} aria-hidden="true" /></button>
        </header>
        <div id="helpdesk-mode" className={styles.mode}>
          <span>{!authenticated ? "Cần đăng nhập" : roomId ? viewedRoom?.id === roomId ? viewedRoom.name : "Phòng đang mở" : chat.status === "connecting" ? "Đang kết nối" : chat.status === "unavailable" ? "Chưa sẵn sàng" : "Khám phá Studio"}</span>
          <small>{chat.restoring ? "Đang khôi phục hội thoại…" : transport.mode === "connected" ? "AI xử lý và lưu lịch sử hỗ trợ; không gửi thông tin nhạy cảm." : roomId ? "Hỏi về phòng đang xem" : "Tìm phòng theo nhu cầu của bạn"}</small>
        </div>
        <div ref={list} className={styles.transcript} role="log" aria-label="Nội dung trò chuyện" aria-live="off" tabIndex={0} onScroll={event => {
          const node = event.currentTarget;
          followLatest.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48;
        }}>
          {!authenticated ? <div className={styles.message}><p>{ready ? "Đăng nhập để trò chuyện với StudioHub AI. Lịch sử trò chuyện được gắn với tài khoản của bạn." : "Đang kiểm tra phiên đăng nhập…"}</p>{ready && <Link href="/login" className={styles.actionLink}>Đăng nhập</Link>}</div> : chat.messages.map(message => <ChatMessage key={message.id} message={message} confirmTicket={chat.confirmTicket} pending={chat.pending} />)}
          {chat.pending && <TypingIndicatorBubble />}
        </div>
        <div className={styles.suggestions} aria-label="Câu hỏi gợi ý">
          {authenticated && suggestions.map(({ question, label }) => <button type="button" key={question} aria-label={question} title={question} disabled={chat.pending || chat.restoring || chat.handoff} onClick={() => send(question)}>{label}</button>)}
        </div>
        {chat.error && <p className={styles.error} role="alert">{chat.error}{chat.failedMessage && <button type="button" className={styles.retry} disabled={chat.pending} onClick={chat.retry}>Thử lại tin nhắn</button>}</p>}
        {authenticated && <ChatComposer pending={chat.pending || chat.restoring} handoff={chat.handoff} connected={transport.mode === "connected"} send={send} draft={draft} setDraft={setDraft} />}
      </div>
    </dialog>
    <span className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{chat.pending ? "StudioHub AI đang nhập phản hồi" : last?.role === "assistant" && last.id !== "welcome" ? last.text : ""}</span>
  </div>;
}
