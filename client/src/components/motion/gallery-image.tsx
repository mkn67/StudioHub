"use client";
import Image from "@/components/image";
import { useRef } from "react";
import { useReducedMotion } from "./reduced-motion";
import { gsap, useGSAP, gsapEase } from "./gsap-runtime";
import { duration } from "./tokens";

/** The current image remains native DOM; animate only after its real pixels decode. */
export function GalleryImage({ src, alt }: { src: string; alt: string }) {
  const scope = useRef<HTMLImageElement>(null);
  const previous = useRef(src);
  const reduced = useReducedMotion();
  useGSAP((_context, contextSafe) => {
    const changed = previous.current !== src;
    previous.current = src;
    const image = scope.current;
    if (!changed || !image || reduced !== false || !contextSafe) return;
    let active = true;
    const reveal = contextSafe(() => {
      if (!active || !image.isConnected) return;
      gsap.fromTo(image, { opacity:.78, y:4 }, { opacity:1,y:0,duration:duration.page,ease:gsapEase,overwrite:"auto",clearProps:"opacity,transform" });
    });
    const loaded = () => { void image.decode().catch(()=>{}).then(()=>{if(active)reveal();}); };
    if (image.complete && image.naturalWidth) loaded();
    else image.addEventListener("load", loaded, { once:true });
    return () => { active=false; image.removeEventListener("load",loaded); };
  }, { scope, dependencies:[src,reduced], revertOnUpdate:true });
  return <Image ref={scope} width={1400} height={1000} src={src} alt={alt} />;
}
