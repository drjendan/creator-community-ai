// Minimal className joiner — avoids pulling in clsx/tailwind-merge for the MVP.
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
