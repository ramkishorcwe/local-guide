import { Compass, MapPin, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
export default function BrandHeader() {
  return <header className="border-b border-white/10 bg-navy/95">
    <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-5 sm:px-8">
      <Link to="/" className="flex items-center gap-3" aria-label="Local Guide home">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold"><Compass size={26} strokeWidth={1.5} /></span>
        <div><div className="text-lg font-semibold tracking-tight">Local Guide<span className="ml-1 text-gold">.</span></div><div className="text-[10px] uppercase tracking-[.18em] text-slate-400">Hotel Pearl Palace</div></div>
      </Link>
      <div className="flex items-center gap-5"><span className="hidden items-center gap-2 text-xs text-slate-400 sm:flex"><MapPin size={14} className="text-gold" /> Jaipur, India</span>
        <Link to="/admin" className="flex items-center gap-1 text-xs text-slate-400 hover:text-gold">Hotel desk <ArrowUpRight size={14} /></Link></div>
    </div>
  </header>;
}
