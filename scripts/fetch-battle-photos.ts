/* eslint-disable no-console */
// Fetches one period photo per battle: the lead image of the battle's
// English Wikipedia article, taken only when it is hosted on Wikimedia
// Commons (which only hosts public-domain / freely licensed media).
//
// Run with (needs Node >= 20 for global fetch):
//   npx ts-node --compiler-options '{"module":"commonjs","downlevelIteration":true,"resolveJsonModule":true}' scripts/fetch-battle-photos.ts
//
// Outputs:
//   public/images/battles/<code>/battle.jpg   (800px-wide photo)
//   public/images/battles/CREDITS.md          (attribution per photo)
//   src/domain/battlePhotos.json              (code -> image path manifest)
//
// Battles whose article has no free lead image (or whose lead image is a
// map/flag/emblem rather than a photo) are skipped and keep the map
// silhouette fallback.
import * as fs from "fs";
import * as path from "path";
import { battles } from "../src/domain/battles";

const API = "https://en.wikipedia.org/w/api.php";
const HEADERS = {
  "User-Agent": "ww2dle-photo-fetcher/1.0 (one-off asset script)",
};
const OUT_DIR = path.join(__dirname, "..", "public", "images", "battles");
const THUMB_WIDTH = 800;
// Lead images that are not battle photos. `plan(?!e)` spares "planes";
// flags are allowed (Raising the Flag on Iwo Jima is a photo).
const NOT_A_PHOTO =
  /map|karte|carte|diagram|situation|plan(?!e)|emblem|insignia|logo|coat_of_arms|locat|\.svg$|\.gif$/i;
// Search results that are about the battle's media echo, not the battle, or
// that are index pages rather than a battle at all. Without the index guard a
// search can resolve to "List of World War II battles", whose lead image then
// becomes the "photo" for every battle that landed there.
const NOT_AN_ARTICLE =
  /\bfilm\b|miniseries|video game|novel|painting|album|^list of|^timeline of|^outline of/i;
