"use client";

import { useState, useEffect, type FormEvent } from "react";
import Image from "next/image";
import styles from "./auth.module.css";

const PRESET_CRESTS = [
  { label: "Marcível Dias", src: "/team-marcivel-dias.png" },
  { label: "Tanquinho", src: "/team-tanquinho.png" },
  { label: "Moka FC", src: "/team-moka-fc.png" },
  { label: "AE Falcões", src: "/team-ae-falcoes.png" },
  { label: "Never Broken", src: "/team-never-broken.png" },
  { label: "Vasco da Brahma", src: "/team-vasco-brahma.png" },
  { label: "Bangu", src: "/team-bangu.png" },
] as const;

const MONTH_NAMES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function maskDate(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

function maskTime(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

export default function AddMatchModal({
  isOpen,
  onClose,
  onMatchAdded,
}: {
  isOpen: boolean;
  onClose: () => void;
  onMatchAdded: () => void;
}) {
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("19:30");
  const [isUpcoming, setIsUpcoming] = useState(false);
  const [isHome, setIsHome] = useState(true); // true = Mandante (Casa), false = Visitante (Fora)
  const [opponentName, setOpponentName] = useState("");
  const [opponentCrest, setOpponentCrest] = useState("");
  const [bullsGoals, setBullsGoals] = useState("6");
  const [opponentGoals, setOpponentGoals] = useState("4");
  const [instagramLink, setInstagramLink] = useState("");
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

  function handleDateInput(raw: string) {
    const masked = maskDate(raw);
    setMatchDate(masked);

    // If full date entered (DD/MM/AAAA), automatically validate
    if (masked.length === 10) {
      const [dStr, mStr, yStr] = masked.split("/");
      const day = parseInt(dStr, 10);
      const month = parseInt(mStr, 10);
      const year = parseInt(yStr, 10);

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000) {
        const inputDate = new Date(year, month - 1, day);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        setIsUpcoming(inputDate > today);
      }
    }
  }

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    if (matchDate.length !== 10) {
      setError("Insira a data completa no formato DD/MM/AAAA (ex: 22/03/2026).");
      setSubmitting(false);
      return;
    }

    const [dStr, mStr, yStr] = matchDate.split("/");
    const day = parseInt(dStr, 10);
    const month = parseInt(mStr, 10);
    const year = parseInt(yStr, 10);

    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000) {
      setError("Data inválida. Verifique o dia, mês e ano inseridos.");
      setSubmitting(false);
      return;
    }

    if (isUpcoming && matchTime.trim().length > 0 && matchTime.trim().length < 4) {
      setError("Horário incompleto. Insira no formato HH:MM (ex: 19:30).");
      setSubmitting(false);
      return;
    }

    // Format for standard display (e.g. "22 mar 2026")
    const formattedDate = `${String(day).padStart(2, "0")} ${MONTH_NAMES[month - 1]} ${year}`;

    try {
      const res = await fetch("/api/admin/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formattedDate,
          time: isUpcoming ? matchTime.trim() || undefined : undefined,
          opponentName,
          opponentCrest: opponentCrest.trim() || undefined,
          isHome,
          isUpcoming,
          bullsGoals: isUpcoming ? undefined : Number(bullsGoals),
          opponentGoals: isUpcoming ? undefined : Number(opponentGoals),
          instagramLink: instagramLink.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao adicionar partida.");
      }

      setSuccess(data.message ?? "Partida adicionada com sucesso!");
      onMatchAdded();
      setTimeout(() => {
        onClose();
        setSuccess("");
        setMatchDate("");
        setOpponentName("");
        setInstagramLink("");
      }, 1000);
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
        aria-label="Fechar modal"
      />
      <div
        className="modal-container admin-match-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-add-match-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Histórico e Calendário · Admin</p>
            <h3 id="modal-add-match-title">Adicionar Jogo</h3>
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
          {/* Mando de Campo (Casa / Fora) */}
          <div className="venue-toggle-wrap">
            <span className="field-subtitle">Mando de campo:</span>
            <div className="modal-type-selector" style={{ marginBottom: "0.85rem" }}>
              <button
                type="button"
                className={`type-btn ${isHome ? "active" : ""}`}
                onClick={() => setIsHome(true)}
              >
                Mandante (Casa)
              </button>
              <button
                type="button"
                className={`type-btn ${!isHome ? "active" : ""}`}
                onClick={() => setIsHome(false)}
              >
                Visitante (Fora)
              </button>
            </div>
          </div>

          {/* Visual Preview of Teams placement */}
          <div className="venue-preview-bar">
            <div className={`venue-preview-side ${isHome ? "highlight-bulls" : ""}`}>
              {isHome ? (
                <>
                  <Image src="/fln-bulls-shield.png" alt="Bulls" width={22} height={22} />
                  <strong>FLN BULLS</strong>
                  <span>(Casa)</span>
                </>
              ) : (
                <>
                  <span className="venue-crest-placeholder">AD</span>
                  <strong>{opponentName || "Adversário"}</strong>
                  <span>(Casa)</span>
                </>
              )}
            </div>

            <span className="venue-vs">VS</span>

            <div className={`venue-preview-side ${!isHome ? "highlight-bulls" : ""}`}>
              {!isHome ? (
                <>
                  <Image src="/fln-bulls-shield.png" alt="Bulls" width={22} height={22} />
                  <strong>FLN BULLS</strong>
                  <span>(Fora)</span>
                </>
              ) : (
                <>
                  <span className="venue-crest-placeholder">AD</span>
                  <strong>{opponentName || "Adversário"}</strong>
                  <span>(Fora)</span>
                </>
              )}
            </div>
          </div>

          <div className={styles.formColumns} style={{ marginTop: "0.85rem" }}>
            {/* Data do Jogo (XX/XX/XXXX) */}
            <label className={styles.field}>
              <span>Data do jogo (DD/MM/AAAA)</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9/]*"
                maxLength={10}
                placeholder="Ex: 22/03/2026"
                value={matchDate}
                onChange={(e) => handleDateInput(e.target.value)}
                required
              />
            </label>

            {/* Nome do Adversário */}
            <label className={styles.field}>
              <span>Nome do Adversário</span>
              <input
                type="text"
                placeholder="Ex: Tigres FC"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                required
              />
            </label>
          </div>

          {/* Status Validation: Realizado vs Agendado */}
          <div className="status-validation-box">
            <span className="field-subtitle">Status da partida:</span>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.3rem" }}>
              <button
                type="button"
                className={`type-btn ${!isUpcoming ? "active" : ""}`}
                style={{ padding: "0.45rem 0.75rem", fontSize: "0.76rem" }}
                onClick={() => setIsUpcoming(false)}
              >
                Jogo Realizado (Encerrado)
              </button>
              <button
                type="button"
                className={`type-btn ${isUpcoming ? "active" : ""}`}
                style={{ padding: "0.45rem 0.75rem", fontSize: "0.76rem" }}
                onClick={() => setIsUpcoming(true)}
              >
                Próximo Jogo (Agendado)
              </button>
            </div>
          </div>

          {/* Horário do jogo (somente quando jogo for Agendado) */}
          {isUpcoming ? (
            <label className={styles.field} style={{ marginTop: "0.75rem" }}>
              <span>Horário do jogo (HH:MM)</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9:]*"
                maxLength={5}
                placeholder="Ex: 19:30"
                value={matchTime}
                onChange={(e) => setMatchTime(maskTime(e.target.value))}
                required
              />
            </label>
          ) : null}

          {/* Placar (somente se jogo já aconteceu) */}
          {!isUpcoming ? (
            <div className={styles.formColumns} style={{ marginTop: "0.75rem" }}>
              <label className={styles.field}>
                <span>Gols do FLN BULLS</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={bullsGoals}
                  onChange={(e) => setBullsGoals(e.target.value)}
                  required
                />
              </label>

              <label className={styles.field}>
                <span>Gols do Adversário</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={opponentGoals}
                  onChange={(e) => setOpponentGoals(e.target.value)}
                  required
                />
              </label>
            </div>
          ) : null}

          {/* Escudo do Adversário */}
          <div className={styles.field} style={{ marginTop: "0.85rem" }}>
            <div className="crest-preset-selector">
              {PRESET_CRESTS.map((preset) => (
                <button
                  type="button"
                  key={preset.src}
                  className={`crest-preset-btn ${
                    opponentCrest === preset.src ? "selected" : ""
                  }`}
                  onClick={() =>
                    setOpponentCrest(
                      opponentCrest === preset.src ? "" : preset.src,
                    )
                  }
                  title={preset.label}
                >
                  <Image
                    src={preset.src}
                    alt={preset.label}
                    width={28}
                    height={28}
                  />
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Ou cole a URL da imagem do escudo"
              value={opponentCrest}
              onChange={(e) => setOpponentCrest(e.target.value)}
              style={{ marginTop: "0.4rem" }}
            />
          </div>

          {/* Link Instagram */}
          <label className={`${styles.field} ${styles.fullField}`} style={{ marginTop: "0.6rem" }}>
            <span>Link da publicação no Instagram (opcional)</span>
            <input
              type="url"
              placeholder="https://www.instagram.com/p/..."
              value={instagramLink}
              onChange={(e) => setInstagramLink(e.target.value)}
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
              {submitting ? "Gravando…" : "Adicionar partida ao site"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
