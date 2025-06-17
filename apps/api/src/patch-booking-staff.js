// Quick patch to fix staff updates in bookings
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function patchBookingStaff(bookingId, newStaffId, merchantId) {
  console.log('[PATCH] Updating booking staff:', { bookingId, newStaffId, merchantId });
  
  try {
    const updated = await prisma.booking.update({
      where: {
        id: bookingId,
        merchantId: merchantId,
      },
      data: {
        providerId: newStaffId,
      },
      include: {
        provider: true,
      }
    });
    
    console.log('[PATCH] Updated booking providerId:', updated.providerId);
    console.log('[PATCH] New provider name:', updated.provider?.firstName, updated.provider?.lastName);
    
    return updated;
  } catch (error) {
    console.error('[PATCH] Error updating booking:', error);
    throw error;
  }
}

module.exports = { patchBookingStaff };