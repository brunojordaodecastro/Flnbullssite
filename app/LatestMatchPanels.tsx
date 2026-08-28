"use client";

import Image from "next/image";

import type { RecentMatch } from "@/lib/matches";
import { useLiveMatches } from "./useLiveMatches";

export default function LatestMatchPanels({
  initialMatches,
}: {
  initialMatches: RecentMatch[];
}) {
  const { matches } = useLiveMatches(initialMatches);

  const latestMatch = matches[0];
  const recentFive = matches.slice(0, 5);
  const formResults = recentFive.map((m) => ({
    result: m.result === "Vitória" ? "V" : m.result === "Empate" ? "E" : "D",
    label: m.result,
  }));
  const formWins = recentFive.filter((m) => m.result === "Vitória").length;
  const formDraws = recentFive.filter((m) => m.result === "Empate").length;
  const formLosses = recentFive.filter((m) => m.result === "Derrota").length;
  const formPoints = formWins * 3 + formDraws * 1;

  if (!latestMatch) {
    return null;
  }

  return (
    <>
      <article className="match-card panel reveal reveal-one">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Última partida</p>
            <h2>Amistoso</h2>
          </div>
          <span
            className={`status-badge ${latestMatch.result === "Vitória" ? "status-win" : "status-loss"}`}
          >
            {latestMatch.result}
          </span>
        </div>

        <p className="match-meta">{latestMatch.date} · Partida oficial</p>

        <div
          className="scoreboard"
          aria-label={`${latestMatch.home.name} ${latestMatch.score.replace("–", " a ")} ${latestMatch.away.name}`}
        >
          <div className="team team-home">
            <span
              className={`team-crest${latestMatch.home.crest ? " crest-bulls" : " crest-rival"}`}
              aria-hidden="true"
            >
              {latestMatch.home.crest ? (
                <Image
                  src={latestMatch.home.crest}
                  alt=""
                  width={1007}
                  height={979}
                />
              ) : (
                latestMatch.home.mark
              )}
            </span>
            <strong>{latestMatch.home.name}</strong>
          </div>

          <div className="score">
            <span>{latestMatch.score.split("–")[0]}</span>
            <small>FINAL</small>
            <span>{latestMatch.score.split("–")[1]}</span>
          </div>

          <div className="team">
            <span
              className={`team-crest${latestMatch.away.crest ? "" : " crest-rival"}`}
              aria-hidden="true"
            >
              {latestMatch.away.crest ? (
                <Image
                  src={latestMatch.away.crest}
                  alt=""
                  width={320}
                  height={320}
                />
              ) : (
                latestMatch.away.mark
              )}
            </span>
            <strong>{latestMatch.away.name}</strong>
          </div>
        </div>

        <div className="match-footer">
          <span>{latestMatch.date}</span>
          {latestMatch.link ? (
            <a
              href={latestMatch.link}
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              Ver no Instagram
            </a>
          ) : null}
        </div>
      </article>

      <article className="form-card panel reveal reveal-two">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Momento</p>
            <h2>Forma recente</h2>
          </div>
          <span className="form-points">{formPoints} pts</span>
        </div>

        <ol className="form-list" aria-label="Últimos cinco resultados">
          {formResults.map((item, index) => (
            <li key={`${item.result}-${index}`}>
              <span
                className={`form-result result-${item.result.toLowerCase()}`}
                aria-label={item.label}
              >
                {item.result}
              </span>
              <span className="form-line" aria-hidden="true" />
            </li>
          ))}
        </ol>

        <div className="form-summary">
          <div>
            <strong>{formWins}</strong>
            <span>{formWins === 1 ? "vitória" : "vitórias"}</span>
          </div>
          <div>
            <strong>{formDraws}</strong>
            <span>{formDraws === 1 ? "empate" : "empates"}</span>
          </div>
          <div>
            <strong>{formLosses}</strong>
            <span>{formLosses === 1 ? "derrota" : "derrotas"}</span>
          </div>
        </div>
      </article>
    </>
  );
}
