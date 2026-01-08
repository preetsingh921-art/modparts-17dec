-- Create query_logs table for tracking API requests
CREATE TABLE IF NOT EXISTS public.query_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    query TEXT,
    model TEXT,
    action TEXT,
    duration INTEGER, -- in milliseconds
    status INTEGER,
    error TEXT
);

-- Add index on timestamp for faster queries
CREATE INDEX IF NOT EXISTS query_logs_timestamp_idx ON public.query_logs(timestamp);

-- No RLS policies needed as we access this via backend (dev-server) with service role key
-- or standard client wrapped by our API.
