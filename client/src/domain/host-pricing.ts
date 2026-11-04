import { execute, type Command } from "./engine";
import type { State } from "./models";

export type HostPricingCommand = Extract<Command, { type: "rate" | "rental_plans" | "crew_policy" | "featured_pricing" }>;

// Replay the existing validations against the latest shared state. Nothing is
// published if a command fails; this adds no pricing or booking state machine.
export function applyHostPricing(state: State, commands: HostPricingCommand[]) {
  return commands.reduce((draft, command) => {
    if (!["rate", "rental_plans", "crew_policy", "featured_pricing"].includes(command.type)) throw Error("Thao tác ngoài phạm vi bảng giá.");
    return execute(draft, command);
  }, state);
}
