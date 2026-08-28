"use client";

import { useEffect, useState } from "react";

type HomePlayer = {
  playerName: string;
  role?: string;
  avatarUrl?: string | null;
};

export default function HomeAccountButton() {
  const [player, setPlayer] = useState<HomePlayer | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPlayer() {
      try {
        const response = await fetch("/api/auth/me", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }

        const body = (await response.json()) as { user?: HomePlayer };
        if (active && body.user) {
          setPlayer(body.user);
        }
      } catch {
        // The public home remains usable when the session check is unavailable.
      }
    }

    loadPlayer();
    return () => {
      active = false;
    };
  }, []);

  if (!player) {
    return (
      <a className="login-button pressable" href="/acesso">
        Entrar
      </a>
    );
  }

  const initial = player.playerName.trim().charAt(0).toLocaleUpperCase("pt-BR");

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem" }}>
      {player.role === "admin" ? (
        <a
          className="login-button admin-header-pill pressable"
          href="/admin"
          aria-label="Abrir painel administrativo"
        >
          Admin
        </a>
      ) : null}

      <a
        className="login-button account-button pressable"
        href="/perfil"
        aria-label={`Abrir perfil de ${player.playerName}`}
      >
        <span className="account-avatar" aria-hidden="true">
          {player.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={player.avatarUrl}
              alt=""
              className="account-avatar-img"
            />
          ) : (
            initial
          )}
        </span>
        <span className="account-copy">
          <small>Meu perfil</small>
          <strong>{player.playerName}</strong>
        </span>
      </a>
    </div>
  );
}
