"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { PLAYER_POSITIONS } from "@/lib/player";
import styles from "../auth.module.css";

type FormStatus = { type: "error" | "success"; message: string } | null;
type TurnstileWindow = Window &
  typeof globalThis & {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          theme: "dark";
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => string;
      reset: (widgetId: string) => void;
    };
  };

async function sendAuthRequest(
  endpoint: string,
  payload: unknown,
  csrfToken: string,
) {
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(body.error ?? "Não foi possível concluir a operação.");
  }
  return body;
}

function TurnstileField({
  siteKey,
  onToken,
  resetSignal,
}: {
  siteKey: string;
  onToken: (token: string) => void;
  resetSignal: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let active = true;
    const renderWidget = () => {
      const turnstile = (window as TurnstileWindow).turnstile;
      if (!active || !containerRef.current || !turnstile || widgetIdRef.current) {
        return;
      }

      widgetIdRef.current = turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "dark",
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };

    const handleLoaded = () => renderWidget();
    window.addEventListener("turnstile-loaded", handleLoaded);

    if ((window as TurnstileWindow).turnstile) {
      renderWidget();
    } else if (!document.querySelector("script[data-turnstile-script]")) {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = "true";
      script.onload = () => {
        window.dispatchEvent(new Event("turnstile-loaded"));
      };
      document.head.appendChild(script);
    }

    return () => {
      active = false;
      window.removeEventListener("turnstile-loaded", handleLoaded);
    };
  }, [onToken, siteKey]);

  useEffect(() => {
    const turnstile = (window as TurnstileWindow).turnstile;
    if (resetSignal > 0 && turnstile && widgetIdRef.current) {
      turnstile.reset(widgetIdRef.current);
      onToken("");
    }
  }, [onToken, resetSignal]);

  return (
    <div className={styles.turnstileWrap}>
      <div ref={containerRef} />
    </div>
  );
}

