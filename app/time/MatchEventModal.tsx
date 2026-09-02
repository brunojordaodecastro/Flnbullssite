"use client";

import { useEffect, useState, type FormEvent } from "react";
import styles from "../auth.module.css";

export default function MatchEventModal({
  isOpen,
  onClose,
  onEventAdded,
  playerName,
  avatarUrl,
  jerseyNumber,
}: {
  isOpen: boolean;
  onClose: () => void;
  onEventAdded: () => void;
  playerName?: string;
  avatarUrl?: string | null;
  jerseyNumber?: number;
}) {
  const [type, setType] = useState<"goal" | "assist">("goal");
  const [minute, setMinute] = useState("");
  const [assistPlayerName, setAssistPlayerName] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/matches/latest-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          minute: minute.trim() || undefined,
          assistPlayerName: type === "goal" ? assistPlayerName.trim() || undefined : undefined,
          detail: detail.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao registrar estatística.");
      }

      setSuccess(data.message ?? "Participação registrada!");
      onEventAdded();
      setTimeout(() => {
        onClose();
        setSuccess("");
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar.");
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
        aria-label="Fechar janela"
      />
      <div
        className="modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-event-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Último jogo · FLN BULLS 6–4 Marcível Dias</p>
            <h3 id="modal-event-title">Registrar Gol ou Assistência</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-player-header-wrap">
            <div className="modal-player-avatar-badge">
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt={playerName || "Atleta"} />
              ) : (
                <span>{jerseyNumber ? `#${jerseyNumber}` : "FB"}</span>
              )}
            </div>
            <p className="modal-player-tag">
              Atleta: <strong>{playerName || "Você"}</strong>
              {jerseyNumber ? <span className="modal-player-num"> · Camisa #{jerseyNumber}</span> : null}
            </p>
          </div>

          <div className="modal-type-selector">
            <button
              type="button"
              className={`type-btn ${type === "goal" ? "active" : ""}`}
              onClick={() => setType("goal")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-goal.png" alt="" className="modal-type-icon" />
              Marquei um Gol
            </button>
            <button
              type="button"
              className={`type-btn ${type === "assist" ? "active" : ""}`}
              onClick={() => setType("assist")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-assist.png" alt="" className="modal-type-icon" />
              Dei uma Assistência
            </button>
          </div>

          <div className={styles.formColumns}>
            <label className={styles.field}>
              <span>Minuto do lance (opcional)</span>
              <input
                type="text"
                placeholder="Ex: 24"
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
              />
            </label>

            {type === "goal" ? (
              <label className={styles.field}>
                <span>Quem deu o passe? (opcional)</span>
                <input
                  type="text"
                  placeholder="Nome do companheiro"
                  value={assistPlayerName}
                  onChange={(e) => setAssistPlayerName(e.target.value)}
                />
              </label>
            ) : null}
          </div>

          <label className={`${styles.field} ${styles.fullField}`}>
            <span>Detalhes do lance (opcional)</span>
            <input
              type="text"
              placeholder="Ex: Chute colocado de fora da área"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={120}
            />
          </label>

          {error ? (
            <p className={styles.errorMessage} role="alert">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className={styles.successMessage} role="status">
              {success}
            </p>
          ) : null}

          <div className="modal-footer">
            <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className={styles.primaryButton} disabled={submitting}>
              {submitting ? "Gravando…" : "Salvar no jogo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

