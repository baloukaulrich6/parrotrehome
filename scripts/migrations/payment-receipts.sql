-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentCheckId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "pdfBase64" TEXT NOT NULL,
    "deliveryState" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentReceipt_paymentCheckId_fkey" FOREIGN KEY ("paymentCheckId") REFERENCES "PaymentCheck" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentReceipt_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_paymentCheckId_key" ON "PaymentReceipt"("paymentCheckId");

-- CreateIndex
CREATE INDEX "PaymentReceipt_requestId_idx" ON "PaymentReceipt"("requestId");

