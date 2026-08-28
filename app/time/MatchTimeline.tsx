"use client";

import Image from "next/image";
import type { MatchEvent } from "@/lib/matches";

export default function MatchTimeline({
  events,
  onOpenRegisterModal,
  isLoggedIn,
}: {
  events: MatchEvent[];
  onOpenRegisterModal: () => void;
  isLoggedIn: boolean;
}) {
  return (
    <div className="match-center-panel">
      {/* OneFootball Style Scoreboard Header */}
      <div className="match-hero-scoreboard">
        <div className="scoreboard-team-box home-side">
          <span className="scoreboard-crest-wrap">
            <Image
              src="/fln-bulls-shield.png"
              alt="FLN BULLS"
              width={1007}
              height={979}
            />
          </span>
          <h3>FLN BULLS</h3>
        </div>

        <div className="scoreboard-score-box">
          <div className="scoreboard-digits">
            <span>6</span>
            <span className="score-divider">:</span>
            <span>4</span>
          </div>
          <span className="scoreboard-status-pill">Fim de jogo</span>
          <p className="scoreboard-date">15 mar 2026 · Partida oficial</p>
        </div>

        <div className="scoreboard-team-box away-side">
          <span className="scoreboard-crest-wrap">
            <Image
              src="/team-marcivel-dias.png"
              alt="Marcível Dias"
              width={320}
              height={320}
            />
          </span>
          <h3>Marcível Dias</h3>
        </div>
      </div>

      {/* Events Timeline Header & Action */}
      <div className="timeline-header">
        <div>
          <p className="eyebrow">Linha do tempo</p>
          <h3>Acontecimentos da partida ({events.length})</h3>
        </div>

        {isLoggedIn ? (
          <button
            type="button"
            className="register-stat-btn pressable"
            onClick={onOpenRegisterModal}
          >
            Registrar gols e assistências
          </button>
        ) : (
          <a href="/acesso" className="register-stat-btn register-stat-btn-login pressable">
            Entre para registrar seus gols
          </a>
        )}
      </div>

      {/* Timeline List */}
      <div className="match-timeline-track">
        {events.map((event) => {
          const isBulls = event.team === "bulls";
          const typeLabel =
            event.type === "goal"
              ? "Gol"
              : event.type === "assist"
                ? "Passe"
                : "Cartão";

          return (
            <div
              key={event.id}
              className={`timeline-row ${isBulls ? "row-bulls" : "row-opponent"}`}
            >
              <span className="timeline-minute">{event.minute}</span>
              <span className="timeline-marker" aria-hidden="true" />

              <div className="timeline-card">
                <div className="timeline-card-main">
                  <span className="timeline-type-tag" aria-hidden="true">
                    {event.type === "goal" ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src="/icon-goal.png" alt="" className="timeline-badge-icon" />
                    ) : event.type === "assist" ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src="/icon-assist.png" alt="" className="timeline-badge-icon" />
                    ) : null}
                    {typeLabel}
                  </span>
                  <div className="timeline-info">
                    <strong>{event.playerName}</strong>
                    {event.assistPlayerName ? (
                      <span className="timeline-assist">
                        Passe: {event.assistPlayerName}
                      </span>
                    ) : null}
                    {event.detail ? (
                      <span className="timeline-detail">{event.detail}</span>
                    ) : null}
                  </div>
                </div>

                {event.scoreSnapshot ? (
                  <span className="timeline-score-tag">{event.scoreSnapshot}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
