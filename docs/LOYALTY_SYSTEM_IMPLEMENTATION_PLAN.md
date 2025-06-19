# Loyalty System Implementation Plan

## Executive Summary

This document outlines a comprehensive implementation plan for a dual-mode loyalty system supporting both visits-based (punch card) and points-based programs. Each merchant can activate only ONE loyalty system type at a time, with the ability to switch between modes (with proper data migration considerations).

## System Overview

### Loyalty Modes
1. **Visits-Based (Punch Card)**
   - Example: "Buy 9 coffees, get 10th free"
   - Tracks visit count for specific services/categories
   - Simple incrementing counter with reward thresholds

2. **Points-Based**
   - Example: "Earn 1 point per $1, redeem 100 points for $10 off"
   - Accumulates points based on spending
   - Flexible redemption rules and tiers

## Database Schema Changes

### 1. Modify Existing Tables

```prisma
// Update Merchant model - add loyalty configuration
model Merchant {
  // ... existing fields ...
  
  // Loyalty system configuration
  loyaltyEnabled      Boolean  @default(false)
  loyaltyType         String?  // 'VISITS' or 'POINTS'
  loyaltyConfig       Json?    // Detailed configuration
  loyaltyActivatedAt  DateTime?
  loyaltyDeactivatedAt DateTime?
}

// Update Customer model - already has loyaltyPoints and visitCount
model Customer {
  // ... existing fields ...
  loyaltyPoints       Float    @default(0)    // For points-based
  visitCount          Int      @default(0)    // For visits-based
  lifetimePoints      Float    @default(0)    // Total points ever earned
  lifetimeVisits      Int      @default(0)    // Total visits ever
  loyaltyTierId       String?                 // Current tier
  loyaltyEnrolledAt   DateTime?               // When enrolled in program
  
  // Add relations
  loyaltyTransactions LoyaltyTransaction[]
  loyaltyRewards      LoyaltyReward[]
  visitRecords        VisitRecord[]
}
```

### 2. New Tables

```prisma
// Loyalty configuration templates
model LoyaltyTemplate {
  id              String   @id @default(cuid())
  merchantId      String
  name            String
  type            String   // 'VISITS' or 'POINTS'
  isActive        Boolean  @default(true)
  configuration   Json     // Detailed rules
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  merchant        Merchant @relation(fields: [merchantId], references: [id])
  
  @@unique([merchantId, name])
  @@index([merchantId, isActive])
}

// Points-based transactions
model LoyaltyTransaction {
  id                String    @id @default(cuid())
  merchantId        String
  customerId        String
  type              String    // 'EARN', 'REDEEM', 'ADJUST', 'EXPIRE'
  points            Float     // Positive for earn, negative for redeem
  balanceAfter      Float     // Running balance
  
  // Reference to what triggered this
  referenceType     String?   // 'BOOKING', 'PAYMENT', 'MANUAL', 'PROMOTION'
  referenceId       String?   // ID of booking/payment/etc
  
  description       String
  expiresAt         DateTime? // For points with expiry
  expiredPoints     Float     @default(0)
  
  // Metadata
  createdByStaffId  String?
  locationId        String?
  notes             String?
  
  createdAt         DateTime  @default(now())
  
  customer          Customer  @relation(fields: [customerId], references: [id])
  createdBy         Staff?    @relation(fields: [createdByStaffId], references: [id])
  
  @@index([merchantId, customerId])
  @@index([type])
  @@index([referenceType, referenceId])
  @@index([expiresAt])
}

// Visit records for punch card system
model VisitRecord {
  id                String    @id @default(cuid())
  merchantId        String
  customerId        String
  visitNumber       Int       // Sequential visit number
  
  // What qualified for this visit
  qualifyingType    String    // 'SERVICE', 'CATEGORY', 'AMOUNT'
  qualifyingId      String?   // Service/Category ID if applicable
  qualifyingAmount  Float?    // Minimum amount if applicable
  
  // Reference
  bookingId         String?
  paymentId         String?
  
  // Reward info
  isRewardVisit     Boolean   @default(false)
  rewardId          String?
  
  createdByStaffId  String?
  locationId        String?
  visitDate         DateTime
  createdAt         DateTime  @default(now())
  
  customer          Customer  @relation(fields: [customerId], references: [id])
  booking           Booking?  @relation(fields: [bookingId], references: [id])
  reward            LoyaltyReward? @relation(fields: [rewardId], references: [id])
  
  @@index([merchantId, customerId])
  @@index([visitDate])
  @@index([qualifyingType])
}

// Rewards earned/redeemed
model LoyaltyReward {
  id                String    @id @default(cuid())
  merchantId        String
  customerId        String
  type              String    // 'VISIT_REWARD', 'POINTS_REDEMPTION', 'TIER_BENEFIT'
  
  // Reward details
  rewardType        String    // 'DISCOUNT_AMOUNT', 'DISCOUNT_PERCENT', 'FREE_SERVICE', 'CUSTOM'
  rewardValue       Float?    // Amount or percentage
  rewardServiceId   String?   // For free service rewards
  rewardDescription String
  
  // Usage tracking
  status            String    @default('AVAILABLE') // 'AVAILABLE', 'REDEEMED', 'EXPIRED'
  redeemedAt        DateTime?
  redeemedInvoiceId String?
  expiresAt         DateTime?
  
  // Source
  sourceType        String    // 'VISIT_COMPLETION', 'POINTS_REDEMPTION', 'TIER_ACHIEVEMENT'
  sourceId          String?   // Visit record ID or transaction ID
  
  createdByStaffId  String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  customer          Customer  @relation(fields: [customerId], references: [id])
  visits            VisitRecord[]
  
  @@index([merchantId, customerId])
  @@index([status])
  @@index([expiresAt])
}

// Loyalty tiers for points-based system
model LoyaltyTier {
  id                String    @id @default(cuid())
  merchantId        String
  name              String
  requiredPoints    Float     // Lifetime points needed
  multiplier        Float     @default(1) // Points earning multiplier
  
  // Benefits
  benefits          Json      // Array of benefit objects
  perks             String[]  // Quick list of perks
  
  // Display
  color             String?
  icon              String?
  description       String?
  
  sortOrder         Int
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@unique([merchantId, name])
  @@index([merchantId, isActive])
}

// Promotion rules
model LoyaltyPromotion {
  id                String    @id @default(cuid())
  merchantId        String
  name              String
  type              String    // 'BONUS_POINTS', 'DOUBLE_VISITS', 'TIER_UPGRADE'
  
  // Conditions
  startDate         DateTime
  endDate           DateTime
  conditions        Json      // Complex conditions
  
  // Rewards
  bonusMultiplier   Float?    // For bonus points/visits
  bonusPoints       Float?    // Fixed bonus points
  
  // Limits
  maxUsesTotal      Int?
  maxUsesPerCustomer Int?
  currentUses       Int       @default(0)
  
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@index([merchantId, isActive])
  @@index([startDate, endDate])
}
```

