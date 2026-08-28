-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('OPPORTUNITY_TYPE', 'INDUSTRY', 'STARTUP_STAGE', 'FOUNDER_TYPE', 'PROVIDER_TYPE', 'GEOGRAPHY');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DISCOVERED', 'EXTRACTING', 'PENDING_REVIEW', 'NEEDS_INFORMATION', 'DRAFT', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED', 'UPDATE_PENDING_REVIEW');

-- CreateEnum
CREATE TYPE "LifecycleStatus" AS ENUM ('UPCOMING', 'OPEN', 'CLOSING_SOON', 'CLOSED', 'ROLLING');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'AUTO_EXTRACTED', 'ADMIN_REVIEWED', 'ADMIN_VERIFIED');

-- CreateEnum
CREATE TYPE "FundingType" AS ENUM ('GRANT', 'EQUITY_FUNDING', 'EQUITY_FREE', 'ACCELERATOR', 'INCUBATOR', 'COMPETITION', 'CHALLENGE', 'SUBSIDY', 'FELLOWSHIP', 'LOAN', 'DEBT', 'PRIZE', 'INNOVATION_VOUCHER', 'RND_FUNDING', 'STIPEND', 'INVESTMENT');

-- CreateEnum
CREATE TYPE "GeographyScope" AS ENUM ('PAN_INDIA', 'STATE', 'CITY', 'INTERNATIONAL', 'REMOTE');

-- CreateEnum
CREATE TYPE "ProviderSector" AS ENUM ('GOVERNMENT', 'PRIVATE', 'ACADEMIC', 'NONPROFIT', 'MULTILATERAL');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('ANONYMOUS_VISITOR', 'LEAD', 'ENGAGED_LEAD', 'REGISTERED_USER', 'ACTIVE_STARTUP');

-- CreateEnum
CREATE TYPE "SavedStatus" AS ENUM ('SAVED', 'APPLIED', 'INTERESTED', 'NOT_RELEVANT');

-- CreateEnum
CREATE TYPE "AlertFrequency" AS ENUM ('IMMEDIATE', 'WEEKLY_DIGEST', 'DEADLINE_REMINDER');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('GOVERNMENT', 'UNIVERSITY', 'INCUBATOR', 'ACCELERATOR', 'CORPORATE', 'FOUNDATION', 'COMPETITION_PORTAL', 'FUNDING_AGENCY', 'INTERNATIONAL_ORGANISATION', 'INVESTOR', 'OTHER');

-- CreateEnum
CREATE TYPE "SourceCrawlType" AS ENUM ('SINGLE_PAGE', 'LISTING_PAGE', 'DOMAIN');

-- CreateEnum
CREATE TYPE "CheckFrequency" AS ENUM ('DAILY', 'EVERY_3_DAYS', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'MANUAL');

-- CreateEnum
CREATE TYPE "SourceHealth" AS ENUM ('PENDING', 'HEALTHY', 'STALE', 'ERROR', 'BLOCKED', 'MANUAL_MONITORING_REQUIRED');

