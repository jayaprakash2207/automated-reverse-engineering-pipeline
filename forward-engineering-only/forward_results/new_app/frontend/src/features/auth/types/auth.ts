export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

// Field names use snake_case to match the backend's global Jackson
// SNAKE_CASE property-naming strategy (backend/src/main/resources/application.yml),
// applied to the AuthResponse DTO referenced in the backend scaffold.
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthenticatedUser {
  subject: string;
  email: string;
  roles: string[];
  expiresAt: number;
}
