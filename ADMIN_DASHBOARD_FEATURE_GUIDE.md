# Heya POS Admin Dashboard - System Administration Feature Guide & Test Cases

## 🎯 Executive Summary

The Admin Dashboard is the super-admin interface for Heya POS, providing centralized control over all merchants, system configuration, monitoring, and platform-wide analytics. This is the command center for managing the entire multi-tenant platform.

---

## 🔐 Module 1: Authentication & Access Control

### Features

- **Admin-Only Access**: Restricted to platform administrators
- **Role-Based Permissions**: Different admin levels (Super Admin, Support, Read-Only)
- **Secure Authentication**: JWT-based with enhanced security
- **Audit Logging**: Track all administrative actions
- **Session Management**: Timeout and concurrent session controls

### Test Cases

```
✅ AUTHENTICATION
□ Login with admin credentials
□ Invalid credentials rejected
□ Session timeout after inactivity (30 min)
□ Forced logout on concurrent login
□ Password complexity enforced
□ 2FA enabled (if configured)

✅ ACCESS CONTROL
□ Super Admin has full access
□ Support Admin can't delete merchants
□ Read-Only can't make changes
□ Audit log captures all actions
□ IP restrictions work (if configured)
```

---

## 📊 Module 2: System Dashboard

### Features

- **Platform Metrics**: Real-time system statistics
- **Health Monitoring**: System status and performance
- **Revenue Overview**: Platform-wide financial metrics
- **Activity Feed**: Recent actions and events
- **Quick Actions**: Common administrative tasks
- **Alert Center**: System warnings and notifications

### Test Cases

```
✅ METRICS DISPLAY
□ Total merchants count accurate
□ Active vs inactive breakdown correct
□ Total users across all merchants
□ Revenue calculations accurate
□ Booking volume trends display
□ System uptime percentage shown

✅ HEALTH MONITORING
□ API response time graphs load
□ Database performance metrics show
□ Server resource usage displayed
□ Error rate tracking works
□ Alert thresholds trigger notifications

✅ ACTIVITY FEED
□ Recent merchant registrations show
□ System events logged
□ Admin actions tracked
□ Timestamp accuracy (timezone)
□ Filter by event type works
```

---

## 🏢 Module 3: Merchant Management

### Features

- **Merchant Directory**: Complete list with search/filter
- **Merchant Creation**: Onboard new businesses
- **Profile Management**: Edit merchant details
- **Subscription Control**: Package and billing management
- **Trial Management**: Control trial periods
- **Status Management**: Activate, suspend, or terminate

### Test Cases

#### Merchant Listing

```
✅ MERCHANT DIRECTORY
□ All merchants displayed in table
□ Pagination works (20 per page)
□ Search by business name
□ Search by email
□ Search by subdomain
□ Filter by status (Active/Inactive/Trial/Suspended)
□ Filter by package type
□ Sort by name, date, revenue

✅ BULK OPERATIONS
□ Select multiple merchants
□ Bulk status change
□ Bulk export to CSV
□ Bulk email notifications
□ Select all/none functionality
```

#### Create New Merchant

```
✅ MERCHANT CREATION
□ Business name required and validated
□ Email format validated
□ Phone number format validated
□ ABN/Tax ID validated (if required)
□ Subdomain auto-generated from name
□ Subdomain uniqueness checked
□ Manual subdomain override works

✅ PACKAGE SELECTION
□ Available packages displayed
□ Package features shown
□ Pricing displayed correctly
□ Trial period option available
□ Skip trial checkbox works
□ Custom package creation (if enabled)

✅ LOCATION SETUP
□ Address fields validated
□ Timezone selection works
□ Map preview shows location
□ Multiple locations supported
□ Default location marked

✅ CREDENTIAL GENERATION
□ Admin username auto-generated
□ Secure password generated
□ Credentials displayed once
□ Copy to clipboard works
□ Email credentials option
□ Warning about saving credentials
```

#### Merchant Details View

```
✅ MERCHANT INFORMATION
□ Business details displayed
□ Contact information shown
□ Subdomain and URLs displayed
□ Creation date and by whom
□ Last login tracked
□ Status clearly indicated

✅ USAGE STATISTICS
□ Total staff members count
□ Active bookings count
□ Service catalog size
□ Customer database size
□ Monthly booking volume
□ Revenue metrics (if enabled)

✅ SUBSCRIPTION DETAILS
□ Current package displayed
□ Billing cycle shown
□ Next payment date
□ Payment history accessible
□ Usage vs limits displayed
□ Overage charges (if any)

✅ ACCESS URLS
□ Production booking URL correct
□ Development booking URL correct
□ Merchant dashboard URL shown
□ Copy URL buttons work
□ QR codes generated
□ Test links work
```

#### Edit Merchant

