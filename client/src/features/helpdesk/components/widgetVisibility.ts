export function shouldShowHelpdesk(path: string): boolean {
  return !["/host", "/admin"].some(route => path === route || path.startsWith(`${route}/`));
}
