import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAuditLogs() {
  try {
    // Check audit logs for any booking-related actions
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: 'booking' },
          { action: { contains: 'booking' } }
        ]
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 50
    });

    console.log(`Found ${auditLogs.length} booking-related audit logs:`);
    auditLogs.forEach(log => {
      console.log(`\n${log.timestamp}: ${log.action} on ${log.entityType} (${log.entityId})`);
      console.log(`  Details: ${JSON.stringify(log.details)}`);
    });

    // Check all recent logs
    const recentLogs = await prisma.auditLog.findMany({
      orderBy: {
        timestamp: 'desc'
      },
      take: 20
    });

    console.log(`\n\nRecent audit logs:`);
    recentLogs.forEach(log => {
      console.log(`${log.timestamp}: ${log.action} on ${log.entityType}`);
      if (JSON.stringify(log.details).includes('SAMPLE') || JSON.stringify(log.details).includes('HCCHJO')) {
        console.log(`  *** Contains SAMPLE or HCCHJO: ${JSON.stringify(log.details)}`);
      }
    });

  } catch (error) {
    console.error('Error checking audit logs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAuditLogs();