import { useEffect, useState } from "react";

/** true when the user prefers reduced motion (OS setting). */
export function useReducedMotionPref(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** true while the element is on screen — used to pause canvas animation off-screen. */
export function useInView<T extends Element>(ref: React.RefObject<T | null>): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(Boolean(e?.isIntersecting)), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}
