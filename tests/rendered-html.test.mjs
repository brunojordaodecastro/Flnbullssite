import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the FLN BULLS home and recent matches", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const homeSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const recentMatchesSection =
    html.match(/<section class="recent-matches"[\s\S]*?<\/section>/i)?.[0] ?? "";
  assert.match(html, /<title>FLN BULLS \| Futebol 7 em Florianópolis<\/title>/i);
  assert.match(html, /id="jogos-titulo"[^>]*>Jogos<\/h2>/i);
  assert.doesNotMatch(
    recentMatchesSection,
    /Forma recente|Histórico enviado pelo time/i,
  );
  assert.match(html, /fln-bulls-shield\.png/i);
  assert.match(homeSource, /<a href="\/time">\s*Time\s*<\/a>/);
  assert.doesNotMatch(homeSource, /<Link href="\/time">/);
  assert.match(html, /class="login-button pressable" href="\/acesso"/i);
  assert.equal(html.match(/class="recent-match"/g)?.length, 10);
  assert.equal(html.match(/<a class="recent-match-link"/g)?.length, 9);
  assert.match(html, /team-marcivel-dias\.png/i);
  assert.match(html, /team-tanquinho\.png/i);
  assert.match(html, /team-never-broken\.png/i);
  assert.match(html, /team-vasco-brahma\.png/i);
  assert.match(html, /team-bangu\.png/i);
  assert.match(html, /team-moka-fc\.png/i);
  assert.match(html, /team-ae-falcoes\.png/i);
  assert.match(html, /instagram\.com\/fln_bulls\/p\/DV7VriVAC9d\//i);
  assert.match(html, /instagram\.com\/fln_bulls\/p\/C6zjw5mu9OE\//i);
  assert.match(html, /Amigos Vitão/i);
  assert.match(html, /Moka FC 6–4 FLN BULLS/i);
  assert.match(html, /AE Falcões 6–3 FLN BULLS/i);
  assert.match(html, /FLN BULLS 3–12 AE Falcões/i);
  assert.match(html, /class="recent-match-link recent-match-static"/i);
  assert.equal(recentMatchesSection.match(/result-d/g)?.length, 3);
  assert.doesNotMatch(
    html,
    /Futebol 7, amizade e história registrada jogo a jogo/i,
  );
  assert.ok(html.indexOf("15 mar 2026") < html.indexOf("19 mai 2025"));
  assert.ok(html.indexOf("19 mai 2025") < html.indexOf("23 mar 2025"));
  assert.ok(html.indexOf("23 mar 2025") < html.indexOf("20 mar 2025"));
  assert.ok(html.indexOf("20 mar 2025") < html.indexOf("25 fev 2025"));
  assert.ok(html.indexOf("25 fev 2025") < html.indexOf("17 mai 2024"));
  assert.ok(html.indexOf("17 mai 2024") < html.indexOf("10 mai 2024"));
  assert.ok(html.indexOf("10 mai 2024") < html.indexOf("21 abr 2024"));
  assert.ok(html.indexOf("21 abr 2024") < html.indexOf("03 out 2023"));
  assert.ok(html.indexOf("03 out 2023") < html.indexOf("28 mai 2023"));
  assert.ok(
    html.indexOf("Quer jogar contra o Bulls?") <
      html.indexOf("Amigos fora de campo. Bulls dentro dele."),
  );
  assert.doesNotMatch(html, /Pular para o conteúdo|skip-link/i);
  assert.doesNotMatch(
    html.match(/<header[\s\S]*?<\/header>/i)?.[0] ?? "",
    /class="brand"|class="brand-mark"|class="brand-name"/i,
  );
});

test("renders player registration and login forms", async () => {
  const response = await render("/acesso");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Acesso do jogador \| FLN BULLS/i);
  assert.match(html, /<h2>Entrar<\/h2>/i);
  assert.match(html, /<h2>Criar usuário<\/h2>/i);
  assert.match(html, /Nome completo/i);
  assert.match(html, /Nome de jogador/i);
  assert.match(html, /Confirmar senha/i);
  assert.match(html, /Número da camisa/i);
  assert.match(html, /Escolha uma posição/i);
  assert.match(html, /Goleiro/i);
  assert.match(html, /Zagueiro\/Fixo/i);
  assert.match(html, /Ala Direito/i);
  assert.match(html, /Ala Esquerdo/i);
  assert.match(html, /Meia Direito/i);
  assert.match(html, /Meia Esquerdo/i);
  assert.match(html, /Atacante\/Pivô/i);
});

