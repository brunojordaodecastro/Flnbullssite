"use client";

import { useMemo, useState } from "react";
import type { RecentMatch } from "@/lib/matches";

const YEARS = ["Geral", "2026", "2025", "2024", "2023"] as const;
type YearFilter = (typeof YEARS)[number];

export default function TeamStatsSummary({
  matches,
}: {
  matches: RecentMatch[];
}) {
  const [selectedYear, setSelectedYear] = useState<YearFilter>("Geral");

  const filteredMatches = useMemo(() => {
    if (selectedYear === "Geral") {
      return matches;
    }
    return matches.filter((m) => m.date.includes(selectedYear));
  }, [matches, selectedYear]);

  const stats = useMemo(() => {
    const total = filteredMatches.length;
    const wins = filteredMatches.filter((m) => m.result === "Vitória").length;
    const draws = filteredMatches.filter((m) => m.result === "Empate").length;
    const losses = filteredMatches.filter((m) => m.result === "Derrota").length;

    return [
      { label: "Jogos", value: String(total) },
      { label: "Vitórias", value: String(wins) },
      { label: "Empates", value: String(draws) },
      { label: "Derrotas", value: String(losses) },
    ];
  }, [filteredMatches]);

  return (
    <section
      className="summary-section section-wrap reveal reveal-two"
      id="estatisticas"
      aria-labelledby="resumo-titulo"
    >
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Retrospecto</p>
          <h2 id="resumo-titulo">Resumo do time</h2>
        </div>
        <div className="year-filter" aria-label="Filtrar retrospecto por ano">
          {YEARS.map((year) => (
            <button
              type="button"
              key={year}
              className={selectedYear === year ? "active" : ""}
              onClick={() => setSelectedYear(year)}
              aria-pressed={selectedYear === year}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <dl className="stats-grid">
        {stats.map((item) => (
          <div className="stat-card" key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

