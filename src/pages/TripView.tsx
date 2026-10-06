import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import BrandHeader from '../components/BrandHeader';
import ItineraryTimeline from '../components/ItineraryTimeline';
import WhatsAppShare from '../components/WhatsAppShare';
import BookingModal from '../components/BookingModal';
import { readTrip } from '../lib/tripService';
import { tripDate } from '../utils/format';
import type { Trip, TripStop } from '../types/trip';
const MapView = lazy(() => import('../components/MapView'));
export default function TripView() {
  const { code = '' } = useParams();
  const [result, setResult] = useState<{ key: string; trip: Trip | null; error: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [booking, setBooking] = useState<TripStop | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${code}:${attempt}`;
  const loading = result?.key !== key;
  const trip = loading ? null : result?.trip;
  const error = loading ? '' : result?.error;
  useEffect(() => {
    let active = true;
    readTrip(code).then((saved) => { if (active) setResult({ key, trip: saved, error: '' }); })
      .catch((err) => { if (active) setResult({ key, trip: null, error: err instanceof Error ? err.message : 'Trip could not be found' }); });
    return () => { active = false; };
  }, [code, key]);
  return <><BrandHeader /><main className="mx-auto max-w-5xl px-5 py-10">
    <Link to="/" className="mb-6 flex items-center gap-2 text-xs text-gold"><ArrowLeft size={14} />Make your own Jaipur plan</Link>
    {loading ? <div className="space-y-4" role="status" aria-label="Loading shared itinerary"><div className="skeleton h-12 w-2/3" /><div className="skeleton h-[400px]" /></div>
      : error || !trip ? <div className="panel p-8"><h1 className="mb-3 text-2xl">We couldn’t find this day.</h1><p className="text-sm text-slate-400" role="alert">{error || 'The trip is unavailable.'}</p><button className="button-secondary mt-5" onClick={() => setAttempt(attempt + 1)}>Try again</button></div>
      : <><p className="mb-3 flex items-center gap-2 text-xs text-gold"><CalendarDays size={14} />{tripDate(trip.stops[0]?.startAt || trip.createdAt)} · {trip.code}</p><h1 className="mb-2 text-3xl font-medium">A little Jaipur, together.</h1><p className="mb-8 text-sm text-slate-400">Your shared itinerary from Hotel Pearl Palace</p>
        <div className="grid gap-5 md:grid-cols-2"><div className="panel p-5"><Suspense fallback={<div className="skeleton h-[300px]" />}><MapView stops={trip.stops} selectedId={selectedId} onSelect={setSelectedId} /></Suspense><div className="mt-5"><WhatsAppShare trip={trip} ensureTrip={async () => trip} /></div></div><div className="panel p-5"><ItineraryTimeline plan={trip} selectedId={selectedId} onSelect={setSelectedId} onBook={setBooking} /></div></div>
        {booking && <BookingModal stop={booking} ensureTrip={async () => trip} onClose={() => setBooking(null)} />}
      </>}
  </main></>;
}
