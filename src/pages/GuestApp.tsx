import { lazy, Suspense, useState } from 'react';
import { MapPin, ShieldCheck, Heart, ArrowRight, Compass } from 'lucide-react';
import BrandHeader from '../components/BrandHeader';
import ChatBox from '../components/ChatBox';
import ItineraryTimeline from '../components/ItineraryTimeline';
import WhatsAppShare from '../components/WhatsAppShare';
import BookingModal from '../components/BookingModal';
import POICard from '../components/POICard';
import { useGuideStore } from '../store/guide';
import { useTrip } from '../hooks/useTrip';
import { usePOIs } from '../hooks/usePOIs';
import type { TripStop } from '../types/trip';
const MapView = lazy(() => import('../components/MapView'));
const emptyStops: TripStop[] = [];
export default function GuestApp() {
  const { plan, trip, selectedId, busy, patch } = useGuideStore();
  const { ensureTrip } = useTrip();
  const { pois, loading, error, refresh } = usePOIs();
  const [booking, setBooking] = useState<TripStop | null>(null);
  const [explore, setExplore] = useState(false);
  return <>
    <BrandHeader />
    <main className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-10">
      <div className="mb-8 flex items-end justify-between gap-6"><div><p className="mb-3 text-[10px] font-medium uppercase tracking-[.25em] text-gold">The pink city, at your pace</p><h1 className="text-3xl font-medium tracking-tight sm:text-[38px]">Less planning.<span className="text-gold"> More Jaipur.</span></h1><p className="mt-3 text-sm text-slate-400">Your hotel’s local knowledge. A day that feels like you.</p></div><div className="hidden items-center gap-2 rounded-full border border-teal/20 bg-teal/5 px-4 py-2 text-[11px] text-teal lg:flex"><ShieldCheck size={14} /> Real places. Thoughtful plans.</div></div>
      <div className="grid items-start gap-5 lg:grid-cols-[3fr_2fr]">
        <ChatBox />
        <aside className="panel overflow-hidden p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-semibold"><MapPin size={16} className="text-gold" />Your Jaipur, mapped</h2><span className="text-[10px] text-slate-500">OPENSTREETMAP</span></div>
          <Suspense fallback={<div className="skeleton h-[300px]" />}><MapView stops={plan?.stops || emptyStops} selectedId={selectedId} onSelect={(id) => patch({ selectedId: id })} /></Suspense>
          <div className="my-4 flex items-center gap-4 text-[10px] text-slate-500"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-teal" />Your hotel</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gold" />Your stops</span><span className="ml-auto">Estimated route</span></div>
          <div className="mb-4 mt-6 flex items-center justify-between"><h2 className="text-sm font-semibold">{plan ? 'Your day, beautifully planned' : 'Your itinerary'}</h2>{plan && <span className="text-[10px] text-teal">{plan.stops.length} stops</span>}</div>
          <ItineraryTimeline plan={plan} selectedId={selectedId} onSelect={(id) => patch({ selectedId: id })} onBook={setBooking} disabled={busy} />
          {plan && <div className="mt-5 border-t border-white/10 pt-5"><WhatsAppShare trip={trip} ensureTrip={ensureTrip} disabled={busy} /></div>}
          <div className="mt-5 flex items-center gap-2 text-[10px] text-slate-500"><Heart size={12} className="text-gold/70" /> Curated by locals. Made for your stay.</div>
        </aside>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6"><div className="flex items-center gap-2 text-xs text-slate-400"><Compass size={16} className="text-gold" /> A city full of stories. Where will yours begin?</div><button onClick={() => setExplore(!explore)} className="flex items-center gap-2 text-xs text-gold">{explore ? 'Hide local favourites' : 'Explore local favourites'}<ArrowRight size={14} /></button></div>
      {explore && <section className="mt-6" aria-label="Hotel curated places">
        {loading ? <div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((key) => <div key={key} className="skeleton h-56" />)}</div>
          : error ? <div className="panel p-5 text-xs text-red-300" role="alert">{error}<button className="ml-3 text-white" onClick={() => void refresh()}>Retry</button></div>
          : !pois.length ? <p className="text-sm text-slate-400">The hotel is adding its Jaipur favourites.</p>
          : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{pois.map((poi) => <POICard key={poi.id} poi={poi} onAsk={(name) => {
            patch({ draft: `Plan a visit to ${name}`, focusInput: true });
          }} />)}</div>}
      </section>}
    </main>
    <footer className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-2 px-5 py-5 text-[10px] text-slate-600 sm:px-8"><span>Hotel Pearl Palace × Local Guide</span><span>Made with a little Jaipur magic · Demo experience bookings</span></footer>
    {booking && <BookingModal stop={booking} ensureTrip={ensureTrip} onClose={() => setBooking(null)} />}
  </>;
}
