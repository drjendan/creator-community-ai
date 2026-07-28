import Link from "next/link";
import { cn } from "@/lib/cn";
import { UpNexxIcon } from "@/components/brand/UpNexxLogo";

export function BrandMark({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="UpNexx home">
      <UpNexxIcon className="h-10 w-10" theme={inverse ? "dark" : "light"} />
      <span>
        <span className={cn("block font-display text-lg font-extrabold tracking-tight", inverse ? "text-white" : "text-brand-900")}>
          Up<span className="upnexx-gradient-text">Nexx</span>
        </span>
        {!compact && <span className={cn("block max-w-[14rem] text-[9px] font-semibold leading-3", inverse ? "text-brand-200" : "text-brand-500")}>The Intelligent Content, Learning &amp; Community Platform</span>}
      </span>
    </Link>
  );
}
