import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.YANDEX_MAPS_KEY ?? "";

interface SuggestionItem {
  name: string;
  subtitle: string;
  lat?: number;
  lng?: number;
}

// Almaty city bounding box
const BBOX = { minLat: 42.85, maxLat: 43.45, minLng: 76.4, maxLng: 77.3 };

function inAlmaty(lat?: number, lng?: number): boolean {
  if (lat == null || lng == null) return true;
  return lat >= BBOX.minLat && lat <= BBOX.maxLat && lng >= BBOX.minLng && lng <= BBOX.maxLng;
}

function scopedQuery(text: string): string {
  return /алматы/i.test(text) ? text : `${text}, Алматы`;
}

/* 1 ─── Yandex Geocoder (house-number precision) ───────────────────── */
async function tryYandexGeocode(text: string): Promise<SuggestionItem[] | null> {
  if (!API_KEY) return null;
  try {
    const url = new URL("https://geocode-maps.yandex.ru/1.x/");
    url.searchParams.set("apikey", API_KEY);
    url.searchParams.set("format", "json");
    url.searchParams.set("geocode", scopedQuery(text));
    url.searchParams.set("lang", "ru_RU");
    url.searchParams.set("results", "6");
    // Restrict results to Almaty bounding box
    url.searchParams.set("bbox", `${BBOX.minLng},${BBOX.minLat}~${BBOX.maxLng},${BBOX.maxLat}`);
    url.searchParams.set("rspn", "1");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;

    const data: {
      response?: {
        GeoObjectCollection?: {
          featureMember?: { GeoObject: { name?: string; description?: string; Point?: { pos: string } } }[];
        };
      };
    } = await res.json();

    const members = data?.response?.GeoObjectCollection?.featureMember ?? [];
    if (!Array.isArray(members) || members.length === 0) return null;

    return members.map((m) => {
      const obj = m.GeoObject;
      const name = obj?.name ?? "";
      const subtitle = obj?.description ?? "";
      let lat: number | undefined;
      let lng: number | undefined;
      const pos = obj?.Point?.pos;
      if (pos) {
        const [lngStr, latStr] = pos.split(" ");
        lng = parseFloat(lngStr);
        lat = parseFloat(latStr);
      }
      return { name, subtitle, lat, lng };
    });
  } catch {
    return null;
  }
}

/* 2 ─── Photon (Komoot/OSM) fallback ───────────────────────────────── */
async function tryPhoton(text: string): Promise<SuggestionItem[] | null> {
  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", scopedQuery(text));
    url.searchParams.set("limit", "7");
    url.searchParams.set("lat", "43.238");
    url.searchParams.set("lon", "76.945");
    url.searchParams.set("bbox", `${BBOX.minLng},${BBOX.minLat},${BBOX.maxLng},${BBOX.maxLat}`);

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(4000),
      headers: { "Accept-Language": "ru,ru-RU" },
    });
    if (!res.ok) return null;
    const data: { features?: { properties: Record<string, string>; geometry?: { coordinates: [number, number] } }[] } =
      await res.json();
    if (!Array.isArray(data.features) || data.features.length === 0) return null;

    return data.features.map((f) => {
      const p = f.properties ?? {};
      const nameParts: string[] = [];
      if (p.street) nameParts.push(p.street);
      if (p.housenumber) nameParts.push(p.housenumber);
      if (nameParts.length === 0 && p.name) nameParts.push(p.name);
      const name = nameParts.join(", ") || p.name || text;
      const subtitle = p.city || p.town || p.village || p.state || "";
      const [lng, lat] = f.geometry?.coordinates ?? [undefined, undefined];
      return { name, subtitle, lat, lng };
    });
  } catch {
    return null;
  }
}

/* 3 ─── Nominatim last resort ──────────────────────────────────────── */
async function tryNominatim(text: string): Promise<SuggestionItem[] | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", scopedQuery(text));
    url.searchParams.set("format", "json");
    url.searchParams.set("countrycodes", "kz");
    url.searchParams.set("limit", "7");
    url.searchParams.set("viewbox", `${BBOX.minLng},${BBOX.maxLat},${BBOX.maxLng},${BBOX.minLat}`);
    url.searchParams.set("bounded", "1");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "RoadRepairAdmin/1.0 (admin@smartalmaty.kz)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data: { display_name: string; lat: string; lon: string }[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    return data.map((item) => ({
      name: item.display_name?.split(",").slice(0, 2).join(",").trim() ?? text,
      subtitle: item.display_name?.split(",").slice(2, 4).join(",").trim() ?? "",
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch {
    return null;
  }
}

/* ─── Handler ──────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text")?.trim() ?? "";
  if (!text || text.length < 2) return NextResponse.json({ suggestions: [] });

  const raw =
    (await tryYandexGeocode(text)) ??
    (await tryPhoton(text)) ??
    (await tryNominatim(text)) ??
    [];

  const suggestions = raw.filter((s) => inAlmaty(s.lat, s.lng));
  return NextResponse.json({ suggestions });
}
