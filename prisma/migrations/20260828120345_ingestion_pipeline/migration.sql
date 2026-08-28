-- CreateEnum
CREATE TYPE "IngestionMethod" AS ENUM ('MANUAL_ENTRY', 'PASTED_TEXT', 'MANUAL_URL', 'CRAWLER', 'CSV_IMPORT');

-- CreateEnum
CREATE TYPE "ExtractionInputType" AS ENUM ('URL', 'CRAWLED_PAGE', 'PASTED_TEXT', 'PDF_TEXT', 'MANUAL_REEXTRACTION');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('SUGGESTED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DuplicateStatus" AS ENUM ('OPEN', 'KEPT_EXISTING', 'UPDATED_EXISTING', 'MERGED', 'NEW_COHORT', 'KEPT_BOTH', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "CollectionClassification_new" AS ENUM ('GRANT', 'SEED_FUND', 'INCUBATION_PROGRAM', 'ACCELERATION_PROGRAM', 'CSR_FUNDING', 'CORPORATE_INNOVATION', 'AWARD_OR_COMPETITION', 'FELLOWSHIP', 'PILOT_OPPORTUNITY', 'MARKET_ACCESS', 'PROCUREMENT_OPPORTUNITY', 'POSSIBLE_FUNDING_OPPORTUNITY', 'EVENT', 'NEWS_OR_ARTICLE', 'GENERAL_INFORMATION', 'NOT_AN_OPPORTUNITY', 'UNKNOWN');
ALTER TABLE "public"."CollectionItem" ALTER COLUMN "classification" DROP DEFAULT;
ALTER TABLE "CollectionItem" ALTER COLUMN "classification" TYPE "CollectionClassification_new" USING ("classification"::text::"CollectionClassification_new");
ALTER TYPE "CollectionClassification" RENAME TO "CollectionClassification_old";
ALTER TYPE "CollectionClassification_new" RENAME TO "CollectionClassification";
DROP TYPE "public"."CollectionClassification_old";
ALTER TABLE "CollectionItem" ALTER COLUMN "classification" SET DEFAULT 'UNKNOWN';
COMMIT;

-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'PARTIAL';

-- AlterTable
ALTER TABLE "CollectionItem" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "origin" "IngestionMethod" NOT NULL DEFAULT 'CRAWLER',
ADD COLUMN     "sourceName" TEXT,
ALTER COLUMN "sourceId" DROP NOT NULL,
ALTER COLUMN "url" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CrawlJob" ADD COLUMN     "changesFound" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "opportunitiesFound" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pagesFound" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pagesProcessed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pagesSkipped" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "ingestionMethod" "IngestionMethod" NOT NULL DEFAULT 'MANUAL_ENTRY';

-- DropTable
DROP TABLE "RejectedUrl";

-- CreateTable
CREATE TABLE "ExtractionRun" (
    "id" TEXT NOT NULL,
    "inputType" "ExtractionInputType" NOT NULL,
    "inputReference" TEXT,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "promptVersion" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "classification" "CollectionClassification",
    "classificationConfidence" DOUBLE PRECISION,
    "classificationReason" TEXT,
    "overallConfidence" DOUBLE PRECISION,
    "structuredResult" JSONB,
    "rawResult" TEXT,
    "error" TEXT,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "collectionItemId" TEXT,
    "opportunityId" TEXT,
    "createdById" TEXT,

    CONSTRAINT "ExtractionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldExtraction" (
    "id" TEXT NOT NULL,
    "extractionRunId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT,
    "confidence" DOUBLE PRECISION,
    "evidence" TEXT,
    "sourceReference" TEXT,
    "isUnknown" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FieldExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategorySuggestion" (
    "id" TEXT NOT NULL,
    "collectionItemId" TEXT,
    "opportunityId" TEXT,
    "categoryId" TEXT,
    "suggestedName" TEXT,
    "confidence" DOUBLE PRECISION,
    "reason" TEXT,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'SUGGESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategorySuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuplicateCandidate" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "existingId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "signals" JSONB,
    "status" "DuplicateStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuplicateCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceSnapshot" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "url" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "title" TEXT,
    "textLength" INTEGER,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "crawlJobId" TEXT,

    CONSTRAINT "SourceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RejectedItem" (
    "id" TEXT NOT NULL,
    "url" TEXT,
    "fingerprint" TEXT,
    "title" TEXT,
    "reason" "RejectionReason" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RejectedItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExtractionRun_collectionItemId_startedAt_idx" ON "ExtractionRun"("collectionItemId", "startedAt");

-- CreateIndex
CREATE INDEX "ExtractionRun_opportunityId_startedAt_idx" ON "ExtractionRun"("opportunityId", "startedAt");

-- CreateIndex
CREATE INDEX "ExtractionRun_status_idx" ON "ExtractionRun"("status");

-- CreateIndex
CREATE INDEX "FieldExtraction_field_confidence_idx" ON "FieldExtraction"("field", "confidence");

-- CreateIndex
CREATE UNIQUE INDEX "FieldExtraction_extractionRunId_field_key" ON "FieldExtraction"("extractionRunId", "field");

-- CreateIndex
CREATE INDEX "CategorySuggestion_opportunityId_status_idx" ON "CategorySuggestion"("opportunityId", "status");

-- CreateIndex
CREATE INDEX "CategorySuggestion_collectionItemId_status_idx" ON "CategorySuggestion"("collectionItemId", "status");

-- CreateIndex
CREATE INDEX "DuplicateCandidate_status_score_idx" ON "DuplicateCandidate"("status", "score");

-- CreateIndex
CREATE UNIQUE INDEX "DuplicateCandidate_opportunityId_existingId_key" ON "DuplicateCandidate"("opportunityId", "existingId");

-- CreateIndex
CREATE INDEX "SourceSnapshot_url_fetchedAt_idx" ON "SourceSnapshot"("url", "fetchedAt");

-- CreateIndex
CREATE INDEX "SourceSnapshot_sourceId_fetchedAt_idx" ON "SourceSnapshot"("sourceId", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RejectedItem_url_key" ON "RejectedItem"("url");

-- CreateIndex
CREATE UNIQUE INDEX "RejectedItem_fingerprint_key" ON "RejectedItem"("fingerprint");

-- CreateIndex
CREATE INDEX "RejectedItem_createdAt_idx" ON "RejectedItem"("createdAt");

-- CreateIndex
CREATE INDEX "CollectionItem_origin_discoveredAt_idx" ON "CollectionItem"("origin", "discoveredAt");

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionRun" ADD CONSTRAINT "ExtractionRun_collectionItemId_fkey" FOREIGN KEY ("collectionItemId") REFERENCES "CollectionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionRun" ADD CONSTRAINT "ExtractionRun_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionRun" ADD CONSTRAINT "ExtractionRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldExtraction" ADD CONSTRAINT "FieldExtraction_extractionRunId_fkey" FOREIGN KEY ("extractionRunId") REFERENCES "ExtractionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategorySuggestion" ADD CONSTRAINT "CategorySuggestion_collectionItemId_fkey" FOREIGN KEY ("collectionItemId") REFERENCES "CollectionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategorySuggestion" ADD CONSTRAINT "CategorySuggestion_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategorySuggestion" ADD CONSTRAINT "CategorySuggestion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCandidate" ADD CONSTRAINT "DuplicateCandidate_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCandidate" ADD CONSTRAINT "DuplicateCandidate_existingId_fkey" FOREIGN KEY ("existingId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCandidate" ADD CONSTRAINT "DuplicateCandidate_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceSnapshot" ADD CONSTRAINT "SourceSnapshot_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceSnapshot" ADD CONSTRAINT "SourceSnapshot_crawlJobId_fkey" FOREIGN KEY ("crawlJobId") REFERENCES "CrawlJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawlJob" ADD CONSTRAINT "CrawlJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

