import { useState } from 'react';
import { MessageCircle, Link2, Check, LoaderCircle } from 'lucide-react';
import type { Trip } from '../types/trip';
import { tripURL, whatsappURL } from '../lib/whatsapp';
export default function WhatsAppShare({ trip, ensureTrip, disabled = false }: { trip: Trip | null; ensureTrip: () => Promise<Trip>; disabled?: boolean }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  async function prepare() {
    setSaving(true); setError('');
    try { await ensureTrip(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save the trip'); }
    finally { setSaving(false); }
  }
  async function copy() {
    if (!trip) return;
    try { await navigator.clipboard.writeText(tripURL(trip.code)); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { setError('Copy the trip link below to share it.'); }
  }
  return <div>
    {trip ? <div className="flex gap-2"><a href={whatsappURL(trip)} target="_blank" rel="noopener noreferrer" className="button-primary flex flex-1 items-center justify-center gap-2 bg-teal text-white"><MessageCircle size={16} />Share on WhatsApp</a><button aria-label="Copy trip link" onClick={() => void copy()} className="button-secondary">{copied ? <Check size={17} /> : <Link2 size={17} />}</button></div>
      : <button disabled={disabled || saving} onClick={() => void prepare()} className="button-primary flex w-full items-center justify-center gap-2 bg-teal text-white">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <MessageCircle size={16} />}{saving ? 'Saving your itinerary…' : 'Save & share itinerary'}</button>}
    {trip && <a href={tripURL(trip.code)} className="mt-2 block break-all text-center text-[10px] text-slate-500 hover:text-gold">{tripURL(trip.code)}</a>}
    {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
  </div>;
}
