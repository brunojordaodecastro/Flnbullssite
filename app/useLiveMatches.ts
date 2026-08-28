"use client";

import { useCallback, useEffect, useState } from "react";

import type { RecentMatch } from "@/lib/matches";

/**
 * Reads the match history from D1 through /api/matches.
 *
 * The server render uses the seed defaults (the home page cannot import the D1
 * client without pulling `cloudflare:workers` into its chunk), so the initial
 * markup stays static and the live list replaces it on hydration.
 */
export function useLiveMatches(initialMatches: RecentMatch[]) {
  const [matches, setMatches] = useState<RecentMatch[]>(initialMatches);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/matches", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        if (active && Array.isArray(data.matches) && data.matches.length > 0) {
          setMatches(data.matches as RecentMatch[]);
        }
      } catch {
        // Mantém o que já foi renderizado no servidor.
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [reloadToken]);

  return { matches, refresh };
}
