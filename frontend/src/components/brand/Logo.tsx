import { useId } from "react";

/** WeatherLens mark: an eye/lens whose iris holds a small cloud — the app "looks at" the weather. */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`lg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7cc4ff" />
          <stop offset="1" stopColor="#4b5dff" />
        </linearGradient>
      </defs>
      <path d="M4 24c5-9 11.5-13.5 20-13.5S39 15 44 24c-5 9-11.5 13.5-20 13.5S9 33 4 24z"
        fill="none" stroke={`url(#lg-${id})`} strokeWidth="3.2" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="8.5" fill={`url(#lg-${id})`} />
      <path d="M26.2 22.2a3.9 3.9 0 0 1 7.4 1.1 2.9 2.9 0 0 1-.5 5.7h-7.8a3 3 0 0 1 .9-6.8z" fill="#fff" />
      <circle cx="20.6" cy="21" r="1.7" fill="#fff" opacity="0.85" />
    </svg>
  );
}

export function Logo({ onScene = false, compact = false }: { onScene?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={30} />
      {!compact && (
        <span className={`text-[1.08rem] font-bold tracking-[-0.02em] ${onScene ? "text-white" : "text-ink"}`}>
          Weather<span className="font-medium opacity-70">Lens</span>
        </span>
      )}
    </span>
  );
}
