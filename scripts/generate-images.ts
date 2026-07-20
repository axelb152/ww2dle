/* eslint-disable no-console */
// Generates one silhouette PNG per battle from Natural Earth public-domain
// geodata (scripts/data/*.geojson).
//
// Run with:
//   npx ts-node --compiler-options '{"module":"commonjs","downlevelIteration":true,"resolveJsonModule":true}' scripts/generate-images.ts
//
// For each battle we render the land within a ~600km-radius box around the
// battle coordinates as a solid #94a3b8 silhouette on a transparent
// background (no marker — the coastline itself is the puzzle). If the box is
// almost entirely sea (mid-ocean battles) the radius is widened step by step.
// If the box is almost entirely land (deep-inland battles) we render
// coastline + country borders as lines instead of a solid fill.
import * as fs from "fs";
import * as path from "path";
import { geoOrthographic, geoPath, GeoPermissibleObjects } from "d3-geo";
import sharp from "sharp";
import { battles } from "../src/domain/battles";

const SIZE = 800;
const COLOR = "#94a3b8";
const EARTH_RADIUS_KM = 6371;
// Candidate view radii, ordered by preference: the 600km default first, then
// nearest alternatives (wider for open-ocean battles, tighter for lone
// islands). First radius whose render passes the ink bounds wins.
const RADII_KM = [600, 900, 300, 1350, 150, 2000, 3000, 75, 40, 20];
// A fill render is acceptable when land covers MIN_LAND_FRACTION of pixels
// (below that it reads as a blank square) and at most MAX_LAND_FRACTION
// (above that it is a featureless solid square, so we switch to
// border/coastline lines instead).
// ponytail: thresholds tuned by probing all radii on the worst battles.
const MIN_LAND_FRACTION = 0.02;
const MAX_LAND_FRACTION = 0.9;
const MIN_LINE_FRACTION = 0.02;

const DATA_DIR = path.join(__dirname, "data");
const OUT_DIR = path.join(__dirname, "..", "public", "images", "battles");

function loadGeoJson(name: string): GeoJSON.FeatureCollection {
  return JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, `${name}.geojson`), "utf8")
  );
}

const land = loadGeoJson("ne_10m_land");
const minorIslands = loadGeoJson("ne_10m_minor_islands");
const coastline = loadGeoJson("ne_50m_coastline");
const borders = loadGeoJson("ne_50m_admin_0_boundary_lines_land");

function makeProjection(lat: number, lon: number, radiusKm: number) {
  // Orthographic projection centered on the battle; scale so that
  // radiusKm maps onto half the canvas.
  const angularRadius = radiusKm / EARTH_RADIUS_KM;
  return geoOrthographic()
    .rotate([-lon, -lat])
    .translate([SIZE / 2, SIZE / 2])
    .scale(SIZE / 2 / Math.sin(angularRadius))
    .clipAngle(90)
    .clipExtent([
      [0, 0],
      [SIZE, SIZE],
    ])
    .precision(0.1);
}

function svgDocument(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${body}</svg>`;
}

function renderFill(lat: number, lon: number, radiusKm: number): string {
  const projection = makeProjection(lat, lon, radiusKm);
  const pathGen = geoPath(projection);
  const parts: string[] = [];
  for (const collection of [land, minorIslands]) {
    const d = pathGen(collection as GeoPermissibleObjects);
    if (d) {
      parts.push(`<path d="${d}" fill="${COLOR}" stroke="none"/>`);
    }
  }
  return svgDocument(parts.join(""));
}

function renderLines(lat: number, lon: number, radiusKm: number): string {
  const projection = makeProjection(lat, lon, radiusKm);
  const pathGen = geoPath(projection);
  const parts: string[] = [];
  for (const collection of [coastline, borders]) {
    const d = pathGen(collection as GeoPermissibleObjects);
    if (d) {
      parts.push(
        `<path d="${d}" fill="none" stroke="${COLOR}" stroke-width="3"/>`
      );
    }
  }
  return svgDocument(parts.join(""));
}

async function rasterize(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// Fraction of pixels that are not fully transparent.
async function inkFraction(png: Buffer): Promise<number> {
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let inked = 0;
  const pixelCount = info.width * info.height;
  for (let i = 3; i < data.length; i += info.channels) {
    if (data[i] > 8) {
      inked += 1;
    }
  }
  return inked / pixelCount;
}

interface RenderResult {
  png: Buffer;
  radiusKm: number;
  mode: "fill" | "lines";
  fraction: number;
}

async function renderBattle(
  lat: number,
  lon: number
): Promise<{ result: RenderResult; blank: boolean }> {
  let best: RenderResult | null = null;
  for (const radiusKm of RADII_KM) {
    const fillPng = await rasterize(renderFill(lat, lon, radiusKm));
    const fillFraction = await inkFraction(fillPng);
    if (
      best == null ||
      (best.mode === "fill" &&
        fillFraction > best.fraction &&
        best.fraction < MIN_LAND_FRACTION)
    ) {
      best = { png: fillPng, radiusKm, mode: "fill", fraction: fillFraction };
    }
    if (fillFraction > MAX_LAND_FRACTION) {
      // Landlocked and wall-to-wall land: coastline/borders as lines instead.
      const linesPng = await rasterize(renderLines(lat, lon, radiusKm));
      const linesFraction = await inkFraction(linesPng);
      if (linesFraction >= MIN_LINE_FRACTION) {
        return {
          result: {
            png: linesPng,
            radiusKm,
            mode: "lines",
            fraction: linesFraction,
          },
          blank: false,
        };
      }
      continue; // no borders in the box either: try the next radius
    }
    if (fillFraction >= MIN_LAND_FRACTION) {
      return {
        result: {
          png: fillPng,
          radiusKm,
          mode: "fill",
          fraction: fillFraction,
        },
        blank: false,
      };
    }
    // Too little land: try the next radius.
  }
  // Nothing meaningful at any radius; keep the best attempt but flag it.
  if (best == null) {
    throw new Error("no render produced");
  }
  return { result: best, blank: true };
}

async function main() {
  const warnings: string[] = [];
  let totalBytes = 0;
  for (const battle of battles) {
    const { result, blank } = await renderBattle(
      battle.latitude,
      battle.longitude
    );
    const dir = path.join(OUT_DIR, battle.code);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, "battle.png");
    fs.writeFileSync(file, result.png);
    totalBytes += result.png.length;
    const note = `${battle.code}: ${result.mode} @ ${result.radiusKm}km, ink ${(
      result.fraction * 100
    ).toFixed(2)}%, ${(result.png.length / 1024).toFixed(0)}KB`;
    console.log(note);
    if (blank) {
      warnings.push(note);
    }
  }
  console.log(
    `\nTotal: ${battles.length} images, ${(totalBytes / 1024 / 1024).toFixed(
      1
    )}MB`
  );
  if (warnings.length > 0) {
    console.warn("\nWARNING: near-blank images (check manually):");
    for (const warning of warnings) {
      console.warn(`  ${warning}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
