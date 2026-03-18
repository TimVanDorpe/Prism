-- AlterTable: add createdAt with default (safe)
ALTER TABLE "User" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add password as nullable first so existing rows don't fail
ALTER TABLE "User" ADD COLUMN "password" TEXT;

-- Give existing rows a placeholder (they can't log in with this — it's not a valid bcrypt hash)
UPDATE "User" SET "password" = 'NEEDS_RESET' WHERE "password" IS NULL;

-- Now enforce NOT NULL
ALTER TABLE "User" ALTER COLUMN "password" SET NOT NULL;
