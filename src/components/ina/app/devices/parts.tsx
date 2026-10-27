import { Check, ChevronLeft, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { ringProgress } from "@/lib/ina/devices";
import { cn } from "@/lib/utils";

/** setInterval that always calls the latest callback; null delay pauses it. */
export function useInterval(fn: () => void, delay: number | null) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (delay === null) return;
    const t = setInterval(() => saved.current(), delay);
    return () => clearInterval(t);
  }, [delay]);
}

/** Scrolls the app's content back to the top whenever [key] changes (each flow step starts at the top). */
export function useScrollTop(key: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.closest(".overflow-y-auto")?.scrollTo({ top: 0 });
  }, [key]);
  return ref;
}

export function BackLink({ label = "Connect", onClick }: { label?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="-ml-1.5 flex items-center text-[15px] text-primary">
      <ChevronLeft className="size-5" /> {label}
    </button>
  );
}

/** Short chime through Web Audio, used for Ping My Watch, AirTag chirps and HomePod setup. */
export function playChime(notes: number[], gap = 0.16) {
  if (typeof window === "undefined") return;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = ctx.currentTime + i * gap;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + gap * 1.6);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + gap * 1.8);
    });
    setTimeout(() => void ctx.close(), (notes.length * gap + 1) * 1000);
  } catch {
    // audio blocked
  }
}

