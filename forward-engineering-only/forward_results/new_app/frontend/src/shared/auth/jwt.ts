export interface DecodedJwt {
  sub: string;
  email?: string;
  roles?: string[];
  exp?: number;
}

// Decoding only reads the payload for UI display/route-gating convenience.
// It is not a trust boundary: signature verification and authorization are
// enforced server-side (Stack Mapping Contract row 6, @PreAuthorize).
export function decodeJwtPayload(token: string): DecodedJwt | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    );
    return JSON.parse(json) as DecodedJwt;
  } catch {
    return null;
  }
}
