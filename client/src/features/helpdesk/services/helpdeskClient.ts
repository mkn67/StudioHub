import { demoHelpdeskAdapter } from "./demoHelpdeskAdapter";
import { createPhpHelpdeskAdapter } from "./phpHelpdeskAdapter";
import type { HelpdeskTransport } from "../types/helpdesk.types";

export const helpdeskClient: HelpdeskTransport = process.env.NEXT_PUBLIC_HELPDESK_MODE === "demo"
  ? demoHelpdeskAdapter : createPhpHelpdeskAdapter();
