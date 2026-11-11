"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { gsap, useGSAP, gsapEase } from "./gsap-runtime";
import { duration } from "./tokens";

/** A single measured line follows real aria-current state; CSS owns its motion. */
function useIndicator(scope: RefObject<HTMLElement | null>, key: string | number | null) {
  useLayoutEffect(() => {
    const root = scope.current;
    if (!root) return;
    const nav = root.matches("nav") ? root : root.querySelector<HTMLElement>(".public-nav, .room-detail-anchor");
    const indicator = nav?.querySelector<HTMLElement>(".motion-active-indicator");
    if (!nav || !indicator) return;
    const update = () => {
      const link = nav.querySelector<HTMLElement>('a[aria-current="page"], a[aria-current="location"]');
      indicator.style.opacity = link ? "1" : "0";
      if (link) { indicator.style.transform = `translateX(${link.offsetLeft}px)`; indicator.style.width = `${link.offsetWidth}px`; }
    };
    update();
    const resize = new ResizeObserver(update);
    resize.observe(nav);
    nav.querySelectorAll("a").forEach(node => resize.observe(node));
    const mutation = new MutationObserver(update);
    mutation.observe(nav, { subtree: true, attributes: true, attributeFilter: ["aria-current"] });
    let mounted = true;
    void document.fonts.ready.then(() => { if (mounted) update(); });
    return () => { mounted = false; resize.disconnect(); mutation.disconnect(); };
  }, [scope, key]);
}

export function PublicHeaderMotion({ children, hero, path }: { children: ReactNode; hero: boolean; path: string }) {
  const scope = useRef<HTMLElement>(null);
  useIndicator(scope, path);
  useEffect(() => {
    const node = scope.current;
    if (!node) return;
    let compact = false, frame = 0;
    const measure = () => {
      frame = 0;
      const next = compact ? window.scrollY > 32 : window.scrollY > 88;
      if (next !== compact) { compact = next; node.classList.toggle("is-scrolled", compact); }
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure(); window.addEventListener("scroll", scroll, { passive: true });
    return () => { window.removeEventListener("scroll", scroll); cancelAnimationFrame(frame); };
  }, []);
  return <div className="public-header-slot"><header ref={scope} className={`site-header public-header ${hero ? "over-hero" : ""}`}>{children}</header></div>;
}

/** API content arrives after the page shell. Rebuild only for a new room identity. */
export function useRoomDetailMotion(roomId: number | null) {
  const scope = useRef<HTMLDivElement>(null);
  useIndicator(scope, roomId);
  useEffect(() => {
    const root = scope.current;
    if (!root || roomId === null) return;
    const nav = root.querySelector<HTMLElement>(".room-detail-anchor");
    const links = Array.from(nav?.querySelectorAll<HTMLAnchorElement>('a[href^="#"]') ?? []);
    const pairs = links.flatMap(link => { const section = root.querySelector<HTMLElement>(link.hash); return section ? [{ link, section }] : []; });
    if (!pairs.length) return;
    const headerHeight = () => (document.querySelector(".public-header")?.getBoundingClientRect().height ?? 88) + 24;
    const choose = (link: HTMLAnchorElement) => {
      if (link.getAttribute("aria-current") === "location") return;
      pairs.forEach(pair => pair.link.setAttribute("aria-current", pair.link === link ? "location" : "false"));
    };
    let frame = 0;
    const spy = () => {
      frame = 0;
      const offset = headerHeight();
      // The pricing aside is sticky on desktop: its natural grid position is the marker.
      const tops = pairs.map(pair => ({ ...pair, top: (pair.section.id === "room-rates" && getComputedStyle(pair.section).position === "sticky" ? root.querySelector(".room-detail-layout") ?? pair.section : pair.section).getBoundingClientRect().top }));
      const visible = tops.filter(pair => pair.top <= offset + 50).sort((a, b) => b.top - a.top);
      choose((visible[0] ?? tops[0]).link);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(spy); };
    const observer = new IntersectionObserver(schedule, { rootMargin: "-100px 0px -45% 0px", threshold: [0, .1, 1] });
    pairs.forEach(pair => observer.observe(pair.section));
    const click = (event: MouseEvent) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      const pair = pairs.find(item => item.link === link);
      if (!pair || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      choose(pair.link);
      const position = pair.section.getBoundingClientRect().top + window.scrollY - headerHeight();
      window.history.replaceState(window.history.state, "", pair.link.hash);
      window.scrollTo({ top: position, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    };
    nav?.addEventListener("click", click); window.addEventListener("scroll", schedule, { passive: true }); window.addEventListener("resize", schedule);
    spy();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); nav?.removeEventListener("click", click); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [roomId]);
  useGSAP(() => {
    if (roomId === null || !scope.current) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const root = scope.current!;
      const timeline = gsap.timeline({ id: "studiohub-room-entry", defaults: { ease: gsapEase, clearProps: "opacity,transform", immediateRender: false } });
      const title = root.querySelector(".room-title-text");
      if (title) timeline.fromTo(title, { yPercent: 105 }, { yPercent: 0, duration: duration.slow }, 0);
      timeline.fromTo(root.querySelectorAll(".room-detail-heading p, .room-type-tags > span"), { opacity: .6, y: 8 }, { opacity: 1, y: 0, duration: duration.normal, stagger: .05 }, .08);
      timeline.fromTo(root.querySelectorAll(".room-key-specs > div"), { opacity: .7, y: 12 }, { opacity: 1, y: 0, duration: duration.normal, stagger: .06 }, .1);
      timeline.fromTo(root.querySelectorAll(".room-detail-media"), { opacity: .8, y: 12 }, { opacity: 1, y: 0, duration: duration.slow }, .14);
      timeline.fromTo(root.querySelectorAll(".room-package-list li"), { opacity: .7, x: 8 }, { opacity: 1, x: 0, duration: duration.normal, stagger: .05 }, .18);
      const finish = () => { timeline.progress(1); };
      root.addEventListener("focusin", finish); root.addEventListener("pointerdown", finish);
      return () => { root.removeEventListener("focusin", finish); root.removeEventListener("pointerdown", finish); };
    }, scope);
    return () => media.revert();
  }, { scope, dependencies: [roomId], revertOnUpdate: true });
  return scope;
}
