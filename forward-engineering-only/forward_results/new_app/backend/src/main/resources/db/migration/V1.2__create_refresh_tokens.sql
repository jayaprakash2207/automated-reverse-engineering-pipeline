CREATE TABLE refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_credential_id BIGINT NOT NULL REFERENCES user_credentials (id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    replaced_by_token_hash VARCHAR(128),
    CONSTRAINT uq_refresh_tokens_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_tokens_user_credential_id ON refresh_tokens (user_credential_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
