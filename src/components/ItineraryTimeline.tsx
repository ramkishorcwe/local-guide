import { motion } from 'framer-motion';
import { ArrowUpRight, MapPin, Clock3, Route, CalendarDays } from 'lucide-react';
import type { RoutePlan, TripStop } from '../types/trip';
import { inr, time, tripDate } from '../utils/format';
export default function ItineraryTimeline({ plan, selectedId, onSelect, onBook, disabled = false }: {
  plan: RoutePlan | null; selectedId?: string | null; onSelect?: (id: string) => void;
  onBook?: (stop: TripStop) => void; disabled?: boolean;
}) {
  if (!plan) return <div className="rounded-xl border border-dashed border-white/15 p-7 text-center"><CalendarDays size={25} className="mx-auto mb-3 text-gold/70" /><h3 className="text-sm font-medium">A day made for you</h3><p className="mt-2 text-xs leading-6 text-slate-500">Chat with Guide to bring your itinerary to life.<br />Your places will appear right here.</p></div>;
  return <div>
    <div className="mb-4 flex flex-wrap items-center gap-3 text-[11px] text-slate-400"><span className="flex items-center gap-1"><CalendarDays size={12} />{tripDate(plan.stops[0].startAt)}</span><span className="flex items-center gap-1"><Clock3 size={12} />{plan.totalMinutes} min</span><span className="flex items-center gap-1"><Route size={12} />{plan.totalDistanceKm} km</span></div>
    {plan.routeNote && <p className="mb-4 rounded-xl border border-teal/20 bg-teal/5 p-3 text-xs leading-6 text-slate-300">{plan.routeNote}</p>}
    <ol className="space-y-3">{plan.stops.map((stop, index) => <motion.li key={stop.poiId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .08 }}
      className={`rounded-xl border p-4 transition ${selectedId === stop.poiId ? 'border-gold/60 bg-gold/5' : 'border-white/10 bg-white/[.025]'}`}>
      <div className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/30 text-xs text-gold">{index + 1}</span>
        <div className="min-w-0 flex-1"><p className="mb-1 text-[10px] font-medium tracking-wide text-gold">{time(stop.startAt)} — {time(stop.endAt)}</p>
          <button onClick={() => onSelect?.(stop.poiId)} className="text-left text-sm font-semibold hover:text-gold">{stop.name}</button>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><MapPin size={10} />{stop.area}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px]"><span className="rounded bg-white/5 px-2 py-1 text-slate-400">{stop.travelMinutes} min transfer</span><span className="rounded bg-white/5 px-2 py-1 text-slate-400">{stop.priceINR < 0 ? 'Price on request' : stop.priceINR === 0 ? 'Free entry' : `${inr(stop.priceINR)} / person`}</span>{stop.partner && <span className="rounded bg-teal/10 px-2 py-1 text-teal">Hotel partner</span>}</div>
          {onBook && stop.partner && stop.priceINR > 0 && <button disabled={disabled} onClick={() => onBook(stop)} className="mt-3 flex items-center gap-1 text-xs font-medium text-teal hover:text-white disabled:opacity-40">Book experience <ArrowUpRight size={13} /></button>}
        </div>
      </div>
    </motion.li>)}</ol>
    <p className="mt-4 text-[10px] leading-5 text-slate-500">Hours checked against the hotel catalogue. Transfers and straight-line distances are estimates; confirm holiday hours. Return to hotel is excluded.</p>
  </div>;
}
