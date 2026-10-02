import { useCallback, useRef, useState } from 'react';

/**
 * Lets one mutating request run at a time for a screen or dialog.
 *
 * `run(task)` returns immediately (undefined) while an earlier task is still pending. The ref is what
 * stops a fast double-click or Enter-key repeat: `disabled={submitting}` only takes effect after
 * React re-renders, which is too late for a second click in the same frame.
 *
 * Usage:
 *   const { submitting, run } = useSubmitGuard();
 *   const handleSave = () => run(async () => { await api.post(...); });
 *   <Button disabled={submitting} onClick={handleSave}>{submitting ? 'Saving…' : 'Save'}</Button>
 */
export default function useSubmitGuard() {
  const inFlightRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const run = useCallback(async (task) => {
    if (inFlightRef.current) return undefined;
    inFlightRef.current = true;
    setSubmitting(true);
    try {
      return await task();
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  }, []);

  return { submitting, run };
}
