"use client";

import type { PitchPlayer } from "@/lib/matches";

function getRatingTier(val: number): string {
  if (val <= 3.4) return "tier-red";
  if (val < 7.0) return "tier-yellow";
  return "tier-green";
}

export default function TacticalPitch({
  starters,
  bench,
}: {
  formation: string;
  starters: PitchPlayer[];
  bench: PitchPlayer[];
}) {
  return (
    <div className="tactical-hub-grid">
      {/* Direct Pitch Element - Clean floating stadium field */}
      <div className="pitch-canvas-holder">
        <div className="tactical-pitch" aria-label="Campo tático do FLN BULLS">
          {/* Players on Pitch */}
          {starters.map((player) => {
            const hasEvents = (player.goals || 0) > 0 || (player.assists || 0) > 0;

            return (
              <div
                key={player.id}
                className="pitch-player-node"
                style={{
                  left: `${player.x}%`,
                  top: `${player.y}%`,
                }}
              >
                {/* Event badges row (Gols e Assistências) above the avatar */}
                {hasEvents ? (
                  <div className="pitch-events-row">
                    {(player.goals || 0) > 0 ? (
                      <span className="player-event-pill event-goal" title={`${player.goals} gol(s)`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/icon-goal.png" alt="Gol" className="event-icon" />
                        <span className="event-count">{player.goals}</span>
                      </span>
                    ) : null}

                    {(player.assists || 0) > 0 ? (
                      <span className="player-event-pill event-assist" title={`${player.assists} assistência(s)`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/icon-assist.png" alt="Assistência" className="event-icon" />
                        <span className="event-count">{player.assists}</span>
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {/* Avatar / Photo Card */}
                <div className="pitch-player-avatar">
                  {player.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={player.avatarUrl} alt={player.name} />
                  ) : (
                    <svg className="pitch-avatar-placeholder" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  )}
                </div>

                {/* Rating Badge below avatar */}
                {player.rating !== undefined ? (
                  <div className={`pitch-rating-pill ${getRatingTier(player.rating)}`} title={`Nota: ${player.rating}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icon-rating.png" alt="Nota" className="rating-star-icon" />
                    <span className="rating-value">{player.rating}</span>
                  </div>
                ) : null}

                {/* Player Name and Number */}
                <div className="pitch-player-label">
                  <strong>{player.name}</strong>
                  <span className="pitch-player-number-label">{player.number}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bench (Banco de Reservas) */}
      <aside className="bench-sidebar" aria-label="Banco de reservas">
        <div className="bench-header">
          <h3>Banco de Reservas</h3>
          <span className="bench-count">{bench.length} suplentes</span>
        </div>

        <div className="bench-list">
          {bench.map((player) => (
            <div className="bench-player-card" key={player.id}>
              <div className="bench-player-avatar">
                {player.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={player.avatarUrl} alt={player.name} />
                ) : (
                  <span>{player.number}</span>
                )}
              </div>
              <div className="bench-player-info">
                <strong>{player.name}</strong>
                <span>
                  #{player.number} · {player.position}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                <span className="bench-sub-tag">Reserva</span>
                {player.rating !== undefined ? (
                  <span className={`bench-rating-tag ${getRatingTier(player.rating)}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icon-rating.png" alt="Nota" className="bench-rating-icon" />
                    {player.rating}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
