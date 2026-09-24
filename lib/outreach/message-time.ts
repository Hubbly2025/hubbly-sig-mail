export function localDateTime(instant: string | Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const value = (key: string) => parts.find((part) => part.type === key)?.value;
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

export function toInstant(local: string, timezone: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw new Error("Choose a date and time.");
  const wallTime = Date.parse(`${local}:00Z`);
  let guess = wallTime;
  for (let i = 0; i < 4; i++) {
    const rendered = Date.parse(`${localDateTime(new Date(guess), timezone)}:00Z`);
    guess += wallTime - rendered;
  }
  if (!Number.isFinite(guess) || localDateTime(new Date(guess), timezone) !== local) {
    throw new Error("That local time does not exist because the clocks change. Choose another time.");
  }
  if (guess <= Date.now()) throw new Error("Choose a send time in the future.");
  return new Date(guess).toISOString();
}

export function presetTime(preset: "tomorrow" | "monday", timezone: string) {
  const day = new Date(`${localDateTime(new Date(), timezone).slice(0, 10)}T09:00:00Z`);
  const days = preset === "tomorrow" ? 1 : (8 - day.getUTCDay()) % 7 || 7;
  day.setUTCDate(day.getUTCDate() + days);
  return toInstant(day.toISOString().slice(0, 16), timezone);
}

export function formatSendTime(instant: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(new Date(instant));
}