-- CreateEnum
CREATE TYPE "CollectionClassification" AS ENUM ('LIKELY_GRANT', 'POSSIBLE_FUNDING_OPPORTUNITY', 'EVENT', 'ACCELERATOR', 'COMPETITION', 'ARTICLE', 'NEWS', 'IRRELEVANT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('NEW', 'EXTRACTING', 'EXTRACTED', 'PROMOTED', 'IGNORED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewItemType" AS ENUM ('NEW_OPPORTUNITY', 'UPDATE', 'POSSIBLE_DUPLICATE', 'LOW_CONFIDENCE', 'MISSING_INFORMATION', 'BROKEN_LINK', 'EXPIRED_OPPORTUNITY', 'ERROR_REPORT');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('UNASSIGNED', 'ASSIGNED', 'UNDER_REVIEW', 'READY_FOR_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RejectionReason" AS ENUM ('NOT_A_STARTUP_FUNDING_OPPORTUNITY', 'DUPLICATE', 'EXPIRED', 'INCORRECT_INFORMATION', 'UNRELIABLE_SOURCE', 'NOT_RELEVANT_TO_USERS', 'UNABLE_TO_VERIFY', 'SPAM', 'OTHER');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('SOURCE_DISCOVER', 'SOURCE_FETCH', 'EXTRACT', 'RECHECK_OPPORTUNITY', 'LINK_CHECK', 'DIGEST_EMAIL', 'DEADLINE_REMINDER', 'EXPIRY_SWEEP');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "ErrorReportType" AS ENUM ('INCORRECT_DEADLINE', 'BROKEN_APPLICATION_LINK', 'PROGRAMME_CLOSED', 'INCORRECT_ELIGIBILITY', 'INCORRECT_FUNDING_AMOUNT', 'OTHER');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "categoryType" "CategoryType" NOT NULL,
    "parentId" TEXT,
    "icon" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "showOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityCategory" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "providerLogoUrl" TEXT,
    "programmeName" TEXT,
    "shortDescription" TEXT NOT NULL,
    "fullDescription" TEXT,
    "fundingMin" DECIMAL(18,2),
    "fundingMax" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "fundingAmountText" TEXT,
    "isEquityFree" BOOLEAN,
    "fundingTypes" "FundingType"[],
    "applicationDeadline" TIMESTAMP(3),
    "isRollingDeadline" BOOLEAN NOT NULL DEFAULT false,
    "applicationOpenDate" TIMESTAMP(3),
    "programmeStartDate" TIMESTAMP(3),
    "programmeEndDate" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "eligibilitySummary" TEXT,
    "incorporationAgeMinMonths" INTEGER,
    "incorporationAgeMaxMonths" INTEGER,
    "companyTypes" TEXT[],
    "technologies" TEXT[],
    "geographyScope" "GeographyScope" NOT NULL DEFAULT 'PAN_INDIA',
    "country" TEXT DEFAULT 'India',
    "state" TEXT,
    "city" TEXT,
    "founderRequirements" TEXT,
    "registrationRequirements" TEXT,
    "revenueRequirement" TEXT,
    "previousFundingLimit" TEXT,
    "requiresDpiit" BOOLEAN,
    "requiresMsmeUdyam" BOOLEAN,
    "requiresStudentFounder" BOOLEAN,
    "requiresWomenFounder" BOOLEAN,
    "otherEligibility" TEXT,
    "benefitsSummary" TEXT,
    "offersMentoring" BOOLEAN NOT NULL DEFAULT false,
    "offersIncubation" BOOLEAN NOT NULL DEFAULT false,
    "offersNetworking" BOOLEAN NOT NULL DEFAULT false,
    "offersInvestorAccess" BOOLEAN NOT NULL DEFAULT false,
    "offersLabAccess" BOOLEAN NOT NULL DEFAULT false,
    "offersPilotOpportunities" BOOLEAN NOT NULL DEFAULT false,
    "offersCorporatePartnerships" BOOLEAN NOT NULL DEFAULT false,
    "offersMarketAccess" BOOLEAN NOT NULL DEFAULT false,
    "applicationProcess" TEXT,
    "requiredDocuments" TEXT,
    "selectionProcess" TEXT,
    "importantNotes" TEXT,
    "applicationUrl" TEXT,
    "applicationInstructions" TEXT,
    "contactEmail" TEXT,
    "officialSourceUrl" TEXT NOT NULL,
    "providerSector" "ProviderSector",
    "sourceId" TEXT,
    "originalSourceUrl" TEXT,
    "sourceWebsite" TEXT,
    "extractionDate" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "contentLastUpdatedAt" TIMESTAMP(3),
    "sourceConfidence" DOUBLE PRECISION,
    "fieldConfidence" JSONB,
    "workflowStatus" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "lifecycleOverride" "LifecycleStatus",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "unlockCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "applyClickCount" INTEGER NOT NULL DEFAULT 0,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityVersion" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedFields" TEXT[],
    "changeSummary" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "OpportunityVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organisation" TEXT,
    "websiteUrl" TEXT,
    "url" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL DEFAULT 'OTHER',
    "crawlType" "SourceCrawlType" NOT NULL DEFAULT 'SINGLE_PAGE',
    "country" TEXT DEFAULT 'India',
    "state" TEXT,
    "categoryId" TEXT,
    "notes" TEXT,
    "checkFrequency" "CheckFrequency" NOT NULL DEFAULT 'WEEKLY',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowPaths" TEXT[],
    "ignorePaths" TEXT[],
    "maxPages" INTEGER NOT NULL DEFAULT 40,
    "maxDepth" INTEGER NOT NULL DEFAULT 2,
    "autoCollect" BOOLEAN NOT NULL DEFAULT true,
    "autoExtract" BOOLEAN NOT NULL DEFAULT true,
    "autoCreateReviewItems" BOOLEAN NOT NULL DEFAULT true,
    "robotsAllowed" BOOLEAN,
    "robotsCheckedAt" TIMESTAMP(3),
    "health" "SourceHealth" NOT NULL DEFAULT 'PENDING',
    "lastCheckedAt" TIMESTAMP(3),
    "lastSuccessfulCheckAt" TIMESTAMP(3),
    "lastChangeDetectedAt" TIMESTAMP(3),
    "nextCheckAt" TIMESTAMP(3),
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastHttpStatus" INTEGER,
    "lastError" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionItem" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "canonicalUrl" TEXT,
    "pageTitle" TEXT,
    "rawText" TEXT,
    "rawHtml" TEXT,
    "contentHash" TEXT,
    "httpStatus" INTEGER,
    "classification" "CollectionClassification" NOT NULL DEFAULT 'UNKNOWN',
    "classificationConfidence" DOUBLE PRECISION,
    "classificationReason" TEXT,
    "status" "CollectionStatus" NOT NULL DEFAULT 'NEW',
    "extractedData" JSONB,
    "fieldConfidence" JSONB,
    "extractionError" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fetchedAt" TIMESTAMP(3),
    "extractedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "opportunityId" TEXT,

    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewItem" (
    "id" TEXT NOT NULL,
    "type" "ReviewItemType" NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "opportunityId" TEXT,
    "collectionItemId" TEXT,
    "duplicateOfId" TEXT,
    "similarityScore" DOUBLE PRECISION,
    "title" TEXT NOT NULL,
    "extractedData" JSONB,
    "fieldConfidence" JSONB,
    "proposedChanges" JSONB,
    "overallConfidence" DOUBLE PRECISION,
    "assignedReviewerId" TEXT,
    "reviewNotes" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "rejectionReason" "RejectionReason",
    "rejectionNote" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RejectedUrl" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "reason" "RejectionReason" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RejectedUrl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlJob" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "sourceId" TEXT,
    "payload" JSONB,
    "result" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrawlJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL,
    "anonId" TEXT NOT NULL,
    "leadId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "landingPath" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp" TEXT,
    "startupName" TEXT,
    "website" TEXT,
    "linkedinUrl" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'India',
    "industryCategoryId" TEXT,
    "stageCategoryId" TEXT,
    "founderTypeCategoryId" TEXT,
    "yearFounded" INTEGER,
    "fundingRaised" TEXT,
    "revenueRange" TEXT,
    "teamSize" TEXT,
    "dpiitStatus" BOOLEAN,
    "udyamStatus" BOOLEAN,
    "fundingRequirementMin" DECIMAL(18,2),
    "fundingRequirementMax" DECIMAL(18,2),
    "leadStage" "LeadStage" NOT NULL DEFAULT 'LEAD',
    "leadScore" INTEGER NOT NULL DEFAULT 0,
    "profileCompletion" INTEGER NOT NULL DEFAULT 0,
    "emailMarketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "whatsappMarketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentTimestamp" TIMESTAMP(3),
    "consentSource" TEXT,
    "unsubscribedAt" TIMESTAMP(3),
    "leadSource" TEXT,
    "landingPath" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "firstVisitAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVisitAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadCategoryInterest" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "source" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadCategoryInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "visitorId" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "opportunityId" TEXT,
    "categoryId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedOpportunity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "status" "SavedStatus" NOT NULL DEFAULT 'SAVED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertSubscription" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "frequency" "AlertFrequency" NOT NULL DEFAULT 'WEEKLY_DIGEST',
    "channel" "MessageChannel" NOT NULL DEFAULT 'EMAIL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "states" TEXT[],
    "providers" TEXT[],
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertSubscriptionCategory" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "AlertSubscriptionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadSession" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,

    CONSTRAINT "LeadSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginToken" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'magic_link',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorReport" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "type" "ErrorReportType" NOT NULL,
    "message" TEXT NOT NULL,
    "reporterEmail" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "visitorId" TEXT,
    "leadId" TEXT,
    "opportunityId" TEXT,
    "categoryId" TEXT,
    "path" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundMessage" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "channel" "MessageChannel" NOT NULL,
    "toAddress" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "providerId" TEXT,
    "provider" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_categoryType_active_displayOrder_idx" ON "Category"("categoryType", "active", "displayOrder");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_showOnHomepage_active_idx" ON "Category"("showOnHomepage", "active");

-- CreateIndex
CREATE INDEX "Category_featured_active_idx" ON "Category"("featured", "active");

-- CreateIndex
CREATE INDEX "OpportunityCategory_categoryId_idx" ON "OpportunityCategory"("categoryId");

-- CreateIndex
CREATE INDEX "OpportunityCategory_opportunityId_isPrimary_idx" ON "OpportunityCategory"("opportunityId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityCategory_opportunityId_categoryId_key" ON "OpportunityCategory"("opportunityId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_slug_key" ON "Opportunity"("slug");

-- CreateIndex
CREATE INDEX "Opportunity_workflowStatus_isActive_idx" ON "Opportunity"("workflowStatus", "isActive");

-- CreateIndex
CREATE INDEX "Opportunity_applicationDeadline_idx" ON "Opportunity"("applicationDeadline");

-- CreateIndex
CREATE INDEX "Opportunity_publishedAt_idx" ON "Opportunity"("publishedAt");

-- CreateIndex
CREATE INDEX "Opportunity_sourceId_idx" ON "Opportunity"("sourceId");

-- CreateIndex
CREATE INDEX "Opportunity_state_idx" ON "Opportunity"("state");

-- CreateIndex
CREATE INDEX "Opportunity_country_idx" ON "Opportunity"("country");

-- CreateIndex
CREATE INDEX "OpportunityVersion_opportunityId_createdAt_idx" ON "OpportunityVersion"("opportunityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityVersion_opportunityId_versionNumber_key" ON "OpportunityVersion"("opportunityId", "versionNumber");

-- CreateIndex
CREATE INDEX "Source_enabled_nextCheckAt_idx" ON "Source"("enabled", "nextCheckAt");

-- CreateIndex
CREATE INDEX "Source_health_idx" ON "Source"("health");

-- CreateIndex
CREATE INDEX "CollectionItem_status_classification_idx" ON "CollectionItem"("status", "classification");

-- CreateIndex
CREATE INDEX "CollectionItem_sourceId_discoveredAt_idx" ON "CollectionItem"("sourceId", "discoveredAt");

-- CreateIndex
CREATE INDEX "CollectionItem_contentHash_idx" ON "CollectionItem"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionItem_sourceId_url_key" ON "CollectionItem"("sourceId", "url");

-- CreateIndex
CREATE INDEX "ReviewItem_type_status_idx" ON "ReviewItem"("type", "status");

-- CreateIndex
CREATE INDEX "ReviewItem_assignedReviewerId_status_idx" ON "ReviewItem"("assignedReviewerId", "status");

-- CreateIndex
CREATE INDEX "ReviewItem_createdAt_idx" ON "ReviewItem"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RejectedUrl_url_key" ON "RejectedUrl"("url");

-- CreateIndex
CREATE INDEX "CrawlJob_status_scheduledFor_idx" ON "CrawlJob"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "CrawlJob_sourceId_createdAt_idx" ON "CrawlJob"("sourceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Visitor_anonId_key" ON "Visitor"("anonId");

-- CreateIndex
CREATE INDEX "Visitor_leadId_idx" ON "Visitor"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_email_key" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_leadStage_lastActivityAt_idx" ON "Lead"("leadStage", "lastActivityAt");

-- CreateIndex
CREATE INDEX "Lead_leadScore_idx" ON "Lead"("leadScore");

-- CreateIndex
CREATE INDEX "Lead_state_idx" ON "Lead"("state");

-- CreateIndex
CREATE INDEX "Lead_emailMarketingConsent_idx" ON "Lead"("emailMarketingConsent");

-- CreateIndex
CREATE INDEX "LeadCategoryInterest_categoryId_idx" ON "LeadCategoryInterest"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadCategoryInterest_leadId_categoryId_key" ON "LeadCategoryInterest"("leadId", "categoryId");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadActivity_visitorId_createdAt_idx" ON "LeadActivity"("visitorId", "createdAt");

-- CreateIndex
CREATE INDEX "SavedOpportunity_opportunityId_idx" ON "SavedOpportunity"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedOpportunity_leadId_opportunityId_key" ON "SavedOpportunity"("leadId", "opportunityId");

-- CreateIndex
CREATE INDEX "AlertSubscription_active_frequency_idx" ON "AlertSubscription"("active", "frequency");

-- CreateIndex
CREATE UNIQUE INDEX "AlertSubscription_leadId_frequency_channel_key" ON "AlertSubscription"("leadId", "frequency", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "AlertSubscriptionCategory_subscriptionId_categoryId_key" ON "AlertSubscriptionCategory"("subscriptionId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadSession_tokenHash_key" ON "LeadSession"("tokenHash");

-- CreateIndex
CREATE INDEX "LeadSession_leadId_idx" ON "LeadSession"("leadId");

-- CreateIndex
CREATE INDEX "LeadSession_expiresAt_idx" ON "LeadSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoginToken_tokenHash_key" ON "LoginToken"("tokenHash");

-- CreateIndex
CREATE INDEX "LoginToken_expiresAt_idx" ON "LoginToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminSession_adminUserId_idx" ON "AdminSession"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_adminUserId_createdAt_idx" ON "AuditLog"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ErrorReport_resolved_createdAt_idx" ON "ErrorReport"("resolved", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_createdAt_idx" ON "AnalyticsEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_opportunityId_eventType_idx" ON "AnalyticsEvent"("opportunityId", "eventType");

-- CreateIndex
CREATE INDEX "OutboundMessage_status_createdAt_idx" ON "OutboundMessage"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundMessage_leadId_createdAt_idx" ON "OutboundMessage"("leadId", "createdAt");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityCategory" ADD CONSTRAINT "OpportunityCategory_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityCategory" ADD CONSTRAINT "OpportunityCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityVersion" ADD CONSTRAINT "OpportunityVersion_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityVersion" ADD CONSTRAINT "OpportunityVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityVersion" ADD CONSTRAINT "OpportunityVersion_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_collectionItemId_fkey" FOREIGN KEY ("collectionItemId") REFERENCES "CollectionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_assignedReviewerId_fkey" FOREIGN KEY ("assignedReviewerId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawlJob" ADD CONSTRAINT "CrawlJob_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_industryCategoryId_fkey" FOREIGN KEY ("industryCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_stageCategoryId_fkey" FOREIGN KEY ("stageCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_founderTypeCategoryId_fkey" FOREIGN KEY ("founderTypeCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCategoryInterest" ADD CONSTRAINT "LeadCategoryInterest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCategoryInterest" ADD CONSTRAINT "LeadCategoryInterest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedOpportunity" ADD CONSTRAINT "SavedOpportunity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedOpportunity" ADD CONSTRAINT "SavedOpportunity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertSubscription" ADD CONSTRAINT "AlertSubscription_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertSubscriptionCategory" ADD CONSTRAINT "AlertSubscriptionCategory_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "AlertSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertSubscriptionCategory" ADD CONSTRAINT "AlertSubscriptionCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadSession" ADD CONSTRAINT "LeadSession_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginToken" ADD CONSTRAINT "LoginToken_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorReport" ADD CONSTRAINT "ErrorReport_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorReport" ADD CONSTRAINT "ErrorReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Search: Postgres full-text (tsvector) + trigram fuzzy matching.
-- Kept behind lib/search so a hosted engine can replace it without app changes.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "Opportunity"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("providerName", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("programmeName", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("shortDescription", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("state", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("country", '')), 'C') ||
    setweight(to_tsvector('english', coalesce("fullDescription", '')), 'C') ||
    setweight(to_tsvector('english', coalesce("eligibilitySummary", '')), 'C') ||
    setweight(to_tsvector('english', coalesce("benefitsSummary", '')), 'D')
  ) STORED;

CREATE INDEX "Opportunity_searchVector_idx" ON "Opportunity" USING GIN ("searchVector");
CREATE INDEX "Opportunity_title_idx" ON "Opportunity" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Opportunity_providerName_idx" ON "Opportunity" USING GIN ("providerName" gin_trgm_ops);
CREATE INDEX "Category_name_idx" ON "Category" USING GIN ("name" gin_trgm_ops);

-- Public listing hot path: published + active, newest first.
CREATE INDEX "Opportunity_workflowStatus_isActive_publishedAt_idx"
  ON "Opportunity" ("workflowStatus", "isActive", "publishedAt" DESC);
