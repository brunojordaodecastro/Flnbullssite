"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import styles from "../auth.module.css";
import type { AdminUserView } from "@/lib/auth";
import type { PitchPlayer } from "@/lib/matches";
import type { RosterPlayer } from "@/lib/team";

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

export default function AdminDashboardView() {
  const [activeTab, setActiveTab] = useState<AdminTab>("solicitacoes");
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [pitchPlayers, setPitchPlayers] = useState<PitchPlayer[]>([]);
  const [ratingsState, setRatingsState] = useState<Record<string, string>>({});
  const [availableRoster, setAvailableRoster] = useState<RosterPlayer[]>([]);
  const [matchSelectedPlayerIds, setMatchSelectedPlayerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  // Form for adding match
  const [matchDate, setMatchDate] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [bullsGoals, setBullsGoals] = useState("6");
  const [opponentGoals, setOpponentGoals] = useState("4");
  const [instagramLink, setInstagramLink] = useState("");
  const [matchSubmitting, setMatchSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        const usersRes = await fetch("/api/admin/users", { cache: "no-store" });
        if (usersRes.ok && active) {
          const data = await usersRes.json();
          if (data.users) setUsers(data.users);
        }

        const rosterRes = await fetch("/api/team/roster", { cache: "no-store" });
        if (rosterRes.ok && active) {
          const rJson = await rosterRes.json();
          if (Array.isArray(rJson.players)) {
            setAvailableRoster(rJson.players);
            setMatchSelectedPlayerIds(rJson.players.map((p: RosterPlayer) => p.id));
          }
        }

        const ratingsRes = await fetch("/api/admin/ratings", { cache: "no-store" });
        if (ratingsRes.ok && active) {
          const rData = await ratingsRes.json();
          if (rData.tactics) {
            const all = [
              ...(rData.tactics.starters || []),
              ...(rData.tactics.bench || []),
            ];
            setPitchPlayers(all);
            const initialRatings: Record<string, string> = {};
            for (const p of all) {
              initialRatings[p.id] = p.rating !== undefined ? String(p.rating) : "7.0";
            }
            setRatingsState(initialRatings);
          }
        }
      } catch (err) {
        console.error("admin-load-failed", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    init();
    return () => {
      active = false;
    };
  }, []);

  async function reloadData() {
    try {
      const usersRes = await fetch("/api/admin/users", { cache: "no-store" });
      if (usersRes.ok) {
        const data = await usersRes.json();
        if (data.users) setUsers(data.users);
      }

      const rosterRes = await fetch("/api/team/roster", { cache: "no-store" });
      if (rosterRes.ok) {
        const rJson = await rosterRes.json();
        if (Array.isArray(rJson.players)) {
          setAvailableRoster(rJson.players);
        }
      }

      const ratingsRes = await fetch("/api/admin/ratings", { cache: "no-store" });
      if (ratingsRes.ok) {
        const rData = await ratingsRes.json();
        if (rData.tactics) {
          const all = [
            ...(rData.tactics.starters || []),
            ...(rData.tactics.bench || []),
          ];
          setPitchPlayers(all);
        }
      }
    } catch (err) {
      console.error("admin-reload-failed", err);
    }
  }

  async function handleUpdateUser(
    targetUserId: string,
    updates: {
      role?: "admin" | "user";
      rosterStatus?: "approved" | "rejected" | "pending" | "not_requested";
    },
  ) {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          ...updates,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao atualizar usuário.");
      }

      setFeedback({
        type: "success",
        message: data.message ?? "Atualizado com sucesso!",
      });
      if (data.users) setUsers(data.users);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro na operação.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddMatch(e: FormEvent) {
    e.preventDefault();
    setMatchSubmitting(true);
    setFeedback(null);

    if (matchDate.length !== 10) {
      setFeedback({
        type: "error",
        message: "Insira a data completa no formato DD/MM/AAAA (ex: 22/03/2026).",
      });
      setMatchSubmitting(false);
      return;
    }

    const [dStr, mStr, yStr] = matchDate.split("/");
    const day = parseInt(dStr, 10);
    const month = parseInt(mStr, 10);
    const year = parseInt(yStr, 10);

    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000) {
      setFeedback({
        type: "error",
        message: "Data inválida. Verifique o dia, mês e ano inseridos.",
      });
      setMatchSubmitting(false);
      return;
    }

    const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const formattedDate = `${String(day).padStart(2, "0")} ${months[month - 1]} ${year}`;

    try {
      const res = await fetch("/api/admin/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formattedDate,
          opponentName,
          bullsGoals: Number(bullsGoals),
          opponentGoals: Number(opponentGoals),
          instagramLink: instagramLink.trim() || undefined,
          selectedPlayerIds: matchSelectedPlayerIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao cadastrar partida.");
      }

      setFeedback({
        type: "success",
        message: "Partida cadastrada com sucesso em 'Jogos' e escalação importada!",
      });
      setMatchDate("");
      setOpponentName("");
      setInstagramLink("");
      await reloadData();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao cadastrar jogo.",
      });
    } finally {
      setMatchSubmitting(false);
    }
  }

  async function handleSaveRatings(e: FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    setFeedback(null);

    const numericRatings: Record<string, number> = {};
    for (const [k, v] of Object.entries(ratingsState)) {
      numericRatings[k] = parseFloat(v) || 7.0;
    }

    try {
      const res = await fetch("/api/admin/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratings: numericRatings }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao salvar notas.");
      }

      setFeedback({
        type: "success",
        message: "Notas salvas e escalação de titulares/reservas recalculada!",
      });
      await reloadData();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao salvar notas.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  const pendingRequests = users.filter((u) => u.rosterStatus === "pending");

  return (
    <div className="admin-dashboard-wrap">
      {/* Header */}
      <section className="section-wrap">
        <div className="section-heading">
          <div>
            <div className="admin-hero-badge-row">
              <span className="admin-crown-badge">PAINEL DO ADMINISTRADOR</span>
            </div>
            <h1>Gestão & Diretoria do Bulls</h1>
          </div>
          <p className="section-description">
            Aprovação de atletas no elenco, atribuição de administradores, registro de jogos e notas táticas.
          </p>
        </div>

        {/* Global Feedback Banner */}
        {feedback ? (
          <div
            className={`admin-feedback-banner ${
              feedback.type === "error" ? "feedback-error" : "feedback-success"
            }`}
            role="status"
          >
            {feedback.message}
          </div>
        ) : null}

        {/* Admin Tabs */}
        <div className="team-subtabs" role="tablist" style={{ marginTop: "1.25rem" }}>
          <button
            type="button"
            className={`team-tab-btn ${activeTab === "solicitacoes" ? "active" : ""}`}
            onClick={() => setActiveTab("solicitacoes")}
          >
            Solicitações ({pendingRequests.length})
          </button>
          <button
            type="button"
            className={`team-tab-btn ${activeTab === "usuarios" ? "active" : ""}`}
            onClick={() => setActiveTab("usuarios")}
          >
            Usuários e Admins ({users.length})
          </button>
          <button
            type="button"
            className={`team-tab-btn ${activeTab === "jogo" ? "active" : ""}`}
            onClick={() => setActiveTab("jogo")}
          >
            Adicionar Jogo
          </button>
          <button
            type="button"
            className={`team-tab-btn ${activeTab === "notas" ? "active" : ""}`}
            onClick={() => setActiveTab("notas")}
          >
            Notas e Escalação
          </button>
        </div>
      </section>

      {/* TAB 1: Solicitações de Entrada */}
      {activeTab === "solicitacoes" ? (
        <section className="section-wrap">
          <div className="roster-header">
            <div>
              <p className="eyebrow">Aprovação de membros</p>
              <h2>Solicitações pendentes para o elenco ({pendingRequests.length})</h2>
            </div>
          </div>

          {loading ? (
            <div className="empty-roster-card">
              <p>Carregando solicitações…</p>
            </div>
          ) : pendingRequests.length > 0 ? (
            <div className="admin-requests-grid">
              {pendingRequests.map((userItem) => (
                <div className="admin-request-card" key={userItem.id}>
                  <div className="player-card-top">
                    <div className="player-card-avatar">
                      {userItem.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={userItem.avatarUrl} alt={userItem.playerName} />
                      ) : (
                        <span className="player-card-number">{userItem.jerseyNumber}</span>
                      )}
                    </div>
                    <div className="player-card-info">
                      <strong>{userItem.playerName}</strong>
                      <span className="player-card-pos">
                        #{userItem.jerseyNumber} · {userItem.position}
                        {userItem.secondaryPosition ? ` · ${userItem.secondaryPosition}` : ""}
                      </span>
                      <span className="admin-user-submeta">
                        Nome: {userItem.fullName} · {userItem.dominantFoot || "Pé não inf."}
                      </span>
                    </div>
                  </div>

                  <div className="admin-action-row">
                    <button
                      type="button"
                      className="admin-btn-approve pressable"
                      disabled={actionLoading}
                      onClick={() =>
                        handleUpdateUser(userItem.id, { rosterStatus: "approved" })
                      }
                    >
                      Aprovar no time
                    </button>
                    <button
                      type="button"
                      className="admin-btn-reject pressable"
                      disabled={actionLoading}
                      onClick={() =>
                        handleUpdateUser(userItem.id, { rosterStatus: "rejected" })
                      }
                    >
                      Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-roster-card">
              <h3>Nenhuma solicitação pendente no momento</h3>
              <p>Quando novos atletas solicitarem entrada pelo site, eles aparecerão aqui para sua aprovação.</p>
            </div>
          )}
        </section>
      ) : null}

      {/* TAB 2: Gestão de Usuários & Administradores */}
      {activeTab === "usuarios" ? (
        <section className="section-wrap">
          <div className="roster-header">
            <div>
              <p className="eyebrow">Permissões de acesso</p>
              <h2>Todos os usuários cadastrados ({users.length})</h2>
            </div>
          </div>

          <div className="admin-users-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Atleta</th>
                  <th>Camisa & Posição</th>
                  <th>Status no Elenco</th>
                  <th>Papel</th>
                  <th>Ações de Admin</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="admin-table-user">
                        <strong>{u.playerName}</strong>
                        <span>{u.fullName}</span>
                      </div>
                    </td>
                    <td>
                      #{u.jerseyNumber} · {u.position}
                    </td>
                    <td>
                      <span
                        className={`join-status-pill ${
                          u.rosterStatus === "approved"
                            ? "join-status-approved"
                            : u.rosterStatus === "pending"
                              ? "join-status-pending"
                              : ""
                        }`}
                      >
                        {u.rosterStatus === "approved"
                          ? "Aprovado"
                          : u.rosterStatus === "pending"
                            ? "Pendente"
                            : "Visitante"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-role-badge ${
                          u.role === "admin" ? "role-admin" : "role-user"
                        }`}
                      >
                        {u.role === "admin" ? "ADMIN" : "USUÁRIO"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        {u.role === "admin" ? (
                          <button
                            type="button"
                            className="admin-mini-btn btn-demote"
                            disabled={actionLoading}
                            onClick={() =>
                              handleUpdateUser(u.id, { role: "user" })
                            }
                          >
                            Remover Admin
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-mini-btn btn-promote"
                            disabled={actionLoading}
                            onClick={() =>
                              handleUpdateUser(u.id, { role: "admin" })
                            }
                          >
                            Tornar Admin
                          </button>
                        )}

                        {u.rosterStatus !== "approved" ? (
                          <button
                            type="button"
                            className="admin-mini-btn btn-approve-small"
                            disabled={actionLoading}
                            onClick={() =>
                              handleUpdateUser(u.id, { rosterStatus: "approved" })
                            }
                          >
                            Aprovar no Time
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-mini-btn btn-reject-small"
                            disabled={actionLoading}
                            onClick={() =>
                              handleUpdateUser(u.id, { rosterStatus: "not_requested" })
                            }
                          >
                            Tirar do Elenco
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* TAB 3: Adicionar Jogo */}
      {activeTab === "jogo" ? (
        <section className="section-wrap">
          <div className="roster-header">
            <div>
              <p className="eyebrow">Histórico & Calendário</p>
              <h2>Adicionar nova partida em Últimos Jogos</h2>
            </div>
          </div>

          <div className="admin-card-box">
            <form onSubmit={handleAddMatch} className={styles.formColumns}>
              <label className={styles.field}>
                <span>Data do jogo (DD/MM/AAAA)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9/]*"
                  maxLength={10}
                  placeholder="Ex: 22/03/2026"
                  value={matchDate}
                  onChange={(e) => setMatchDate(maskDate(e.target.value))}
                  required
                />
              </label>

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

              <label className={`${styles.field} ${styles.fullField}`}>
                <span>Link da publicação no Instagram (opcional)</span>
                <input
                  type="url"
                  placeholder="https://www.instagram.com/p/..."
                  value={instagramLink}
                  onChange={(e) => setInstagramLink(e.target.value)}
                />
              </label>

              {/* Seleção de Jogadores Convocados / Escalação */}
              <div className="match-roster-selector-section" style={{ gridColumn: "1 / -1", marginTop: "0.5rem" }}>
                <div className="match-roster-header">
                  <div>
                    <span className="field-subtitle">Escalação / Atletas Presentes no Jogo:</span>
                    <p className="field-hint">
                      Selecione os atletas aceitos no clube que estarão presentes ({matchSelectedPlayerIds.length} de {availableRoster.length} selecionados)
                    </p>
                  </div>
                  <div className="match-roster-quick-actions">
                    <button
                      type="button"
                      className="quick-select-btn"
                      onClick={() => setMatchSelectedPlayerIds(availableRoster.map((p) => p.id))}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      className="quick-select-btn"
                      onClick={() => setMatchSelectedPlayerIds([])}
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {availableRoster.length > 0 ? (
                  <div className="match-roster-chips-grid">
                    {availableRoster.map((player) => {
                      const isSelected = matchSelectedPlayerIds.includes(player.id);
                      return (
                        <button
                          type="button"
                          key={player.id}
                          className={`roster-player-chip ${isSelected ? "selected" : ""}`}
                          onClick={() => {
                            setMatchSelectedPlayerIds((prev) =>
                              isSelected ? prev.filter((id) => id !== player.id) : [...prev, player.id]
                            );
                          }}
                        >
                          <span className="chip-check-indicator">{isSelected ? "✓" : ""}</span>
                          <div className="chip-avatar">
                            {player.avatarUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={player.avatarUrl} alt={player.playerName} />
                            ) : (
                              <span>{player.jerseyNumber}</span>
                            )}
                          </div>
                          <div className="chip-info">
                            <strong>{player.playerName}</strong>
                            <span>#{player.jerseyNumber} · {player.position}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="field-hint">Nenhum atleta aprovado no momento.</p>
                )}
              </div>

              <div style={{ marginTop: "1rem", gridColumn: "1 / -1" }}>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={matchSubmitting}
                >
                  {matchSubmitting ? "Salvando partida…" : "Adicionar partida ao site"}
                </button>
              </div>
            </form>
          </div>
        </section>
      ) : null}

      {/* TAB 4: Notas Pós-Jogo & Escalação */}
      {activeTab === "notas" ? (
        <section className="section-wrap">
          <div className="roster-header">
            <div>
              <p className="eyebrow">Avaliação de Atuação</p>
              <h2>Notas pós-jogo (Definição de Titulares e Reservas)</h2>
            </div>
          </div>
          <p className="section-description">
            Atribua notas de 0 a 10 para os atletas. O sistema automaticamente escalará os melhores avaliados para o campo tático Society (2-3-1) e colocará os demais no banco de reservas!
          </p>

          <form onSubmit={handleSaveRatings} className="admin-ratings-form">
            <div className="admin-ratings-grid">
              {pitchPlayers.map((player) => (
                <div className="rating-player-box" key={player.id}>
                  <div className="rating-player-left">
                    <div className="player-card-avatar" style={{ width: 44, height: 44 }}>
                      <span className="player-card-number">{player.number}</span>
                    </div>
                    <div>
                      <strong>{player.name}</strong>
                      <span className="rating-player-sub">
                        #{player.number} · {player.position}
                      </span>
                    </div>
                  </div>

                  <div className="rating-input-wrap">
                    <span>Nota:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={ratingsState[player.id] ?? "7.0"}
                      onChange={(e) =>
                        setRatingsState((prev) => ({
                          ...prev,
                          [player.id]: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "1.75rem", display: "flex", gap: "1rem" }}>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={actionLoading}
              >
                {actionLoading ? "Recalculando…" : "Salvar Notas & Atualizar Escalação"}
              </button>
              <Link href="/time" className={styles.secondaryButton}>
                Ver Campo Tático Atualizado
              </Link>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
