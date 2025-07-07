-- Mark Location and StaffLocation tables as deprecated
-- DO NOT DROP these tables yet - keeping for data safety

-- Add comment to Location table
COMMENT ON TABLE "Location" IS 'DEPRECATED - Business hours moved to Merchant.settings. Do not use for new features.';

-- Add comment to StaffLocation table  
COMMENT ON TABLE "StaffLocation" IS 'DEPRECATED - Location support removed. Do not use for new features.';

-- Add comments to relevant columns
COMMENT ON COLUMN "Booking"."locationId" IS 'DEPRECATED - Location support removed. This column is no longer required.';
COMMENT ON COLUMN "Order"."locationId" IS 'DEPRECATED - Location support removed. This column is no longer used.';
COMMENT ON COLUMN "Payment"."locationId" IS 'DEPRECATED - Location support removed. This column is no longer used.';
COMMENT ON COLUMN "Invoice"."locationId" IS 'DEPRECATED - Location support removed. This column is no longer used.';