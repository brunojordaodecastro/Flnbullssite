import { getSessionToken, getPlayerFromSession } from "@/lib/auth";
import { getR2 } from "@/lib/storage";
import { getD1 } from "@/db";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function avatarKey(userId: string) {
  return `avatars/${userId}`;
}

/**
 * GET /api/avatar?userId=<id>
 * Serves the player's avatar image from R2.
 * Public — no authentication required so it can be used as <img src>.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return Response.json(
      { error: "Parâmetro userId é obrigatório." },
      { status: 400 },
    );
  }

  try {
    const r2 = getR2();
    const object = await r2.get(avatarKey(userId));

    if (!object) {
      return new Response("Avatar não encontrado.", { status: 404 });
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      object.httpMetadata?.contentType ?? "image/jpeg",
    );
    headers.set("Cache-Control", "public, max-age=3600");
    headers.set("ETag", object.httpEtag);

    return new Response(object.body, { headers });
  } catch (error) {
    console.error("avatar-get-failed", {
      code: error instanceof Error ? error.message : "unknown",
    });
    return new Response("Não foi possível carregar a foto.", { status: 500 });
  }
}

/**
 * POST /api/avatar
 * Uploads a new avatar photo for the authenticated player.
 * Accepts multipart/form-data with a "file" field.
 * Validates type (JPEG/PNG/WebP) and size (≤ 2 MB).
 */
export async function POST(request: Request) {
  const token = getSessionToken(request);
  if (!token) {
    return Response.json(
      { error: "Sessão não encontrada." },
      { status: 401 },
    );
  }

  let player;
  try {
    player = await getPlayerFromSession(token);
  } catch {
    return Response.json(
      { error: "Não foi possível verificar a sessão." },
      { status: 500 },
    );
  }

  if (!player) {
    return Response.json({ error: "Sessão expirada." }, { status: 401 });
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Envie a foto como formulário (multipart/form-data)." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { error: "Selecione uma foto para enviar." },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json(
      { error: "Formato não aceito. Use JPEG, PNG ou WebP." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "A foto deve ter no máximo 2 MB." },
      { status: 400 },
    );
  }

  try {
    const r2 = getR2();
    const key = avatarKey(player.id);

    // Upload to R2 (overwrites any existing avatar for this user)
    await r2.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    // Update avatar_key in D1
    const d1 = getD1();
    await d1
      .prepare(
        "UPDATE users SET avatar_key = ?, updated_at = ? WHERE id = ?",
      )
      .bind(key, new Date().toISOString(), player.id)
      .run();

    return Response.json(
      {
        message: "Foto enviada com sucesso.",
        avatarUrl: `/api/avatar?userId=${encodeURIComponent(player.id)}`,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("avatar-upload-failed", {
      code: error instanceof Error ? error.message : "unknown",
    });
    return Response.json(
      { error: "Não foi possível enviar a foto agora." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/avatar
 * Removes the authenticated player's avatar from R2 and clears the reference in D1.
 */
export async function DELETE(request: Request) {
  const token = getSessionToken(request);
  if (!token) {
    return Response.json(
      { error: "Sessão não encontrada." },
      { status: 401 },
    );
  }

  let player;
  try {
    player = await getPlayerFromSession(token);
  } catch {
    return Response.json(
      { error: "Não foi possível verificar a sessão." },
      { status: 500 },
    );
  }

  if (!player) {
    return Response.json({ error: "Sessão expirada." }, { status: 401 });
  }

  try {
    const r2 = getR2();
    const key = avatarKey(player.id);

    // Delete from R2 (no-op if the key doesn't exist)
    await r2.delete(key);

    // Clear avatar_key in D1
    const d1 = getD1();
    await d1
      .prepare(
        "UPDATE users SET avatar_key = NULL, updated_at = ? WHERE id = ?",
      )
      .bind(new Date().toISOString(), player.id)
      .run();

    return Response.json(
      { message: "Foto removida com sucesso." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("avatar-delete-failed", {
      code: error instanceof Error ? error.message : "unknown",
    });
    return Response.json(
      { error: "Não foi possível remover a foto agora." },
      { status: 500 },
    );
  }
}

