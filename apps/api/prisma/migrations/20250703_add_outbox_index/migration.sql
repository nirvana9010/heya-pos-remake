-- CreateIndex
CREATE INDEX "OutboxEvent_processedAt_retryCount_idx" ON "OutboxEvent"("processedAt", "retryCount");