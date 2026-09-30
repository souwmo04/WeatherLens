import { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { CloudLoader } from "@/components/ui/States";
import { useForecast } from "@/hooks/useWeather";
import { useRainAmbience } from "@/hooks/useRainAmbience";
import { useApp } from "@/state/AppState";
import { SCENE_ACCENT } from "@/utils/weatherHelpers";
import { MobileNavigation } from "./MobileNavigation";
import { Navbar } from "./Navbar";

export function AppLayout() {
  const { pathname } = useLocation();
  const { resolvedTheme, sound } = useApp();
  const forecast = useForecast();
  const scene = forecast.data?.current.scene;
  const onScene = pathname === "/";
  useRainAmbience(sound && (scene === "rain" || scene === "storm"), scene === "storm");

  // The weather tints the whole interface through a single accent token.
  useEffect(() => {
    const root = document.documentElement;
    if (scene) root.style.setProperty("--accent", SCENE_ACCENT[scene][resolvedTheme]);
  }, [scene, resolvedTheme]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only z-[100] rounded-full bg-ink px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Navbar onScene={onScene} />
      <AnimatePresence mode="wait">
        <motion.main id="main" key={pathname} tabIndex={-1} className="outline-none"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
          <Suspense fallback={<div className="pt-32"><CloudLoader label="Loading" /></div>}>
            <Outlet />
          </Suspense>
        </motion.main>
      </AnimatePresence>
      <MobileNavigation />
    </div>
  );
}

/** Standard page frame for non-hero pages. */
export function PageFrame({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-32 pt-28 sm:px-6 lg:pb-20 lg:pt-32">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-ink sm:text-[2.6rem]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-ink-soft">{subtitle}</p>}
      </header>
      {children}
    </div>
  );
}
