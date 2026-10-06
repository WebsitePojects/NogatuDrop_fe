import { useEffect, useState } from 'react';
import api from '@/services/api';
import { TRACKING } from '@/services/endpoints';

// Riders ping about every 15 s; refreshing faster only repeats the same point.
const REFRESH_MS = 15000;

/**
 * Loads GET /tracking/:orderId/route and keeps it fresh while the order is on the road.
 * Returns { route, error }. Pass a falsy orderId to stay idle.
 */
export default function useOrderRoute(orderId, { live = true } = {}) {
  const [route, setRoute] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) { setRoute(null); return undefined; }
    let active = true;
    let timer;
    const load = async () => {
      try {
        const { data } = await api.get(TRACKING.ROUTE(orderId));
        if (!active) return;
        setRoute(data.data);
        setError('');
        if (live && data.data?.order_status === 'delivering') timer = setTimeout(load, REFRESH_MS);
      } catch (err) {
        if (active) setError(err?.response?.data?.message || 'Could not load the delivery map');
      }
    };
    load();
    return () => { active = false; clearTimeout(timer); };
  }, [orderId, live]);

  return { route, error };
}
