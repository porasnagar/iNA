import { motion, useMotionValue, useSpring, useTransform, type HTMLMotionProps, type Variants } from "framer-motion";
import type { PointerEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Motion primitives for the website. Everything animates transform/opacity only (GPU-composited),
 * and framer-motion drives springs from requestAnimationFrame, so they run at the display's native
 * rate — 60, 90, 120 (ProMotion) or 144 Hz. Reduced motion is honoured by <MotionConfig> in __root.
 */
export const SPRING = { type: "spring", stiffness: 260, damping: 26, mass: 0.9 } as const;
export const SOFT_SPRING = { type: "spring", stiffness: 120, damping: 20, mass: 1 } as const;

const reveal: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: SOFT_SPRING },
};

/** Fades and springs a block into place the first time it scrolls into view. */
export function Reveal({ className, children, delay = 0, ...rest }: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      className={className}
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ ...SOFT_SPRING, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };

/** A list whose children enter one after another. Use with <StaggerItem>. */
export function Stagger({ as = "ul", className, children, ...rest }: { as?: "ul" | "div" | "ol"; className?: string; children: ReactNode } & Record<string, unknown>) {
  const Comp = as === "ul" ? motion.ul : as === "ol" ? motion.ol : motion.div;
  return (
    <Comp className={className} variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "0px 0px -10% 0px" }} {...rest}>
      {children}
    </Comp>
  );
}

/** A card inside <Stagger>: springs in, lifts on hover, presses down on tap. */
export function StaggerItem({ as = "li", className, children, interactive = true }: { as?: "li" | "div"; className?: string; children: ReactNode; interactive?: boolean }) {
  const Comp = as === "li" ? motion.li : motion.div;
  return (
    <Comp
      className={cn("transform-gpu", className)}
      variants={reveal}
      whileHover={interactive ? { y: -5, transition: SPRING } : undefined}
      whileTap={interactive ? { scale: 0.98, transition: SPRING } : undefined}
    >
      {children}
    </Comp>
  );
}

/**
 * Brand artwork that floats: a slow CSS bob (compositor-only, so it never janks) plus a
 * spring-driven 3D tilt that follows the pointer, and a ground shadow that breathes with it.
 */
export function FloatingArt({ className, children }: { className?: string; children: ReactNode }) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-7, 7]), SOFT_SPRING);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [6, -6]), SOFT_SPRING);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div className={cn("relative [perspective:1200px]", className)} onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="animate-float">
        <motion.div className="transform-gpu" style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
          {children}
        </motion.div>
      </div>
      <div aria-hidden className="animate-breathe mx-auto mt-6 h-6 w-3/4 rounded-[50%] bg-float-shadow blur-xl" />
    </div>
  );
}
