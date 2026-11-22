// Mirrors NogatuDrop_be/src/utils/passwordPolicy.js. The server is the authority; this lets a form say
// what is wrong before anything is sent.
export const MIN_PASSWORD_LENGTH = 8;
export const PASSWORD_RULE_TEXT = `At least ${MIN_PASSWORD_LENGTH} characters, with a letter, a number and a symbol (for example ! @ # $).`;

/** What is wrong with a proposed password, or '' when it is allowed. */
export function passwordProblem(password) {
  if (!password) return 'Password is required';
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  if (!/[A-Za-z]/.test(password)) return 'Password must include a letter';
  if (!/[0-9]/.test(password)) return 'Password must include a number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include a symbol, for example ! @ # $';
  return '';
}
