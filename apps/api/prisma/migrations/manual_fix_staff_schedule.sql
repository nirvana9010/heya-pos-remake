-- Make locationId nullable in StaffSchedule table if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'StaffSchedule' 
    AND column_name = 'locationId'
  ) THEN
    ALTER TABLE "StaffSchedule" 
    ALTER COLUMN "locationId" DROP NOT NULL;
    
    COMMENT ON COLUMN "StaffSchedule"."locationId" IS 'DEPRECATED - Location support removed. This column is no longer used.';
  END IF;
END $$;