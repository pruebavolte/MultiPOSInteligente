-- Terminal Connections table for storing OAuth tokens from payment terminals
-- Supports Mercado Pago Point, Clip, and other terminal integrations

CREATE TABLE IF NOT EXISTS terminal_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    mp_user_id TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    public_key TEXT,
    token_expires_at TIMESTAMPTZ,
    live_mode BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'connected',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one connection per provider per user
    UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE terminal_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own connections
CREATE POLICY "Users can view their own terminal connections"
    ON terminal_connections
    FOR SELECT
    USING (
        user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        OR user_id = auth.uid()::text
    );

-- Policy: Service role can do everything (for API callbacks)
CREATE POLICY "Service role full access to terminal connections"
    ON terminal_connections
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_terminal_connections_user_provider 
    ON terminal_connections(user_id, provider);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_terminal_connections_status 
    ON terminal_connections(status);
