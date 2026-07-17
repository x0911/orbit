import { NextRequest, NextResponse } from "next/server";

// Only proxy known, trusted cover-image hosts — this route must not become an
// open proxy for arbitrary URLs.
const ALLOWED_HOSTS = ["covers.openlibrary.org", "archive.org"];

function isAllowedHost(hostname: string) {
  return ALLOWED_HOSTS.some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
}

/**
 * Streams an external cover image back through our own origin.
 *
 * Why this exists: some Open Library cover IDs 302-redirect to an
 * archive.org item viewer URL. That final response often lacks CORS headers,
 * so loading it directly into a WebGL texture (via crossOrigin="anonymous")
 * fails silently — the browser refuses to let WebGL touch cross-origin pixel
 * data without permission, and the texture never appears. Fetching it
 * server-side and re-serving it from our own domain sidesteps CORS entirely,
 * since same-origin resources are never subject to that restriction.
 */
export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get("url");
  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (parsed.protocol !== "https:" || !isAllowedHost(parsed.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { "User-Agent": "OrbitCoverProxy/1.0" },
      redirect: "follow",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Proxy error" }, { status: 502 });
  }
}
