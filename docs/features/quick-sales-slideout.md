# Feature: Quick Sales Slideout

**Date Implemented**: July 17, 2025  
**Implemented By**: Claude Code Session  
**Risk Level**: MEDIUM  
**Related Ticket/Issue**: Payment Modal Performance & UI Enhancement

## 📋 Quick Reference

**What It Does**: Enables quick point-of-sale transactions with service selection, customer assignment, and payment processing in a slideout interface  
**Where To Find It**: `/apps/merchant-app/src/components/QuickSaleSlideOut.tsx`  
**How To Test It**: Navigate to `/test/quick-sale` or click "Quick Sale" button on payments page  
**Key Dependencies**: PaymentDialogEnhanced, ServiceSelectionSlideout, CustomerSelectionSlideout, prepare-order API endpoint

## 🎯 Business Context

### Why This Feature Exists
The Quick Sales feature addresses the need for fast, walk-in customer transactions at beauty and wellness establishments. It eliminates the need to create bookings for immediate services, streamlining the checkout process for walk-in customers and quick service scenarios.

### User Story
As a merchant staff member, I want to quickly create an order for walk-in customers so that I can process immediate service payments without creating a booking.

### Success Metrics
- [x] Order creation time reduced from 4+ API calls to 1
- [x] Payment modal loads instantly with cached data
- [x] Support for both walk-in and registered customers
- [x] Individual service price adjustments (discounts/surcharges)
- [x] Order-level adjustments supported

## 🏗️ Technical Implementation

### Architecture Decision
Implemented a multi-layered slideout architecture with React Portals for payment processing. This approach prevents z-index conflicts, enables smooth animations, and provides instant UI feedback through localStorage caching and draft order pre-creation.

### Files Modified/Created
```
CREATED:
- /apps/merchant-app/src/components/QuickSaleSlideOut.tsx - Main slideout component with draft order management
- /apps/merchant-app/src/components/ServiceSelectionSlideout.tsx - Nested slideout for service selection
- /apps/merchant-app/src/components/CustomerSelectionSlideout.tsx - Nested slideout for customer selection
- /apps/merchant-app/src/components/PaymentDialogPortal.tsx - Portal wrapper for payment dialog
- /apps/merchant-app/src/components/PaymentDialogEnhanced.tsx - Enhanced payment dialog with single API call
- /apps/api/src/payments/dto/prepare-order.dto.ts - DTO for unified order preparation
- /apps/merchant-app/src/app/test/quick-sale/page.tsx - Test page for development

MODIFIED:
- /apps/api/src/payments/orders.service.ts
  - Added: prepareOrderForPayment method for single-call order creation
  - Added: recalculateOrderTotalsInTransaction for transaction-safe calculations
  - Reason: Performance optimization to reduce multiple API calls to one atomic operation
  
- /apps/api/src/payments/orders.controller.ts
  - Added: POST /api/v1/payments/prepare-order endpoint
  - Reason: Unified endpoint for both new and existing order preparation
  
- /apps/merchant-app/src/lib/api-client/payments.client.ts
  - Added: prepareOrderForPayment method
  - Reason: Client-side API integration
  
- /apps/merchant-app/src/components/PaymentDialog.tsx
  - Added: Display logic for individual service adjustments
  - Changed: Shows both discounts and surcharges with clear visual indicators
  - Reason: Better visibility of price adjustments in payment modal
```

### Database Changes
```sql
-- No schema changes required
-- Uses existing Order, OrderItem, and OrderModifier tables
-- Leverages draft order state for pre-creation pattern
```

