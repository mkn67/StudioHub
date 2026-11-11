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
        layer(".hero-kicker",8,.55,duration.normal,"0");
        const lines = Array.from(hero.querySelectorAll<HTMLElement>(".motion-line-text"));
        if (lines.length) timeline.fromTo(lines,{ yPercent:105 },{
          yPercent:0,duration:duration.reveal,stagger:.12,ease:gsapEase,clearProps:"transform",
          onStart:()=>mark(lines,timeline),onComplete:()=>release(lines),
        },.08);
        layer(".hero-editorial > p",12,.6,duration.normal,"0.48");
        layer(".hero-search",26,.55,duration.slow,"0.64");
        layer(".hero-caption",8,.65,duration.normal,"0.84");
      } else if (!hero && (operational || typeof document.startViewTransition !== "function")) {
        const heading = select(".page-heading, .detail-heading, .booking-header, .auth-panel");
        if (heading) gsap.fromTo(heading, { opacity:.9, y:operational?3:6 }, { opacity:1,y:0,duration:operational?.16:duration.page,ease:gsapEase,clearProps:"opacity,transform" });
      }
      if (!operational) {
        // Create triggers in DOM order. Group only true sibling card collections.
        root.querySelectorAll<HTMLElement>(".section-head, .categories:not(.home-category-grid), .how-grid > h2, .room-related-section > div:first-child, .room-information > h2").forEach((trigger, index) => {
          if (trigger.closest(".home-categories")) return;
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
          const tween = gsap.fromTo(batch, { opacity:photographic || mediaContext.conditions?.compact ? .82 : .72, y: photographic ? 8 : mediaContext.conditions?.compact ? 10 : 16, scale: group ? 0.985 : 1 }, {
            opacity:1,y:0,scale:1,duration:group?duration.card:duration.section,ease:gsapEase,
            stagger:batch.length>1?Math.min(duration.stagger,.21/(batch.length-1)):0,
            immediateRender:false,clearProps:"opacity,transform",
            onStart:()=>{ mark(batch,tween); batch.forEach(node=>{node.dataset.motionRevealed="true";}); },
            onComplete:()=>release(batch),
            scrollTrigger:{ id:"studiohub:"+path+":"+index+":"+row,trigger:group && mediaContext.conditions?.compact?batch[0]:trigger,start:"top 92%",once:true,toggleActions:"play none none none" },
          });
          batch.forEach(node=>owned.set(node,tween));
          });
        });
      }
      const partner = select(".host-cta");
      if (partner && !operational) {
        const headingLines = Array.from(partner.querySelectorAll<HTMLElement>(".motion-line-text"));
        const wipe = partner.querySelector<HTMLElement>(".partner-image-wipe");
        const entrance = gsap.timeline({ defaults:{ease:gsapEase,immediateRender:false}, scrollTrigger:{id:"studiohub-partner",trigger:partner,start:"top 90%",once:true} });
        entrance.fromTo(partner,{opacity:.85,scale:.98},{opacity:1,scale:1,duration:duration.slow,clearProps:"opacity,transform",onStart:()=>mark([partner],entrance),onComplete:()=>release([partner])},0);
        if (headingLines.length) entrance.fromTo(headingLines,{yPercent:105},{yPercent:0,duration:duration.slow,stagger:.1,clearProps:"transform"},.08);
        if (wipe) entrance.fromTo(wipe,{scaleX:1},{scaleX:0,duration:duration.reveal,clearProps:"transform"},.12);
        owned.set(partner,entrance);
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

/** API categories can arrive after the initial page animation has been created. */
export function useHomepageCategoryMotion(categoryKey: string) {
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const root = scope.current;
    if (!root) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const owned = new Map<HTMLElement, gsap.core.Timeline>();
      const sectionHeading = root.closest(".home-categories")?.querySelector<HTMLElement>(".section-head");
      if (sectionHeading && !sectionHeading.dataset.motionRevealed) {
        const intro = gsap.timeline({defaults:{ease:gsapEase,immediateRender:false},scrollTrigger:{id:"studiohub-category-intro",trigger:sectionHeading,start:"top 92%",once:true,onEnter:()=>{sectionHeading.dataset.motionRevealed="true";}}});
        intro.fromTo(sectionHeading.querySelector("h2"),{opacity:.7,y:18},{opacity:1,y:0,duration:duration.slow,clearProps:"opacity,transform"},0);
        intro.fromTo(sectionHeading.querySelector("p"),{opacity:.6,y:8},{opacity:1,y:0,duration:duration.normal,clearProps:"opacity,transform"},.12);
        intro.fromTo(sectionHeading,{"--heading-rule-scale":0},{"--heading-rule-scale":1,duration:duration.slow},.12);
      }
      root.querySelectorAll<HTMLElement>(".space-category-group").forEach((group,index) => {
        if (group.dataset.motionRevealed) return;
        const heading = group.querySelector("h3");
        const cards = Array.from(group.querySelectorAll<HTMLElement>(".home-category-card"));
        const timeline = gsap.timeline({defaults:{ease:gsapEase,immediateRender:false},scrollTrigger:{id:"studiohub-category-group:"+index,trigger:group,start:"top 93%",once:true,onEnter:()=>{group.dataset.motionRevealed="true";}}});
        if (heading) timeline.fromTo(heading,{opacity:.65,y:10,"--group-rule-scale":0,"--group-marker-angle":"-20deg"},{opacity:1,y:0,"--group-rule-scale":1,"--group-marker-angle":"0deg",duration:duration.slow,clearProps:"opacity,transform"},0);
        if (cards.length) timeline.fromTo(cards,{opacity:.65,y:24},{opacity:1,y:0,duration:duration.slow,stagger:.09,clearProps:"opacity,transform"},.08);
        owned.set(group,timeline);
      });
      const finish = (event: Event) => {
        const group = event.target instanceof Element ? event.target.closest<HTMLElement>(".space-category-group") : null;
        if (group) owned.get(group)?.progress(1);
      };
      root.addEventListener("pointerover",finish); root.addEventListener("focusin",finish);
      const refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
      return () => {cancelAnimationFrame(refreshFrame);root.removeEventListener("pointerover",finish);root.removeEventListener("focusin",finish);owned.clear();};
    }, scope);
    return () => media.revert();
  }, { scope, dependencies: [categoryKey], revertOnUpdate: true });
  return scope;
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
        gsap.fromTo(node,{ opacity:.78,y:6,scale:.995 },{ opacity:1,y:0,scale:1,duration:duration.card,ease:gsapEase,overwrite:"auto",clearProps:"opacity,transform" });
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
