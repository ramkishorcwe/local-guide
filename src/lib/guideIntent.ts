import type { IPoi } from '../interfaces';
import type { ChatMessage, PlanningContext } from '../types/trip';
import { normalizeSearch, type SearchFilters } from './planner.js';
import { makeNaturalKey } from '../utility/naturalKey.js';

export type GuideIntent = { requiredIds: string[]; preferences: SearchFilters; availableMinutes: number; fixedStartISO?: string;
  wantsFood: boolean; foodQuery?: string; budgetFlexible: boolean; wantsRevision: boolean; keepOrder: boolean };

export function namedPlaces(text: string, pois: IPoi[]): IPoi[] {
  const normalized = normalizeSearch(text);
  const words = new Set(normalized.split(' '));
  const matches = pois.map(poi => {
    const tokens = normalizeSearch(poi.name).split(' ').filter(word => !['ka', 'ki', 'ke', 'jaipur', 'the'].includes(word));
    const main = normalizeSearch(poi.name.split('(')[0]).split(' ').filter(word => !['ka', 'ki', 'ke', 'jaipur', 'the', 'viewpoint'].includes(word));
    const alias = poi.name.match(/\(([A-Z]{2,8})\)/)?.[1]?.toLowerCase();
    return { poi, tokens: main, matches: (main.length >= 2 && main.every(word => words.has(word))) || (tokens.length >= 2 && tokens.every(word => words.has(word))) || !!(alias && words.has(alias)) };
  }).filter(item => item.matches);
  const seen = new Set<string>();
  return matches.filter(item => !matches.some(other => other !== item && other.tokens.length > item.tokens.length && item.tokens.every(word => other.tokens.includes(word))))
    .filter(({poi}) => { const key = makeNaturalKey(poi); if (seen.has(key)) return false; seen.add(key); return true; })
    .sort((a, b) => normalized.indexOf(a.tokens[0]) - normalized.indexOf(b.tokens[0])).map(item => item.poi);
}

export function resolveGuideIntent(messages: Pick<ChatMessage, 'role' | 'text'>[], pois: IPoi[], context?: PlanningContext): GuideIntent {
  const users = messages.filter(message => message.role === 'user').map(message => normalizeSearch(message.text));
  const latest = users.at(-1) || '';
  const preferences: SearchFilters = {};
  let availableMinutes = context?.availableMinutes ?? 720;
  let explicitDuration = false;
  let budgetFlexible = false;
  let foodQuery: string | undefined;
  for (const text of users) {
    if (/\brajasthani\b/.test(text)) foodQuery = 'rajasthani';
    if (/\b(pure veg|pure vegetarian|vegetarian|only veg)\b/.test(text)) preferences.pureVeg = true;
    if (/\bjain\b/.test(text)) preferences.jainFoodAvailable = true;
    if (/\b(no dietary restrictions|any food|non veg is fine)\b/.test(text)) { delete preferences.pureVeg; delete preferences.jainFoodAvailable; }
    if (/\b(no|without|not|remove)\b.*\b(budget|price|cost)\b|\b(budget|price|cost)\b.*\b(no limit|unlimited|boundation nahi|restriction nahi)\b/.test(text)) { delete preferences.maxPriceINR; budgetFlexible = true; }
    else {
      const budget = text.match(/\bbudget(?: of| is| around| under)?\s+(?:inr\s+)?(\d[\d ]*)/);
      if (budget) { preferences.maxPriceINR = Number(budget[1].replace(/ /g, '')); budgetFlexible = false; }
    }
    if (/\b(no|without|not|remove)\b.*\b(time|duration)\b|\b(time|duration)\b.*\b(no limit|unlimited|boundation nahi|restriction nahi)\b/.test(text)) { availableMinutes = 720; explicitDuration = true; }
    else {
      const duration = text.match(/\b(\d{1,3})\s*(hours?|hrs?|minutes?|mins?|ghante)\b/);
      if (duration) { availableMinutes = Math.min(720, Math.max(15, Number(duration[1]) * (/hour|hr|ghante/.test(duration[2]) ? 60 : 1))); explicitDuration = true; }
    }
  }
  if (!explicitDuration) availableMinutes = 720; // Don't perpetuate a duration invented in an earlier reply.
  const named = namedPlaces(latest, pois);
  const replacing = /\b(instead|replace|start over|new trip|new plan|only visit|sirf)\b/.test(latest);
  const changingSchedule = replacing || /\b(tomorrow|today|tonight|start|begin|reschedule|earlier|later|morning|afternoon|evening)\b|\b\d{1,2}\s*(am|pm)\b|\bat\s+\d{1,2}\b/.test(latest)
    || /\b\d{1,2}:\d{2}\b/.test(messages.filter(message => message.role === 'user').at(-1)?.text || '');
  const removing = /\b(remove|skip|drop|exclude|do not include|dont include)\b/.test(latest);
  const previous = replacing ? [] : context?.poiIds || [];
  const requiredIds = removing ? previous.filter(id => !named.some(poi => poi.id === id)) : [...new Set([...previous, ...named.map(poi => poi.id)])];
  return { requiredIds, preferences, availableMinutes, budgetFlexible, foodQuery, fixedStartISO: changingSchedule ? undefined : context?.startISO,
    wantsFood: /\b(food|dinner|lunch|breakfast|dining|restaurant|veg|vegetarian|jain|thali|rajasthani)\b/.test(latest),
    wantsRevision: named.length > 0 || /\b(add|include|remove|skip|cheaper|indoor|revise|change)\b/.test(latest),
    keepOrder: /\b(in this order|keep (?:my|this|the) order|exact order|same order)\b/.test(latest) };
}
