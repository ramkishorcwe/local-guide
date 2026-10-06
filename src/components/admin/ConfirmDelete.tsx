import { AlertTriangle } from "lucide-react";
import { useRef } from 'react';
import { useDialog } from '../../hooks/useDialog';

type Props = {
  poiName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export default function ConfirmDelete({ poiName, onConfirm, onCancel, loading }: Props) {
  const dialog = useRef<HTMLDivElement>(null);
  useDialog(dialog, onCancel, loading);
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div ref={dialog} role="dialog" aria-modal="true" aria-label="Delete place" className="bg-navy border border-red-500/30 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-red-500/20 p-2 rounded-lg">
            <AlertTriangle size={22} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Delete POI?</h3>
            <p className="text-sm text-gray-400 mt-1">
              <span className="text-white font-medium">{poiName}</span> will be
              permanently removed. This cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-gray-300 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
