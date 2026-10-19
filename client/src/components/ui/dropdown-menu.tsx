"use client";
import * as Primitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export const DropdownMenuItem = Primitive.Item;
export const DropdownMenuSeparator = Primitive.Separator;
export function DropdownMenuContent({
  className,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={8}
        align="end"
        className={cn("dropdown-content", className)}
        {...props}
      />
    </Primitive.Portal>
  );
}
