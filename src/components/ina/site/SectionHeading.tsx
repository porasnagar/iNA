import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Eyebrow + heading + lede. Use `as="h1"` exactly once per page for its primary heading. */
export function SectionHeading({
  eyebrow,
  title,
  children,
  className,
  as: Tag = "h2",
  id,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
  as?: "h1" | "h2";
  id?: string;
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <Tag
        id={id}
        className={cn(
          "mt-3 text-balance font-semibold tracking-tight",
          Tag === "h1" ? "text-4xl sm:text-6xl" : "text-3xl sm:text-5xl",
        )}
      >
        {title}
      </Tag>
      {children && <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">{children}</p>}
    </div>
  );
}
