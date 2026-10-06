export function sameOrigin(request: Request): boolean {
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    const host = request.headers.get("host"); const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
    if (!host || !["http:", "https:"].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) return false;
    return origin.host === new URL(`${origin.protocol}//${host}`).host && origin.protocol === `${protocol}:`;
  } catch { return false; }
}
