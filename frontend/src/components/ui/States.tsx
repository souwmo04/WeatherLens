import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import type { ApiError } from "@/services/http";
import { Button } from "./primitives";

/* Small hand-drawn style illustrations, consistent with the scene art. */
function CloudArt({ mood }: { mood: "sad" | "calm" | "road" | "off" }) {
  return (
    <svg viewBox="0 0 160 110" className="h-24 w-36" aria-hidden="true">
      <defs>
        <linearGradient id="st-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--bg-elev)" /><stop offset="1" stopColor="var(--surface-sunken)" />
        </linearGradient>
      </defs>
      {mood === "road" && (
        <g>
          <path d="M60 108 L76 58 H84 L100 108Z" fill="var(--surface-sunken)" stroke="var(--line-strong)" />
          <path d="M80 64v8M80 80v10M80 97v9" stroke="var(--ink-mute)" strokeWidth="2" strokeLinecap="round" />
          <path d="M10 108 H150" stroke="var(--line-strong)" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      <g transform={mood === "road" ? "translate(20 -14) scale(0.8)" : "translate(0 4)"}>
        <g fill="url(#st-cloud)" stroke="var(--line-strong)" strokeWidth="1.5">
          <path d="M40 78h78a20 20 0 0 0 2-39.9A28 28 0 0 0 66 34a20 20 0 0 0-26 44z" />
        </g>
        {mood === "sad" && (
          <g stroke="var(--ink-soft)" strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M68 56h6M92 56h6" /><path d="M72 68q11-7 22 0" />
          </g>
        )}
        {mood === "calm" && (
          <g stroke="var(--ink-soft)" strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M66 56q4 3 8 0M92 56q4 3 8 0" /><path d="M74 66q9 6 18 0" />
          </g>
        )}
        {mood === "off" && (
          <g stroke="var(--ink-soft)" strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M68 52l6 6M74 52l-6 6M92 52l6 6M98 52l-6 6" /><path d="M74 68h18" />
          </g>
        )}
      </g>
      {mood === "sad" && <g stroke="#6ea2ff" strokeWidth="2.4" strokeLinecap="round"><path d="M64 92l-3 8M84 92l-3 8M104 92l-3 8" /></g>}
    </svg>
  );
}

const COPY: Record<string, { title: string; body: string; art: "sad" | "off" }> = {
  network: { title: "You seem to be offline", body: "We couldn't reach WeatherLens. Check your connection and try again.", art: "off" },
  timeout: { title: "That took too long", body: "The weather service is slow right now. Give it another try.", art: "sad" },
  provider_unavailable: { title: "Weather service unavailable", body: "Our weather provider isn't responding. Your data will be back shortly.", art: "sad" },
  place_not_found: { title: "We couldn't find that place", body: "Try a nearby landmark or a more specific name.", art: "sad" },
  server: { title: "Something went wrong", body: "An unexpected error occurred on our side. Please try again.", art: "sad" },
};

export function ErrorState({ error, title, body, onRetry, compact = false, children }: {
  error?: ApiError | null; title?: string; body?: string; onRetry?: () => void; compact?: boolean; children?: ReactNode;
}) {
  const copy = COPY[error?.code ?? ""] ?? { title: "Something went wrong", body: error?.message ?? "Please try again.", art: "sad" as const };
  return (
    <div role="alert" className={`flex flex-col items-center justify-center text-center ${compact ? "gap-2 py-6" : "gap-3 py-12"}`}>
      {!compact && <CloudArt mood={copy.art} />}
      <h3 className="text-lg font-bold text-ink">{title ?? copy.title}</h3>
      <p className="max-w-sm text-sm text-ink-soft">{body ?? (error?.code === "place_not_found" ? error.message : copy.body)}</p>
      {onRetry && (
        <Button size="sm" onClick={onRetry} icon={<RefreshCw size={15} aria-hidden="true" />} className="mt-1">Try again</Button>
      )}
      {children}
    </div>
  );
}

export function EmptyState({ title, body, art = "road", children }: {
  title: string; body?: string; art?: "road" | "calm"; children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <CloudArt mood={art} />
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {body && <p className="max-w-sm text-sm text-ink-soft">{body}</p>}
      {children}
    </div>
  );
}

/** Cloud-shaped loading indicator for places where a skeleton doesn't fit. */
export function CloudLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-10 text-ink-mute">
      <svg viewBox="0 0 80 50" className="h-10 w-16" aria-hidden="true">
        <path className="anim-cloud-bob" d="M20 42h38a11 11 0 0 0 1-21.9A15 15 0 0 0 32 18a11 11 0 0 0-12 24z"
          fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeDasharray="140"
          style={{ animation: "dash 1.6s linear infinite" }} />
      </svg>
      <span className="text-sm font-medium">{label}…</span>
    </div>
  );
}
