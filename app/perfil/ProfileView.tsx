"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";

import { DOMINANT_FEET, PLAYER_POSITIONS } from "@/lib/player";
import styles from "../auth.module.css";

type PlayerProfile = {
  id: string;
  fullName: string;
  playerName: string;
  jerseyNumber: number;
  position: string;
  secondaryPosition: string | null;
  dominantFoot: string | null;
  role?: string;
  rosterStatus?: string;
  createdAt: string;
  avatarUrl?: string | null;
};

type FeedbackStatus = { type: "error" | "success"; message: string } | null;

export default function ProfileView() {
  const [user, setUser] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState<FeedbackStatus>(null);

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editStatus, setEditStatus] = useState<FeedbackStatus>(null);

  const [editFullName, setEditFullName] = useState("");
  const [editJerseyNumber, setEditJerseyNumber] = useState<number | string>(1);
  const [editPosition, setEditPosition] = useState("");
  const [editSecondaryPosition, setEditSecondaryPosition] = useState("");
  const [editDominantFoot, setEditDominantFoot] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/auth/me", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (response.status === 401) {
          window.location.replace("/acesso");
          return;
        }

        const body = (await response.json()) as {
          user?: PlayerProfile;
          error?: string;
        };
        if (!response.ok || !body.user) {
          throw new Error(body.error ?? "Não foi possível carregar o perfil.");
        }
        if (active) {
          setUser(body.user);
          setEditFullName(body.user.fullName);
          setEditJerseyNumber(body.user.jerseyNumber);
          setEditPosition(body.user.position);
          setEditSecondaryPosition(body.user.secondaryPosition ?? "");
          setEditDominantFoot(body.user.dominantFoot ?? "");
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar o perfil.",
          );
        }
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  function startEditing() {
    if (!user) return;
    setEditFullName(user.fullName);
    setEditJerseyNumber(user.jerseyNumber);
    setEditPosition(user.position);
    setEditSecondaryPosition(user.secondaryPosition ?? "");
    setEditDominantFoot(user.dominantFoot ?? "");
    setEditStatus(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditStatus(null);
  }

  async function handleSaveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setEditStatus(null);

    try {
      const response = await fetch("/api/player/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editFullName,
          jerseyNumber: Number(editJerseyNumber),
          position: editPosition,
          secondaryPosition:
            editSecondaryPosition === "" || editSecondaryPosition === "Nenhuma"
              ? null
              : editSecondaryPosition,
          dominantFoot:
            editDominantFoot === "" || editDominantFoot === "Não informada"
              ? null
              : editDominantFoot,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        user?: PlayerProfile;
        error?: string;
      };

      if (!response.ok || !body.user) {
        throw new Error(body.error ?? "Não foi possível salvar as alterações.");
      }

      setUser(body.user);
      setEditStatus({
        type: "success",
        message: "Perfil atualizado com sucesso.",
      });
      setIsEditing(false);
    } catch (err) {
      setEditStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Erro ao salvar perfil.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setAvatarStatus({
        type: "error",
        message: "Formato inválido. Use JPEG, PNG ou WebP.",
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarStatus({
        type: "error",
        message: "A foto deve ter no máximo 2 MB.",
      });
      return;
    }

    setUploading(true);
    setAvatarStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/avatar", {
        method: "POST",
        body: formData,
      });

      const body = (await response.json().catch(() => ({}))) as {
        avatarUrl?: string;
        error?: string;
      };
      if (!response.ok || !body.avatarUrl) {
        throw new Error(body.error ?? "Não foi possível enviar a foto.");
      }

      const cacheBustedUrl = `${body.avatarUrl}${body.avatarUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
      setUser((prev) => (prev ? { ...prev, avatarUrl: cacheBustedUrl } : null));
      setAvatarStatus({
        type: "success",
        message: "Foto de perfil atualizada com sucesso.",
      });
    } catch (err) {
      setAvatarStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Erro ao enviar a foto.",
      });
    } finally {
      setUploading(false);
      if (event.target) event.target.value = "";
    }
  }

  async function handleAvatarDelete() {
    setDeletingAvatar(true);
    setAvatarStatus(null);

    try {
      const response = await fetch("/api/avatar", {
        method: "DELETE",
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error ?? "Não foi possível remover a foto.");
      }

      setUser((prev) => (prev ? { ...prev, avatarUrl: null } : null));
      setAvatarStatus({
        type: "success",
        message: "Foto de perfil removida com sucesso.",
      });
    } catch (err) {
      setAvatarStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Erro ao remover a foto.",
      });
    } finally {
      setDeletingAvatar(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.assign("/");
  }

  if (error) {
    return (
      <section className={styles.profileCard}>
        <p className={styles.errorMessage} role="alert">
          {error}
        </p>
        <Link className={styles.secondaryButton} href="/acesso">
          Voltar para o acesso
        </Link>
      </section>
    );
  }

  if (!user) {
    return (
      <section className={styles.profileCard} aria-live="polite">
        <p className={styles.loadingText}>Carregando seu perfil…</p>
      </section>
    );
  }

  return (
    <section className={styles.profileCard}>
      <div className={styles.profileHero}>
        <div className={styles.avatarContainer}>
          <div className={styles.avatarBox}>
            {user.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.avatarUrl}
                alt={`Foto de ${user.playerName}`}
                className={styles.avatarPhoto}
              />
            ) : (
              <div
                className={styles.jerseyNumber}
                aria-label={`Camisa ${user.jerseyNumber}`}
              >
                {user.jerseyNumber}
              </div>
            )}
          </div>

          <div className={styles.avatarControls}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handleAvatarUpload}
              disabled={uploading || deletingAvatar}
            />
            <button
              type="button"
              className={styles.avatarButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || deletingAvatar}
            >
              {uploading
                ? "Enviando…"
                : user.avatarUrl
                  ? "Trocar foto"
                  : "Adicionar foto"}
            </button>
            {user.avatarUrl ? (
              <button
                type="button"
                className={styles.avatarDeleteButton}
                onClick={handleAvatarDelete}
                disabled={uploading || deletingAvatar}
              >
                {deletingAvatar ? "Removendo…" : "Remover"}
              </button>
            ) : null}
          </div>
        </div>

        <div className={styles.profileHeaderInfo}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <p>Perfil do jogador</p>
            {user.role === "admin" ? (
              <span className="admin-crown-badge">ADMIN</span>
            ) : null}
          </div>
          <h1>{user.playerName}</h1>
          <span>
            {user.position}
            {user.secondaryPosition ? ` · ${user.secondaryPosition}` : ""}
          </span>
          {user.role === "admin" ? (
            <div style={{ marginTop: "0.6rem" }}>
              <Link href="/admin" className="admin-mini-btn btn-promote" style={{ textDecoration: "none", display: "inline-block" }}>
                Acessar Painel do Administrador
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {avatarStatus ? (
        <p
          className={
            avatarStatus.type === "error"
              ? styles.errorMessage
              : styles.successMessage
          }
          style={{ marginTop: "1rem" }}
          role="status"
        >
          {avatarStatus.message}
        </p>
      ) : null}

      {editStatus ? (
        <p
          className={
            editStatus.type === "error"
              ? styles.errorMessage
              : styles.successMessage
          }
          style={{ marginTop: "1rem" }}
          role="status"
        >
          {editStatus.message}
        </p>
      ) : null}

      <div className={styles.profileSectionHeader}>
        <h2 className={styles.profileSectionTitle}>Ficha do atleta</h2>
        {!isEditing ? (
          <button
            type="button"
            className={styles.editToggleBtn}
            onClick={startEditing}
          >
            Personalizar dados
          </button>
        ) : null}
      </div>

      {isEditing ? (
        <form className={styles.editForm} onSubmit={handleSaveProfile}>
          <div className={styles.formColumns}>
            <label className={styles.field}>
              <span>Nome completo</span>
              <input
                type="text"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                minLength={3}
                maxLength={100}
                required
              />
            </label>

            <label className={styles.field}>
              <span>Número da camisa</span>
              <input
                type="number"
                value={editJerseyNumber}
                onChange={(e) => setEditJerseyNumber(e.target.value)}
                min={1}
                max={99}
                required
              />
            </label>

            <label className={styles.field}>
              <span>Posição principal</span>
              <select
                value={editPosition}
                onChange={(e) => setEditPosition(e.target.value)}
                required
              >
                {PLAYER_POSITIONS.map((pos) => (
                  <option value={pos} key={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Posição secundária</span>
              <select
                value={editSecondaryPosition}
                onChange={(e) => setEditSecondaryPosition(e.target.value)}
              >
                <option value="">Nenhuma</option>
                {PLAYER_POSITIONS.filter((pos) => pos !== editPosition).map(
                  (pos) => (
                    <option value={pos} key={pos}>
                      {pos}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className={`${styles.field} ${styles.fullField}`}>
              <span>Perna dominante</span>
              <select
                value={editDominantFoot}
                onChange={(e) => setEditDominantFoot(e.target.value)}
              >
                <option value="">Não informada</option>
                {DOMINANT_FEET.map((foot) => (
                  <option value={foot} key={foot}>
                    {foot}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.editFormButtons}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={cancelEditing}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isSaving}
            >
              {isSaving ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </form>
      ) : (
        <dl className={styles.profileDetails}>
          <div>
            <dt>Nome completo</dt>
            <dd>{user.fullName}</dd>
          </div>
          <div>
            <dt>Nome de jogador</dt>
            <dd>{user.playerName}</dd>
          </div>
          <div>
            <dt>Número da camisa</dt>
            <dd>#{user.jerseyNumber}</dd>
          </div>
          <div>
            <dt>Posição principal</dt>
            <dd>{user.position}</dd>
          </div>
          <div>
            <dt>Posição secundária</dt>
            <dd>{user.secondaryPosition || "Nenhuma"}</dd>
          </div>
          <div>
            <dt>Perna dominante</dt>
            <dd>{user.dominantFoot || "Não informada"}</dd>
          </div>
        </dl>
      )}

      <div className={styles.profileActions}>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={() => window.location.assign("/")}
        >
          Voltar ao site
        </button>
        <button
          className={styles.logoutButton}
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? "Saindo…" : "Sair da conta"}
        </button>
      </div>
    </section>
  );
}
