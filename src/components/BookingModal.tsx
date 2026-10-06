import { useRef, useState } from 'react';
import { X, CheckCircle2, Smartphone } from 'lucide-react';
import { bookPartner } from '../lib/bookingService';
import type { Trip, TripStop } from '../types/trip';
import { inr } from '../utils/format';
import { useDialog } from '../hooks/useDialog';
export default function BookingModal({ stop, ensureTrip, onClose }: { stop: TripStop; ensureTrip: () => Promise<Trip>; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [amount, setAmount] = useState(stop.priceINR);
  const [error, setError] = useState('');
  const requestId = useRef(crypto.randomUUID());
  const dialog = useRef<HTMLDivElement>(null);
  useDialog(dialog, onClose, busy);
  async function confirm() {
    setBusy(true); setError('');
    try { const trip = await ensureTrip(); const booking = await bookPartner(trip.code, stop.poiId, requestId.current); setAmount(booking.amountINR); setSuccess(true); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not book this experience'); }
    finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-5" onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="booking-title" className="panel w-full max-w-md p-7">
      <div className="mb-6 flex justify-between"><span className="rounded-md bg-gold/10 px-2 py-1 text-[10px] tracking-wider text-gold">DEMO BOOKING</span><button aria-label="Close booking" disabled={busy} onClick={onClose}><X size={18} /></button></div>
      {success ? <><CheckCircle2 size={38} className="mb-4 text-teal" /><h2 id="booking-title" className="mb-2 text-xl font-semibold">You’re on the list!</h2><p className="text-sm leading-7 text-slate-400">Demo booking for {stop.name} saved at {inr(amount)}. No money was charged and no real reservation was made.</p><button onClick={onClose} className="button-primary mt-6 w-full">Back to my day</button></>
        : <><Smartphone size={32} className="mb-4 text-teal" /><h2 id="booking-title" className="text-xl font-semibold">{stop.name}</h2><p className="mt-2 text-sm text-slate-400">One guest · Indicative Indian adult rate</p><p className="my-6 text-3xl font-medium text-gold">{inr(stop.priceINR)}</p><div className="rounded-xl border border-white/10 bg-navy p-4 text-xs leading-6 text-slate-400">Mock UPI checkout. This creates a demo booking and tracks hotel commission. No payment or real reservation. Current catalogue pricing is applied on confirmation.</div>{error && <p className="mt-3 text-xs text-red-300" role="alert">{error}</p>}<button disabled={busy} onClick={() => void confirm()} className="button-primary mt-6 w-full">{busy ? 'Saving booking…' : 'Confirm demo booking'}</button></>}
    </div>
  </div>;
}