### API Changes
```typescript
// New unified order preparation endpoint
POST /api/v1/payments/prepare-order
  Request: {
    orderId?: string,          // For updating existing orders
    customerId?: string,       // For new orders with customer
    isWalkIn?: boolean,        // Walk-in customer flag
    bookingId?: string,        // Link to booking if applicable
    items?: [{
      itemType: string,        // 'SERVICE' | 'PRODUCT'
      itemId: string,
      description: string,
      unitPrice: number,
      quantity: number,
      discount?: number,       // Can be positive (discount) or negative (surcharge)
      taxRate?: number,
      staffId?: string,
      metadata?: any
    }],
    orderModifier?: {
      type: 'DISCOUNT' | 'SURCHARGE',
      amount: number,
      description: string
    }
  }
  Response: {
    order: Order,              // Complete order with items, modifiers, totals
    paymentGateway: {...},     // Payment gateway configuration
    merchant: {...},           // Merchant details
    location: {...},           // Location details
    customer?: {...},          // Customer if applicable
    booking?: {...}            // Booking if applicable
  }
  Breaking change: NO
```

### Key Components/Functions
```typescript
QuickSaleSlideOut
  Location: /apps/merchant-app/src/components/QuickSaleSlideOut.tsx
  Purpose: Main slideout container managing service selection, customer assignment, and order creation
  Used by: Quick sale button on payments page, test page
  
ServiceSelectionSlideout
  Location: /apps/merchant-app/src/components/ServiceSelectionSlideout.tsx
  Purpose: Nested slideout for browsing and selecting services with staff assignment
  Used by: QuickSaleSlideOut component
  
CustomerSelectionSlideout
  Location: /apps/merchant-app/src/components/CustomerSelectionSlideout.tsx
  Purpose: Nested slideout for searching and selecting customers or walk-in option
  Used by: QuickSaleSlideOut component
  
PaymentDialogEnhanced
  Location: /apps/merchant-app/src/components/PaymentDialogEnhanced.tsx
  Purpose: Enhanced payment dialog that creates/updates orders in a single API call
  Used by: QuickSaleSlideOut via PaymentDialogPortal
  
prepareOrderForPayment (service method)
  Location: /apps/api/src/payments/orders.service.ts:568
  Purpose: Unified method to create or update orders with all items and modifiers atomically
  Used by: /api/v1/payments/prepare-order endpoint
```

## 🔗 Integration Points

### Upstream Dependencies
- [x] Service catalog - Must have active services defined
- [x] Staff members - At least one active staff required for order creation
- [x] Customer database - For customer selection (optional for walk-ins)
- [x] Payment gateway configuration - Required for payment processing

### Downstream Impact
- [x] Order Management - Creates orders in DRAFT state
- [x] Payment Processing - Integrates with payment dialog
- [x] Analytics/Reporting - Orders created are included in reports
- [ ] Inventory - Not yet integrated for product sales

### Critical Paths
1. Quick Sale from Payments Page → Service Selection → Customer Selection → Payment
2. Walk-in Customer → Skip Customer Selection → Direct to Payment
3. Price Adjustment Flow → Modify Individual Services → Apply Order Discount → Process Payment

## 🧪 Testing

### Automated Tests
```bash
# Unit tests
npm run test -- QuickSaleSlideOut

# Integration tests  
npm run test -- prepare-order

# E2E tests
# Manual testing recommended due to complex UI interactions
```

### Manual Testing Checklist
- [x] Open Quick Sale slideout from payments page
- [x] Select multiple services with different quantities
- [x] Assign different staff to each service
- [x] Apply individual service discounts (test both positive and negative values)
- [x] Apply order-level discount/surcharge
- [x] Test with walk-in customer (no customer selected)
- [x] Test with existing customer selection
- [x] Verify payment modal shows correct totals with adjustments
- [x] Complete payment and verify order state
- [x] Test cancel and re-open flow (data should refresh)
- [x] Test z-index stacking with multiple slideouts open

## ⚠️ Edge Cases & Gotchas

### Handled Edge Cases
- ✅ Prisma Decimal conversion - Automatically converts Decimal objects to numbers
- ✅ Invalid staff IDs - Filters out non-UUID staff IDs from mock data
- ✅ Locked order errors - Tracks used draft orders and creates new ones
- ✅ Transaction timeouts - Moves non-critical operations outside transaction
- ✅ Missing staff - Automatically selects first active staff if none provided

