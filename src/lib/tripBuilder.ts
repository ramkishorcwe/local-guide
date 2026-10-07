export function localPlanningDefaults(now = Date.now()) {
  const next = Math.ceil((now + 60_000) / (15 * 60_000)) * 15 * 60_000;
  const local = new Date(next + 330 * 60_000).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}
export function localTripStart(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Choose a date and start time for your trip.');
  const startAt = Date.parse(`${date}T${time}:00+05:30`);
  if (!Number.isFinite(startAt) || new Date(startAt + 330 * 60_000).toISOString().slice(0, 10) !== date) throw new Error('Choose a valid trip date.');
  return startAt;
}
export function hasTripStartPassed(startAt: number, now = Date.now()) {
  return startAt < now;
}
