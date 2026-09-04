import { useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query from JS.
 *
 * Unlike a `useEffect`-based hook this resolves on the very first render, so a
 * layout picked from it never flashes the wrong branch before correcting
 * itself. Use it only where the two branches must not both exist — mounting
 * one component tree instead of rendering both and hiding one with CSS.
 * Anything purely visual belongs in a Tailwind breakpoint instead.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    // No DOM on the server; the mobile-first branch is the safe default.
    () => false
  );
}

/** Matches Tailwind's `lg`, the width at which the three-column desk fits. */
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");
