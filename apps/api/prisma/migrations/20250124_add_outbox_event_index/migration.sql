-- Add performance index for OutboxEvent polling queries
-- This index specifically targets the frequent query: WHERE processedAt IS NULL AND retryCount < X

CREATE INDEX IF NOT EXISTS "OutboxEvent_processedAt_retryCount_idx" 
ON "OutboxEvent"("processedAt", "retryCount") 
WHERE "processedAt" IS NULL;