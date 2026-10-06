import type { IPoi } from "../interfaces";

export function makeNaturalKey(poi: Pick<IPoi, "name" | "area">): string {
  return `${poi.name.toLowerCase().trim()}|${poi.area.toLowerCase().trim()}`;
}

export function makeNaturalKeyFromInput(name: string, area: string): string {
  return `${name.toLowerCase().trim()}|${area.toLowerCase().trim()}`;
}