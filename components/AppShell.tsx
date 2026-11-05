"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { BottomNav } from "./BottomNav";

const ROUTES = ["/", "/feed", "/main", "/leaderboard", "/profile"];
function routeIndex(path: string) {
  return ROUTES.findIndex((route) => route === "/" ? path === "/" : path === route || path.startsWith(`${route}/`));
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state, ready } = useStore();
  const [navigation, setNavigation] = useState({ path: pathname, direction: "forward" });

  // Keep the previous route only to choose the entrance direction. The router
  // still owns navigation, loading, scroll restoration, and page lifetimes.
  if (navigation.path !== pathname) {
    const previous = routeIndex(navigation.path);
    const next = routeIndex(pathname);
    const goingBack = next < previous || (next === previous && pathname.length < navigation.path.length);
    setNavigation({ path: pathname, direction: goingBack ? "backward" : "forward" });
  }

  return (
    <div className="app-shell mx-auto min-h-dvh w-full max-w-[440px]">
      <a className="skip-link" href="#route-content">Langsung ke konten</a>
      <div id="route-content" key={pathname} tabIndex={-1} className="route-content" data-direction={navigation.direction}>
        {children}
      </div>
      {ready && state.user && pathname !== "/login" && <BottomNav />}
    </div>
  );
}
