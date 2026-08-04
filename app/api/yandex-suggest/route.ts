import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.YANDEX_MAPS_KEY ?? "";

interface SuggestionItem {
  name: string;
  subtitle: string;
  lat?: number;
  lng?: number;
}

const BBOX = { minLat: 42.85, maxLat: 43.45, minLng: 76.4, maxLng: 77.3 };

function inAlmaty(lat?: number, lng?: number): boolean {
  if (lat == null || lng == null) return true;
  return lat >= BBOX.minLat && lat <= BBOX.maxLat && lng >= BBOX.minLng && lng <= BBOX.maxLng;
}

function scopedQuery(text: string): string {
  return /алматы/i.test(text) ? text : `${text}, Алматы`;
}

// Extract "улица Айманова, 103" from "Казахстан, Алматы, улица Айманова, 103"
function extractAddress(formatted: string, fallbackDesc: string): { name: string; subtitle: string } {
  const parts = formatted.split(",").map((s) => s.trim()).filter(Boolean);
  const almatyIdx = parts.findIndex((p) => /^алматы$/i.test(p) || /^алматы қаласы$/i.test(p));
  if (almatyIdx >= 0 && almatyIdx < parts.length - 1) {
    return { name: parts.slice(almatyIdx + 1).join(", "), subtitle: "Алматы" };
  }
  return { name: parts.slice(-2).join(", ") || formatted, subtitle: fallbackDesc };
}

/* 1 ─── Yandex Geocoder ─────────────────────────────────────────────── */
async function tryYandexGeocode(text: string): Promise<SuggestionItem[] | null> {
  if (!API_KEY) return null;
  try {
    const url = new URL("https://geocode-maps.yandex.ru/1.x/");
    url.searchParams.set("apikey", API_KEY);
    url.searchParams.set("format", "json");
    url.searchParams.set("geocode", scopedQuery(text));
    url.searchParams.set("lang", "ru_RU");
    url.searchParams.set("results", "6");
    url.searchParams.set("bbox", `${BBOX.minLng},${BBOX.minLat}~${BBOX.maxLng},${BBOX.maxLat}`);
    url.searchParams.set("rspn", "1");
    // Narrow to house precision when query has digits (house number)
    if (/\d/.test(text)) url.searchParams.set("kind", "house");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;

    const data: {
      response?: {
        GeoObjectCollection?: {
          featureMember?: {
            GeoObject: {
              name?: string;
              description?: string;
              Point?: { pos: string };
              metaDataProperty?: {
                GeocoderMetaData?: {
                  Address?: { formatted?: string };
                };
              };
            };
          }[];
        };
      };
    } = await res.json();

    const members = data?.response?.GeoObjectCollection?.featureMember ?? [];
    if (!Array.isArray(members) || members.length === 0) return null;

    const seen = new Set<string>();
    const results: SuggestionItem[] = [];

    for (const m of members) {
      const obj = m.GeoObject;
      const formatted = obj?.metaDataProperty?.GeocoderMetaData?.Address?.formatted ?? "";
      const { name, subtitle } = formatted
        ? extractAddress(formatted, obj?.description ?? "")
        : { name: [obj?.name, obj?.description].filter(Boolean).join(", "), subtitle: obj?.description ?? "" };

      if (!name || seen.has(name)) continue;
      seen.add(name);

      let lat: number | undefined;
      let lng: number | undefined;
      const pos = obj?.Point?.pos;
      if (pos) {
        const [lngStr, latStr] = pos.split(" ");
        lng = parseFloat(lngStr);
        lat = parseFloat(latStr);
      }
      results.push({ name, subtitle, lat, lng });
    }

    return results.length > 0 ? results : null;
  } catch {
    return null;
  }
}

/* 2 ─── Photon (Komoot/OSM) — good for house numbers ───────────────── */
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
    const data: {
      features?: { properties: Record<string, string>; geometry?: { coordinates: [number, number] } }[];
    } = await res.json();
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

  // When query has digits: run Geocoder (house mode) + Photon in parallel for best coverage
  if (/\d/.test(text)) {
    const [geocoded, photon] = await Promise.all([tryYandexGeocode(text), tryPhoton(text)]);
    // Prefer geocoder results (Yandex data quality), supplement with Photon
    const combined = [...(geocoded ?? []), ...(photon ?? [])];
    const seen = new Set<string>();
    const unique = combined.filter((s) => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });
    const suggestions = unique.filter((s) => inAlmaty(s.lat, s.lng)).slice(0, 7);
    if (suggestions.length > 0) return NextResponse.json({ suggestions });
  }

  // Street-name only query: Geocoder → Photon → Nominatim chain
  const raw =
    (await tryYandexGeocode(text)) ??
    (await tryPhoton(text)) ??
    (await tryNominatim(text)) ??
    [];

  const suggestions = raw.filter((s) => inAlmaty(s.lat, s.lng));
  return NextResponse.json({ suggestions });
}
