import { decodeJwt } from './jwtDecode';

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function buildToken(payload: Record<string, unknown>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('decodeJwt', () => {
  it('decodes the payload segment of a well-formed JWT', () => {
    const token = buildToken({ sub: 'user-1', email: 'user@example.com', roles: ['MANAGER'], exp: 1999999999 });

    const claims = decodeJwt(token);

    expect(claims).toMatchObject({
      sub: 'user-1',
      email: 'user@example.com',
      roles: ['MANAGER'],
      exp: 1999999999,
    });
  });

  it('throws when the token does not have three segments', () => {
    expect(() => decodeJwt('not-a-jwt')).toThrow('Malformed JWT');
  });
});
