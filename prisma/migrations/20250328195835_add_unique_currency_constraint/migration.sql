/*
  Warnings:

  - The primary key for the `Currency` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Currency` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[base,target]` on the table `Currency` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Currency" DROP CONSTRAINT "Currency_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Currency_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "Currency_base_target_key" ON "Currency"("base", "target");
