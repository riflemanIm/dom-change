CREATE TABLE "ExchangeReview" (
    "id" UUID NOT NULL,
    "exchangeRequestId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "cleanlinessRating" INTEGER NOT NULL,
    "communicationRating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExchangeReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExchangeReview_exchangeRequestId_authorId_key" ON "ExchangeReview"("exchangeRequestId", "authorId");
CREATE INDEX "ExchangeReview_subjectId_createdAt_idx" ON "ExchangeReview"("subjectId", "createdAt");
ALTER TABLE "ExchangeReview" ADD CONSTRAINT "ExchangeReview_exchangeRequestId_fkey" FOREIGN KEY ("exchangeRequestId") REFERENCES "ExchangeRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExchangeReview" ADD CONSTRAINT "ExchangeReview_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExchangeReview" ADD CONSTRAINT "ExchangeReview_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
