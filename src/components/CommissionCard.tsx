import { IndianRupee, RefreshCw } from 'lucide-react';
import { useBookings } from '../hooks/useBookings';
import { inr, tripDate } from '../utils/format';
export default function CommissionCard() {
  const { bookings, loading, error, refresh } = useBookings();
  return <section className="panel mx-auto mb-6 max-w-7xl p-5">
    <div className="flex items-start justify-between gap-4"><div><p className="mb-2 text-xs text-slate-400">Recorded hotel commission · Demo bookings</p><p className="flex items-center gap-2 text-3xl font-semibold text-gold"><IndianRupee size={24} />{loading ? '…' : inr(bookings.reduce((total, booking) => total + booking.commissionINR, 0))}</p><p className="mt-2 text-xs text-slate-400">{bookings.length} bookings · {inr(bookings.reduce((total, booking) => total + booking.amountINR, 0))} in experience value</p></div><button aria-label="Refresh bookings" disabled={loading} onClick={() => void refresh()} className="button-secondary"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button></div>
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
    {!error && !loading && !bookings.length && <p className="mt-4 text-sm text-slate-500">Your first guest experience booking will appear here.</p>}
    {bookings.slice(0, 5).map((booking) => <div key={booking.id} className="mt-4 flex justify-between gap-3 border-t border-white/10 pt-3 text-xs"><div>{booking.poiName}<p className="mt-1 text-slate-500">{booking.tripCode} · {tripDate(booking.bookedAt)}</p></div><span className="text-teal">+{inr(booking.commissionINR)}</span></div>)}
  </section>;
}
