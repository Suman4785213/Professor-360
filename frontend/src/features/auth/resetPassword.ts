export function readResetToken(location: Pick<Location, 'hash'>): string {
  return new URLSearchParams(location.hash.replace(/^#/, '')).get('token') || '';
}
export function validateReset(password: string, confirmation: string, token: string): string {
  if (!token) return 'This reset link is invalid. Request a new link.';
  if (password.length < 8) return 'Use at least 8 characters.';
  if (password !== confirmation) return 'Passwords do not match.';
  return '';
}
export function resetError(error: any): string {
  if (error.response?.status === 429) return 'Too many attempts. Please try again later.';
  if (error.response?.status === 400) return 'The link is invalid, expired or already used, or the password does not meet security requirements. Try a stronger password or request a new link.';
  return 'Unable to reset your password. Please try again later.';
}
