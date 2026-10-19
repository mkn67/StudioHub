"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;
export function DialogContent({
  className,
  children,
  variant = "dialog",
  ...props
}: React.ComponentProps<typeof Primitive.Content> & {
  variant?: "dialog" | "sheet" | "drawer" | "gallery";
}) {
  const returnFocus = React.useRef<HTMLElement | null>(null);
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="dialog-overlay" />
      <Primitive.Content
        className={cn("dialog-content", variant, className)}
        {...props}
        onOpenAutoFocus={(event) => {
          returnFocus.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          props.onOpenAutoFocus?.(event);
        }}
        onCloseAutoFocus={(event) => {
          props.onCloseAutoFocus?.(event);
          if (!event.defaultPrevented && returnFocus.current?.isConnected) {
            event.preventDefault();
            returnFocus.current.focus();
          }
        }}
      >
        {children}
        <Primitive.Close className="dialog-x" aria-label="Đóng">
          <X size={20} />
        </Primitive.Close>
      </Primitive.Content>
    </Primitive.Portal>
  );
}
