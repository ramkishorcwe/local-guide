import { useState, useRef } from "react";
import { useDialog } from '../../hooks/useDialog';
import type { IPoi } from "../../interfaces";
import { X, Save } from "lucide-react";

type Props = {
  poi?: IPoi | null;
  onClose: () => void;
  onSave: (poi: Partial<IPoi>) => Promise<void>;
};

const CATEGORIES = [
  "restaurant",
  "attraction",
  "experience",
  "shopping",
  "cafe",
  "wellness",
  "park",
  "transport",
];

export default function POIFormModal({ poi, onClose, onSave }: Props) {
  const isEdit = !!poi;
  const [form, setForm] = useState<Partial<IPoi>>(
    poi ?? {
      name: "",
      category: "attraction",
      subCategory: "",
      area: "",
      rating: 4.0,
      lat: 26.9124,
      lng: 75.7873,
      kidFriendly: false,
      indoor: false,
      partner: false,
      commissionPct: 0,
      avgVisitMinutes: 60,
      distanceFromHotelKm: 0,
      tags: [],
      imageUrl: "",
      openHours: {
        mon: "09:00-18:00",
        tue: "09:00-18:00",
        wed: "09:00-18:00",
        thu: "09:00-18:00",
        fri: "09:00-18:00",
        sat: "09:00-18:00",
        sun: "09:00-18:00",
      },
    }
  );
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  useDialog(dialog, onClose, saving);

  const update = (key: keyof IPoi, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    setError("");
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div ref={dialog} role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit place' : 'Add place'} className="bg-navy border border-gold/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-navy z-10">
          <h2 className="text-xl font-bold text-gold">
            {isEdit ? "Edit POI" : "Add New POI"}
          </h2>
          <button aria-label="Close place editor" disabled={saving} onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-gray-400">One place per name and area. Edit an existing place to change its details.</p>
          {error && (
            <div role="alert" className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Name *">
              <input
                required
                aria-label="Place name"
                value={form.name ?? ""}
                onChange={(e) => update("name", e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Category *">
              <select
                value={form.category ?? "attraction"}
                onChange={(e) => update("category", e.target.value)}
                className="input"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>

            <Field label="Sub-category">
              <input
                value={form.subCategory ?? ""}
                onChange={(e) => update("subCategory", e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Area *">
              <input
                required
                aria-label="Area"
                value={form.area ?? ""}
                onChange={(e) => update("area", e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Rating (0-5)">
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={form.rating ?? 0}
                onChange={(e) => update("rating", parseFloat(e.target.value))}
                className="input"
              />
            </Field>

            <Field label="Avg Visit (min)">
              <input
                type="number"
                value={form.avgVisitMinutes ?? 60}
                onChange={(e) => update("avgVisitMinutes", parseInt(e.target.value))}
                className="input"
              />
            </Field>

            <Field label="Latitude">
              <input
                type="number"
                step="0.0001"
                value={form.lat ?? 0}
                onChange={(e) => update("lat", parseFloat(e.target.value))}
                className="input"
              />
            </Field>

            <Field label="Longitude">
              <input
                type="number"
                step="0.0001"
                value={form.lng ?? 0}
                onChange={(e) => update("lng", parseFloat(e.target.value))}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Cuisine"><input className="input" value={form.cuisine ?? ''} onChange={(e) => update('cuisine', e.target.value)} /></Field>
            <Field label="Distance from hotel (km)"><input className="input" type="number" min="0" step="0.1" value={form.distanceFromHotelKm ?? 0} onChange={(e) => update('distanceFromHotelKm', Number(e.target.value))} /></Field>
            <Field label="Experience price (INR)"><input className="input" type="number" min="0" step="1" value={form.priceINR ?? ''} onChange={(e) => update('priceINR', e.target.value ? Number(e.target.value) : undefined)} /></Field>
            <Field label="Indian entry fee (INR)"><input className="input" type="number" min="0" step="1" value={form.entryFeeINR ?? ''} onChange={(e) => update('entryFeeINR', e.target.value ? Number(e.target.value) : undefined)} /></Field>
            <Field label="Foreigner entry fee (INR)"><input className="input" type="number" min="0" step="1" value={form.foreignerFeeINR ?? ''} onChange={(e) => update('foreignerFeeINR', e.target.value ? Number(e.target.value) : undefined)} /></Field>
            <Field label="Price level (1–4)"><input className="input" type="number" min="1" max="4" value={form.priceLevel ?? ''} onChange={(e) => update('priceLevel', e.target.value ? Number(e.target.value) : undefined)} /></Field>
          </div>
          <Field label="Booking URL"><input className="input" type="url" value={form.bookingUrl ?? ''} onChange={(e) => update('bookingUrl', e.target.value || null)} /></Field>
          <fieldset className="rounded-xl border border-white/10 p-4"><legend className="px-2 text-xs text-gray-400">Weekly opening hours · Asia/Kolkata</legend><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => <label key={day} className="text-xs uppercase text-gray-400">{day}<input aria-label={`${day} opening hours`} className="input mt-1 text-xs" placeholder="09:00-18:00 or closed" value={form.openHours?.[day] ?? ''} onChange={(e) => update('openHours', { ...form.openHours, [day]: e.target.value })} required /></label>)}</div></fieldset>
          <Field label="Tags (comma-separated)">
            <input
              value={(form.tags ?? []).join(", ")}
              onChange={(e) =>
                update(
                  "tags",
                  e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
                )
              }
              placeholder="heritage, photography, family"
              className="input"
            />
          </Field>

          <Field label="Image URL">
            <input
              value={form.imageUrl ?? ""}
              onChange={(e) => update("imageUrl", e.target.value)}
              placeholder="https://..."
              className="input"
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              rows={2}
              className="input"
            />
          </Field>

          <div className="flex flex-wrap gap-6">
            <Checkbox label="Jain food available" checked={!!form.jainFoodAvailable} onChange={(v) => update('jainFoodAvailable', v)} />
            <Checkbox label="Rooftop" checked={!!form.hasRooftop} onChange={(v) => update('hasRooftop', v)} />
            <Checkbox
              label="Kid-friendly"
              checked={!!form.kidFriendly}
              onChange={(v) => update("kidFriendly", v)}
            />
            <Checkbox
              label="Indoor"
              checked={!!form.indoor}
              onChange={(v) => update("indoor", v)}
            />
            <Checkbox
              label="Pure Veg"
              checked={!!form.pureVeg}
              onChange={(v) => update("pureVeg", v)}
            />
            <Checkbox
              label="Partner"
              checked={!!form.partner}
              onChange={(v) => update("partner", v)}
            />
          </div>

          {form.partner && (
            <Field label="Commission %">
              <input
                type="number"
                min="0"
                max="50"
                value={form.commissionPct ?? 0}
                onChange={(e) => update("commissionPct", parseInt(e.target.value))}
                className="input"
              />
            </Field>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-gray-300 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-gold text-navy font-bold px-5 py-2.5 rounded-lg hover:bg-gold/90 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "Saving..." : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .input {
          width: 100%;
          background: #0A1628;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          color: white;
          outline: none;
        }
        .input:focus { border-color: #D4AF37; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-gold w-4 h-4"
      />
      {label}
    </label>
  );
}