## API Endpoints

### 1. Loyalty Configuration Management

```typescript
// Merchant loyalty settings
POST   /api/loyalty/configure
GET    /api/loyalty/configuration
PUT    /api/loyalty/configuration
DELETE /api/loyalty/disable

// Configuration DTOs
interface ConfigureLoyaltyDto {
  type: 'VISITS' | 'POINTS';
  configuration: VisitsConfig | PointsConfig;
}

interface VisitsConfig {
  requiredVisits: number;           // e.g., 9
  rewardType: 'FREE_SERVICE' | 'DISCOUNT';
  rewardValue?: number;             // Discount amount/percentage
  rewardServiceIds?: string[];      // Eligible free services
  qualifyingRules: {
    minAmount?: number;             // Minimum spend to count as visit
    serviceIds?: string[];          // Only these services count
    categoryIds?: string[];         // Only these categories count
  };
  expiryDays?: number;             // Days until reward expires
}

interface PointsConfig {
  earningRules: {
    pointsPerDollar: number;        // e.g., 1
    categoryMultipliers?: Record<string, number>; // Category-specific multipliers
    roundingMode: 'UP' | 'DOWN' | 'NEAREST';
  };
  redemptionRules: {
    minPoints: number;              // Minimum to redeem
    pointsValue: number;            // e.g., 100 points = $10
    maxRedemptionPercent?: number;  // Max % of invoice
  };
  expiryRules?: {
    expiryMonths: number;           // Points expire after X months
    warningDays: number;            // Warn X days before expiry
  };
  tiers?: TierConfig[];
}
```

### 2. Customer Loyalty Operations

```typescript
// Enrollment and status
POST   /api/customers/:customerId/loyalty/enroll
GET    /api/customers/:customerId/loyalty/status
GET    /api/customers/:customerId/loyalty/history
GET    /api/customers/:customerId/loyalty/rewards

// Manual adjustments (admin only)
POST   /api/customers/:customerId/loyalty/adjust
POST   /api/customers/:customerId/loyalty/add-visit

// Redemption
POST   /api/loyalty/rewards/:rewardId/redeem
GET    /api/loyalty/rewards/available    // For current customer
```

### 3. Transaction Processing Integration

```typescript
// Booking completion trigger
POST /api/bookings/:bookingId/complete
// Should trigger loyalty point earning or visit recording

// Payment processing trigger  
POST /api/payments/process
// Should calculate and award points based on payment amount
```

