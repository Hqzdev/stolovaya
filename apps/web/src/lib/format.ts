export function dateLabel(date: string, short = false): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: short ? "short" : "long",
    ...(short ? {} : { year: "numeric" }),
    timeZone: "UTC",
  })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(" г.", "");
}
export function timeLabel(timestamp: string | null, timezone: string): string {
  return timestamp
    ? new Intl.DateTimeFormat("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      }).format(new Date(timestamp))
    : "—";
}
export function number(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}
export function portions(value: number): string {
  const a = value % 100,
    b = value % 10;
  return `${number(value)} ${a > 10 && a < 20 ? "порций" : b === 1 ? "порция" : b >= 2 && b <= 4 ? "порции" : "порций"}`;
}
export function scopeQuery(
  params: URLSearchParams,
  today: string,
): URLSearchParams {
  return new URLSearchParams({
    date: params.get("date") || today,
    period: params.get("period") === "week" ? "week" : "day",
  });
}
export function linkTo(
  path: string,
  scope: URLSearchParams,
  changes: Record<string, string | number | undefined> = {},
): string {
  const query = new URLSearchParams(scope);
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === "" || value === "all")
      query.delete(key);
    else query.set(key, String(value));
  }
  return `${path}?${query}`;
}