/** Proximity card that slides up over the app, like the AirPods case-open sheet. */
export function ProximityCard({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end">
      <button type="button" aria-label="Dismiss" onClick={onClose} className="absolute inset-0 glass-scrim animate-in fade-in duration-300" />
      <div role="dialog" aria-label={title} className="relative mx-2 mb-2 rounded-[42px] px-6 pb-6 pt-5 text-center shadow-sheet liquid-glass animate-in slide-in-from-bottom-full duration-500 ease-out">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-glass-tile text-muted-foreground">
          <X className="size-4" />
        </button>
        <h4 className="mx-8 truncate text-xl font-semibold tracking-tight">{title}</h4>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

/** Animated checklist: done stages get a check, the current one a spinner. */
export function StageList({ stages, current }: { stages: readonly string[]; current: number }) {
  return (
    <ol className="space-y-2 text-left">
      {stages.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className={cn("flex items-start gap-3 rounded-2xl bg-card px-4 py-3 transition-opacity", !done && !active && "opacity-45")}>
            <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", done ? "bg-success text-primary-foreground" : "bg-elevated")}>
              {done ? <Check className="size-3" strokeWidth={3} /> : active ? <span className="size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : null}
            </span>
            <span className="min-w-0 text-[13.5px] leading-snug">{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Apple's pairing pattern: a slowly rotating particle cloud inside the camera frame guide. */
export function ParticleReticle({ locked, className }: { locked: boolean; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const css = getComputedStyle(c);
    const primary = css.getPropertyValue("--primary").trim() || "oklch(0.63 0.2 255)";
    const fg = css.getPropertyValue("--viewfinder-foreground").trim() || "oklch(0.97 0 0)";
    const n = 260;
    const pts = Array.from({ length: n }, (_, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      return { phi, theta, r: 0.7 + Math.random() * 0.35, tw: Math.random() * Math.PI * 2, blue: i % 3 === 0 };
    });
    let raf = 0;
    let rot = 0;
    let tight = 0;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (c.width !== w * dpr) {
        c.width = w * dpr;
        c.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      rot += 0.006;
      tight += ((lockedRef.current ? 1 : 0) - tight) * 0.05;
      const R = Math.min(w, h) * 0.3 * (1 - tight * 0.18);
      for (const p of pts) {
        const th = p.theta + rot;
        const x = Math.sin(p.phi) * Math.cos(th);
        const y = Math.cos(p.phi);
        const z = Math.sin(p.phi) * Math.sin(th);
        const scatter = p.r + (1 - tight) * 0.12 * Math.sin(rot * 3 + p.tw);
        const px = w / 2 + x * R * scatter;
        const py = h / 2 + y * R * scatter;
        const depth = (z + 1) / 2;
        ctx.globalAlpha = 0.25 + depth * 0.75;
        ctx.fillStyle = p.blue ? primary : fg;
        ctx.beginPath();
        ctx.arc(px, py, 0.6 + depth * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={canvas} aria-hidden className={cn("size-full", className)} />;
}

/** Four corner brackets of the camera frame guide; turns green once the pattern is read. */
export function FrameGuide({ locked }: { locked: boolean }) {
  const corner = "absolute size-8 border-[3px] transition-colors duration-300";
  const color = locked ? "border-success" : "border-viewfinder-foreground";
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-[14%] transition-transform duration-500", locked && "scale-95")}>
      <span className={cn(corner, color, "left-0 top-0 rounded-tl-2xl border-b-0 border-r-0")} />
      <span className={cn(corner, color, "right-0 top-0 rounded-tr-2xl border-b-0 border-l-0")} />
      <span className={cn(corner, color, "bottom-0 left-0 rounded-bl-2xl border-r-0 border-t-0")} />
      <span className={cn(corner, color, "bottom-0 right-0 rounded-br-2xl border-l-0 border-t-0")} />
    </div>
  );
}

const RING_CLASS = { move: "text-activity-move", exercise: "text-activity-exercise", stand: "text-activity-stand" } as const;

/** Concentric Move / Exercise / Stand rings; a closed ring keeps going for a second lap. */
export function ActivityRings({
  values,
  goals,
  size = 132,
  stroke = 16,
}: {
  values: { move: number; exercise: number; stand: number };
  goals: { move: number; exercise: number; stand: number };
  size?: number;
  stroke?: number;
}) {
  const rings = (["move", "exercise", "stand"] as const).map((k, i) => ({ k, r: size / 2 - stroke / 2 - i * (stroke + 2), p: ringProgress(values[k], goals[k]) }));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label="Activity rings">
      {rings.map(({ k, r, p }) => {
        const c = 2 * Math.PI * r;
        const lap1 = Math.min(1, p);
        const lap2 = Math.max(0, p - 1);
        return (
          <g key={k} className={RING_CLASS[k]}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${lap1 * c} ${c}`}
              className="transition-[stroke-dasharray] duration-700 ease-out"
            />
            {lap2 > 0 && (
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${lap2 * c} ${c}`} className="brightness-125 transition-[stroke-dasharray] duration-700" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Scrolling heart waveform drawn from recent BPM samples, with the high / low threshold lines. */
export function HeartTrace({ samples, low, high, className }: { samples: number[]; low: number; high: number; className?: string }) {
  const w = 300;
  const h = 90;
  const min = Math.min(low - 10, ...samples);
  const max = Math.max(high + 10, ...samples);
  const y = (v: number) => h - ((v - min) / (max - min || 1)) * h;
  const step = w / Math.max(1, samples.length - 1);
  const path = samples.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("h-24 w-full", className)} aria-hidden>
      <line x1={0} x2={w} y1={y(high)} y2={y(high)} className="stroke-warning" strokeDasharray="4 4" strokeWidth={1} />
      <line x1={0} x2={w} y1={y(low)} y2={y(low)} className="stroke-primary" strokeDasharray="4 4" strokeWidth={1} />
      <path d={path} fill="none" className="stroke-destructive" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** ECG-style trace: a PQRST complex repeated at the current heart rate. */
export function EcgTrace({ bpm, running }: { bpm: number; running: boolean }) {
  const [t, setT] = useState(0);
  useInterval(() => setT((v) => v + 1), running ? 40 : null);
  const w = 300;
  const h = 70;
  const beat = Math.max(20, Math.round((60 / Math.max(40, bpm)) * 25));
  const pts: string[] = [];
  for (let x = 0; x <= 150; x++) {
    const p = (x + t) % beat;
    let v = 0;
    if (p === 3) v = 6;
    else if (p === 6) v = -6;
    else if (p === 7) v = 40;
    else if (p === 8) v = -14;
    else if (p >= 12 && p <= 15) v = 8;
    pts.push(`${x * 2},${h / 2 - (running ? v : 0) * 0.6}`);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-16 w-full" aria-hidden>
      <polyline points={pts.join(" ")} fill="none" className="stroke-destructive" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
