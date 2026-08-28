import { createCsrfCookie, createCsrfToken } from "@/lib/auth-security";

export function GET(request: Request) {
  const token = createCsrfToken();

  return Response.json(
    { token },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": createCsrfCookie(token, request.url),
      },
    },
  );
}
