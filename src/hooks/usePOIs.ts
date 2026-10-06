import { useCallback, useEffect, useState } from 'react';
import { listPOIs } from '../lib/poiService';
import type { IPoi } from '../interfaces';
export function usePOIs() {
  const [pois, setPois] = useState<IPoi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setPois(await listPOIs()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load places'); }
    finally { setLoading(false); }
  }, []);
  const refresh = () => { setLoading(true); setError(''); return load(); };
  useEffect(() => { void load(); }, [load]);
  return { pois, loading, error, refresh };
}