test("renders the protected player profile shell", async () => {
  const response = await render("/perfil");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Perfil do jogador \| FLN BULLS/i);
  assert.match(html, /Área protegida/i);
  assert.match(html, /Carregando seu perfil/i);
});

test("keeps the profile return action as a direct home button", async () => {
  const [profilePage, profile] = await Promise.all([
    readFile(new URL("../app/perfil/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/perfil/ProfileView.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(profilePage, /<a className=\{styles\.authBrand\} href="\/">/);
  assert.doesNotMatch(profilePage, /<Link className=\{styles\.authBrand\} href="\/">/);
  assert.match(
    profile,
    /onClick=\{\(\) => window\.location\.assign\("\/"\)\}/,
  );
  assert.doesNotMatch(
    profile,
    /<Link className=\{styles\.secondaryButton\} href="\/">\s*Voltar ao site/,
  );
});

test("keeps the signed-in account entry in the home header", async () => {
  const accountButton = await readFile(
    new URL("../app/HomeAccountButton.tsx", import.meta.url),
    "utf8",
  );

  assert.match(accountButton, /fetch\("\/api\/auth\/me"/);
  assert.match(accountButton, /href="\/perfil"/);
  assert.match(accountButton, /Meu perfil/);
  assert.match(accountButton, /player\.playerName/);
});

test("keeps auth storage and session security in source", async () => {
  const [
    migration,
    rateLimitMigration,
    auth,
    rateLimit,
    security,
    csrfRoute,
    securityConfigRoute,
    authForms,
    envExample,
    database,
    loginRoute,
    registerRoute,
  ] = await Promise.all([
    readFile(
      new URL("../drizzle/0000_watery_apocalypse.sql", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../drizzle/0002_strange_xavin.sql", import.meta.url), "utf8"),
    readFile(new URL("../lib/auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/auth-rate-limit.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/auth-security.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/csrf/route.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/auth/security-config/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/acesso/AuthForms.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
    readFile(new URL("../db/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(migration, /CREATE TABLE `users`/);
  assert.match(migration, /CREATE TABLE `sessions`/);
  assert.match(migration, /CREATE UNIQUE INDEX `idx_users_player_name_normalized`/);
  assert.match(migration, /`password_hash` text NOT NULL/);
  assert.match(migration, /`password_salt` text NOT NULL/);
  assert.doesNotMatch(migration, /`password` text/);
  assert.match(rateLimitMigration, /CREATE TABLE `auth_rate_limits`/);
  assert.match(rateLimitMigration, /`subject_hash` text NOT NULL/);
  assert.match(rateLimitMigration, /`client_hash` text NOT NULL/);
  assert.doesNotMatch(rateLimitMigration, /ALTER TABLE `users` ADD `dominant_foot`/);
  // O workerd de produção recusa PBKDF2 acima de 100.000 iterações.
  assert.match(auth, /MAX_WORKERS_PBKDF2_ITERATIONS = 100_000/);
  assert.match(auth, /CURRENT_PBKDF2_ITERATIONS = MAX_WORKERS_PBKDF2_ITERATIONS/);
  assert.match(auth, /LEGACY_PBKDF2_ITERATIONS = 100_000/);
  assert.match(auth, /\{ name: "PBKDF2" \}/);
  assert.match(auth, /hash: \{ name: "SHA-256" \}/);
  assert.match(auth, /passwordBytes\.buffer/);
  assert.match(auth, /saltBytes\.buffer/);
  assert.match(auth, /encodePasswordHash/);
  assert.match(auth, /parsePasswordHash/);
  assert.match(auth, /storedPasswordHash\.needsUpgrade/);
  assert.match(auth, /UPDATE users SET password_hash/);
  assert.match(auth, /Password hash upgrade skipped/);
  assert.match(auth, /HttpOnly; SameSite=Lax/);
  assert.match(auth, /hashSessionToken/);
  assert.match(auth, /\.prepare\(/);
  assert.match(auth, /await d1\.batch\(\[/);
  assert.doesNotMatch(auth, /getDb\(|drizzle-orm/);
  assert.match(rateLimit, /AUTH_RATE_LIMIT_POLICIES/);
  assert.match(rateLimit, /maxAttempts:\s*5/);
  assert.match(rateLimit, /maxAttempts:\s*3/);
  assert.match(rateLimit, /cf-connecting-ip/);
  assert.match(rateLimit, /x-forwarded-for/);
  assert.match(rateLimit, /sha256Hex/);
  assert.match(rateLimit, /INSERT INTO auth_rate_limits/);
  assert.match(rateLimit, /ON CONFLICT\(key\) DO UPDATE SET/);
  assert.match(rateLimit, /DELETE FROM auth_rate_limits WHERE key = \?/);
  assert.match(rateLimit, /status:\s*429/);
  assert.match(rateLimit, /"Retry-After"/);
  assert.match(security, /CSRF_COOKIE_NAME = "fln_bulls_csrf"/);
  assert.match(security, /CSRF_HEADER_NAME = "x-csrf-token"/);
  assert.match(security, /HttpOnly; SameSite=Strict/);
  assert.match(security, /sec-fetch-site/);
  assert.match(security, /fetchSite === "cross-site"/);
  assert.match(security, /origin === requestOrigin/);
  assert.match(security, /TURNSTILE_SITEVERIFY_URL/);
  assert.match(security, /challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
  assert.match(security, /TURNSTILE_SECRET_KEY/);
  assert.match(security, /TURNSTILE_SECRET/);
  assert.match(security, /isExpectedTurnstileHostname/);
  assert.match(csrfRoute, /createCsrfToken/);
  assert.match(csrfRoute, /Set-Cookie/);
  assert.match(authForms, /fetch\("\/api\/auth\/csrf"/);
  assert.match(authForms, /fetch\("\/api\/auth\/security-config"/);
  assert.match(authForms, /"X-CSRF-Token": csrfToken/);
  assert.match(authForms, /turnstile\/v0\/api\.js\?render=explicit/);
  assert.match(authForms, /turnstileToken/);
  assert.match(authForms, /Conclua a verificação anti-robô/);
  assert.match(securityConfigRoute, /getTurnstileSiteKey/);
  assert.match(securityConfigRoute, /turnstileSiteKey/);
  assert.match(envExample, /TURNSTILE_SITE_KEY=/);
  assert.match(envExample, /TURNSTILE_SECRET_KEY=/);
  assert.match(loginRoute, /checkAuthRateLimit/);
  assert.match(loginRoute, /validateAuthRequestSecurity/);
  assert.match(loginRoute, /recordAuthRateLimitFailure/);
  assert.match(loginRoute, /clearAuthRateLimit/);
  assert.match(registerRoute, /checkAuthRateLimit/);
  assert.match(registerRoute, /validateAuthRequestSecurity/);
  assert.match(registerRoute, /recordAuthRateLimitFailure/);
  assert.match(registerRoute, /clearAuthRateLimit/);
  assert.match(database, /export function getD1\(\)/);
  assert.match(auth, /Expired session cleanup skipped/);
  assert.match(
    auth,
    /const session = await createSession\(user\.id\);\s*await cleanupExpiredSessions\(\);/,
  );
  assert.doesNotMatch(
    auth,
    /createPlayerAccount\(input: RegistrationInput\) \{\s*await cleanupExpiredSessions/,
  );
});

test("keeps the recent matches strip responsive and semantic", async () => {
  const [page, matchesSection, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/MatchesSection.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<MatchesSection/);
  assert.match(matchesSection, /<ol\s+className="recent-matches-track"/);
  assert.match(matchesSection, /className="recent-match-link"/);
  assert.match(matchesSection, /className="recent-match-link recent-match-static"/);
  assert.match(matchesSection, /setIsAdmin\(data\.user\?\.role === "admin"\)/);
  assert.match(matchesSection, /\{isAdmin \? \(\s*<AddMatchModal/);
  assert.doesNotMatch(matchesSection, /className="admin-add-match-btn[\s\S]*?>\s*\+/);
  assert.doesNotMatch(matchesSection, /recent-matches-kicker|Histórico enviado pelo time/);
  assert.match(css, /\.recent-matches-track\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css, /scroll-snap-type:\s*x proximity/);
  assert.match(css, /@media \(max-width:\s*680px\)[\s\S]*\.recent-match\s*\{/);
  assert.doesNotMatch(matchesSection, /tabIndex=\{0\}/);
});

test("integrates avatar photo upload and display across profile and header", async () => {
  const [profile, accountButton, avatarRoute, storage] = await Promise.all([
    readFile(
      new URL("../app/perfil/ProfileView.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/HomeAccountButton.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/avatar/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../lib/storage.ts", import.meta.url),
      "utf8",
    ),
  ]);

  // ProfileView integration
  assert.match(profile, /fetch\("\/api\/avatar",\s*\{\s*method:\s*"POST"/);
  assert.match(profile, /fetch\("\/api\/avatar",\s*\{\s*method:\s*"DELETE"/);
  assert.match(profile, /handleAvatarUpload/);
  assert.match(profile, /handleAvatarDelete/);
  assert.match(profile, /user\.avatarUrl/);

  // Home header integration
  assert.match(accountButton, /player\.avatarUrl/);
  assert.match(accountButton, /account-avatar-img/);

  // Avatar API route and R2 storage
  assert.match(avatarRoute, /export async function GET/);
  assert.match(avatarRoute, /export async function POST/);
  assert.match(avatarRoute, /export async function DELETE/);
  assert.match(avatarRoute, /MAX_FILE_SIZE = 2 \* 1024 \* 1024/);
  assert.match(storage, /env\.PLAYER_MEDIA/);
});

test("supports player profile customization for secondary position and dominant foot", async () => {
  const [profile, profileRoute, schema, player] = await Promise.all([
    readFile(
      new URL("../app/perfil/ProfileView.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/player/profile/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../db/schema.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../lib/player.ts", import.meta.url),
      "utf8",
    ),
  ]);

  // UI fields & API calls
  assert.match(profile, /Personalizar dados/);
  assert.match(profile, /Posição secundária/);
  assert.match(profile, /Perna dominante/);
  assert.match(profile, /fetch\("\/api\/player\/profile"/);

  // Profile Route
  assert.match(profileRoute, /updatePlayerProfile/);
  assert.match(profileRoute, /validateProfileUpdate/);

  // Database schema and constants
  assert.match(schema, /secondaryPosition:\s*text\("secondary_position"\)/);
  assert.match(schema, /dominantFoot:\s*text\("dominant_foot"\)/);
  assert.match(player, /DOMINANT_FEET/);
  assert.match(player, /Destro/);
  assert.match(player, /Canhoto/);
  assert.match(player, /Ambidestro/);
});

test("supports team roster display and join request functionality", async () => {
  const [teamPage, teamView, teamJoinRoute, teamRosterRoute, teamLib] =
    await Promise.all([
      readFile(new URL("../app/time/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/time/TeamView.tsx", import.meta.url), "utf8"),
      readFile(
        new URL("../app/api/team/join/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/api/team/roster/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../lib/team.ts", import.meta.url), "utf8"),
    ]);

  // Team page and view components
  assert.match(teamPage, /Elenco e Inscrição/);
  assert.match(teamPage, /<TeamView/);
  assert.match(teamPage, /<a href="\/">\s*In/);
  assert.match(teamPage, /<a aria-current="page" href="\/time">/);
  assert.match(teamPage, /<a href="\/#estatisticas">/);
  assert.match(teamPage, /<a href="\/#partidas">/);
  assert.match(teamPage, /<a href="\/#amistoso">/);
  assert.match(teamPage, /<a href="\/#sobre">/);
  assert.match(teamPage, /<a className="brand footer-brand" href="\/">/);
  assert.doesNotMatch(teamPage, /<Link href="\/#(?:estatisticas|partidas|amistoso|sobre)">/);
  assert.match(teamView, /Elenco Oficial/);
  assert.match(teamView, /Solicitar entrada no time|Quer jogar no FLN BULLS/);
  assert.match(teamView, /fetch\("\/api\/team\/join"/);
  assert.match(teamView, /fetch\("\/api\/team\/roster"/);

  // Team routes and library
  assert.match(teamJoinRoute, /requestJoinRoster/);
  assert.match(teamJoinRoute, /cancelJoinRoster/);
  assert.match(teamRosterRoute, /getRosterPlayers/);
  assert.match(teamLib, /WHERE roster_status = 'approved'/);
});

test("supports OneFootball-style tactical pitch, bench, and match events timeline", async () => {
  const [pitch, timeline, modal, eventsRoute, matchesLib] = await Promise.all([
    readFile(new URL("../app/time/TacticalPitch.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/time/MatchTimeline.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/time/MatchEventModal.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/matches/latest-events/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/matches.ts", import.meta.url), "utf8"),
  ]);

  // Tactical Pitch
  assert.match(pitch, /tactical-pitch/);
  assert.match(pitch, /pitch-player-node/);
  assert.match(pitch, /Banco de Reservas/);
  assert.match(pitch, /bench-sidebar/);
  assert.match(pitch, /\/icon-goal\.png/);
  assert.match(pitch, /\/icon-assist\.png/);
  assert.match(pitch, /\/icon-rating\.png/);

  // Timeline
  assert.match(timeline, /match-hero-scoreboard/);
  assert.match(timeline, /FLN BULLS/);
  assert.match(timeline, /Marcível Dias/);
  assert.match(timeline, /match-timeline-track/);
  assert.match(timeline, /Registrar gols e assistências/);
  assert.match(timeline, /\/icon-goal\.png/);
  assert.match(timeline, /\/icon-assist\.png/);

  // Modal
  assert.match(modal, /Registrar Gol ou Assistência/);
  assert.match(modal, /Marquei um Gol/);
  assert.match(modal, /Dei uma Assistência/);
  assert.match(modal, /\/icon-goal\.png/);
  assert.match(modal, /\/icon-assist\.png/);

  // Events API & Library
  assert.match(eventsRoute, /addMatchEvent/);
  assert.match(eventsRoute, /export async function POST/);
  assert.match(matchesLib, /DEFAULT_MATCH_TACTICS/);
  assert.match(matchesLib, /formation:\s*"2-3-1 \(Society\)"/);
});

test("supports Admin Dashboard, user roles, match adding, and ratings evaluation", async () => {
  const [
    adminPage,
    adminView,
    adminUsersRoute,
    adminMatchesRoute,
    adminRatingsRoute,
    homeButton,
    profileView,
  ] = await Promise.all([
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/admin/AdminDashboardView.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/admin/users/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/admin/matches/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/admin/ratings/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/HomeAccountButton.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/perfil/ProfileView.tsx", import.meta.url), "utf8"),
  ]);

  // Admin page and view
  assert.match(adminPage, /Painel do Administrador/);
  assert.match(adminPage, /<AdminDashboardView/);
  assert.match(adminPage, /<a className=\{styles\.authBrand\} href="\/">/);
  assert.match(adminPage, /<a href="\/time" className=\{styles\.backHomeLink\}>/);
  assert.match(adminPage, /<a href="\/perfil" className=\{styles\.backHomeLink\}>/);
  assert.doesNotMatch(adminPage, /<Link className=\{styles\.authBrand\} href="\/">/);
  assert.doesNotMatch(adminPage, /<Link href="\/time" className=\{styles\.backHomeLink\}>/);
  assert.doesNotMatch(adminPage, /<Link href="\/perfil" className=\{styles\.backHomeLink\}>/);
  assert.match(adminView, /Gestão & Diretoria do Bulls/);
  assert.match(adminView, /Solicitações/);
  assert.match(adminView, /Usuários e Admins/);
  assert.match(adminView, /Adicionar Jogo/);
  assert.match(adminView, /Notas e Escalação/);
  assert.match(adminView, /match-roster-selector-section/);

  // Admin routes
  assert.match(adminUsersRoute, /listAllUsersForAdmin/);
  assert.match(adminUsersRoute, /setUserRole/);
  assert.match(adminUsersRoute, /setUserRosterStatus/);
  assert.match(adminMatchesRoute, /createMatch\(/);
  assert.match(adminMatchesRoute, /selectedPlayerIds/);
  assert.match(adminRatingsRoute, /applyRatings\(/);

  // Header & Profile integration
  assert.match(homeButton, /href="\/admin"/);
  assert.match(
    profileView,
    /<a href="\/admin"[\s\S]*?>\s*Acessar Painel do Administrador\s*<\/a>/,
  );
  assert.doesNotMatch(profileView, /<Link href="\/admin"[\s\S]*?>\s*Acessar Painel do Administrador/);
});

test("supports Post-Match evaluation window, player goals/assists submission, and arithmetic average rating computation", async () => {
  const [
    evaluationsLib,
    postMatchRoute,
    postMatchModal,
    teamView,
  ] = await Promise.all([
    readFile(new URL("../lib/evaluations.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/matches/post-match/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/time/PostMatchModal.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/time/TeamView.tsx", import.meta.url), "utf8"),
  ]);

  // Evaluations library logic
  assert.match(evaluationsLib, /isEvaluationWindowOpen/);
  assert.match(evaluationsLib, /getPostMatchStatus/);
  assert.match(evaluationsLib, /submitPostMatchEvaluation/);
  assert.match(evaluationsLib, /recalculateAverageRatings/);

  // Post-match API
  assert.match(postMatchRoute, /export async function GET/);
  assert.match(postMatchRoute, /export async function POST/);
  assert.match(postMatchRoute, /getPostMatchStatus/);
  assert.match(postMatchRoute, /submitPostMatchEvaluation/);

  // Post-match modal UI
  assert.match(postMatchModal, /Minhas Estatísticas no Jogo/);
  assert.match(postMatchModal, /Avaliação dos Companheiros Escalados/);
  assert.match(postMatchModal, /\/icon-goal\.png/);
  assert.match(postMatchModal, /\/icon-assist\.png/);
  assert.match(postMatchModal, /\/icon-rating\.png/);

  // TeamView integration
  assert.match(teamView, /PostMatchModal/);
  assert.match(teamView, /loadPostMatchStatus/);
  assert.match(teamView, /post-match-banner-card/);
});







test("persists matches, lineups, events and evaluations in D1", async () => {
  const [
    migration,
    store,
    evaluationsLib,
    matchesLib,
    adminMatchesRoute,
    eventsRoute,
    matchesRoute,
  ] = await Promise.all([
    readFile(
      new URL("../drizzle/0003_fantastic_venom.sql", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/match-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/evaluations.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/matches.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/admin/matches/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/matches/latest-events/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/api/matches/route.ts", import.meta.url), "utf8"),
  ]);

  // Schema backing the match history
  assert.ok(migration.includes("CREATE TABLE `matches`"));
  assert.ok(migration.includes("CREATE TABLE `match_lineups`"));
  assert.ok(migration.includes("CREATE TABLE `match_events`"));
  assert.ok(migration.includes("CREATE TABLE `match_evaluations`"));
  assert.ok(migration.includes("CREATE TABLE `match_evaluation_ratings`"));
  assert.ok(
    migration.includes("CREATE UNIQUE INDEX `idx_match_evaluations_match_user`"),
  );

  // The store reads and writes D1, seeding the historical matches only once
  assert.ok(store.includes('import { getD1 } from "@/db"'));
  assert.ok(store.includes("INSERT OR IGNORE INTO matches"));
  assert.ok(store.includes("INSERT INTO match_lineups"));
  assert.ok(store.includes("INSERT INTO match_events"));
  assert.ok(store.includes("ON CONFLICT(match_id, player_id) DO UPDATE SET"));
  assert.match(store, /async function ensureSeeded/);

  // Post-match evaluations are rows, not process memory
  assert.ok(evaluationsLib.includes("INSERT INTO match_evaluations"));
  assert.ok(evaluationsLib.includes("match_evaluation_ratings"));
  assert.doesNotMatch(evaluationsLib, /const submissions/);

  // Seed data is frozen so it can never serve as a mutable store again
  assert.ok(matchesLib.includes("deepFreeze(DEFAULT_RECENT_MATCHES)"));
  assert.ok(matchesLib.includes("deepFreeze(DEFAULT_MATCH_TACTICS)"));

  // No route may keep match state in module scope
  assert.doesNotMatch(adminMatchesRoute, /recentMatches|latestMatchTactics/);
  assert.doesNotMatch(eventsRoute, /liveEvents/);

  // Public read endpoint the client uses to refresh the history
  assert.match(matchesRoute, /getRecentMatches/);
  assert.match(matchesRoute, /export async function GET/);
});
