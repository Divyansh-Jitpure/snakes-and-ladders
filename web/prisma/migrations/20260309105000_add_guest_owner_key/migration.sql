ALTER TABLE "GameHistory"
ADD COLUMN "createdByGuestKey" TEXT;

CREATE INDEX "GameHistory_createdByGuestKey_createdAt_idx"
ON "GameHistory"("createdByGuestKey", "createdAt");
