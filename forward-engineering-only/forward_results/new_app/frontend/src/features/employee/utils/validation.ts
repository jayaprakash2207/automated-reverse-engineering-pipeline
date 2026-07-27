export function isRequired(value: string): boolean {
  return value.trim().length > 0;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidSsn(value: string): boolean {
  return /^\d{9}$/.test(value.replace(/-/g, ''));
}

export function isValidDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}