// Battles whose search resolves to the wrong article.
const ARTICLE_OVERRIDES: Record<string, string> = {
  arnhem: "Battle of Arnhem",
  "tali-ihantala": "Battle of Tali-Ihantala",
  guam: "Battle of Guam (1944)",
  // These five all resolved to "List of World War II battles" and so shared
  // that index page's lead image. The search query alone does not reach the
  // right article for them even with the index guard above, so pin the title.
  "battle-of-britain": "Battle of Britain",
  budapest: "Siege of Budapest",
  "kunlun-pass": "Battle of Kunlun Pass",
  leningrad: "Siege of Leningrad",
  singapore: "Fall of Singapore",
};
// Hand-picked Commons files where automatic selection returns a memorial or
// map instead of a wartime photo.
const FILE_OVERRIDES: Record<string, string> = {
  "tali-ihantala": "Tali-Ihantala.jpg",
  "channel-dash":
    'Bundesarchiv_DVM_10_Bild-23-63-46,_Schlachtschiff_"Scharnhorst".jpg',
  "st-nazaire":
    "Bundesarchiv_Bild_101II-MW-3722-03,_St._Nazaire,_Zerstörer_'HMS_Campbeltown'.jpg",
  // The article's lead image is a West Point atlas map captioned with the
  // battle's name, which gives the answer away.
  suomussalmi: "Marching_to_Raate-road.jpg",
  // The article's infobox leads with a drawn diagram titled "Battle of
  // Smolensk -- 1941", so the picture spells out the answer.
  smolensk:
    "Bundesarchiv_Bild_101I-137-1032-14A,_Russland,_brennendes_Dorf,_deutsche_Kavallerie.jpg",
  // The article's infobox leads with a theatre-wide Eastern Front map, not a photo.
  "brest-fortress":
    "Wojska_niemieckie_we_wsi_na_froncie_wschodnim_(2-1118).jpg",
  // The article's infobox leads with a Cotentin Peninsula map, not a photo.
  cherbourg: "Cherbourg1944-Combat_avParis.jpg",
  // The article's infobox leads with an Operation Olive plan map, not a photo.
  "gothic-line": "The_British_Army_in_Italy_1944_NA18091.jpg",
  // The article's infobox leads with a theatre-wide Eastern Front map, not a photo.
  "jassy-kishinev":
    "Bundesarchiv_Bild_101I-244-2321-34,_Ostfront-Süd,_Panzer_V_(Panther).jpg",
  // The article's infobox leads with a map of the Japanese conquest of Java, not a photo.
  "java-sea": "Exeter_sinking.jpg",
  // The article's infobox leads with a counteroffensive map labelling Kharkov itself.
  kharkov:
    "Bundesarchiv_Bild_101III-Zschaeckel-186-36,_Charkow,_Waffen-SS_vor_brennendem_Haus.jpg",
  // The article's infobox leads with a drawn assault diagram, not a photo.
  koenigsberg: "Уличный_бой_в_Кенигсберге.jpg",
  // The article's infobox leads with a New Guinea map labelling Kokoda itself.
  "kokoda-track": "AWM_027054_16th_Brigade_moving_along_track.jpg",
  // The article's infobox leads with a Bagration map labelling Minsk itself.
  "minsk-1944": "На_центральной_площади_освобожденного_Минска.jpg",
  // The article's infobox leads with a West Point atlas map of the salient, not a photo.
  rzhev:
    "Bundesarchiv_Bild_101I-269-0219-24,_Russland,_Soldaten_auf_nasser_Strasse.jpg",
  // The article's infobox leads with a map of the Japanese conquest of Burma, not a photo.
  yenangyaung:
    "British_troops_destroy_equipment_and_machinery_at_the_Yenangyaung_oilfields_in_Burma_before_retreating,_16_April_1942._IND989.jpg",
  // These five shared one photo: their article search resolved to
  // "List of World War II battles" and took its lead image. Pin the
  // right file as well as the right article, above.
  "battle-of-britain": "Spitfire_and_He_111_during_Battle_of_Britain_1940.jpg",
  budapest:
    "Bundesarchiv_Bild_101I-680-8282A-12A,_Budapest,_SS-Männer_auf_der_Burg.jpg",
  "kunlun-pass":
    "Li_Jishen,_Chen_Cheng,_Zhang_Fakui,_and_other_ROC_commanders_at_the_Battle_of_South_Guangxi.jpg",
  leningrad: "Anti_aircraft_Leningrad_1941.JPG",
  singapore: "Surrender_Singapore.jpg",
};
// No usable wartime photo on Commons: these keep the map silhouette.
const NO_PHOTO = new Set(["novorossiysk"]);