export default function AuthForms() {
  const [loginStatus, setLoginStatus] = useState<FormStatus>(null);
  const [registerStatus, setRegisterStatus] = useState<FormStatus>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [turnstileSiteKey, setTurnstileSiteKey] = useState("");
  const [loginTurnstileToken, setLoginTurnstileToken] = useState("");
  const [registerTurnstileToken, setRegisterTurnstileToken] = useState("");
  const [loginTurnstileReset, setLoginTurnstileReset] = useState(0);
  const [registerTurnstileReset, setRegisterTurnstileReset] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadSecuritySetup() {
      const [csrfResponse, configResponse] = await Promise.all([
        fetch("/api/auth/csrf", {
          cache: "no-store",
          credentials: "same-origin",
        }),
        fetch("/api/auth/security-config", {
          cache: "no-store",
          credentials: "same-origin",
        }),
      ]);
      const csrfBody = (await csrfResponse.json().catch(() => ({}))) as {
        token?: string;
      };
      const configBody = (await configResponse.json().catch(() => ({}))) as {
        turnstileSiteKey?: string;
      };

      if (active && csrfResponse.ok && csrfBody.token) {
        setCsrfToken(csrfBody.token);
      }
      if (active && configResponse.ok && configBody.turnstileSiteKey) {
        setTurnstileSiteKey(configBody.turnstileSiteKey);
      }
    }

    loadSecuritySetup().catch(() => {
      if (active) {
        setLoginStatus({
          type: "error",
          message: "Não foi possível preparar o formulário de acesso.",
        });
        setRegisterStatus({
          type: "error",
          message: "Não foi possível preparar o formulário de cadastro.",
        });
      }
    });

    return () => {
      active = false;
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginLoading(true);
    setLoginStatus(null);

    const form = new FormData(event.currentTarget);
    try {
      if (!csrfToken) {
        throw new Error("Recarregue a página antes de entrar.");
      }
      if (turnstileSiteKey && !loginTurnstileToken) {
        throw new Error("Conclua a verificação anti-robô.");
      }

      await sendAuthRequest(
        "/api/auth/login",
        {
          playerName: form.get("playerName"),
          password: form.get("password"),
          turnstileToken: loginTurnstileToken,
        },
        csrfToken,
      );
      setLoginStatus({ type: "success", message: "Login realizado." });
      window.location.assign("/perfil");
    } catch (error) {
      setLoginStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Não foi possível entrar.",
      });
      setLoginTurnstileToken("");
      setLoginTurnstileReset((value) => value + 1);
      setLoginLoading(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegisterLoading(true);
    setRegisterStatus(null);

    const form = new FormData(event.currentTarget);
    try {
      if (!csrfToken) {
        throw new Error("Recarregue a página antes de criar o usuário.");
      }
      if (turnstileSiteKey && !registerTurnstileToken) {
        throw new Error("Conclua a verificação anti-robô.");
      }

      await sendAuthRequest(
        "/api/auth/register",
        {
          fullName: form.get("fullName"),
          playerName: form.get("playerName"),
          password: form.get("password"),
          confirmPassword: form.get("confirmPassword"),
          jerseyNumber: form.get("jerseyNumber"),
          position: form.get("position"),
          turnstileToken: registerTurnstileToken,
        },
        csrfToken,
      );
      setRegisterStatus({
        type: "success",
        message: "Usuário criado. Abrindo seu perfil…",
      });
      window.location.assign("/perfil");
    } catch (error) {
      setRegisterStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível criar o usuário.",
      });
      setRegisterTurnstileToken("");
      setRegisterTurnstileReset((value) => value + 1);
      setRegisterLoading(false);
    }
  }

  return (
    <div className={styles.authGrid}>
      <section className={`${styles.authCard} ${styles.loginCard}`}>
        <div className={styles.cardHeading}>
          <p>Já sou jogador</p>
          <h2>Entrar</h2>
          <span>Use seu nome de jogador e sua senha.</span>
        </div>

        <form className={styles.form} onSubmit={handleLogin}>
          <label className={styles.field}>
            <span>Nome de jogador</span>
            <input
              name="playerName"
              type="text"
              autoComplete="username"
              minLength={3}
              maxLength={30}
              required
            />
          </label>
          <label className={styles.field}>
            <span>Senha</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={8}
              maxLength={128}
              required
            />
          </label>

          {loginStatus ? (
            <p
              className={
                loginStatus.type === "error"
                  ? styles.errorMessage
                  : styles.successMessage
              }
              role="status"
            >
              {loginStatus.message}
            </p>
          ) : null}

          {turnstileSiteKey ? (
            <TurnstileField
              siteKey={turnstileSiteKey}
              onToken={setLoginTurnstileToken}
              resetSignal={loginTurnstileReset}
            />
          ) : null}

          <button
            className={styles.primaryButton}
            type="submit"
            disabled={loginLoading || !csrfToken}
          >
            {loginLoading ? "Entrando…" : "Entrar no perfil"}
          </button>
        </form>
      </section>

      <section className={styles.authCard}>
        <div className={styles.cardHeading}>
          <p>Novo no elenco</p>
          <h2>Criar usuário</h2>
          <span>Preencha seus dados para montar o perfil de jogador.</span>
        </div>

        <form className={styles.form} onSubmit={handleRegister}>
          <div className={styles.formColumns}>
            <label className={`${styles.field} ${styles.fullField}`}>
              <span>Nome completo</span>
              <input
                name="fullName"
                type="text"
                autoComplete="name"
                minLength={3}
                maxLength={100}
                required
              />
            </label>
            <label className={`${styles.field} ${styles.fullField}`}>
              <span>Nome de jogador</span>
              <input
                name="playerName"
                type="text"
                autoComplete="username"
                minLength={3}
                maxLength={30}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Senha</span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Confirmar senha</span>
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Número da camisa</span>
              <input
                name="jerseyNumber"
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Posição</span>
              <select name="position" defaultValue="" required>
                <option value="" disabled>
                  Escolha uma posição
                </option>
                {PLAYER_POSITIONS.map((position) => (
                  <option value={position} key={position}>
                    {position}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className={styles.passwordHint}>
            A senha precisa ter pelo menos 8 caracteres.
          </p>

          {registerStatus ? (
            <p
              className={
                registerStatus.type === "error"
                  ? styles.errorMessage
                  : styles.successMessage
              }
              role="status"
            >
              {registerStatus.message}
            </p>
          ) : null}

          {turnstileSiteKey ? (
            <TurnstileField
              siteKey={turnstileSiteKey}
              onToken={setRegisterTurnstileToken}
              resetSignal={registerTurnstileReset}
            />
          ) : null}

          <button
            className={styles.primaryButton}
            type="submit"
            disabled={registerLoading || !csrfToken}
          >
            {registerLoading ? "Criando usuário…" : "Criar meu usuário"}
          </button>
        </form>
      </section>
    </div>
  );
}
