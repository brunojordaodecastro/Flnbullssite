"use client";

import { useEffect, useState, type FormEvent } from "react";
import styles from "../auth.module.css";

export type TeammateToRate = {
  id: string;
  name: string;
  number: number;
  position: string;
  avatarUrl: string | null;
  currentRating: number;
};

function getRatingTier(val: number): string {
  if (val <= 3.4) return "tier-red";
  if (val < 7.0) return "tier-yellow";
  return "tier-green";
}

export default function PostMatchModal({
  isOpen,
  onClose,
  onSubmitted,
  playerName,
  avatarUrl,
  jerseyNumber,
  teammates,
  initialGoals = 0,
  initialAssists = 0,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  playerName?: string;
  avatarUrl?: string | null;
  jerseyNumber?: number;
  teammates: TeammateToRate[];
  initialGoals?: number;
  initialAssists?: number;
}) {
  const [myGoals, setMyGoals] = useState<number>(initialGoals);
  const [myAssists, setMyAssists] = useState<number>(initialAssists);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const finalRatings: Record<string, number> = {};
      for (const t of teammates) {
        finalRatings[t.id] = ratings[t.id] ?? t.currentRating ?? 7.0;
      }

      const res = await fetch("/api/matches/post-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals: myGoals,
          assists: myAssists,
          ratingsGiven: finalRatings,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao enviar avaliação pós-jogo.");
      }

      setSuccess(data.message ?? "Avaliação e notas registradas com sucesso!");
      onSubmitted();
      setTimeout(() => {
        onClose();
        setSuccess("");
      }, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na operação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <button
        type="button"
        className="modal-backdrop-overlay"
        onClick={onClose}
        aria-label="Fechar janela de avaliação"
      />
      <div
        className="modal-container post-match-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-post-match-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Pós-Jogo · FLN BULLS</p>
            <h3 id="modal-post-match-title">Avaliação e Estatísticas do Jogo</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Player Identity Tag */}
          <div className="modal-player-header-wrap">
            <div className="modal-player-avatar-badge">
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt={playerName || "Atleta"} />
              ) : (
                <span>{jerseyNumber ? `#${jerseyNumber}` : "FB"}</span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <p className="modal-player-tag">
                Atleta: <strong>{playerName || "Você"}</strong>
                {jerseyNumber ? <span className="modal-player-num"> · Camisa #{jerseyNumber}</span> : null}
              </p>
              <span className="post-match-escalado-pill">Atleta Escalado na Partida</span>
            </div>
          </div>

          {/* Section 1: My Match Stats (Gols & Assistências) */}
          <div className="post-match-section-block">
            <h4 className="post-match-section-title">Minhas Estatísticas no Jogo</h4>
            <div className="post-match-stats-grid">
              {/* Goals Counter */}
              <div className="post-match-stat-box">
                <div className="stat-box-label">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icon-goal.png" alt="Gol" className="post-match-icon" />
                  <span>Gols Marcados</span>
                </div>
                <div className="stat-counter-controls">
                  <button
                    type="button"
                    className="stat-counter-btn"
                    onClick={() => setMyGoals((prev) => Math.max(0, prev - 1))}
                    aria-label="Diminuir gol"
                  >
                    −
                  </button>
                  <span className="stat-counter-value">{myGoals}</span>
                  <button
                    type="button"
                    className="stat-counter-btn"
                    onClick={() => setMyGoals((prev) => prev + 1)}
                    aria-label="Aumentar gol"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Assists Counter */}
              <div className="post-match-stat-box">
                <div className="stat-box-label">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icon-assist.png" alt="Assistência" className="post-match-icon" />
                  <span>Assistências Dadas</span>
                </div>
                <div className="stat-counter-controls">
                  <button
                    type="button"
                    className="stat-counter-btn"
                    onClick={() => setMyAssists((prev) => Math.max(0, prev - 1))}
                    aria-label="Diminuir assistência"
                  >
                    −
                  </button>
                  <span className="stat-counter-value">{myAssists}</span>
                  <button
                    type="button"
                    className="stat-counter-btn"
                    onClick={() => setMyAssists((prev) => prev + 1)}
                    aria-label="Aumentar assistência"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Rate Teammates (Notas para os companheiros escalados) */}
          {teammates.length > 0 ? (
            <div className="post-match-section-block" style={{ marginTop: "0.85rem" }}>
              <div style={{ marginBottom: "0.5rem" }}>
                <h4 className="post-match-section-title">Avaliação dos Companheiros Escalados</h4>
                <p className="field-hint">
                  Dê notas de 0 a 10 para cada colega. A nota final de cada atleta é calculada pela média aritmética de todas as avaliações recebidas.
                </p>
              </div>

              <div className="post-match-teammates-list">
                {teammates.map((teammate) => {
                  const currentVal = ratings[teammate.id] ?? teammate.currentRating ?? 7.0;
                  const tier = getRatingTier(currentVal);
                  return (
                    <div className="teammate-rating-row" key={teammate.id}>
                      <div className="teammate-rating-info">
                        <div className="chip-avatar" style={{ width: 34, height: 34, borderRadius: 10 }}>
                          {teammate.avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={teammate.avatarUrl} alt={teammate.name} />
                          ) : (
                            <span>{teammate.number}</span>
                          )}
                        </div>
                        <div>
                          <strong>{teammate.name}</strong>
                          <span className="teammate-sub">
                            #{teammate.number} · {teammate.position}
                          </span>
                        </div>
                      </div>

                      <div className="teammate-rating-control">
                        <div className={`rating-pill-display ${tier}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/icon-rating.png" alt="Nota" className="rating-star-mini" />
                          <span className="rating-pill-num">{currentVal.toFixed(1)}</span>
                        </div>

                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          className={`rating-range-slider ${tier}`}
                          value={currentVal}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setRatings((prev) => ({
                              ...prev,
                              [teammate.id]: val,
                            }));
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {error ? (
            <p className={styles.errorMessage} role="alert" style={{ marginTop: "0.75rem" }}>
              {error}
            </p>
          ) : null}

          {success ? (
            <p className={styles.successMessage} role="status" style={{ marginTop: "0.75rem" }}>
              {success}
            </p>
          ) : null}

          <div className="modal-footer" style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={submitting}
            >
              {submitting ? "Calculando médias…" : "Salvar Minha Avaliação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
