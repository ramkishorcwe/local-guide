import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import {
  listPOIs,
  createPOI,
  updatePOI,
  deletePOI,
} from "../../services/poiService"
import type { IPoi } from "../../interfaces";
import POIFormModal from "../../components/admin/POIFormModal";
import ConfirmDelete from "../../components/admin/ConfirmDelete";
import { Plus, Pencil, Trash2, LogOut, Search, Star, Users } from "lucide-react";
import CommissionCard from '../CommissionCard';
import { Link } from 'react-router-dom';

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const { logout } = useAdminAuth();
  const [pois, setPois] = useState<IPoi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPOI, setEditingPOI] = useState<IPoi | null>(null);
  const [deletingPOI, setDeletingPOI] = useState<IPoi | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await listPOIs();
      setPois(data);
    } catch (err) {
      console.error(err);
      showToast("Failed to load POIs", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);
  const refresh = () => { setLoading(true); return load(); };

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (data: Partial<IPoi>) => {
    try {
      if (editingPOI) {
        await updatePOI(editingPOI.id, data);
        showToast("POI updated");
      } else {
        await createPOI(data);
        showToast("POI created");
      }
      await refresh();
    } catch (err: any) {
      showToast(err.message || "Save failed", "error");
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deletingPOI) return;
    setDeleteLoading(true);
    try {
      await deletePOI(deletingPOI.id);
      showToast("POI deleted");
      setDeletingPOI(null);
      await refresh();
    } catch {
      showToast("Delete failed", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await logout(); onLogout(); }
    catch { showToast('Could not sign out. Try again.', 'error'); }
  };

  const filtered = pois.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.area.toLowerCase().includes(search.toLowerCase())
  );

  const partnerCount = pois.filter((p) => p.partner).length;

  return (
    <div className="min-h-screen bg-navy text-white">
      {/* Top bar */}
      <header className="border-b border-white/10 sticky top-0 bg-navy/95 backdrop-blur z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gold">Local Guide</h1>
            <p className="text-xs text-gray-400">Admin Panel</p>
            <Link to="/" className="text-xs text-teal">View guest app</Link>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-red-400 transition"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total POIs" value={pois.length} icon={<Users size={20} />} />
        <StatCard label="Partners" value={partnerCount} icon={<Star size={20} />} />
        <StatCard
          label="Avg Commission"
          value={
            partnerCount > 0
              ? `${Math.round(
                  pois.filter((p) => p.partner).reduce((s, p) => s + p.commissionPct, 0) /
                    partnerCount
                )}%`
              : "0%"
          }
          icon={<Star size={20} />}
        />
      </div>

      <div className="px-6"><CommissionCard /></div>
      {/* Toolbar */}
      <div className="max-w-7xl mx-auto px-6 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            value={search}
            aria-label="Search places"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or area..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-gray-500 focus:border-gold focus:outline-none"
          />
        </div>
        <button
          onClick={() => {
            setEditingPOI(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-gold text-navy font-bold px-5 py-2.5 rounded-lg hover:bg-gold/90 transition"
        >
          <Plus size={18} />
          Add POI
        </button>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading POIs...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              {search ? "No POIs match your search" : "No POIs yet. Add the first one!"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Area</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-left px-4 py-3">Rating</th>
                    <th className="text-left px-4 py-3">Partner</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((poi) => (
                    <tr
                      key={poi.id}
                      className="border-t border-white/5 hover:bg-white/5 transition"
                    >
                      <td className="px-4 py-3 font-medium">{poi.name}</td>
                      <td className="px-4 py-3 text-gray-400">{poi.area}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-white/10 px-2 py-1 rounded">
                          {poi.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gold">{poi.rating}★</td>
                      <td className="px-4 py-3">
                        {poi.partner ? (
                          <span className="text-xs bg-teal/20 text-teal px-2 py-1 rounded">
                            {poi.commissionPct}%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingPOI(poi);
                              setShowForm(true);
                            }}
                            className="p-2 rounded-lg hover:bg-gold/10 text-gray-400 hover:text-gold transition"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeletingPOI(poi)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <POIFormModal
          poi={editingPOI}
          onClose={() => {
            setShowForm(false);
            setEditingPOI(null);
          }}
          onSave={handleSave}
        />
      )}

      {deletingPOI && (
        <ConfirmDelete
          poiName={deletingPOI.name}
          onConfirm={handleDelete}
          onCancel={() => setDeletingPOI(null)}
          loading={deleteLoading}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-5 py-3 rounded-lg shadow-lg z-50 ${
            toast.type === "success"
              ? "bg-teal text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
      <div className="bg-gold/20 text-gold p-3 rounded-lg">{icon}</div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
