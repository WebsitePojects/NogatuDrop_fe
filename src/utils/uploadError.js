// Surfaces the server's actual reason for a failed upload (wrong file type,
// file too large, service unavailable) instead of a generic "Upload failed"
// toast that leaves the user guessing what to do differently.
export function extractUploadErrorMessage(err, fallback = 'Upload failed. Please try a JPG, PNG, HEIC, or PDF under the size limit.') {
  return err?.response?.data?.message || err?.message || fallback;
}
