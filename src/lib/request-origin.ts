/** Build a browser-reachable origin for links returned by API routes.
 *  Next dev binds to 0.0.0.0, which produces unusable share URLs like
 *  http://0.0.0.0:3000 — browsers refuse to open those. Prefer the Host
 *  header the client actually used, then NEXTAUTH_URL, then localhost. */
export function getPublicOrigin(request: Request): string {
  const envUrl = process.env.NEXTAUTH_URL?.trim();
  if (envUrl) {
    try {
      return new URL(envUrl).origin;
    } catch {
      /* ignore invalid NEXTAUTH_URL */
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  if (host) {
    const proto =
      request.headers.get("x-forwarded-proto") ||
      (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${proto}://${host}`;
  }

  const origin = new URL(request.url).origin;
  if (origin.includes("0.0.0.0")) {
    return origin.replace("0.0.0.0", "localhost");
  }
  return origin;
}
