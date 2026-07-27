import { decodeJwt } from './jwt';

function base64url(value: object): string {
  const json = JSON.stringify(value);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeJwt(claims: Record<string, unknown>): string {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const payload = base64url(claims);
  return `${header}.${payload}.fake-signature`;
}

describe('decodeJwt', () => {
  it('decodes the claims from a well-formed token', () => {
    const claims = { sub: 'emp-123', email: 'user@example.com', roles: ['EMPLOYEE'], exp: 9999999999 };

    const decoded = decodeJwt(makeJwt(claims));

    expect(decoded).toEqual(claims);
  });

  it('round-trips claims containing special characters and unicode text', () => {
    const claims = { sub: 'emp-456', email: 'user+test@example.com', roles: ['MANAGER', 'EMPLOYEE'], exp: 1234567890, note: '日本語 / naïve café' };

    const decoded = decodeJwt(makeJwt(claims));

    expect(decoded).toEqual(claims);
  });

  it('returns null for a string with no dot separators', () => {
    expect(decodeJwt('not-a-jwt-at-all')).toBeNull();
  });

  it('returns null when the payload segment is not valid base64', () => {
    expect(decodeJwt('header.!!!not-base64!!!.signature')).toBeNull();
  });

  it('returns null when the payload segment is not valid JSON', () => {
    const notJson = btoa('this is not json').replace(/=+$/, '');
    expect(decodeJwt(`header.${notJson}.signature`)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(decodeJwt('')).toBeNull();
  });
});
