import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/services/api';

/**
 * useFetch(url)
 * useFetch(url, deps)            — re-fetch when deps change (array)
 * useFetch(url, { params, immediate }) — original options form
 */
const useFetch = (url, secondArg = null) => {
  // Detect whether secondArg is a dependency array or an options object
  const isDepsArray = Array.isArray(secondArg);
  const deps   = isDepsArray ? secondArg : [];
  const options = isDepsArray ? {} : (secondArg || {});
  const { params = {}, immediate = true } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const paramsKey = JSON.stringify(params);

  const fetchData = useCallback(
    async (overrideParams) => {
      if (!url) return;
      setLoading(true);
      setError(null);
      try {
        const { data: response } = await api.get(url, {
          params: overrideParams || params,
        });
        // API envelope: { success, data, pagination } — expose the full response
        setData(response);
        return response;
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'An error occurred';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, paramsKey]
  );

  useEffect(() => {
    if (immediate !== false && url) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, ...deps]);

  return { data, loading, error, refetch: fetchData };
};

export default useFetch;
