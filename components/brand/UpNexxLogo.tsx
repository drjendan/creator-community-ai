import { cn } from "@/lib/cn";

type LogoTheme = "dark" | "light" | "monochrome";

interface LogoProps {
  className?: string;
  theme?: LogoTheme;
  title?: string;
}

const gradientId = "upnexx-mark-gradient";

export function UpNexxIcon({ className, theme = "dark", title }: LogoProps) {
  const monochrome = theme === "monochrome";
  return (
    <svg viewBox="0 0 64 64" className={cn("shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="8" y1="56" x2="56" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#06B6D4" />
          <stop offset=".55" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#9333EA" />
        </linearGradient>
      </defs>
      <path
        d="M14 14v27c0 10.5 7.4 17 17 17s17-6.5 17-17V15"
        fill="none"
        stroke={monochrome ? "currentColor" : `url(#${gradientId})`}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="9"
      />
      <path
        d="m37 19 11-12 11 12"
        fill="none"
        stroke={monochrome ? "currentColor" : `url(#${gradientId})`}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="9"
      />
      <path d="M27 21v20c0 3 1.3 4.8 4 4.8s4-1.8 4-4.8V25" fill="none" stroke={theme === "light" ? "#08112B" : "#F8FAFC"} strokeLinecap="round" strokeWidth="4" opacity=".9" />
    </svg>
  );
}

export function UpNexxLogo({ className, theme = "dark", title = "UpNexx" }: LogoProps) {
  const dark = theme === "dark";
  const monochrome = theme === "monochrome";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} role="img" aria-label={title}>
      <UpNexxIcon className="h-11 w-11" theme={theme} />
      <span className={cn("font-display text-2xl font-extrabold tracking-[-.045em]", dark ? "text-white" : "text-brand-900")}>
        Up<span className={monochrome ? "" : "upnexx-gradient-text"}>Nexx</span>
      </span>
    </span>
  );
}

export function UpNexxStackedLogo({ className, theme = "dark" }: LogoProps) {
  return (
    <span className={cn("inline-flex flex-col items-center gap-2 text-center", className)}>
      <UpNexxIcon className="h-16 w-16" theme={theme} />
      <UpNexxLogo theme={theme} />
      <span className={cn("text-xs", theme === "dark" ? "text-brand-200" : "text-brand-500")}>
        The Intelligent Content, Learning &amp; Community Platform
      </span>
    </span>
  );
}
