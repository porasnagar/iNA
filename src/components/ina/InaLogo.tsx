import { cn } from "@/lib/utils";

/** iNA app mark — gradient squircle with the lowercase-i wordmark and a signal arc. */
export function InaLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-[28%] bg-logo shadow-[inset_0_1px_0_oklch(1_0_0/0.35)]",
        className,
      )}
      aria-label="iNA"
      role="img"
    >
      <svg viewBox="0 0 64 64" className="size-[78%] text-primary-foreground" fill="none">
        <path d="M44 15a20 20 0 0 1 0 34" stroke="currentColor" strokeOpacity=".45" strokeWidth="3" strokeLinecap="round" />
        <path d="M38 22a11 11 0 0 1 0 20" stroke="currentColor" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" />
        <circle cx="21" cy="17" r="4" fill="currentColor" />
        <rect x="17" y="25" width="8" height="24" rx="4" fill="currentColor" />
      </svg>
    </div>
  );
}
