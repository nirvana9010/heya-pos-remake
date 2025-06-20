# Existing Staff PINs (From Seed Data)

## Hamilton Beauty Spa Staff

| Name | Role | Access Level | PIN | Email |
|------|------|--------------|-----|-------|
| **Sarah Johnson** | Owner | 3 | `1234` | sarah@hamiltonbeauty.com |
| Emma Williams | Manager | 2 | `5678` | emma@hamiltonbeauty.com |
| Olivia Brown | Employee | 1 | `9012` | olivia@hamiltonbeauty.com |

## Important Notes

1. **Sarah Johnson is the Owner** with PIN `1234`
2. These PINs were set during database seeding
3. PINs are stored as bcrypt hashes in the database
4. The owner PIN (`1234`) is what you need for accessing protected features like Reports

## PIN Protected Features

Based on merchant settings:
- ✅ Reports (when enabled in settings)
- ✅ Refunds (enabled by default)
- ✅ Cancellations (enabled by default)

## To Test

1. Navigate to Reports page
2. Enter Sarah Johnson's PIN: `1234`
3. You should gain access to the reports

## Why You Were Asked for PIN

The system flow worked correctly:
1. Detected Sarah Johnson exists ✓
2. Checked if she has a PIN → YES (from seed data) ✓
3. Asked you to enter the PIN ✓

You just need to use her existing PIN: `1234`