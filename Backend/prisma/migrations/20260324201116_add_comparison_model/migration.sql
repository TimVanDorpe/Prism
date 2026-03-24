-- CreateTable
CREATE TABLE "Comparison" (
    "id" SERIAL NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "url" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "originalScore" INTEGER,
    "originalLeaning" TEXT,
    "originalSummary" TEXT,
    "relatedArticles" JSONB,
    "costUsd" DOUBLE PRECISION,
    "errorMessage" TEXT,

    CONSTRAINT "Comparison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Comparison_jobId_key" ON "Comparison"("jobId");

-- AddForeignKey
ALTER TABLE "Comparison" ADD CONSTRAINT "Comparison_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