### Known Limitations
- ⚠️ Draft orders expire after 5 minutes - User must complete within timeout
- ⚠️ No product support yet - Only services can be added to quick sales
- ⚠️ Single location only - Uses user's primary location

### Performance Notes
- Draft order pre-creation reduces payment initiation from ~2s to near-instant
- localStorage caching enables optimistic UI rendering
- Single API call for order preparation vs previous 4+ calls
- Transaction timeout set to 10 seconds for complex orders

## 🐛 Debugging Guide

### Common Issues

**Issue**: "Cannot modify a locked order" error
- Check: Is the draft order already used? Check `usedDraftOrderId` state
- Check: Order state in database - must be DRAFT
- Fix: Component tracks used orders and creates new draft if needed

**Issue**: Payment modal shows loading indefinitely
- Check: Browser console for API errors
- Check: PM2 logs for prepare-order endpoint errors
- Fix: Ensure all required fields are sent in prepare-order request

**Issue**: Slideouts appear behind each other
- Check: Z-index values in component classes
- Fix: Nested slideouts must use z-[60], main slideout uses z-50

### Debug Commands
```bash
# Check API logs for order creation
pm2 logs api --nostream | grep "PrepareOrder"

# Monitor slow queries
pm2 logs api | grep "Slow.*Order"

# Clear localStorage cache (in browser console)
localStorage.removeItem('quickSale')
```

### Key Log Entries
```
[PrepareOrder] Completed in Xms - Performance timing
[PaymentDialogEnhanced] Service X adjustment details - Price calculations
[QuickSaleSlideOut] Draft order created: UUID - Order pre-creation
Full error object: Cannot modify a locked order - State conflict
```

## 🔄 Maintenance Notes

### Safe to Modify
- ✅ UI styling and layout adjustments
- ✅ Adding new service filters or search options
- ✅ Timeout values for draft orders
- ✅ localStorage cache duration

### Modify with Caution
- ⚠️ Z-index values - Must maintain proper hierarchy
- ⚠️ Price calculation logic - Affects order totals
- ⚠️ Draft order state management - Can cause locked order errors
- ⚠️ API endpoint changes - Used by multiple features

### Do NOT Modify Without Full Understanding
- ❌ Transaction handling in prepareOrderForPayment - Can cause data inconsistency
- ❌ Decimal to number conversions - Will cause Prisma errors
- ❌ Portal rendering logic - Can break payment dialog
- ❌ Order state transitions - Must follow valid state machine

## 📊 Monitoring

### Metrics to Track
- Draft order creation time - Should be <500ms
- Order preparation API response time - Target <1s
- Draft order utilization rate - % that become completed orders
- Payment modal load time - Should be instant with cache

### Alerts to Configure
- Draft order creation failures >5% - Indicates staff configuration issues
- Transaction timeouts >1% - Database performance degradation
- Order preparation >2s response time - Performance regression

## 🔗 Related Documentation

- [Payment Dialog Documentation](./payment-dialog.md)
- [Order State Machine](../api/order-states.md)
- [V1 vs V2 API Architecture](../V1_VS_V2_API_ARCHITECTURE.md)
- [Performance Optimization Guide](../PERFORMANCE_OPTIMIZATION.md)

## 📝 Additional Notes

**Design Philosophy**: The Quick Sales feature prioritizes speed and user experience. Every decision, from draft order pre-creation to localStorage caching, aims to minimize perceived latency. The slideout architecture provides a focused workflow while maintaining access to the underlying UI.

**Future Enhancements**:
1. Product support for retail sales
2. Multi-location order creation
3. Batch service selection
4. Barcode scanning integration
5. Preset service packages

**Performance Baseline** (as of implementation):
- Order creation: 4 API calls → 1 API call
- Payment modal load: ~2s → Instant (with cache)
- Total transaction time: ~8s → ~3s

---

**Last Updated**: July 17, 2025  
**Next Review Date**: October 17, 2025