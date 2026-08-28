# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Email and name are intended for display or contact purposes.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)

## Deploy na Cloudflare

Pré-requisitos: estar logado (`npx wrangler login`).

1. Os recursos do `wrangler.toml` já existem na conta atual (D1 `fln-bulls-db`
   e R2 `fln-bulls-media`). Em outra conta, recrie-os e atualize o
   `database_id`:

   ```bash
   npx wrangler d1 create fln-bulls-db
   npx wrangler r2 bucket create fln-bulls-media
   ```

2. Apontar o domínio `flnbulls.site`. Hoje os nameservers estão na Hostinger
   (`solar`/`lunar.dns-parking.com`), então o site só responde pela URL
   `*.workers.dev`. Para usar o domínio: adicione a zona `flnbulls.site` na
   conta Cloudflare, troque os nameservers no registrador para os que a
   Cloudflare indicar, aguarde a zona ficar ativa e só então descomente os
   blocos `[[routes]]` do `wrangler.toml`. Com as rotas ativas antes disso o
   `wrangler deploy` falha.

3. Configurar o Turnstile. Sem isso, `/api/auth/login` e `/api/auth/register`
   respondem `400` em produção — o bypass de `lib/auth-security.ts` só vale para
   `localhost`. Crie o widget listando os hostnames que servem o site
   (`flnbulls.site`, `www.flnbulls.site` e, enquanto usar, o `*.workers.dev`),
   porque o código rejeita a verificação quando o hostname devolvido pelo
   siteverify não bate com o da requisição. Coloque a site key em
   `[vars] TURNSTILE_SITE_KEY` no `wrangler.toml` e a secret key em:

   ```bash
   npx wrangler secret put TURNSTILE_SECRET_KEY
   ```

4. Publicar e aplicar as migrations no banco remoto (o deploy não aplica sozinho):

   ```bash
   npm run deploy
   npm run db:migrate:remote
   ```

Para desenvolvimento local com o banco simulado: `npm run db:migrate:local`.

O primeiro usuário cadastrado entra como `user`. Para promover alguém a admin,
atualize a coluna `role` direto no D1:

```bash
npx wrangler d1 execute fln-bulls-db --remote \
  --command "UPDATE users SET role = 'admin' WHERE player_name = 'SeuNome'"
```
