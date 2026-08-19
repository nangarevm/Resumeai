import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const secret = process.env.NEXTAUTH_SECRET || "resumeproof-dev-secret-change-in-production";

  const token = await getToken({ req: request, secret });
  if (token?.sub) {
    response.cookies.set("rp_user", token.sub, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30
    });
  } else if (!request.cookies.get("rp_guest")) {
    response.cookies.set("rp_guest", `guest-${crypto.randomUUID()}`, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365
    });
  }

  return response;
}

export const config = {
  matcher: ["/candidate/:path*", "/agency/:path*", "/api/:path*", "/login"]
};
