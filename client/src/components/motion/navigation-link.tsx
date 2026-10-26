"use client";
import NextLink, { useLinkStatus } from "next/link";
import { forwardRef, type ComponentProps } from "react";

function PendingIndicator() {
  const { pending } = useLinkStatus();
  return pending ? <i className="link-pending" aria-hidden="true" /> : null;
}
const NavigationLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof NextLink>>(function NavigationLink({ children, className = "", ...props }, ref) {
  return <NextLink ref={ref} {...props} className={`${className} motion-link`}>{children}<PendingIndicator /></NextLink>;
});
export default NavigationLink;
