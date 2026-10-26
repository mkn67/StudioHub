"use client";
import { forwardRef, useEffect, useRef, ViewTransition, type ReactNode, type RefObject } from "react";
import { AnimatePresence, usePresence, usePresenceData, useIsPresent } from "motion/react";
import { usePathname } from "next/navigation";
import { duration } from "./tokens";
import { gsap, ScrollTrigger, useGSAP, gsapEase } from "./gsap-runtime";
import { useReducedMotion } from "./reduced-motion";

// Presence owns DOM lifetime only. GSAP exclusively owns animated DOM properties.
export { AnimatePresence as Presence, useIsPresent, useReducedMotion };

/** No DOM wrapper, flags or router interception: React 19.3's stable boundary. */
export function PublicTransition({ children }: { children: ReactNode }) {
  return <ViewTransition name="public-content" default="editorial-page">{children}</ViewTransition>;
}
export function SharedPhoto({ name, children }: { name: string; children: ReactNode }) {
  return <ViewTransition name={name} share="editorial-photo" enter="none" exit="none">{children}</ViewTransition>;
}

/** A bounded GSAP composition; existing content is visible without animation. */
export function MotionSurface({ children, operational = false }: { children: ReactNode; operational?: boolean }) {
  const scope = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useGSAP((_context, contextSafe) => {
    const root = scope.current;
    if (!root || !contextSafe) return;
    const safe = contextSafe;
    const media = gsap.matchMedia();
    media.add({ animate:"(prefers-reduced-motion: no-preference)", compact:"(max-width:1150px)" }, mediaContext => {
      if (!mediaContext.conditions?.animate) return;
      let active = true;
      const owned = new Map<HTMLElement, gsap.core.Animation>();
      const touched = new Set<HTMLElement>();
      const mark = (nodes: HTMLElement[], animation: gsap.core.Animation) => {
        nodes.forEach(node => { node.dataset.gsapRevealing = "true"; touched.add(node); owned.set(node, animation); });
      };
      const release = (nodes: HTMLElement[]) => nodes.forEach(node => { delete node.dataset.gsapRevealing; owned.delete(node); });
      const select = (selector: string) => root.querySelector<HTMLElement>(selector);
      const hero = select(".hero");
      if (hero && !hero.dataset.gsapHeroPlayed) {
        const timeline = gsap.timeline({ id:"studiohub-hero", onStart:()=>{hero.dataset.gsapHeroPlayed="true";}, defaults:{ ease:gsapEase, immediateRender:false, clearProps:"opacity,transform" } });
        const layer = (selector: string, offset: number, from: number, time: number, at: string) => {
          const node = select(selector);
          if (!node) return;
          owned.set(node,timeline);
          const spatial = offset !== 0;
          timeline.fromTo(node, spatial?{ opacity:from,y:offset }:{ opacity:from }, {
            opacity:1,...(spatial?{y:0}:{}),duration:time,clearProps:spatial?"opacity,transform":"opacity",
            onStart:()=>mark([node],timeline),onComplete:()=>release([node]),
          }, at);
        };
        timeline.addLabel("plate", 0);
        layer(".hero-editorial",18,.84,duration.section,"plate");
        layer(".hero-editorial > p",6,.82,.3,"plate+=0.10");
        timeline.addLabel("search", .16);
        layer(".hero-search",12,.86,duration.card,"search");
        layer(".hero-search .btn",0,.82,duration.select,"search+=0.10");
      } else if (!hero && (operational || typeof document.startViewTransition !== "function")) {
        const heading = select(".page-heading, .detail-heading, .booking-header, .auth-panel");
        if (heading) gsap.fromTo(heading, { opacity:.9, y:operational?3:6 }, { opacity:1,y:0,duration:operational?.16:duration.page,ease:gsapEase,clearProps:"opacity,transform" });
      }
      if (!operational) {
        // Create triggers in DOM order. Group only true sibling card collections.
        root.querySelectorAll<HTMLElement>(".section-head, .categories, .how-grid > h2, .host-cta").forEach((trigger, index) => {
          const group = trigger.matches(".categories");
          const photographic = trigger.matches(".host-cta");
          // Photograph-heavy listings stay still; their section heading carries the reveal.
          const candidates = photographic
            ? Array.from(trigger.querySelectorAll<HTMLElement>(":scope > div:not(.print-art)"))
            : group ? Array.from(trigger.children) as HTMLElement[] : [trigger];
          const nodes = candidates.filter(node=>!node.dataset.motionRevealed);
          if (!nodes.length) return;
          // Compact grids reveal one visible row at a time, avoiding offscreen work.
          const batches = group && mediaContext.conditions?.compact
            ? Array.from({length:Math.ceil(nodes.length/2)},(_,row)=>nodes.slice(row*2,row*2+2))
            : [nodes];
          batches.forEach((batch,row)=>{
          // The hero carries spatial choreography; ordinary sections use lighter fades.
          const tween = gsap.fromTo(batch, { opacity:photographic || mediaContext.conditions?.compact ? .82 : .72 }, {
            opacity:1,duration:group?duration.card:duration.section,ease:gsapEase,
            stagger:batch.length>1?Math.min(duration.stagger,.21/(batch.length-1)):0,
            immediateRender:false,clearProps:"opacity",
            onStart:()=>{ mark(batch,tween); batch.forEach(node=>{node.dataset.motionRevealed="true";}); },
            onComplete:()=>release(batch),
            scrollTrigger:{ id:"studiohub:"+path+":"+index+":"+row,trigger:group && mediaContext.conditions?.compact?batch[0]:trigger,start:"top 92%",once:true,toggleActions:"play none none none" },
          });
          batch.forEach(node=>owned.set(node,tween));
          });
        });
      }
      // Interaction finishes a decorative entrance, immediately returning ownership to CSS.
      const finishOnInteraction = safe((event: Event) => {
        const node = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-gsap-revealing], .hero-search, .categories > a") : null;
        if (node && root.contains(node)) owned.get(node)?.progress(1);
      });
      root.addEventListener("pointerover", finishOnInteraction);
      root.addEventListener("focusin", finishOnInteraction);
      void document.fonts.ready.then(()=>{if(active && root.isConnected) ScrollTrigger.refresh();});
      return () => {
        active = false;
        root.removeEventListener("pointerover",finishOnInteraction);
        root.removeEventListener("focusin",finishOnInteraction);
        touched.forEach(node=>{delete node.dataset.gsapRevealing;});
        owned.clear();
      };
    }, scope);
    return () => media.revert();
  }, { scope, dependencies:[path,operational], revertOnUpdate:true });
  return <div ref={scope} className="motion-surface">{children}</div>;
}

