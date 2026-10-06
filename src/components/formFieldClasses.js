// Field styles shared by the staff forms that sit next to the AddressPicker, so every input in one
// dialog looks the same. Phones get 16px text (so iOS does not zoom the page on focus) and a 44px tap
// height; from 768px up the denser desktop size returns.
export const FIELD_CLASSES = {
  field: '',
  label: 'mb-1 block text-sm font-medium text-gray-900 dark:text-[var(--dark-text)]',
  input: 'block w-full min-h-[44px] rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-base text-gray-900 placeholder-gray-500 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-60 aria-[invalid=true]:border-red-500 md:min-h-[40px] md:text-sm dark:border-[var(--dark-border)] dark:bg-[var(--dark-card2)] dark:text-[var(--dark-text)]',
  hint: 'mt-1 text-xs text-red-600 dark:text-red-400',
};
