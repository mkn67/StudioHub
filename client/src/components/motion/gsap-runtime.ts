"use client";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";
import { editorialEase } from "./tokens";

export const gsapEase = "studiohub-editorial";
// Imports are SSR-safe; registration and every animation run only in the browser.
if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase);
  CustomEase.create(gsapEase, editorialEase.join(","));
}
export { gsap, ScrollTrigger, useGSAP };
