"use client";
import { ResponsiveContainer } from "recharts";
import type { ComponentProps, ReactNode } from "react";
export type ChartConfig = Record<string, { label: string; color: string }>;
export function ChartContainer({
  config,
  children,
  ...props
}: ComponentProps<"div"> & { config: ChartConfig; children: ReactNode }) {
  return (
    <div
      {...props}
      className="chart-container"
      style={Object.fromEntries(
        Object.entries(config).map(([k, v]) => [`--color-${k}`, v.color]),
      )}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children as ComponentProps<typeof ResponsiveContainer>["children"]}
      </ResponsiveContainer>
    </div>
  );
}
