-- CreateTable
CREATE TABLE "AccountPreference" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "intent" TEXT NOT NULL DEFAULT 'BUY',
    CONSTRAINT "AccountPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SellerListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "ageYears" REAL,
    "priceUsd" REAL NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photos" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactAddress" TEXT NOT NULL,
    "payoutMethod" TEXT NOT NULL,
    "payoutRecipient" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "birdId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SellerListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SellerListing_birdId_fkey" FOREIGN KEY ("birdId") REFERENCES "Bird" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SellerUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SellerUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccountNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccountNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerListing_birdId_key" ON "SellerListing"("birdId");

-- CreateIndex
CREATE INDEX "SellerListing_sellerId_createdAt_idx" ON "SellerListing"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "SellerListing_status_createdAt_idx" ON "SellerListing"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SellerUpload_url_key" ON "SellerUpload"("url");

-- CreateIndex
CREATE INDEX "SellerUpload_userId_createdAt_idx" ON "SellerUpload"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountNotification_eventKey_key" ON "AccountNotification"("eventKey");

-- CreateIndex
CREATE INDEX "AccountNotification_kind_createdAt_idx" ON "AccountNotification"("kind", "createdAt");

