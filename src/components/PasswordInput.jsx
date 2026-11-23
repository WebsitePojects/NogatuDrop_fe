import { useState } from 'react';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';

/**
 * Every password field in the app: a plain input with a show / hide eye button (standing UI rule: password
 * fields always let the person see what they typed). Takes the same props as <input>; `className` styles the
 * input, `toggleClassName` the eye (e.g. light colors on a dark login card). The eye is a real button, reachable
 * by keyboard, with a label that says what it will do.
 */
export default function PasswordInput({ className = '', toggleClassName = 'text-gray-500 hover:text-gray-800 dark:text-[var(--dark-muted)] dark:hover:text-[var(--dark-text)]', ...inputProps }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...inputProps} type={visible ? 'text' : 'password'} className={`${className} pr-11`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={inputProps.disabled}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={inputProps.id}
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50 ${toggleClassName}`}
      >
        {visible ? <HiOutlineEyeOff className="h-5 w-5" aria-hidden="true" /> : <HiOutlineEye className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  );
}
