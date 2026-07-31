import { NextRequest, NextResponse } from "next/server";

const MINIO = (process.env.MINIO_ENDPOINT ?? "http://10.100.200.34:9000").replace(/\/$/, "");
const BUCKET = process.env.MINIO_TILE_BUCKET ?? "django-main";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return new NextResponse("missing key", { status: 400 });

  const upstream = `${MINIO}/${BUCKET}/${key}`;

  try {
    const res = await fetch(upstream, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return new NextResponse("upstream error", { status: res.status });

    const buf = await res.arrayBuffer();
    const ct = res.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("proxy error", { status: 502 });
  }
}
