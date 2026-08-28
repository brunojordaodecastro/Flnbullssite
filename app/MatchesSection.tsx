"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { DEFAULT_RECENT_MATCHES, type RecentMatch } from "@/lib/matches";
import AddMatchModal from "./AddMatchModal";
import { useLiveMatches } from "./useLiveMatches";

function RecentMatchDetails({ match }: { match: RecentMatch }) {
  const resultClass =
    match.result === "Vitória"
      ? "result-v"
      : match.result === "Empate"
        ? "result-e"
        : match.result === "Derrota"
          ? "result-d"
          : "result-scheduled";

  return (
    <>
      <div className="recent-match-topline">
        <span>{match.date}</span>
        <span className={`recent-match-result ${resultClass}`}>
          {match.result}
        </span>
      </div>

      <div className="recent-match-main">
        <div className="recent-match-crest">
          {match.home.crest ? (
            <Image
              src={match.home.crest}
              alt=""
              width={match.home.crest === "/fln-bulls-shield.png" ? 1007 : 320}
              height={match.home.crest === "/fln-bulls-shield.png" ? 979 : 320}
            />
          ) : (
            <span
              className="recent-match-crest recent-match-fallback"
              aria-hidden="true"
            >
              {match.home.mark}
            </span>
          )}
        </div>

        <strong className={match.result === "Agendado" ? "scheduled-match-time" : ""}>
          {match.result === "Agendado" && match.time ? match.time : match.score}
        </strong>

        <div className="recent-match-crest">
          {match.away.crest ? (
            <Image
              src={match.away.crest}
              alt=""
              width={match.away.crest === "/fln-bulls-shield.png" ? 1007 : 320}
              height={match.away.crest === "/fln-bulls-shield.png" ? 979 : 320}
            />
          ) : (
            <span
              className="recent-match-crest recent-match-fallback"
              aria-hidden="true"
            >
              {match.away.mark}
            </span>
          )}
        </div>
      </div>

      <div className="recent-match-meta">
        <span>{match.home.name}</span>
        <span>{match.away.name}</span>
      </div>
    </>
  );
}

export default function MatchesSection() {
  const { matches, refresh } = useLiveMatches(DEFAULT_RECENT_MATCHES);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function checkAdmin() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (active && data.user && data.user.role === "admin") {
            setIsAdmin(true);
          }
        }
      } catch {
        // public view fallback
      }
    }
    checkAdmin();
    return () => {
      active = false;
    };
  }, []);

  function handleMatchAdded() {
    // A partida foi gravada no D1; recarrega a lista a partir do banco.
    void refresh();
  }

  return (
    <section className="recent-matches" aria-labelledby="jogos-titulo">
      <div className="recent-matches-inner">
        <div className="recent-matches-heading">
          <div className="matches-heading-row">
            <h2 id="jogos-titulo" className="matches-main-title">
              Jogos
            </h2>
            {isAdmin ? (
              <button
                type="button"
                className="admin-add-match-btn pressable"
                onClick={() => setIsAddOpen(true)}
                title="Adicionar novo jogo ao site"
                aria-label="Adicionar novo jogo"
              >
                +
                <svg
                  className="add-plus-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        <ol
          className="recent-matches-track"
          aria-label="Resultados e calendário de jogos do FLN BULLS"
        >
          {matches.map((match, idx) => (
            <li
              className="recent-match"
              key={`${match.date}-${match.home.name}-${match.away.name}-${idx}`}
            >
              {match.link ? (
                <a
                  className="recent-match-link"
                  href={match.link}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${match.date}: ${match.home.name} ${match.score} ${match.away.name}. Abrir publicação no Instagram`}
                >
                  <RecentMatchDetails match={match} />
                </a>
              ) : (
                <div
                  className="recent-match-link recent-match-static"
                  role="group"
                  aria-label={`${match.date}: ${match.home.name} ${match.score} ${match.away.name}`}
                >
                  <RecentMatchDetails match={match} />
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>

      <AddMatchModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onMatchAdded={handleMatchAdded}
      />
    </section>
  );
}
