export function shouldShowHelpdesk(path: string): boolean {
  return path === "/" || /^\/rooms\/?$/.test(path) || /^\/rooms\/[1-9][0-9]*\/?$/.test(path);
}

export function helpdeskRoomId(path: string): number | undefined {
  const match = /^\/rooms\/([1-9][0-9]*)\/?$/.exec(path);
  const id = match ? Number(match[1]) : undefined;
  return id !== undefined && Number.isSafeInteger(id) && id <= 2147483647 ? id : undefined;
}
