import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

type Locations = {
  states: string[];
  districtsByState: Record<string, string[]>;
  areasByStateDistrict: Record<string, Record<string, string[]>>;
};

function normalize(s: string) {
  return s.replaceAll("\uFEFF", "").trim();
}

export async function GET() {
  const csvPath = path.join(process.cwd(), "Reference", "Negeri - Daerah - Kawasan.csv");
  const text = await fs.readFile(csvPath, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);

  const districtsByState: Record<string, Set<string>> = {};
  const areasByStateDistrict: Record<string, Record<string, Set<string>>> = {};

  for (const line of lines.slice(1)) {
    const parts = line.split(",").map(normalize);
    if (parts.length < 3) continue;
    const [state, district, area] = parts;
    if (!state || !district || !area) continue;

    if (!districtsByState[state]) districtsByState[state] = new Set();
    districtsByState[state].add(district);

    if (!areasByStateDistrict[state]) areasByStateDistrict[state] = {};
    if (!areasByStateDistrict[state][district]) areasByStateDistrict[state][district] = new Set();
    areasByStateDistrict[state][district].add(area);
  }

  const states = Object.keys(districtsByState).sort((a, b) => a.localeCompare(b));
  const districtsOut: Record<string, string[]> = {};
  const areasOut: Record<string, Record<string, string[]>> = {};

  for (const state of states) {
    districtsOut[state] = Array.from(districtsByState[state]).sort((a, b) => a.localeCompare(b));
    areasOut[state] = {};
    for (const district of districtsOut[state]) {
      const set = areasByStateDistrict[state]?.[district];
      areasOut[state][district] = Array.from(set ?? []).sort((a, b) => a.localeCompare(b));
    }
  }

  const payload: Locations = {
    states,
    districtsByState: districtsOut,
    areasByStateDistrict: areasOut,
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
}

