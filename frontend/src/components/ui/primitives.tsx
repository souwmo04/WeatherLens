import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { animate, useMotionValue, useTransform, motion } from "motion/react";
import { useReducedMotionPref } from "@/hooks/useMotionPref";

type Variant = "primary" | "secondary" | "ghost" | "scene";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-bg hover:opacity-90 shadow-[var(--shadow-soft)]",
  secondary: "bg-elev text-ink border border-line hover:border-line-strong shadow-[var(--shadow-soft)]",
  ghost: "text-ink-soft hover:text-ink hover:bg-sunken",
  scene: "glass-on-scene hover:bg-white/25",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant; size?: "sm" | "md" | "lg"; icon?: ReactNode;
}>(function Button({ variant = "secondary", size = "md", icon, className = "", children, ...rest }, ref) {
  const sizes = { sm: "h-9 px-3.5 text-sm gap-1.5", md: "h-11 px-5 text-[0.95rem] gap-2", lg: "h-13 px-7 text-base gap-2.5" };
  return (
    <button ref={ref} className={`inline-flex select-none items-center justify-center rounded-full font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${sizes[size]} ${VARIANTS[variant]} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  );
});

/** Smoothly tweening integer (temperatures, percentages). */
export function AnimatedNumber({ value, className, suffix = "" }: { value: number; className?: string; suffix?: string }) {
  const reduced = useReducedMotionPref();
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (v) => `${Math.round(v)}${suffix}`);
  const first = useRef(true);
  useEffect(() => {
    if (first.current || reduced) { mv.set(value); first.current = false; return; }
    const controls = animate(mv, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [value, reduced, mv]);
  return <motion.span className={className}>{rounded}</motion.span>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function SectionTitle({ eyebrow, title, action, id }: { eyebrow?: string; title: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>}
        <h2 id={id} className="text-[1.35rem] font-bold tracking-[-0.02em] text-ink sm:text-2xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Pill({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: "neutral" | "good" | "fair" | "poor" | "accent"; className?: string }) {
  const tones = {
    neutral: "bg-sunken text-ink-soft",
    good: "bg-good/12 text-good",
    fair: "bg-fair/14 text-fair",
    poor: "bg-poor/12 text-poor",
    accent: "bg-accent-soft text-accent",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`}>{children}</span>;
}