/** Commit actual results first; never retain stale rows or animate incorrect amounts. */
export function useContentMotion<T extends HTMLElement = HTMLDivElement>(changeKey: string) {
  const scope = useRef<T>(null);
  const reduced = useReducedMotion();
  const previous = useRef(changeKey);
  useGSAP(() => {
    const changed = previous.current !== changeKey;
    previous.current = changeKey;
    const node = scope.current;
    if (!changed || !node || reduced !== false) return;
    gsap.fromTo(node,{ opacity:.76 },{ opacity:1,duration:duration.select,ease:gsapEase,overwrite:"auto",clearProps:"opacity" });
  }, { scope, dependencies:[changeKey,reduced], revertOnUpdate:true });
  return scope;
}

/** Native dialog remains modal until GSAP completes and Presence releases its DOM. */
export function useDialogMotion(scope: RefObject<HTMLDialogElement | null>, drawer: boolean) {
  const [present, safeToRemove] = usePresence();
  const reduced = useReducedMotion();
  const entered = useRef(false);
  // Presence registers exits in layout effects; immediate exits complete after that commit.
  useEffect(() => { if (!present && reduced) safeToRemove?.(); }, [present,reduced,safeToRemove]);
  useGSAP(() => {
    const node = scope.current;
    if (!node) return;
    gsap.killTweensOf(node);
    const firstEntrance = !entered.current;
    entered.current = true;
    if (reduced !== false) { gsap.set(node,{clearProps:"opacity,transform"}); return; }
    if (present) {
      const arrival = { opacity:1,x:0,y:0,duration:duration["dialog-in"],ease:gsapEase,clearProps:"opacity,transform" };
      if (firstEntrance) gsap.fromTo(node,{ opacity:.84,x:drawer?16:0,y:drawer?0:12 },arrival);
      else gsap.to(node,arrival);
    } else {
      gsap.to(node,{ opacity:0,x:drawer?12:0,y:drawer?0:8,duration:duration["dialog-out"],ease:gsapEase,onComplete:()=>safeToRemove?.() });
    }
  }, { scope, dependencies:[present,reduced,drawer,safeToRemove] });
}

export const StepPanel = forwardRef<HTMLDivElement, { children: ReactNode; direction: number; animateEntrance?: boolean }>(function StepPanel({ children, direction, animateEntrance = true }, ref) {
  const scope = useRef<HTMLDivElement>(null);
  const [present, safeToRemove] = usePresence();
  const presenceDirection = usePresenceData();
  const exitDirection = typeof presenceDirection === "number" ? presenceDirection : direction;
  const reduced = useReducedMotion();
  const entered = useRef(false);
  useEffect(() => { if (!present && reduced) safeToRemove?.(); }, [present,reduced,safeToRemove]);
  useGSAP(() => {
    const node = scope.current;
    if (!node) return;
    gsap.killTweensOf(node);
    const firstEntrance = !entered.current;
    entered.current = true;
    if (reduced !== false) { gsap.set(node,{clearProps:"opacity,transform"}); return; }
    if (!present) {
      gsap.to(node,{ opacity:0,x:-exitDirection*8,duration:duration.select,ease:gsapEase,onComplete:()=>safeToRemove?.() });
    } else if (animateEntrance && firstEntrance) {
      gsap.fromTo(node,{ opacity:.8,x:direction*14 },{ opacity:1,x:0,duration:duration.select,ease:gsapEase,clearProps:"opacity,transform" });
    } else if (!firstEntrance) {
      gsap.to(node,{ opacity:1,x:0,duration:duration.select,ease:gsapEase,clearProps:"opacity,transform" });
    }
  }, { scope, dependencies:[present,reduced,exitDirection,direction,animateEntrance,safeToRemove] });
  return <div ref={node=>{scope.current=node;if(typeof ref === "function")ref(node);else if(ref)ref.current=node;}}
    className="wizard-main" inert={!present} aria-hidden={!present || undefined}>{children}</div>;
});
