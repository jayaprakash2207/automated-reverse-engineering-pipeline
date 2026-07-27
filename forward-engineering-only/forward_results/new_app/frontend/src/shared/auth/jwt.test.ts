import { decodeJwt, isExpired } from './jwt';
import type { JwtPayload } from './jwt';

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function buildToken(payload: object): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('decodeJwt', () => {
  it('decodes a well-formed token payload', () => {
    const token = buildToken({ sub: 'emp-1', roles: ['EMPLOYEE'], exp: 9999999999 });
    expect(decodeJwt(token)).toEqual({ sub: 'emp-1', roles: ['EMPLOYEE'], exp: 9999999999 });
  });

  it('returns null for a token with no payload segment', () => {
    expect(decodeJwt('only-one-segment')).toBeNull();
  });

  it('returns null for a payload segment that is not valid base64url JSON', () => {
    expect(decodeJwt('header.%%%not-base64%%%.sig')).toBeNull();
  });
});

describe('isExpired', () => {
  it('treats a payload with no exp claim as never expired', () => {
    expect(isExpired({ sub: 'emp-1' } as JwtPayload)).toBe(false);
  });

  it('returns true once exp is in the past', () => {
    expect(isExpired({ sub: 'emp-1', exp: 1 } as JwtPayload)).toBe(true);
  });

  it('returns false while exp is still in the future', () => {
    const farFuture = Math.floor(Date.now() / 1000) + 3600;
    expect(isExpired({ sub: 'emp-1', exp: farFuture } as JwtPayload)).toBe(false);
  });
});
