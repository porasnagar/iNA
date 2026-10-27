import { BRAND } from "@/components/ina/brand";
import { cn } from "@/lib/utils";

/** Official iNA app icon — the chameleon with the bitten "á" lettermark. */
export function InaLogo({ className }: { className?: string }) {
  return (
    <img
      src={BRAND.icon}
      alt="iNA"
      width={512}
      height={512}
      draggable={false}
      className={cn("aspect-square select-none rounded-[28%] bg-paper object-cover", className)}
    />
  );
}
