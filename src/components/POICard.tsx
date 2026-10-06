import { Star, ArrowUpRight } from 'lucide-react';
import type { IPoi } from '../interfaces';
export default function POICard({ poi, onAsk }: { poi: IPoi; onAsk: (name: string) => void }) {
  return <button onClick={() => onAsk(poi.name)} className="panel group overflow-hidden text-left transition hover:border-gold/30">
    <div className="relative h-36 overflow-hidden"><img src={poi.imageUrl} alt={poi.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} /><div className="absolute inset-0 bg-gradient-to-t from-navy/80 to-transparent" /><span className="absolute bottom-3 left-4 rounded bg-black/40 px-2 py-1 text-[9px] uppercase tracking-widest">{poi.category}</span></div>
    <div className="p-4"><h3 className="text-sm font-semibold">{poi.name}</h3><div className="mt-2 flex items-center justify-between text-[11px] text-slate-400"><span>{poi.area}</span><span className="flex items-center gap-1 text-gold"><Star size={11} fill="currentColor" />{poi.rating}</span></div><p className="mt-3 flex items-center gap-1 text-[11px] text-teal">Ask Guide about this place <ArrowUpRight size={12} /></p></div>
  </button>;
}
