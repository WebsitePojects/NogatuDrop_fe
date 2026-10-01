import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '@/services/api';
import { ORDERS } from '@/services/endpoints';
import Shop from './Shop.jsx';
import NotFound from './NotFound.jsx';
import { INFLUENCER_ROUTE, decideInfluencerRoute } from './influencerRouteDecision.js';

const LOADING = 'loading';

function RouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4" style={{ colorScheme: 'light' }}>
      <div className="w-full max-w-md space-y-3" role="status" aria-label="Loading checkout">
        <div className="h-6 w-1/2 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-40 animate-pulse rounded-2xl bg-gray-200" />
        <div className="h-10 animate-pulse rounded-xl bg-gray-200" />
      </div>
    </div>
  );
}

function RouteRetry({ onRetry }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4" style={{ colorScheme: 'light' }}>
      <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
        <h2 className="text-lg font-bold">We could not load this page</h2>
        <p className="mt-2 text-sm">Check your connection and try again.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-800 focus:outline-none focus:ring-4 focus:ring-amber-200"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

/**
 * Resolves `/:influencerSlug` against the API before rendering anything, so a
 * mistyped URL reaches NotFound instead of an empty influencer checkout.
 */
export default function InfluencerRoute() {
  const { influencerSlug } = useParams();
  const [attempt, setAttempt] = useState(0);
  const [resolution, setResolution] = useState({ view: LOADING, influencer: null });

  useEffect(() => {
    let active = true;
    setResolution({ view: LOADING, influencer: null });
    api.get(ORDERS.PUBLIC_INFLUENCER(influencerSlug))
      .then(({ data }) => ({ payload: data.data }))
      .catch((error) => ({ error }))
      .then((outcome) => {
        if (!active) return;
        setResolution({
          view: decideInfluencerRoute(outcome),
          // Use the server's canonical (lower-cased) slug for the order POST.
          influencer: outcome.payload
            ? { slug: outcome.payload.slug || influencerSlug, product: outcome.payload.product }
            : null,
        });
      });
    return () => { active = false; };
  }, [influencerSlug, attempt]);

  if (resolution.view === LOADING) return <RouteLoading />;
  if (resolution.view === INFLUENCER_ROUTE.RETRY) return <RouteRetry onRetry={() => setAttempt((n) => n + 1)} />;
  if (resolution.view === INFLUENCER_ROUTE.NOT_FOUND) return <NotFound />;
  return <Shop influencer={resolution.influencer} />;
}
