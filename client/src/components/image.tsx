"use client";
import NextImage, { type ImageProps } from "next/image";
import { forwardRef } from "react";
// Host-owned HTTPS assets load directly in the browser. Do not expose Next's
// server image optimizer as an unrestricted proxy for arbitrary stored URLs.
export default forwardRef<HTMLImageElement, ImageProps>(function StudioImage(props, ref) {
  const external = typeof props.src === "string" && props.src.startsWith("https://");
  return <NextImage {...props} ref={ref} unoptimized={external || props.unoptimized} />;
});
