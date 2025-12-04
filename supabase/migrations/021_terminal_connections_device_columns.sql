-- Add selected device columns to terminal_connections table
-- These columns store which terminal device the user has selected

ALTER TABLE terminal_connections 
ADD COLUMN IF NOT EXISTS selected_device_id TEXT,
ADD COLUMN IF NOT EXISTS selected_device_name TEXT;

-- Add index for device lookups
CREATE INDEX IF NOT EXISTS idx_terminal_connections_device 
    ON terminal_connections(selected_device_id);