interface PhotoResult {
  code: string;
  article: string;
  file: string;
  filePage: string;
  license: string;
  artist: string;
  imagePath: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.status === 429 && attempt < 5) {
      const retryAfter = Number(res.headers.get("retry-after")) || 2 ** attempt * 5;
      await sleep(retryAfter * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} for ${url}`);
    return res;
  }
}

async function api(base: string, params: Record<string, string>): Promise<any> {
  const url = `${base}?${new URLSearchParams({
    format: "json",
    formatversion: "2",
    action: "query",
    ...params,
  })}`;
  return (await fetchWithRetry(url)).json();
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "").trim();
}

async function findArticle(name: string, year: number): Promise<string | null> {
  const prefix = /battle|operation|siege|raid/i.test(name) ? "" : "Battle of ";
  const data = await api(API, {
    list: "search",
    srsearch: `${prefix}${name} ${year} World War II`,
    srlimit: "5",
  });
  const hits: { title: string }[] = data.query?.search ?? [];
  const real = hits.filter((h) => !NOT_AN_ARTICLE.test(h.title));
  // Prefer a title that actually names the battle.
  const named = real.find((h) =>
    h.title.toLowerCase().includes(name.toLowerCase().split(" ")[0])
  );
  return (named ?? real[0])?.title ?? null;
}

// Lead image of the article, falling back to the linked Wikidata item's
// image (P18) — often a photo when the infobox leads with a map.
async function candidateImages(article: string): Promise<string[]> {
  const data = await api(API, {
    titles: article,
    prop: "pageimages|pageprops",
    piprop: "name",
    ppprop: "wikibase_item",
  });
  const page = data.query?.pages?.[0];
  const candidates: string[] = [];
  if (page?.pageimage) candidates.push(page.pageimage);
  const item = page?.pageprops?.wikibase_item;
  if (item) {
    const wd = await (
      await fetchWithRetry(
        `https://www.wikidata.org/w/api.php?${new URLSearchParams({
          format: "json",
          action: "wbgetclaims",
          entity: item,
          property: "P18",
        })}`
      )
    ).json();
    const p18 = wd.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (p18) candidates.push(String(p18).replace(/ /g, "_"));
  }
  // Last resort: search Commons files for the article title, preferring
  // wartime-looking names.
  const commons = await api("https://commons.wikimedia.org/w/api.php", {
    list: "search",
    srsearch: article,
    srnamespace: "6",
    srlimit: "8",
  });
  const files: string[] = (commons.query?.search ?? []).map((h: any) =>
    h.title.replace(/^File:/, "").replace(/ /g, "_")
  );
  const wartime = files.filter((f) => /19[34]\d/.test(f));
  candidates.push(...wartime, ...files);
  return candidates;
}

async function fetchBattle(code: string, name: string, year: number): Promise<PhotoResult | null> {
  if (NO_PHOTO.has(code)) {
    console.warn(`${code}: marked as having no usable photo, keeping map`);
    return null;
  }
  const article = ARTICLE_OVERRIDES[code] ?? (await findArticle(name, year));
  if (!article) {
    console.warn(`${code}: no article found`);
    return null;
  }
  const candidates = FILE_OVERRIDES[code]
    ? [FILE_OVERRIDES[code]]
    : (await candidateImages(article)).filter(
        (image) => !NOT_A_PHOTO.test(image)
      );
  if (candidates.length === 0) {
    console.warn(`${code}: "${article}" has no photo-like image`);
    return null;
  }
  for (const image of candidates) {
    const info = await api(API, {
      titles: `File:${image}`,
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: String(THUMB_WIDTH),
      iiextmetadatafilter: "LicenseShortName|Artist",
    });
    const page = info.query?.pages?.[0];
    if (page?.imagerepository !== "shared") {
      console.warn(`${code}: "${image}" is not on Commons (non-free), skipping`);
      continue;
    }
    const ii = page.imageinfo?.[0];
    const thumbUrl: string | undefined = ii?.thumburl ?? ii?.url;
    if (!thumbUrl) {
      console.warn(`${code}: no image URL for "${image}"`);
      continue;
    }
    const res = await fetchWithRetry(thumbUrl);
    const buf = Buffer.from(await res.arrayBuffer());
    const rel = `images/battles/${code}/battle.jpg`;
    fs.mkdirSync(path.join(OUT_DIR, code), { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, code, "battle.jpg"), buf);
    const meta = ii.extmetadata ?? {};
    return {
      code,
      article,
      file: image,
      filePage:
        ii.descriptionurl ?? `https://commons.wikimedia.org/wiki/File:${image}`,
      license: stripHtml(meta.LicenseShortName?.value ?? "unknown"),
      artist: stripHtml(meta.Artist?.value ?? "unknown"),
      imagePath: rel,
    };
  }
  return null;
}

async function main() {
  const results: PhotoResult[] = [];
  const misses: string[] = [];
  for (const battle of battles) {
    try {
      const r = await fetchBattle(battle.code, battle.name, battle.year);
      if (r) {
        results.push(r);
        console.log(`${r.code}: ${r.file} [${r.license}]`);
      } else {
        misses.push(battle.code);
      }
    } catch (error) {
      console.warn(`${battle.code}: ${error}`);
      misses.push(battle.code);
    }
    await sleep(1500); // be polite to the API
  }

  const manifest: Record<string, string> = {};
  for (const r of results) manifest[r.code] = r.imagePath;
  fs.writeFileSync(
    path.join(__dirname, "..", "src", "domain", "battlePhotos.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );

  const credits = [
    "# Photo credits",
    "",
    "All battle photos are from Wikimedia Commons. Per-file source and license:",
    "",
    ...results.map(
      (r) => `- **${r.code}** — [${r.file}](${r.filePage}) — ${r.license} — ${r.artist}`
    ),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "CREDITS.md"), credits);

  console.log(`\n${results.length}/${battles.length} photos fetched.`);
  if (misses.length > 0) {
    console.log(`No free photo (map fallback): ${misses.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
