"use client";
import { useEffect, useRef, useState } from "react";
import { welcomeMessage } from "../data/demoFaq";
import { MAX_MESSAGES, MAX_MESSAGE_LENGTH, type HelpdeskContext, type HelpdeskMessage, type HelpdeskTransport } from "../types/helpdesk.types";
import { HelpdeskApiError } from "../services/phpHelpdeskAdapter";

export function useHelpdeskChat(transport: HelpdeskTransport, context: HelpdeskContext) {
  const [messages, setMessages] = useState<HelpdeskMessage[]>([{ id: "welcome", role: "assistant", text: welcomeMessage, createdAt: "" }]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [handoff, setHandoff] = useState(false);
  const [handoffState, setHandoffState] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting" | "processing" | "received" | "unavailable">("idle");
  const active = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; active.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!handoff || !transport.loadHistory) return;
    const controller = new AbortController();
    let polling = false;
    const timer = setInterval(async () => {
      if (polling) return; polling = true;
      try {
        const result = await transport.loadHistory!(controller.signal);
        if (controller.signal.aborted) return;
        setHandoffState(result.state);
        if (result.messages.length) setMessages(result.messages);
        if (result.state === "bot_active") setHandoff(false);
      } catch { if (!controller.signal.aborted) setError("Chưa cập nhật được trạng thái hỗ trợ. Chưa xác nhận nhân viên tiếp nhận."); }
      finally { polling = false; }
    }, 5000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [handoff, transport]);

  async function send(input: string): Promise<boolean> {
    const text = input.trim();
    if (!text || active.current || handoff) return false;
    if (text.length > MAX_MESSAGE_LENGTH || messages.length + 2 > MAX_MESSAGES) {
      setError("Đã đạt giới hạn cuộc trò chuyện. Bạn có thể xóa cuộc trò chuyện để bắt đầu lại.");
      return false;
    }
    const request = new AbortController();
    active.current = request;
    setPending(true); setError("");
    const userMessage: HelpdeskMessage = { id: crypto.randomUUID(), role: "user", text, createdAt: new Date().toISOString() };
    setMessages(previous => [...previous, userMessage]);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let onAbort: (() => void) | undefined;
    try {
      const response = await Promise.race([
        transport.sendMessage(text, context, { signal: request.signal, onStatus: setStatus }),
        new Promise<never>((_, reject) => {
          onAbort = () => reject(new Error("Request cancelled"));
          request.signal.addEventListener("abort", onAbort, { once: true });
          timeout = setTimeout(() => request.abort(), transport.timeoutMs ?? 15000);
        }),
      ]);
      if (request.signal.aborted) return true;
      setMessages(previous => [...previous, { id: crypto.randomUUID(), role: "assistant", text: response.text, response, createdAt: new Date().toISOString() }]);
      setHandoff(response.state === "human_handoff");
      setStatus("received");
    } catch (failure) {
      // Do not surface transport internals, tokens or raw provider errors.
      if (mounted.current && active.current === request) {
        setError(failure instanceof HelpdeskApiError ? failure.message : "Chưa nhận được phản hồi. Bạn có thể thử lại; không gửi yêu cầu mới nếu thao tác trước chưa rõ kết quả.");
        setStatus("unavailable");
      }
    } finally {
      clearTimeout(timeout);
      if (onAbort) request.signal.removeEventListener("abort", onAbort);
      if (active.current === request) { active.current = null; if (mounted.current) setPending(false); }
    }
    return true;
  }
  function clear() {
    if (active.current || handoff) return;
    setMessages([{ id: "welcome", role: "assistant", text: welcomeMessage, createdAt: "" }]);
    setError(""); setHandoff(false);
    setStatus("idle"); transport.reset?.();
  }
  async function confirmTicket(proposalId: string) {
    if (active.current || !transport.confirmTicket) return;
    const request = new AbortController(); active.current = request;
    setPending(true); setError(""); setStatus("processing");
    const timer = setTimeout(() => request.abort(), transport.timeoutMs ?? 15000);
    try {
      const response = await transport.confirmTicket(proposalId, request.signal);
      if (!mounted.current || request.signal.aborted) return;
      setMessages(previous => [...previous.map(message => message.response?.ticketProposal?.id === proposalId
        ? { ...message, response: { ...message.response, ticketProposal: undefined } } : message),
        { id: crypto.randomUUID(), role: "assistant", text: response.text, response, createdAt: new Date().toISOString() }]);
      setStatus("received");
    } catch (failure) {
      if (mounted.current) { setError(failure instanceof HelpdeskApiError ? failure.message : "Ticket chưa được xác nhận thành công. Hãy thử lại."); setStatus("unavailable"); }
    } finally { clearTimeout(timer); if (active.current === request) { active.current = null; if (mounted.current) setPending(false); } }
  }
  return { messages, pending, error, handoff, handoffState, status, send, clear, confirmTicket };
}
