import { Github, Scale, Star } from "lucide-react";

import { REPO } from "@/components/ina/brand";
import { cn } from "@/lib/utils";

/** "Open Source · MIT" pill linking to the GitHub repository. */
export function OpenSourceBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <a
      href={REPO.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group inline-flex shrink-0 items-center gap-2 rounded-full border border-primary/30 bg-primary/10 py-1 pl-2 pr-3 text-xs font-medium text-primary transition-colors hover:bg-primary/15",
        className,
      )}
    >
      <Github className="size-3.5" />
      <span>Open Source</span>
      {!compact && (
        <span className="inline-flex items-center gap-1 border-l border-primary/30 pl-2 text-primary/80">
          <Scale className="size-3" />
          {REPO.license}
        </span>
      )}
    </a>
  );
}

/** Secondary GitHub call to action with a star prompt (no fabricated star count). */
export function GithubStarLink({ className }: { className?: string }) {
  return (
    <a
      href={REPO.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-card",
        className,
      )}
    >
      <Github className="size-4" />
      Star on GitHub
      <Star className="size-3.5 text-primary" />
    </a>
  );
}
