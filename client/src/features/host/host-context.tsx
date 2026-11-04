"use client";
import { createContext, useContext } from "react";
import { useResource } from "@/services/api/use-resource";
import type { HostStudio } from "./host-types";

export const HostContext = createContext<{
  studios: ReturnType<typeof useResource<HostStudio[]>>;
  studioId: string; selectStudio: (id: string) => void;
} | null>(null);
export function useHostContext() { const context = useContext(HostContext); if (!context) throw new Error("HostContext missing"); return context; }
