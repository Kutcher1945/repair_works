import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.YANDEX_MAPS_KEY ?? "";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ lat: null, lng: null });

  if (API_KEY) {
    try {
      const url = new URL("https://geocode-maps.yandex.ru/1.x/");
      url.searchParams.set("apikey", API_KEY);
      url.searchParams.set("format", "json");
      url.searchParams.set("geocode", q);
      url.searchParams.set("lang", "ru_RU");
      url.searchParams.set("results", "1");
      url.searchParams.set("bbox", "76.0,42.7~77.5,43.7");

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(4000) });
      const data = await res.json();
      const pos: string | undefined =
        data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
      if (pos) {
        const [lngStr, latStr] = pos.split(" ");
        return NextResponse.json({ lat: parseFloat(latStr), lng: parseFloat(lngStr) });
      }
    } catch {}
  }

  // Fallback: Nominatim (Almaty bounding box)
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("countrycodes", "kz");
    url.searchParams.set("limit", "1");
    url.searchParams.set("viewbox", "76.0,43.7,77.5,42.7");
    url.searchParams.set("bounded", "1");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "RoadRepairAdmin/1.0 (admin@smartalmaty.kz)" },
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.lat) {
      return NextResponse.json({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
    }
  } catch {}

  return NextResponse.json({ lat: null, lng: null });
}
