import { useRef, useState } from 'react';
import { MessageCircle, Link2, Check, LoaderCircle, Bookmark, ArrowUpRight } from 'lucide-react';
import type { Trip } from '../types/trip';
import { tripURL, whatsappURL } from '../lib/whatsapp';
export default function WhatsAppShare({ trip, ensureTrip, disabled = false }: { trip: Trip | null; ensureTrip: () => Promise<Trip>; disabled?: boolean }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const inFlight = useRef(false);
  async function prepare() {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true); setError('');
    try { await ensureTrip(); }
    catch (err) {
      setError(err && typeof err === 'object' && 'code' in err && [401, 403].includes(Number(err.code))
        ? 'We couldn’t save your trip. Please ask the hotel desk to check trip-saving access.'
        : 'Your trip hasn’t been saved yet. Check your connection and try Save trip again.');
    }
    finally { inFlight.current = false; setSaving(false); }
  }
  async function copy() {
    if (!trip) return;
    try { await navigator.clipboard.writeText(tripURL(trip.code)); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { setError('Copy the trip link below to share it.'); }
  }
  return <div>
    {trip ? <><p role="status" className="mb-3 flex items-center gap-2 text-xs text-teal"><Check size={15} />Trip saved · {trip.code}</p><div className="flex gap-2"><a href={tripURL(trip.code)} className="button-secondary flex flex-1 items-center justify-center gap-2">View saved trip<ArrowUpRight size={14} /></a><button aria-label="Copy trip link" onClick={() => void copy()} className="button-secondary">{copied ? <Check size={17} /> : <Link2 size={17} />}</button></div><a href={whatsappURL(trip)} target="_blank" rel="noopener noreferrer" className="button-primary mt-2 flex w-full items-center justify-center gap-2 bg-teal text-white"><MessageCircle size={16} />Share on WhatsApp</a></>
      : <><button disabled={disabled || saving} onClick={() => void prepare()} className="button-primary flex w-full items-center justify-center gap-2">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Bookmark size={16} />}{saving ? 'Saving your trip…' : 'Save trip'}</button><p className="mt-2 text-center text-[11px] text-slate-400">Keep this itinerary and get a link to reopen or share it.</p></>}
    {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
  </div>;
}