### 4. Reporting and Analytics

```typescript
GET /api/loyalty/reports/summary         // Overall program performance
GET /api/loyalty/reports/customers      // Customer engagement metrics
GET /api/loyalty/reports/redemptions    // Redemption analytics
GET /api/loyalty/reports/expiring       // Upcoming expirations
```

## Business Logic Implementation

### 1. Core Services

```typescript
// loyalty.service.ts
export class LoyaltyService {
  // Configuration management
  async configureLoyalty(merchantId: string, config: ConfigureLoyaltyDto);
  async getLoyaltyConfiguration(merchantId: string);
  async disableLoyalty(merchantId: string);
  
  // Transaction processing
  async processBookingCompletion(bookingId: string);
  async processPayment(paymentId: string);
  async processRefund(paymentRefundId: string);
  
  // Customer operations
  async enrollCustomer(customerId: string);
  async getCustomerLoyaltyStatus(customerId: string);
  async adjustPoints(customerId: string, adjustment: PointsAdjustmentDto);
  async recordManualVisit(customerId: string, visit: ManualVisitDto);
  
  // Rewards
  async checkAndCreateRewards(customerId: string);
  async redeemReward(rewardId: string, invoiceId: string);
  async getAvailableRewards(customerId: string);
  
  // Maintenance
  async processExpirations();
  async updateCustomerTiers(merchantId: string);
}
```

### 2. Integration Points

```typescript
// bookings.service.ts - Add loyalty hooks
async completeBooking(bookingId: string) {
  // ... existing completion logic ...
  
  // Trigger loyalty processing
  await this.loyaltyService.processBookingCompletion(bookingId);
}

// payments.service.ts - Add loyalty hooks
async processPayment(payment: ProcessPaymentDto) {
  // ... existing payment logic ...
  
  // Award loyalty points
  const processedPayment = await this.savePayment(payment);
  await this.loyaltyService.processPayment(processedPayment.id);
}
```

### 3. Event-Driven Architecture

```typescript
// loyalty.events.ts
export enum LoyaltyEvents {
  POINTS_EARNED = 'loyalty.points.earned',
  POINTS_REDEEMED = 'loyalty.points.redeemed',
  VISIT_RECORDED = 'loyalty.visit.recorded',
  REWARD_EARNED = 'loyalty.reward.earned',
  REWARD_REDEEMED = 'loyalty.reward.redeemed',
  TIER_ACHIEVED = 'loyalty.tier.achieved',
  POINTS_EXPIRING = 'loyalty.points.expiring',
}

// Event payloads
export interface PointsEarnedEvent {
  customerId: string;
  points: number;
  balance: number;
  source: string;
  sourceId: string;
}
```

## UI/UX Implementation

### 1. Merchant Dashboard Components

```typescript
// Loyalty configuration page
- LoyaltyConfigurationForm
  - LoyaltyTypeSelector (Visits vs Points)
  - VisitsConfigPanel
  - PointsConfigPanel
  - TierManagement
  
// Customer management integration
- CustomerLoyaltyCard
  - CurrentBalance/VisitCount
  - ProgressIndicator
  - RewardsList
  - TransactionHistory
  
// POS integration
- LoyaltyWidget (in payment screen)
  - PointsEarned preview
  - Available rewards
  - Quick redemption
```

### 2. Customer-Facing Features

```typescript
// Booking confirmation
- Points/visits earned display
- Progress towards next reward

// Customer portal
- Loyalty dashboard
- Transaction history
- Available rewards
- Tier status and benefits
```

### 3. Staff Training Tools

```typescript
// Built-in help system
- Loyalty program explainers
- Common scenarios
- Troubleshooting guide
```

## Edge Cases and Complications

### 1. Mode Switching Scenarios

**Visits to Points Migration:**
```typescript
async migrateVisitsToPoints(merchantId: string, conversionRate: number) {
  // Convert existing visit count to points
  // Archive visit records
  // Create initial point balance transactions
  // Handle partially completed visit cycles
}
```

**Points to Visits Migration:**
```typescript
async migratePointsToVisits(merchantId: string) {
  // More complex - may need manual decisions
  // Option 1: Reset completely
  // Option 2: Convert points to visit credits
  // Option 3: Maintain points as separate legacy balance
}
```

### 2. Complex Business Rules

**Refund Handling:**
- Points: Reverse points earned
- Visits: Complex - may need to reverse visit if refund is full
- Rewards: Block refunds if reward was used

**Booking Modifications:**
- Service changes affect points/visits
- Date changes may affect promotions
- Cancellations need cleanup

