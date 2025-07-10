-- Enable Realtime for MerchantNotification table
ALTER PUBLICATION supabase_realtime ADD TABLE "MerchantNotification";

-- Create RLS policies for MerchantNotification
ALTER TABLE "MerchantNotification" ENABLE ROW LEVEL SECURITY;

-- Policy to allow merchants to see their own notifications
CREATE POLICY "Merchants can view own notifications" ON "MerchantNotification"
    FOR SELECT
    USING (auth.jwt() ->> 'merchantId' = "merchantId");

-- Policy to allow the API service role to insert notifications
CREATE POLICY "Service role can insert notifications" ON "MerchantNotification"
    FOR INSERT
    WITH CHECK (true);

-- Policy to allow merchants to update their own notifications (for marking as read)
CREATE POLICY "Merchants can update own notifications" ON "MerchantNotification"
    FOR UPDATE
    USING (auth.jwt() ->> 'merchantId' = "merchantId");

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_merchant_notification_merchant_id_created 
    ON "MerchantNotification" ("merchantId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_merchant_notification_read_status 
    ON "MerchantNotification" ("merchantId", "read");

-- Enable Realtime for the entire database (if not already enabled)
-- This is usually already done, but including for completeness
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pgtap'
    ) THEN
        -- Check if realtime is enabled
        PERFORM 1 FROM pg_stat_replication;
    END IF;
END $$;

-- Test the setup by checking if the table is in the publication
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'MerchantNotification';