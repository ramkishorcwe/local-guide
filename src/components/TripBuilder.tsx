import { useMemo, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Check, Search, X, Route } from 'lucide-react';
import type { IPoi } from '../interfaces';
import type { RoutePlan } from '../types/trip';
import { buildRoute } from '../lib/planner';
import { localPlanningDefaults, localTripStart, hasTripStartPassed } from '../lib/tripBuilder';
import { makeNaturalKey } from '../utility/naturalKey';

export default function TripBuilder({ pois, loading, loadError, onRetry, disabled, onBuild, onClose, initialPlan }: {
  pois: IPoi[]; loading: boolean; loadError: string; onRetry: () => void; disabled: boolean;
  onBuild: (plan: RoutePlan, query: string) => void; onClose: () => void;
  initialPlan?: RoutePlan | null;
}) {
  const [selected, setSelected] = useState<string[]>(() => initialPlan?.stops.map(stop => stop.poiId) || []);
  const [search, setSearch] = useState('');
  const [schedule, setSchedule] = useState(() => {
    const start = initialPlan?.startAt ?? (initialPlan ? initialPlan.stops[0].startAt - initialPlan.stops[0].travelMinutes * 60_000 : undefined);
    const local = start === undefined ? undefined : new Date(start + 330 * 60_000).toISOString();
    return { ...(local ? { date: local.slice(0, 10), time: local.slice(11, 16) } : localPlanningDefaults()), minutes: initialPlan?.availableMinutes ?? 360 };
  });
  const [today] = useState(() => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const places = useMemo(() => {
    const distinct = new Map<string, IPoi>();
    for (const poi of pois) {
      const key = makeNaturalKey(poi);
      const previous = distinct.get(key);
      if (!previous || initialPlan?.stops.some(stop => stop.poiId === poi.id)) distinct.set(key, poi);
    }
    return [...distinct.values()];
  }, [pois, initialPlan]);
  const chosen = selected.map(id => places.find(poi => poi.id === id)).filter((poi): poi is IPoi => !!poi);
  function toggle(id: string) {
    setError('');
    if (selected.includes(id)) setSelected(selected.filter(value => value !== id));
    else if (selected.length < 6) setSelected([...selected, id]);
    else setError('You can choose up to six stops. Remove one to add another.');
  }
  function move(index: number, offset: number) {
    const next = [...selected];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    setSelected(next); setError('');
  }
  function handleBuild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const currentSchedule = { date: String(data.get('date')), time: String(data.get('time')), minutes: Number(data.get('minutes')) };
    setSchedule(currentSchedule);
    setError('');
    try {
      if (!chosen.length) throw new Error('Choose at least one place to start your itinerary.');
      const startAt = localTripStart(currentSchedule.date, currentSchedule.time);
      if (hasTripStartPassed(startAt)) throw new Error('That start time has passed. Choose a later time or another day.');
      const plan = buildRoute(places, selected, startAt, currentSchedule.minutes);
      onBuild(plan, `Visit ${chosen.map(poi => poi.name).join(', ')} on ${currentSchedule.date} at ${currentSchedule.time} IST, with ${currentSchedule.minutes} minutes available.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'We couldn’t fit these stops. Adjust the time or places and try again.'); }
  }
  return <section className="panel mb-6 p-5 sm:p-6" aria-label="Choose your trip stops">
    <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-lg font-medium">Your places. Your order.</h2><p className="mt-1 text-xs leading-6 text-slate-400">Pick up to six stops. We’ll check opening hours and whether your whole outing fits.</p></div><button onClick={onClose} aria-label="Close trip builder" className="button-secondary p-2"><X size={16} /></button></div>
    <div className="grid gap-6 md:grid-cols-2">
      <div><label className="mb-3 flex items-center gap-2 rounded-lg border border-white/15 px-3"><Search size={15} className="text-slate-500" /><input aria-label="Search trip places" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search a place, area or category" className="w-full bg-transparent py-3 text-xs outline-none" /></label>
        {loading ? <p role="status" className="p-4 text-sm text-slate-400">Loading the hotel’s favourites…</p> : loadError ? <p role="alert" className="text-xs text-red-300">{loadError}<button onClick={onRetry} className="ml-2 text-gold">Try again</button></p>
          : <div className="max-h-72 space-y-2 overflow-y-auto pr-1">{places.filter(poi => `${poi.name} ${poi.area} ${poi.category}`.toLowerCase().includes(search.toLowerCase().trim())).map(poi => <button key={poi.id} aria-pressed={selected.includes(poi.id)} disabled={disabled} onClick={() => toggle(poi.id)} className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left ${selected.includes(poi.id) ? 'border-gold/50 bg-gold/10' : 'border-white/10 hover:border-gold/30'}`}><span><span className="block text-xs font-medium">{poi.name}</span><span className="mt-1 block text-[11px] text-slate-400">{poi.area} · {poi.avgVisitMinutes} min visit</span></span><span className="text-gold">{selected.includes(poi.id) ? <Check size={16} /> : '+'}</span></button>)}{!places.length && <p className="text-xs text-slate-400">The hotel is adding its local favourites.</p>}</div>}
      </div>
      <form onSubmit={handleBuild}>
        <div className="mb-4 grid grid-cols-3 gap-3"><label className="text-[11px] text-slate-400">Date<input aria-label="Trip date" name="date" type="date" min={today} value={schedule.date} onChange={event => setSchedule({ ...schedule, date: event.target.value })} className="input mt-2 text-xs" /></label><label className="text-[11px] text-slate-400">Start · Jaipur time<input aria-label="Trip start time" name="time" type="time" value={schedule.time} onChange={event => setSchedule({ ...schedule, time: event.target.value })} className="input mt-2 text-xs" /></label><label className="text-[11px] text-slate-400">Time available<select aria-label="Trip time available" name="minutes" value={schedule.minutes} onChange={event => setSchedule({ ...schedule, minutes: Number(event.target.value) })} className="input mt-2 text-xs">{[...new Set([60, 120, 180, 240, 360, 480, 720, schedule.minutes])].sort((a, b) => a - b).map(minutes => <option key={minutes} value={minutes}>{minutes / 60} {minutes === 60 ? 'hour' : 'hours'}</option>)}</select></label></div>
        <p className="mb-2 text-[11px] text-slate-400">Your stops · {selected.length}/6</p>
        {!chosen.length ? <div className="rounded-lg border border-dashed border-white/15 p-6 text-xs leading-6 text-slate-500">Choose places on the left. They’ll appear here in the order you select them.</div> : <ol className="space-y-2">{chosen.map((poi, index) => <li key={poi.id} className="flex items-center gap-2 rounded-lg bg-white/5 p-3"><span className="text-xs text-gold">{index + 1}.</span><span className="flex-1 text-xs">{poi.name}</span><button type="button" disabled={disabled || index === 0} aria-label={`Move ${poi.name} earlier`} onClick={() => move(index, -1)} className="p-1 text-slate-400 disabled:opacity-20"><ArrowUp size={14} /></button><button type="button" disabled={disabled || index === chosen.length - 1} aria-label={`Move ${poi.name} later`} onClick={() => move(index, 1)} className="p-1 text-slate-400 disabled:opacity-20"><ArrowDown size={14} /></button><button type="button" disabled={disabled} aria-label={`Remove ${poi.name}`} onClick={() => toggle(poi.id)} className="p-1 text-slate-400"><X size={14} /></button></li>)}</ol>}
        {error && <p role="alert" className="mt-3 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-xs leading-6 text-red-300">{error} Try another start time, allow more time, or remove a stop.</p>}
        <button type="submit" disabled={disabled || loading || !chosen.length} className="button-primary mt-4 flex w-full items-center gap-2"><Route size={15} />Build my itinerary</button>
        <p className="mt-2 text-[10px] leading-5 text-slate-500">From Hotel Pearl Palace. Includes transfers and full visits; the return to your hotel is extra.</p>
      </form>
    </div>
  </section>;
}
