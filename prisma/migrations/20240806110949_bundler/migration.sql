/*
  Warnings:

  - You are about to drop the `BundleDiscount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BundleItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BundleItemImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BundleItemOption` table. If the table is not empty, all the data it contains will be lost.
  - The primary key for the `Bundle` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `isActive` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `shop` on the `Bundle` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `Bundle` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - Added the required column `bundleName` to the `Bundle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discountType` to the `Bundle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discountValue` to the `Bundle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `products` to the `Bundle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Bundle` table without a default value. This is not possible if the table is not empty.
  - Made the column `endDate` on table `Bundle` required. This step will fail if there are existing NULL values in that column.
  - Made the column `startDate` on table `Bundle` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "BundleDiscount_bundleId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BundleDiscount";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BundleItem";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BundleItemImage";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BundleItemOption";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bundle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bundleName" TEXT NOT NULL,
    "createSectionBlock" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "products" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bundle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Bundle" ("createSectionBlock", "createdAt", "description", "endDate", "id", "startDate", "updatedAt") SELECT "createSectionBlock", "createdAt", "description", "endDate", "id", "startDate", "updatedAt" FROM "Bundle";
DROP TABLE "Bundle";
ALTER TABLE "new_Bundle" RENAME TO "Bundle";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
