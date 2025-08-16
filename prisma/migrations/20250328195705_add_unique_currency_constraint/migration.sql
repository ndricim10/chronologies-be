-- CreateTable
CREATE TABLE "Currency" (
    "id" TEXT NOT NULL,
    "base" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);
