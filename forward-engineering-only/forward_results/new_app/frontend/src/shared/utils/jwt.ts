export interface JwtClaims {
  sub: string;
  email?: string;
  roles?: string[];
  exp: number;
  [claim: string]: unknown;
}

/**
 * Decodes the JWT payload purely to read display claims (email/roles) for the UI.
 * The signature is never verified client-side — every request is still authorized
 * server-side per Stack Mapping Contract row 6. Malformed input (a boundary case,
 * since the token nominally comes from our own auth response) returns null rather
 * than throwing, so a decode hiccup can't blank the screen.
 */
export function decodeJwt(token: string): JwtClaims | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}
