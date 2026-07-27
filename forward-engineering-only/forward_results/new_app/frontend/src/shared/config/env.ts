export const API_BASE_URL = '/api/v1';

export function isProductionBuild(): boolean {
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
}
