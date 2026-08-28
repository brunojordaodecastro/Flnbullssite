import { getPlayerFromSession, getSessionToken } from "@/lib/auth";
import { cancelJoinRoster, requestJoinRoster } from "@/lib/team";

export async function POST(request: Request) {
  const token = getSessionToken(request);
  if (!token) {
    return Response.json(
      { error: "Você precisa entrar na sua conta para solicitar entrada no time." },
      { status: 401 },
    );
  }

  const user = await getPlayerFromSession(token);
  if (!user) {
    return Response.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  }

  if (user.rosterStatus === "approved") {
    return Response.json(
      { message: "Você já faz parte do elenco oficial!", rosterStatus: "approved" },
      { status: 200 },
    );
  }

  const success = await requestJoinRoster(user.id);
  if (!success) {
    return Response.json(
      { error: "Não foi possível enviar a solicitação. Tente novamente." },
      { status: 500 },
    );
  }

  return Response.json({
    message: "Solicitação para entrar no time enviada com sucesso!",
    rosterStatus: "pending",
  });
}

export async function DELETE(request: Request) {
  const token = getSessionToken(request);
  if (!token) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const user = await getPlayerFromSession(token);
  if (!user) {
    return Response.json({ error: "Sessão expirada." }, { status: 401 });
  }

  const success = await cancelJoinRoster(user.id);
  if (!success) {
    return Response.json(
      { error: "Não foi possível cancelar a solicitação." },
      { status: 500 },
    );
  }

  return Response.json({
    message: "Solicitação cancelada.",
    rosterStatus: "not_requested",
  });
}

