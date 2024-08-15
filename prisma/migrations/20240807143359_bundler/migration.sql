-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bundle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bundleName" TEXT NOT NULL,
    "ProductBundleId" TEXT,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" TEXT NOT NULL,
    "products" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bundle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Bundle" ("ProductBundleId", "bundleName", "createdAt", "description", "discountType", "discountValue", "id", "products", "updatedAt", "userId") SELECT "ProductBundleId", "bundleName", "createdAt", "description", "discountType", "discountValue", "id", "products", "updatedAt", "userId" FROM "Bundle";
DROP TABLE "Bundle";
ALTER TABLE "new_Bundle" RENAME TO "Bundle";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
