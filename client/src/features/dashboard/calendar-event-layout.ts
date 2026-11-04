// Presentation lanes only: never changes booking times or availability.
export function calendarEventLanes(events: { id: string; start: number; end: number }[]) {
  const result = new Map<string, { lane: number; lanes: number }>();
  let group: { id: string; lane: number }[] = [];
  let ends: number[] = [];
  const flush = () => {
    for (const event of group) result.set(event.id, { lane: event.lane, lanes: ends.length });
    group = [];
    ends = [];
  };
  for (const event of [...events].sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id))) {
    if (ends.length && ends.every(end => end <= event.start)) flush();
    let lane = ends.findIndex(end => end <= event.start);
    if (lane < 0) lane = ends.length;
    ends[lane] = event.end;
    group.push({ id: event.id, lane });
  }
  flush();
  return result;
}
