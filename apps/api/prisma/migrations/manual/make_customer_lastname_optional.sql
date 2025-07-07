-- Make the lastName column nullable for Customer table
ALTER TABLE "Customer" ALTER COLUMN "lastName" DROP NOT NULL;