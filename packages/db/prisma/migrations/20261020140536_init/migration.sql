-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ACTIVE', 'APPLIED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('INTERN', 'JUNIOR', 'MID', 'SENIOR', 'STAFF_PLUS', 'MANAGER', 'DIRECTOR_PLUS', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "JobFunction" AS ENUM ('ENGINEERING', 'RECRUITING', 'PRODUCT', 'DATA', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ContactSource" AS ENUM ('AI_SEARCH', 'PEOPLE_TAB_PASTE', 'PROFILE_PASTE', 'MANUAL', 'SAMPLE');

-- CreateEnum
CREATE TYPE "DataConfidence" AS ENUM ('USER_VERIFIED', 'LINKEDIN_PASTE', 'WEB_EVIDENCE');

-- CreateEnum
CREATE TYPE "RelationshipTag" AS ENUM ('COLLEGE_ALUMNI', 'SAME_COLLEGE_DIFFERENT_COURSE', 'RECRUITER', 'HIRING_MANAGER', 'OPEN_TO_REFER');

-- CreateEnum
CREATE TYPE "TagSource" AS ENUM ('RULE', 'AI', 'USER');

-- CreateEnum
CREATE TYPE "OutreachState" AS ENUM ('DISCOVERED', 'CONNECTION_SENT', 'ACCEPTED_MESSAGE_READY', 'AWAITING_REPLY', 'IN_CONVERSATION', 'REFERRAL_RECEIVED', 'DECLINED', 'NO_RESPONSE', 'DROPPED', 'SKIPPED', 'WRONG_PERSON', 'JOB_CLOSED', 'STOPPED');

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('CONNECTION_NOTE', 'REFERRAL_REQUEST', 'FOLLOW_UP', 'RESUME_SHARE', 'THANK_YOU', 'THANKS_ANYWAY', 'REPLY_RESPONSE', 'INBOUND_REPLY');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('DRAFT', 'SENT', 'DISCARDED');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile" (
    "userId" TEXT NOT NULL,
    "headline" TEXT,
    "degree" TEXT,
    "field" TEXT,
    "graduationYear" INTEGER,
    "currentSemester" INTEGER,
    "skills" TEXT[],
    "projects" JSONB NOT NULL DEFAULT '[]',
    "resumeUrl" TEXT,
    "linkedinUrl" TEXT,
    "githubUrl" TEXT,
    "portfolioUrl" TEXT,
    "preferredRoles" TEXT[],
    "preferredLocations" TEXT[],
    "settings" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,

    CONSTRAINT "institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institution_alias" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,

    CONSTRAINT "institution_alias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "contactId" TEXT,
    "institutionId" TEXT,
    "institutionRaw" TEXT NOT NULL,
    "degree" TEXT,
    "field" TEXT,
    "startYear" INTEGER,
    "endYear" INTEGER,

    CONSTRAINT "education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "domain" TEXT,
    "linkedinSlug" TEXT,
    "hasReferralBonus" BOOLEAN,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_opportunity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "externalJobId" TEXT,
    "url" TEXT,
    "location" TEXT,
    "descriptionRaw" TEXT,
    "analysis" JSONB,
    "status" "JobStatus" NOT NULL DEFAULT 'ACTIVE',
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "headline" TEXT,
    "currentTitle" TEXT,
    "location" TEXT,
    "seniority" "Seniority" NOT NULL DEFAULT 'UNKNOWN',
    "function" "JobFunction" NOT NULL DEFAULT 'UNKNOWN',
    "source" "ContactSource" NOT NULL,
    "confidence" "DataConfidence" NOT NULL DEFAULT 'WEB_EVIDENCE',
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_tag" (
    "contactId" TEXT NOT NULL,
    "tag" "RelationshipTag" NOT NULL,
    "evidence" TEXT,
    "source" "TagSource" NOT NULL,

    CONSTRAINT "contact_tag_pkey" PRIMARY KEY ("contactId","tag")
);

-- CreateTable
CREATE TABLE "outreach" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "rank" INTEGER,
    "isReserve" BOOLEAN NOT NULL DEFAULT false,
    "matchScore" INTEGER,
    "scoreBreakdown" JSONB,
    "state" "OutreachState" NOT NULL DEFAULT 'DISCOVERED',
    "stateChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextCheckAt" TIMESTAMP(3),
    "followupCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_event" (
    "id" TEXT NOT NULL,
    "outreachId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromState" "OutreachState",
    "toState" "OutreachState",
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" TEXT NOT NULL,
    "outreachId" TEXT NOT NULL,
    "kind" "MessageKind" NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'DRAFT',
    "body" TEXT NOT NULL,
    "factsUsed" JSONB,
    "aiRunId" TEXT,
    "editedByUser" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_run" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "progress" JSONB,
    "queries" JSONB,
    "candidatesFound" INTEGER NOT NULL DEFAULT 0,
    "candidatesVerified" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_run" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "output" JSONB,
    "validationStatus" TEXT,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "latencyMs" INTEGER,
    "fellBack" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "institution_normalizedName_key" ON "institution"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "institution_alias_normalizedAlias_key" ON "institution_alias"("normalizedAlias");

-- CreateIndex
CREATE INDEX "education_userId_idx" ON "education"("userId");

-- CreateIndex
CREATE INDEX "education_contactId_idx" ON "education"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "company_userId_normalizedName_key" ON "company"("userId", "normalizedName");

-- CreateIndex
CREATE INDEX "job_opportunity_userId_status_idx" ON "job_opportunity"("userId", "status");

-- CreateIndex
CREATE INDEX "contact_userId_companyId_idx" ON "contact"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "contact_userId_linkedinUrl_key" ON "contact"("userId", "linkedinUrl");

-- CreateIndex
CREATE INDEX "outreach_userId_nextCheckAt_idx" ON "outreach"("userId", "nextCheckAt");

-- CreateIndex
CREATE INDEX "outreach_contactId_idx" ON "outreach"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "outreach_jobId_contactId_key" ON "outreach"("jobId", "contactId");

-- CreateIndex
CREATE INDEX "outreach_event_outreachId_createdAt_idx" ON "outreach_event"("outreachId", "createdAt");

-- CreateIndex
CREATE INDEX "message_outreachId_idx" ON "message"("outreachId");

-- CreateIndex
CREATE INDEX "discovery_run_jobId_idx" ON "discovery_run"("jobId");

-- CreateIndex
CREATE INDEX "ai_run_userId_task_inputHash_idx" ON "ai_run"("userId", "task", "inputHash");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_alias" ADD CONSTRAINT "institution_alias_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education" ADD CONSTRAINT "education_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education" ADD CONSTRAINT "education_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education" ADD CONSTRAINT "education_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_opportunity" ADD CONSTRAINT "job_opportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_opportunity" ADD CONSTRAINT "job_opportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_tag" ADD CONSTRAINT "contact_tag_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach" ADD CONSTRAINT "outreach_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach" ADD CONSTRAINT "outreach_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job_opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach" ADD CONSTRAINT "outreach_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_event" ADD CONSTRAINT "outreach_event_outreachId_fkey" FOREIGN KEY ("outreachId") REFERENCES "outreach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_outreachId_fkey" FOREIGN KEY ("outreachId") REFERENCES "outreach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_run" ADD CONSTRAINT "discovery_run_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job_opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_run" ADD CONSTRAINT "ai_run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
