import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h2>
      {children && <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">{children}</p>}
    </div>
  );
}
