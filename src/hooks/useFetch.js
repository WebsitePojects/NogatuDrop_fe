import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';

const useFetch = (url, options = {}) => {
  const { params = {}, immediate = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(
    async (overrideParams) => {
      if (!url) return;
      setLoading(true);
      setError(null);
      try {
        const { data: response } = await api.get(url, {
          params: overrideParams || params,
        });
        setData(response.data || response);
        return response.data || response;
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'An error occurred';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [url, JSON.stringify(params)]
  );

  useEffect(() => {
    if (immediate && url) {
      fetchData();
    }
  }, [fetchData, immediate]);

  return { data, loading, error, refetch: fetchData };
};

export default useFetch;
