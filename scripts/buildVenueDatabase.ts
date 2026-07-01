import { writeFile } from "fs/promises";
import path from "path";
import { config } from "dotenv";

config({ path: ".env.local" });

const API_KEY =
  process.env.GOOGLE_PLACES_API_KEY ??
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const OUTPUT_PATH = path.join(process.cwd(), "lib/data/melbourneVenues.ts");

type MelbourneVenueRecord = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  types: string[];
};

// Melbourne search areas
const queries = [
  "nightclub Melbourne",
  "warehouse venue Melbourne",
  "live music venue Melbourne",
  "rooftop bar Melbourne",
  "function venue Melbourne",
  "event space Melbourne",
  "underground club Melbourne",
];

async function fetchPlaces(query: string) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    query,
  )}&key=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

async function build() {
  if (!API_KEY) {
    console.error(
      "Missing GOOGLE_PLACES_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
    );
    return;
  }

  const allVenues: MelbourneVenueRecord[] = [];

  for (const q of queries) {
    console.log("Searching:", q);

    const results = await fetchPlaces(q);

    for (const place of results) {
      allVenues.push({
        id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        rating: place.rating ?? null,
        types: place.types ?? [],
      });
    }
  }

  const unique = Array.from(
    new Map(allVenues.map((venue) => [venue.id, venue])).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  const fileContents = `export const melbourneVenues = ${JSON.stringify(unique, null, 2)};\n`;

  await writeFile(OUTPUT_PATH, fileContents, "utf8");

  console.log(`Saved ${unique.length} Melbourne venues to melbourneVenues.ts`);
}

build();
