export const duration = {
  press: .12, hover: .16, icon: .18, select: .18,
  "dialog-in": .24, "dialog-out": .18, page: .24,
  section: .46, card: .38, stagger: .07,
} as const;
export const editorialEase: [number, number, number, number] = [.16, 1, .3, 1];
const motionStyles = {
  ...Object.fromEntries(Object.entries(duration).map(([name, seconds]) => [`--motion-${name}`, `${seconds}s`])),
  "--motion-ease": "cubic-bezier(.16,1,.3,1)",
};
// A stylesheet keeps shared tokens out of the body style attribute that
// ScrollTrigger's browser measurements can reserialize before hydration.
export const motionTokenCSS = `:root{${Object.entries(motionStyles).map(([name, value]) => `${name}:${value}`).join(";")}}`;
