#!/bin/bash

echo "=== Appointment Reminder Testing Script ==="
echo ""
echo "This script helps test appointment reminders without waiting 24h/2h"
echo ""

# Option 1: Create a booking with immediate reminders
echo "Option 1: Create a test booking that triggers reminders immediately"
echo "-------------------------------------------------------------"
echo "curl -X POST http://localhost:3000/api/v1/test/notifications/send-booking/test-booking-123 \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"type\": \"booking_reminder_24h\"}'"
echo ""

# Option 2: Check current scheduled notifications
echo "Option 2: Query scheduled notifications (requires auth)"
echo "-----------------------------------------------------"
echo "You'll need to check the database directly or add a test endpoint"
echo ""

# Option 3: Force scheduler to run
echo "Option 3: Force scheduler to process notifications"
echo "-----------------------------------------------"
echo "The scheduler runs every 5 minutes, but you can:"
echo "1. Restart the API to trigger immediate processing:"
echo "   pm2 restart api"
echo ""
echo "2. Wait for the next 5-minute cycle and watch logs:"
echo "   pm2 logs api --nostream --lines 100 | grep -E '(reminder|scheduled|notification)'"
echo ""

# Option 4: Direct database manipulation
echo "Option 4: Update scheduled notification times in database"
echo "------------------------------------------------------"
echo "Run: node test-reminders.js"
echo ""
echo "This will:"
echo "- Find pending scheduled notifications"
echo "- Update their scheduledFor time to be in the past"
echo "- Create test bookings with immediate reminders"
echo ""

echo "Monitoring commands:"
echo "-------------------"
echo "# Watch for reminder processing:"
echo "pm2 logs api | grep -i reminder"
echo ""
echo "# Check scheduled notifications being processed:"
echo "pm2 logs api | grep 'Found.*scheduled notifications'"
echo ""
echo "# See if notifications were sent:"
echo "pm2 logs api | grep 'Processed scheduled notification'"