import Link from "next/link";
import { cn } from "@/lib/cn";
import { UpNexxIcon } from "@/components/brand/UpNexxLogo";

export function BrandMark({
  inverse = false,
  compact = false,
  name = "UpNexx",
  tagline = "The Intelligent Content, Learning & Community Platform",
  logoUrl
}: {
  inverse?: boolean;
  compact?: boolean;
  name?: string;
  tagline?: string;
  logoUrl?: string | null;
}) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="UpNexx home">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={`${name} logo`} className="h-12 max-w-52 object-contain" />
      ) : (
        <UpNexxIcon className="h-10 w-10" theme={inverse ? "dark" : "light"} />
      )}
      {!logoUrl && (
      <span>
        <span className={cn("block font-display text-lg font-extrabold tracking-tight", inverse ? "text-white" : "text-brand-900")}>
          {name}
        </span>
        {!compact && <span className={cn("block max-w-[14rem] text-[9px] font-semibold leading-3", inverse ? "text-brand-200" : "text-brand-500")}>{tagline}</span>}
      </span>
      )}
    </Link>
  );
}