```
✅ PROFILE UPDATES
□ Business name editable
□ Contact information updatable
□ Address changes saved
□ Timezone modification works
□ Logo upload works
□ Description/bio updates

✅ SUBSCRIPTION MANAGEMENT
□ Change package tier
□ Upgrade shows prorated amount
□ Downgrade shows restrictions
□ Billing cycle changeable
□ Payment method update
□ Cancel subscription option

✅ TRIAL CONTROLS
□ Current trial status shown
□ Trial end date displayed
□ "Remove Trial" button visible
□ Confirmation dialog appears
□ Trial removal immediate
□ Status changes to ACTIVE
□ Email notification sent
□ Audit log entry created

✅ ACCOUNT CONTROLS
□ Suspend account (with reason)
□ Reactivate suspended account
□ Delete merchant (with confirmation)
□ Force password reset
□ Clear merchant cache
□ Bypass restrictions temporarily
```

---

## 👥 Module 4: User Management

### Features

- **Global User Directory**: All users across all merchants
- **User Search**: Find users across the platform
- **Access Management**: Enable/disable accounts
- **Role Assignment**: Manage user permissions
- **Activity Tracking**: User login and action history
- **Support Tools**: Password resets, unlock accounts

### Test Cases

```
✅ USER DIRECTORY
□ All platform users listed
□ Filter by merchant
□ Filter by role (Owner/Manager/Staff)
□ Search by name
□ Search by email
□ Activity status shown (active/inactive)

✅ USER MANAGEMENT
□ View user details
□ See merchant association
□ Check last login time
□ View activity history
□ Reset user password
□ Unlock locked account
□ Disable user access
□ Change user role
□ Transfer to different merchant

✅ BULK USER OPERATIONS
□ Export user list
□ Bulk password reset
□ Bulk email notification
□ Bulk status change
□ Import users from CSV
```

---

## 📦 Module 5: Package & Subscription Management

### Features

- **Package Templates**: Define subscription tiers
- **Feature Controls**: Set package limitations
- **Pricing Management**: Configure billing amounts
- **Usage Limits**: Set restrictions per package
- **Custom Packages**: Create merchant-specific plans
- **Promotion Codes**: Discount and trial extensions

### Test Cases

```
✅ PACKAGE CONFIGURATION
□ View all package types
□ Create new package
□ Set package name and description
□ Configure pricing (monthly/yearly)
□ Set usage limits (staff, bookings, etc.)
□ Enable/disable features
□ Set trial period length

✅ LIMIT ENFORCEMENT
□ Staff member limits
□ Monthly booking limits
□ Customer database size limits
□ Storage limits
□ API call limits
□ Feature access restrictions

✅ PROMOTIONAL TOOLS
□ Create discount codes
□ Set percentage or fixed discounts
□ Set code expiration
□ Limit usage count
□ Apply to specific packages
□ Track code usage
```

---

## 📈 Module 6: Analytics & Reporting

### Features

- **Platform Analytics**: System-wide metrics
- **Financial Reports**: Revenue and billing summaries
- **Usage Analytics**: Feature and resource utilization
- **Growth Metrics**: User and merchant acquisition
- **Performance Reports**: System health and uptime
- **Custom Reports**: Build specific queries

### Test Cases

```
✅ PLATFORM METRICS
□ Total revenue calculation correct
□ Revenue by merchant breakdown
□ Revenue by package type
□ Monthly recurring revenue (MRR)
□ Annual recurring revenue (ARR)
□ Churn rate calculated

✅ USAGE ANALYTICS
□ Total bookings across platform
□ Bookings by merchant
□ Peak usage times identified
□ Feature adoption rates
□ API usage statistics
□ Storage consumption

✅ REPORT GENERATION
□ Date range selection works
□ Export to PDF
□ Export to CSV
□ Email report scheduling
□ Custom report builder
□ Saved report templates
```

---

## ⚙️ Module 7: System Configuration

### Features

- **Global Settings**: Platform-wide configuration
- **Feature Flags**: Control feature rollouts
- **Email Templates**: Customize system emails
- **API Configuration**: Rate limits and access
- **Backup Settings**: Automated backup configuration
- **Maintenance Mode**: System maintenance controls

### Test Cases

```
✅ GLOBAL SETTINGS
□ Platform name/branding
□ Default timezone
□ Currency settings
□ Language options
□ Terms of service URL
□ Privacy policy URL

✅ FEATURE FLAGS
□ Enable/disable features globally
□ Gradual rollout percentage
□ Merchant-specific overrides
□ A/B testing configuration
□ Feature access logs

✅ MAINTENANCE MODE
□ Enable maintenance mode
□ Custom maintenance message
□ Whitelist IP addresses
□ Estimated downtime display
□ Auto-disable after time
□ Notification to merchants
```

---

