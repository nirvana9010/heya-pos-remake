-- Setup Supabase Realtime for MerchantNotification table
-- This migration should be run manually in Supabase dashboard or via migration

-- 1. Enable Realtime for the MerchantNotification table
-- Note: This requires superuser privileges and should be run in Supabase SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE "MerchantNotification";

-- 2. Enable Row Level Security on MerchantNotification
ALTER TABLE "MerchantNotification" ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policy for merchants to read their own notifications
-- This ensures merchants can only see notifications for their merchantId
CREATE POLICY "merchants_read_own_notifications" 
ON "MerchantNotification" 
FOR SELECT
TO authenticated
USING (
  -- Extract merchantId from JWT token
  -- Note: This assumes the JWT contains a merchantId claim
  "merchantId" = auth.jwt() ->> 'merchantId'
);

-- 4. Create RLS policy for service role to manage all notifications
-- This allows the backend API to create/update/delete notifications
CREATE POLICY "service_role_all_access" 
ON "MerchantNotification" 
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON "MerchantNotification" TO authenticated;

-- 6. Create index for better performance on merchantId filtering
-- (This might already exist from previous migrations)
CREATE INDEX IF NOT EXISTS idx_merchant_notification_merchant_id 
ON "MerchantNotification"("merchantId");

-- 7. Optional: Create a function to emit custom events
-- This can be used to emit events when notifications are created
CREATE OR REPLACE FUNCTION notify_new_merchant_notification()
RETURNS trigger AS $$
BEGIN
  -- Emit a custom event that can be listened to
  PERFORM pg_notify(
    'new_notification',
    json_build_object(
      'merchantId', NEW."merchantId",
      'notificationId', NEW."id",
      'type', NEW."type"
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to call the function on insert
CREATE TRIGGER on_merchant_notification_insert
AFTER INSERT ON "MerchantNotification"
FOR EACH ROW
EXECUTE FUNCTION notify_new_merchant_notification();

-- Note: To test if Realtime is working:
-- 1. Run this in SQL Editor: SELECT * FROM "MerchantNotification" WHERE "merchantId" = 'your-merchant-id';
-- 2. In another tab, insert a notification and see if it appears in realtime

-- To rollback:
-- ALTER PUBLICATION supabase_realtime DROP TABLE "MerchantNotification";
-- DROP POLICY IF EXISTS "merchants_read_own_notifications" ON "MerchantNotification";
-- DROP POLICY IF EXISTS "service_role_all_access" ON "MerchantNotification";
-- ALTER TABLE "MerchantNotification" DISABLE ROW LEVEL SECURITY;
-- DROP TRIGGER IF EXISTS on_merchant_notification_insert ON "MerchantNotification";
-- DROP FUNCTION IF EXISTS notify_new_merchant_notification();