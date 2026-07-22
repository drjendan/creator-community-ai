import { cn } from "@/lib/cn";

// Eyebrow + heading + optional subtitle. Keeps heading sizes controlled
// (spec §9.1: "balanced headings; avoid oversized type").
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  as = "h2",
  align = "left",
  className
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  as?: "h1" | "h2";
  align?: "left" | "center";
  className?: string;
}) {
  const Heading = as;
  const titleSize = as === "h1" ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl";
  return (
    <div className={cn(align === "center" && "mx-auto max-w-2xl text-center", className)}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-600">{eyebrow}</p>
      )}
      <Heading
        className={cn("mt-2 font-display font-semibold leading-[1.1] text-brand-900", titleSize)}
      >
        {title}
      </Heading>
      {subtitle && (
        <p className="mt-4 text-base leading-7 text-brand-700 md:text-lg md:leading-8">{subtitle}</p>
      )}
    </div>
  );
}