## 🔧 Module 8: System Monitoring

### Features

- **Real-Time Monitoring**: Live system metrics
- **Error Tracking**: Application errors and exceptions
- **Performance Monitoring**: Response times and throughput
- **Database Health**: Query performance and connections
- **Queue Monitoring**: Background job status
- **Alert Management**: Configure monitoring alerts

### Test Cases

```
✅ SYSTEM HEALTH
□ Server CPU usage displayed
□ Memory usage tracked
□ Disk space monitored
□ Network throughput shown
□ Database connections counted
□ Cache hit rates displayed

✅ ERROR TRACKING
□ Error logs displayed
□ Error frequency graphs
□ Error details accessible
□ Stack traces shown
□ Affected users identified
□ Error resolution tracking

✅ ALERT CONFIGURATION
□ Set alert thresholds
□ Configure email alerts
□ SMS alerts (if enabled)
□ Slack integration works
□ Alert history tracked
□ Alert acknowledgment system
```

---

## 🧪 Comprehensive Testing Scenarios

### Scenario 1: New Merchant Onboarding

```
1. Create Merchant
   □ Enter business details
   □ Generate subdomain
   □ Select starter package
   □ Skip trial period
   □ Generate credentials

2. Configure Merchant
   □ Add business location
   □ Set timezone
   □ Upload logo
   □ Configure features

3. Verify Setup
   □ Access merchant dashboard
   □ Check booking app URL
   □ Verify package limits
   □ Test customer booking flow
```

### Scenario 2: Trial Management

```
□ View merchant in trial
□ Check trial end date (30 days)
□ Remove trial restriction
□ Verify status changes to ACTIVE
□ Check merchant has full access
□ Verify billing activated
□ Audit log shows action
```

### Scenario 3: System Maintenance

```
1. Pre-Maintenance
   □ Schedule maintenance window
   □ Notify all merchants
   □ Set maintenance message

2. During Maintenance
   □ Enable maintenance mode
   □ Verify customer-facing apps show message
   □ Admin access still works
   □ Monitor system health

3. Post-Maintenance
   □ Disable maintenance mode
   □ Verify all services restored
   □ Check error logs
   □ Send completion notification
```

### Scenario 4: Performance Investigation

```
□ Identify slow merchant
□ Check usage statistics
□ Review error logs
□ Analyze API calls
□ Check database queries
□ Review package limits
□ Optimize or upgrade as needed
```

---

## 🚨 Critical Test Points

### Data Integrity

- Merchant isolation verified
- No cross-tenant data leaks
- Audit logs complete
- Backup systems working
- Data export accurate

### Security

- Admin authentication strong
- Session management secure
- Audit trail comprehensive
- Sensitive data encrypted
- Access controls enforced

### Performance

- Dashboard loads < 2 seconds
- Merchant list handles 1000+ entries
- Search returns < 500ms
- Bulk operations efficient
- Reports generate < 10 seconds

---

## 📋 Admin Access & Test Scenarios

### Test Credentials

```
Super Admin:
- Email: admin@heyapos.com
- Password: [Secure Password]
- Access: Full system control

Support Admin:
- Email: support@heyapos.com
- Password: [Secure Password]
- Access: Read and modify, no delete
```

### Test URLs

```
Production:
- Admin Dashboard: https://admin.heyapos.com

Development:
- Admin Dashboard: http://localhost:3003
```

---

## 🔑 Key Administrative Tasks Checklist

### Daily Tasks

- [ ] Check system health dashboard
- [ ] Review error logs
- [ ] Monitor active merchants
- [ ] Check trial expirations
- [ ] Review new registrations

### Weekly Tasks

- [ ] Generate usage reports
- [ ] Review merchant performance
- [ ] Check package limit violations
- [ ] Update system documentation
- [ ] Review and action support tickets

### Monthly Tasks

- [ ] Platform analytics review
- [ ] Revenue reconciliation
- [ ] Merchant satisfaction metrics
- [ ] System performance analysis
- [ ] Security audit review

### Critical Operations

- [ ] Emergency merchant suspension
- [ ] System-wide maintenance mode
- [ ] Bulk merchant notifications
- [ ] Database backup verification
- [ ] Disaster recovery testing

---

## 📊 Metrics to Monitor

### Business Metrics

- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- Churn Rate
- Trial Conversion Rate
- Average Revenue Per User (ARPU)

### System Metrics

- Uptime percentage (target: 99.9%)
- Average response time (< 200ms)
- Error rate (< 0.1%)
- Database query time (< 100ms)
- Cache hit rate (> 90%)
- API rate limit violations

### User Metrics

- Daily active merchants
- Bookings per merchant
- Feature adoption rates
- Support ticket volume
- User satisfaction scores

---

_Last Updated: 2025-01-09_
_Version: 1.0_
