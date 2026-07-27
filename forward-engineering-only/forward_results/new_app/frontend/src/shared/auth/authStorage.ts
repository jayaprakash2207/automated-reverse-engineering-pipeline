// The Security/Identity Context sprint owns login/token-issuance UX. This
// module only reads the token it is expected to leave behind, so Employee
// Management screens can attach it to API calls once that sprint lands.
const ACCESS_TOKEN_KEY = 'app.access_token';

export function getAccessToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}
