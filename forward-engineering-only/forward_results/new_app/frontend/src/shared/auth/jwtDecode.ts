export interface JwtClaims {
  sub: string;
  email?: string;
  roles?: string[];
  exp: number;
  iat?: number;
  [claim: string]: unknown;
}

export function decodeJwt(token: string): JwtClaims {
  const segments = token.split('.');
  if (segments.length !== 3) {
    throw new Error('Malformed JWT: expected three dot-separated segments.');
  }

  const payloadSegment = segments[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payloadSegment.padEnd(payloadSegment.length + ((4 - (payloadSegment.length % 4)) % 4), '=');
  const decoded = atob(padded);
  return JSON.parse(decoded) as JwtClaims;
}