**Multi-Service Bookings:**
- Which services qualify for visits?
- How to split points across services?
- Partial completion scenarios

### 3. Data Integrity Concerns

```typescript
// Implement double-entry bookkeeping for points
interface PointsLedger {
  transactionId: string;
  customerId: string;
  debit: number;     // Points added
  credit: number;    // Points removed
  balance: number;   // Running balance
  timestamp: DateTime;
}

// Audit trail for all changes
interface LoyaltyAudit {
  action: string;
  entityType: string;
  entityId: string;
  previousValue: any;
  newValue: any;
  reason: string;
  performedBy: string;
}
```

### 4. Performance Considerations

```typescript
// Batch processing for large operations
async function processLoyaltyBatch() {
  // Process expirations in chunks
  // Update tier statuses in background
  // Generate reports asynchronously
}

// Caching strategy
interface LoyaltyCache {
  customerBalance: Map<string, number>;
  customerTier: Map<string, string>;
  activePromotions: Promotion[];
  merchantConfig: Map<string, LoyaltyConfig>;
}
```

### 5. Special Scenarios

**Group Bookings:**
- Who gets the points/visits?
- Split options for fairness

**Gift Cards/Vouchers:**
- Do purchases with gift cards earn points?
- Policy configuration needed

**Promotional Periods:**
- Double points days
- Bonus visit credits
- Tier upgrade promotions

**Cross-Location Considerations:**
- Shared loyalty across merchant locations
- Location-specific promotions
- Transfer policies

## Migration Strategy

### Phase 1: Database Schema (Week 1)
1. Add new tables via Prisma migration
2. Update existing models
3. Create indexes for performance
4. Add audit triggers

### Phase 2: Core Services (Week 2-3)
1. Implement LoyaltyService
2. Add transaction processors
3. Create reward calculators
4. Build maintenance jobs

### Phase 3: API Integration (Week 3-4)
1. Add loyalty endpoints
2. Integrate with existing services
3. Add event emitters
4. Create webhooks

### Phase 4: UI Implementation (Week 4-6)
1. Merchant configuration UI
2. Customer management integration
3. POS widgets
4. Reporting dashboards

### Phase 5: Testing and Rollout (Week 6-8)
1. Unit and integration tests
2. Load testing
3. Beta merchant testing
4. Phased rollout

## Security Considerations

### 1. Access Control
```typescript
// Permission levels
enum LoyaltyPermissions {
  VIEW_CONFIG = 'loyalty.config.view',
  EDIT_CONFIG = 'loyalty.config.edit',
  VIEW_CUSTOMER = 'loyalty.customer.view',
  ADJUST_POINTS = 'loyalty.points.adjust',
  ISSUE_REWARDS = 'loyalty.rewards.issue',
  VIEW_REPORTS = 'loyalty.reports.view',
}
```

### 2. Fraud Prevention
- Rate limiting on point adjustments
- Approval workflow for large redemptions
- Audit trail for all transactions
- Suspicious activity monitoring

### 3. Data Privacy
- PII handling in loyalty data
- GDPR compliance for point expiry
- Customer opt-out processes
- Data retention policies

## Monitoring and Analytics

### 1. Key Metrics
```typescript
interface LoyaltyMetrics {
  // Engagement
  enrollmentRate: number;
  activeRate: number;        // Used in last 30 days
  averageBalance: number;
  
  // Financial
  redemptionRate: number;
  liabilityTotal: number;    // Outstanding points value
  breakageRate: number;      // Expired unused
  
  // Program Health
  earnVelocity: number;      // Points/visits per day
  redeemVelocity: number;
  customerLifetimeValue: number;
}
```

### 2. Alerting Rules
- Unusual point adjustments
- High redemption velocity
- System errors in processing
- Approaching liability limits

## Future Enhancements

### Phase 2 Features
1. **Referral Programs**
   - Earn points for referrals
   - Tiered referral rewards

2. **Social Sharing**
   - Bonus points for reviews
   - Social media check-ins

3. **Gamification**
   - Challenges and badges
   - Streak rewards
   - Leaderboards

4. **Partner Networks**
   - Cross-merchant point sharing
   - Partner reward redemptions

5. **Advanced Analytics**
   - Predictive churn modeling
   - Personalized offers
   - ROI optimization

## Conclusion

This loyalty system implementation provides a flexible, scalable foundation for both visits-based and points-based programs. The architecture supports future enhancements while maintaining data integrity and performance. Key success factors include:

1. Clear migration paths between modes
2. Robust audit and reconciliation
3. Intuitive UI for all users
4. Comprehensive edge case handling
5. Performance optimization from day one

The phased approach allows for iterative development and testing, reducing risk and ensuring a smooth rollout to merchants and their customers.