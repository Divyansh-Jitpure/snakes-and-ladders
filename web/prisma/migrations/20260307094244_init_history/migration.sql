-- CreateEnum
CREATE TYPE "public"."MatchStatus" AS ENUM ('IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "public"."MoveJumpType" AS ENUM ('SNAKE', 'LADDER');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Match" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "winnerId" TEXT,
    "status" "public"."MatchStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MatchPlayer" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "turnOrder" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Move" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "diceRoll" INTEGER NOT NULL,
    "startPosition" INTEGER NOT NULL,
    "endPosition" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Move_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameHistory" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "winnerName" TEXT NOT NULL,
    "playerNames" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameMove" (
    "id" TEXT NOT NULL,
    "historyId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "diceRoll" INTEGER NOT NULL,
    "startPosition" INTEGER NOT NULL,
    "rawPosition" INTEGER NOT NULL,
    "endPosition" INTEGER NOT NULL,
    "jumpType" "public"."MoveJumpType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameMove_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Match_roomCode_createdAt_idx" ON "public"."Match"("roomCode", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPlayer_matchId_userId_key" ON "public"."MatchPlayer"("matchId", "userId");

-- CreateIndex
CREATE INDEX "Move_matchId_createdAt_idx" ON "public"."Move"("matchId", "createdAt");

-- CreateIndex
CREATE INDEX "GameHistory_createdAt_idx" ON "public"."GameHistory"("createdAt");

-- CreateIndex
CREATE INDEX "GameHistory_winnerName_idx" ON "public"."GameHistory"("winnerName");

-- CreateIndex
CREATE INDEX "GameMove_historyId_createdAt_idx" ON "public"."GameMove"("historyId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchPlayer" ADD CONSTRAINT "MatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchPlayer" ADD CONSTRAINT "MatchPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Move" ADD CONSTRAINT "Move_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Move" ADD CONSTRAINT "Move_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameMove" ADD CONSTRAINT "GameMove_historyId_fkey" FOREIGN KEY ("historyId") REFERENCES "public"."GameHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
