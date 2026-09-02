"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { RosterPlayer } from "@/lib/team";
import type { PlayerProfile } from "@/lib/auth";
import {
  DEFAULT_MATCH_TACTICS,
  organizeLineupByRatings,
  type MatchTactics,
  type PitchPlayer,
} from "@/lib/matches";
import TacticalPitch from "./TacticalPitch";
import MatchTimeline from "./MatchTimeline";
import MatchEventModal from "./MatchEventModal";
import PostMatchModal, { type TeammateToRate } from "./PostMatchModal";

const CATEGORIES = [
  "Todos",
  "Goleiros",
  "Zagueiros/Fixos",
  "Alas e Meias",
  "Atacantes/Pivôs",
] as const;

type TeamTab = "jogo" | "elenco";

export default function TeamView() {
  const [activeTab, setActiveTab] = useState<TeamTab>("jogo");
  const [user, setUser] = useState<PlayerProfile | null>(null);
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [tactics, setTactics] = useState<MatchTactics>(DEFAULT_MATCH_TACTICS);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isPostMatchModalOpen, setIsPostMatchModalOpen] = useState(false);
  const [postMatchStatus, setPostMatchStatus] = useState<{
    isOpen: boolean;
    isEscalado: boolean;
    hasSubmitted: boolean;
    match: {
      date: string;
      time?: string;
      home: string;
      away: string;
      score: string;
      result: string;
    } | null;
    userPlayer: {
      id: string;
      name: string;
      number: number;
      position: string;
      goals: number;
      assists: number;
    } | null;
    teammates: TeammateToRate[];
  } | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");

  async function loadMatchEvents() {
    try {
      const res = await fetch("/api/matches/latest-events", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { tactics?: MatchTactics };
        if (data.tactics) {
          setTactics(data.tactics);
        }
      }
    } catch (err) {
      console.error("load-match-events-failed", err);
    }
  }

  async function loadPostMatchStatus() {
    try {
      const res = await fetch("/api/matches/post-match", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPostMatchStatus(data);
        // Automatically open modal for escalado player who has not submitted yet
        if (data.isOpen && data.isEscalado && !data.hasSubmitted) {
          setIsPostMatchModalOpen(true);
        }
      }
    } catch (err) {
      console.error("load-post-match-status-failed", err);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        // Load user session
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        if (meRes.ok) {
          const meData = (await meRes.json()) as { user?: PlayerProfile };
          if (active && meData.user) {
            setUser(meData.user);
          }
        }

        // Load roster
        const rosterRes = await fetch("/api/team/roster", { cache: "no-store" });
        if (rosterRes.ok) {
          const rosterData = (await rosterRes.json()) as {
            players?: RosterPlayer[];
          };
          if (active && rosterData.players) {
            setPlayers(rosterData.players);
          }
        }

        // Load tactics and events
        await loadMatchEvents();

        // Load post match evaluation status
        await loadPostMatchStatus();
      } catch (err) {
        console.error("load-team-failed", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, []);

  async function handleRequestJoin() {
    setActionLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/team/join", {
        method: "POST",
      });
      const data = (await res.json()) as {
        message?: string;
        rosterStatus?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível enviar a solicitação.");
      }

      setUser((prev) =>
        prev
          ? {
              ...prev,
              rosterStatus: data.rosterStatus ?? "pending",
            }
          : null,
      );
      setFeedback({
        type: "success",
        message: data.message ?? "Solicitação enviada com sucesso!",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Erro ao solicitar entrada no time.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelJoin() {
    setActionLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/team/join", {
        method: "DELETE",
      });
      const data = (await res.json()) as {
        message?: string;
        rosterStatus?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível cancelar.");
      }

      setUser((prev) =>
        prev
          ? {
              ...prev,
              rosterStatus: data.rosterStatus ?? "not_requested",
            }
          : null,
      );
      setFeedback({
        type: "success",
        message: "Solicitação cancelada.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error ? err.message : "Erro ao cancelar solicitação.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  const filteredPlayers = useMemo(() => {
    if (selectedCategory === "Todos") return players;
    if (selectedCategory === "Goleiros") {
      return players.filter((p) => p.position === "Goleiro");
    }
    if (selectedCategory === "Zagueiros/Fixos") {
      return players.filter((p) => p.position === "Zagueiro/Fixo");
    }
    if (selectedCategory === "Alas e Meias") {
      return players.filter(
        (p) =>
          p.position.includes("Ala") ||
          p.position.includes("Meia") ||
          (p.secondaryPosition &&
            (p.secondaryPosition.includes("Ala") ||
              p.secondaryPosition.includes("Meia"))),
      );
    }
    if (selectedCategory === "Atacantes/Pivôs") {
      return players.filter(
        (p) =>
          p.position === "Atacante/Pivô" ||
          p.secondaryPosition === "Atacante/Pivô",
      );
    }
    return players;
  }, [players, selectedCategory]);

  const enrichedTactics = useMemo(() => {
    function normalizeName(str: string): string {
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
    }

    function enrichPlayer(p: PitchPlayer): PitchPlayer {
      const normP = normalizeName(p.name);
      const byName = players.find(
        (rp) => normalizeName(rp.playerName) === normP || rp.id === p.id,
      );
      if (byName?.avatarUrl) {
        return { ...p, avatarUrl: byName.avatarUrl };
      }
      if (byName) {
        return p;
      }

      const byNumWithAvatar = players.find(
        (rp) => rp.jerseyNumber === p.number && Boolean(rp.avatarUrl),
      );
      if (byNumWithAvatar?.avatarUrl) {
        return { ...p, avatarUrl: byNumWithAvatar.avatarUrl };
      }

      return p;
    }

    const allEnriched = [
      ...tactics.starters.map(enrichPlayer),
      ...tactics.bench.map(enrichPlayer),
    ];

    const { starters, bench } = organizeLineupByRatings(allEnriched);

    return {
      ...tactics,
      starters,
      bench,
    };
  }, [tactics, players]);

  const canRegisterPostMatchStats = Boolean(
    postMatchStatus?.isOpen && postMatchStatus.isEscalado,
  );

  return (
    <div className="team-page">
      {/* Team Hero */}
      <section className="team-hero section-wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FLN BULLS · Futebol 7</p>
            <h1>Elenco Oficial & Último Jogo</h1>
          </div>
          <p className="section-description">
            Escalação tática e acontecimentos do último jogo, além do elenco oficial e solicitação de vaga.
          </p>
        </div>

        {/* Join Request Banner */}
        <div className="join-banner">
          <div className="join-banner-copy">
            {!user ? (
              <>
                <h3>Quer jogar no FLN BULLS?</h3>
                <p>
                  Crie sua conta ou faça login com seu nome de atleta para
                  solicitar vaga no elenco oficial do time.
                </p>
              </>
            ) : user.rosterStatus === "approved" ? (
              <>
                <span className="join-status-pill join-status-approved">
                  Atleta Oficial Confirmado
                </span>
                <h3>Você faz parte do elenco!</h3>
                <p>
                  Sua inscrição está aprovada como #{user.jerseyNumber} ·{" "}
                  {user.position}.
                </p>
              </>
            ) : user.rosterStatus === "pending" ? (
              <>
                <span className="join-status-pill join-status-pending">
                  Solicitação em Análise
                </span>
                <h3>Solicitação enviada para a diretoria</h3>
                <p>
                  Seu pedido para ingressar no elenco com a camisa #
                  {user.jerseyNumber} está sob revisão.
                </p>
              </>
            ) : (
              <>
                <h3>Pronto para vestir a camisa do Bulls?</h3>
                <p>
                  Olá, <strong>{user.playerName}</strong>! Envie sua
                  solicitação para entrar no elenco oficial como #
                  {user.jerseyNumber} ({user.position}).
                </p>
              </>
            )}

            {feedback ? (
              <p
                style={{
                  marginTop: "0.6rem",
                  color: feedback.type === "error" ? "#ff9cab" : "#7beb9f",
                  fontWeight: 650,
                  fontSize: "0.82rem",
                }}
              >
                {feedback.message}
              </p>
            ) : null}
          </div>

          <div className="join-actions">
            {!user ? (
              <Link href="/acesso" className="join-button pressable">
                Entrar / Solicitar vaga
              </Link>
            ) : user.rosterStatus === "approved" ? (
              <Link href="/perfil" className="join-button pressable">
                Ver meu perfil
              </Link>
            ) : user.rosterStatus === "pending" ? (
              <button
                type="button"
                className="cancel-join-button pressable"
                onClick={handleCancelJoin}
                disabled={actionLoading}
              >
                {actionLoading ? "Aguarde…" : "Cancelar solicitação"}
              </button>
            ) : (
              <button
                type="button"
                className="join-button pressable"
                onClick={handleRequestJoin}
                disabled={actionLoading}
              >
                {actionLoading ? "Enviando…" : "Solicitar entrada no time"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Tabs Navigation */}
      <section className="section-wrap team-tabs-nav-wrap">
        <div className="team-subtabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "jogo"}
            className={`team-tab-btn ${activeTab === "jogo" ? "active" : ""}`}
            onClick={() => setActiveTab("jogo")}
          >
            Escalação e Último Jogo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "elenco"}
            className={`team-tab-btn ${activeTab === "elenco" ? "active" : ""}`}
            onClick={() => setActiveTab("elenco")}
          >
            Plantel do Elenco ({players.length})
          </button>
        </div>
      </section>

      {/* Tab 1: Último Jogo e Campo Tático */}
      {activeTab === "jogo" ? (
        <section className="section-wrap match-tactics-section">
          {/* Post-Match Action Banner for Escalados */}
          {postMatchStatus?.isOpen && postMatchStatus?.isEscalado ? (
            <div className="post-match-banner-card">
              <div className="post-match-banner-info">
                <div className="post-match-banner-badge">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icon-rating.png" alt="Pós-Jogo" className="post-match-star-icon" />
                </div>
                <div>
                  <strong>
                    {postMatchStatus.hasSubmitted
                      ? "Sua Avaliação Pós-Jogo foi Registrada"
                      : "Avaliação Pós-Jogo Liberada para Atletas Escalados"}
                  </strong>
                  <p>
                    {postMatchStatus.hasSubmitted
                      ? "Você já registrou seus gols, assistências e notas para os companheiros. As médias foram calculadas."
                      : "Você jogou nesta partida! Informe seus gols/assistências e dê notas para seus companheiros para calcular a média final do time."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="post-match-open-btn"
                onClick={() => setIsPostMatchModalOpen(true)}
              >
                {postMatchStatus.hasSubmitted ? "Revisar Minha Avaliação" : "Avaliar Jogo & Atletas"}
              </button>
            </div>
          ) : null}

          {/* Tactical Pitch & Bench */}
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">Futebol 7 · Formação Tática</p>
              <h2>Escalação do Último Jogo</h2>
            </div>
          </div>

          <TacticalPitch
            formation={enrichedTactics.formation}
            starters={enrichedTactics.starters}
            bench={enrichedTactics.bench}
          />

          {/* Timeline de Acontecimentos do Jogo */}
          <MatchTimeline
            events={tactics.events}
            onOpenRegisterModal={() => setIsPostMatchModalOpen(true)}
            isLoggedIn={Boolean(user)}
            canRegisterStats={canRegisterPostMatchStats}
          />
        </section>
      ) : (
        /* Tab 2: Plantel Completo */
        <section className="section-wrap" aria-labelledby="elenco-titulo">
          <div className="roster-header">
            <div>
              <p className="eyebrow">Plantel</p>
              <h2 id="elenco-titulo">
                Atletas confirmados ({filteredPlayers.length})
              </h2>
            </div>

            <div className="position-filter" aria-label="Filtrar elenco por posição">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  className={selectedCategory === cat ? "active" : ""}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="empty-roster-card">
              <p>Carregando elenco do Bulls…</p>
            </div>
          ) : filteredPlayers.length > 0 ? (
            <div className="players-grid">
              {filteredPlayers.map((player) => (
                <article className="player-card" key={player.id}>
                  <div className="player-card-top">
                    <div className="player-card-avatar">
                      {player.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={player.avatarUrl}
                          alt={`Foto de ${player.playerName}`}
                        />
                      ) : (
                        <span className="player-card-number">
                          {player.jerseyNumber}
                        </span>
                      )}
                    </div>
                    <div className="player-card-info">
                      <strong>{player.playerName}</strong>
                      <span className="player-card-pos">
                        {player.position}
                        {player.secondaryPosition
                          ? ` · ${player.secondaryPosition}`
                          : ""}
                      </span>
                    </div>
                  </div>

                  <div className="player-card-details">
                    <span className="player-badge-tag player-badge-official">
                      #{player.jerseyNumber} Oficial
                    </span>
                    {player.dominantFoot ? (
                      <span className="player-badge-tag">
                        Pé: {player.dominantFoot}
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-roster-card">
              <h3>Nenhum atleta listado nesta categoria ainda</h3>
              <p>
                O elenco oficial está sendo montado para a temporada. Faça seu
                cadastro e solicite sua entrada no time!
              </p>
            </div>
          )}
        </section>
      )}

      {/* Match Event Submission Modal */}
      <MatchEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onEventAdded={loadMatchEvents}
        playerName={user?.playerName}
        avatarUrl={user?.avatarUrl}
        jerseyNumber={user?.jerseyNumber}
      />

      {/* Post-Match Evaluation Modal */}
      <PostMatchModal
        isOpen={isPostMatchModalOpen}
        onClose={() => setIsPostMatchModalOpen(false)}
        onSubmitted={async () => {
          await loadMatchEvents();
          await loadPostMatchStatus();
        }}
        playerName={user?.playerName}
        avatarUrl={user?.avatarUrl}
        jerseyNumber={user?.jerseyNumber}
        teammates={postMatchStatus?.teammates || []}
        initialGoals={postMatchStatus?.userPlayer?.goals || 0}
        initialAssists={postMatchStatus?.userPlayer?.assists || 0}
      />
    </div>
  );
}
