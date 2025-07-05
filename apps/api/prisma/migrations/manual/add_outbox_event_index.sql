-- Add index to improve OutboxEvent query performance
-- This index significantly speeds up queries that filter by processedAt and retryCount
CREATE INDEX IF NOT EXISTS "idx_outbox_event_processing" 
ON "OutboxEvent" ("processedAt", "retryCount") 
WHERE "processedAt" IS NULL;

-- This partial index is even more efficient as it only indexes unprocessed events
-- which are the ones we query for