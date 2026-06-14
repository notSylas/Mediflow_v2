import { formatDate, formatTime } from "@/lib/format";

/** "9:41 AM" for today, "Yesterday", else a short date — for conversation lists. */
export function formatRelativeDay(value: string | Date): string {
  const date = new Date(value);
  const now = new Date();
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (dayDiff <= 0) return formatTime(date);
  if (dayDiff === 1) return "Yesterday";
  return formatDate(date);
}
