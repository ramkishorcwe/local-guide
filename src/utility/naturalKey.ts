import type { IPoi } from "../interfaces";

export function normalizePOIText(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
}

export function makeNaturalKey(poi: Pick<IPoi, "name" | "area">): string {
  return makeNaturalKeyFromInput(poi.name, poi.area);
}

export function makeNaturalKeyFromInput(name: string, area: string): string {
  const component = (value: string) => normalizePOIText(value).toLowerCase().replace(/%/g, '%25').replace(/\|/g, '%7C');
  const key = `${component(name)}|${component(area)}`;
  if (key.length > 255) throw new Error('The combined place name and area are too long. Please shorten them.');
  return key;
}
