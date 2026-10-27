import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 px-5 pb-3 pt-4">
      <div className="min-w-0">
        <h1 className="truncate text-[30px] font-bold leading-tight tracking-tight">{title}</h1>
        {subtitle && <div className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</div>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function Group({ title, footer, children, className }: { title?: string; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("px-4", className)}>
      {title && <h2 className="mb-1.5 px-3 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">{title}</h2>}
      <div className="divide-y divide-border overflow-hidden rounded-[20px] bg-card">{children}</div>
      {footer && <p className="mt-1.5 px-3 text-[11.5px] leading-snug text-muted-foreground">{footer}</p>}
    </section>
  );
}

function RowIcon({ icon: I, tint }: { icon?: LucideIcon | undefined; tint?: string | undefined }) {
  if (!I) return null;
  return (
    <span className={cn("grid size-7 shrink-0 place-items-center rounded-[8px] text-primary-foreground", tint ?? "bg-primary")}>
      <I className="size-4" />
    </span>
  );
}

/** Title takes remaining width and truncates; value never wraps (weight(1f) / softWrap=false parity). */
export function Row({
  icon,
  tint,
  title,
  detail,
  value,
  onClick,
  children,
}: {
  icon?: LucideIcon | undefined;
  tint?: string | undefined;
  title: string;
  detail?: string | undefined;
  value?: ReactNode;
  onClick?: (() => void) | undefined;
  children?: ReactNode;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp type={onClick ? "button" : undefined} onClick={onClick} className="flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left">
      <RowIcon icon={icon} tint={tint} />
      <span className="min-w-0 flex-1 pr-3">
        <span className="block truncate text-[15px]">{title}</span>
        {detail && <span className="block truncate text-[11.5px] text-muted-foreground">{detail}</span>}
      </span>
      {value !== undefined && <span className="shrink-0 whitespace-nowrap text-[14px] text-muted-foreground">{value}</span>}
      {children}
    </Comp>
  );
}

export function ToggleRow({
  icon,
  tint,
  title,
  detail,
  checked,
  onCheckedChange,
  disabled,
}: {
  icon?: LucideIcon | undefined;
  tint?: string | undefined;
  title: string;
  detail?: string | undefined;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex min-h-12 w-full cursor-pointer items-center gap-3 px-4 py-2.5", disabled && "cursor-not-allowed opacity-45")}>
      <RowIcon icon={icon} tint={tint} />
      <span className="min-w-0 flex-1 pr-3">
        <span className="block truncate text-[15px]">{title}</span>
        {detail && <span className="block truncate text-[11.5px] text-muted-foreground">{detail}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="shrink-0 data-[state=checked]:bg-success" />
    </label>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-foreground/8 px-2 py-0.5 font-mono text-[10.5px] text-muted-foreground", className)}>
      {children}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex rounded-[10px] bg-foreground/8 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "min-w-0 flex-1 truncate rounded-[8px] px-2 py-1.5 text-[12.5px] font-medium transition-colors",
            o.value === value ? "bg-elevated text-foreground shadow" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
