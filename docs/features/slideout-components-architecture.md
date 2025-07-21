# Feature: Slideout Components Architecture

**Date Implemented**: May-July 2025  
**Implemented By**: Claude Code Session  
**Risk Level**: HIGH  
**Related Ticket/Issue**: Various - Booking management, Quick sales, Payment processing

## 📋 Quick Reference

**What It Does**: Provides a layered slideout panel system for complex workflows like booking creation, order management, and payment processing  
**Where To Find It**: `/apps/merchant-app/src/components/*SlideOut*.tsx`  
**How To Test It**: Navigate to calendar/bookings/payments pages and use respective slideout triggers  
**Key Dependencies**: SlideOutPanel base component, React Portals, z-index management

## 🎯 Business Context

### Why This Feature Exists
The slideout architecture addresses the need for complex multi-step workflows in a POS system while maintaining context and allowing users to reference underlying information. It enables nested interactions without losing state and provides a focused environment for critical business operations.

### User Story
As a merchant staff member, I want to create bookings, process sales, and manage orders in a focused interface so that I can complete complex workflows without losing context or navigating away from my current view.

### Success Metrics
- [x] Complex workflows completed without page navigation
- [x] State maintained across nested slideouts
- [x] Z-index conflicts resolved with proper layering
- [x] Mobile-responsive design maintained
- [x] Performance optimized with lazy loading

## 🏗️ Technical Implementation

### Architecture Decision
Implemented a hierarchical slideout system with:
1. Base SlideOutPanel component for consistent behavior
2. Nested slideouts with proper z-index management (50, 60, 70)
3. React Portals for payment dialogs to prevent z-index issues
4. State preservation during transitions
5. Mobile-responsive full-screen mode

### Component Hierarchy
```
SlideOutPanel (Base Component - z-50)
├── BookingSlideOut (Main booking creation)
│   ├── ServiceSelectionSlideout (z-60)
│   ├── CustomerSelectionSlideout (z-60)
│   └── PaymentDialogPortal (z-70)
├── QuickSaleSlideOut (Quick POS transactions)
│   ├── ServiceSelectionSlideout (z-60)
│   ├── CustomerSelectionSlideout (z-60)
│   └── PaymentDialogEnhanced (z-70)
└── BookingDetailsSlideOut (Booking management)
    └── PaymentDialogPortal (z-70)
```

## 📑 Component Documentation

### 1. SlideOutPanel (Base Component)

**Location**: `/apps/merchant-app/src/components/SlideOutPanel.tsx`  
**Purpose**: Reusable base component providing slideout panel behavior

#### Key Features
- Smooth slide-in animation from right
- Mobile-responsive (full-screen on mobile)
- Backdrop click to close
- ESC key support
- Customizable width and z-index
- Focus management

#### Props
```typescript
interface SlideOutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
  showCloseButton?: boolean;
  width?: string; // Default: "w-full md:w-[600px]"
  zIndex?: string; // Default: "z-50"
}
```

### 2. BookingSlideOut

**Location**: `/apps/merchant-app/src/components/BookingSlideOut.tsx`  
**Purpose**: Complete booking creation workflow with multi-service support

#### Key State Management
```typescript
// Service selection with staff assignment
const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);

// Customer management
const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
const [isWalkIn, setIsWalkIn] = useState(false);

// Loyalty integration
const [loyaltyDiscount, setLoyaltyDiscount] = useState({ 
  amount: 0, 
  description: '' 
});

// Date/time management
const [date, setDate] = useState<Date>(initialDate || defaultDate);
const [time, setTime] = useState<Date>(initialTime || defaultTime);
```

#### API Integrations
- `POST /api/v2/bookings` - Create booking
- `GET /api/v1/customers` - Customer search
- `GET /api/v1/services` - Service catalog
- `GET /api/v1/loyalty/points/{customerId}` - Loyalty balance

#### Recent Features Added
1. **Loyalty Points Redemption** (July 2025)
   - LoyaltyRedemption component integration
   - Discount stored in booking notes as metadata
   - Applied as order modifier during payment
   - Can be removed/modified before payment
   - Format: `[LOYALTY_DISCOUNT:amount:description]`

2. **Walk-in Customer Support**
   - Toggle for walk-in vs registered customers
   - Merchant setting: `allowWalkInBookings`

3. **Unassigned Booking Support**
   - Allow bookings without staff assignment
   - Merchant setting: `allowUnassignedBookings`

4. **Multi-Service Bookings**
   - Add multiple services with different staff
   - Individual price adjustments per service
   - Total duration calculation

#### Important Patterns
```typescript
// Prevent infinite loops with stable defaults
const [defaultDate] = useState(() => new Date());
const [defaultTime] = useState(() => {
  // Round to next 15-minute interval
  const now = new Date();
  const minutes = now.getMinutes();
  const remainder = minutes % 15;
  // ... rounding logic
  return now;
});

// Reset form only on open transition
useEffect(() => {
  const wasClosedNowOpen = !prevIsOpenRef.current && isOpen;
  if (wasClosedNowOpen && !hasInitializedRef.current) {
    // Reset form state
  }
}, [isOpen]);
```

### 3. QuickSaleSlideOut

**Location**: `/apps/merchant-app/src/components/QuickSaleSlideOut.tsx`  
**Purpose**: Fast point-of-sale transactions without booking creation

#### Key State Management
```typescript
// Draft order pre-creation
const [draftOrderId, setDraftOrderId] = useState<string | null>(null);
const [usedDraftOrderId, setUsedDraftOrderId] = useState<string | null>(null);

// Service management with adjustments
const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);

// Order-level adjustments
const [orderDiscount, setOrderDiscount] = useState(0);
const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
```

#### API Integrations
- `POST /api/v1/payments/prepare-order` - Single-call order creation
- `POST /api/v1/orders` - Draft order creation
- `GET /api/v1/services` - Service catalog

#### Performance Optimizations
1. **Draft Order Pre-creation**
   - Creates draft order on slideout open
   - Enables instant payment modal loading
   - Tracks used drafts to prevent conflicts

2. **LocalStorage Caching**
   ```typescript
   // Cache customer for reopening
   if (customer) {
     localStorage.setItem('quickSale', JSON.stringify({
       customer,
       timestamp: Date.now()
     }));
   }
   ```

3. **Single API Call Pattern**
   - Replaced 4+ API calls with one `prepare-order` endpoint
   - Atomic transaction for order creation

#### Recent Features Added
1. **Individual Service Adjustments**
   - Per-service discount/surcharge
   - Visual indicators in payment modal

2. **Order-Level Modifiers**
   - Percentage or fixed amount discounts
   - Applied after service-level adjustments

### 4. BookingDetailsSlideOut

**Location**: `/apps/merchant-app/src/components/BookingDetailsSlideOut.tsx`  
**Purpose**: View and manage existing bookings with status updates and payment processing

#### Key State Management
```typescript
// Editing state
const [isEditing, setIsEditing] = useState(false);
const [formData, setFormData] = useState(() => initializeFormData(booking));

// Order association
const [associatedOrder, setAssociatedOrder] = useState<any>(null);
const [isLoadingOrder, setIsLoadingOrder] = useState(false);

// Payment processing
const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<any>(null);
```

#### API Integrations
- `PUT /api/v2/bookings/{id}` - Update booking
- `DELETE /api/v2/bookings/{id}` - Delete booking
- `POST /api/v1/orders/from-booking/{id}` - Create order from booking
- `PATCH /api/v2/bookings/{id}/status` - Update booking status

#### Status Management
```typescript
// Booking statuses with visual indicators
const statusConfig = {
  pending: { icon: AlertCircle, color: "text-yellow-600" },
  confirmed: { icon: CheckCircle, color: "text-blue-600" },
  "in-progress": { icon: PlayCircle, color: "text-purple-600" },
  completed: { icon: CheckCircle, color: "text-green-600" },
  cancelled: { icon: XCircle, color: "text-red-600" },
  "no-show": { icon: XCircle, color: "text-gray-600" }
};
```

#### Recent Features Added
1. **Real-time Notification Integration**
   - Refreshes notifications on status change
   - Uses NotificationContext

2. **Multi-Service Display**
   - Shows all services in a booking
   - Backward compatible with single service

3. **Order Association**
   - Automatically creates order for payment
   - Tracks payment status

### 5. ServiceSelectionSlideout

**Location**: `/apps/merchant-app/src/components/ServiceSelectionSlideout.tsx`  
**Purpose**: Nested slideout for browsing and selecting services

#### Key Features
- Category filtering
- Search functionality
- Staff assignment per service
- Duration and price display
- Mobile-optimized grid layout

#### Props
```typescript
interface ServiceSelectionSlideoutProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  staff: Staff[];
  onSelectService: (service: ServiceWithStaff) => void;
  selectedServices?: string[]; // IDs of already selected services
}
```

### 6. CustomerSelectionSlideout

**Location**: `/apps/merchant-app/src/components/CustomerSelectionSlideout.tsx`  
**Purpose**: Nested slideout for customer search and selection

#### Key Features
- Real-time search
- Walk-in customer option
- Customer creation flow
- Phone/email/name search
- Recent customers display

#### Props
```typescript
interface CustomerSelectionSlideoutProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer | null, isWalkIn: boolean) => void;
  customers?: Customer[];
  allowWalkIn?: boolean;
}
```

## 🔗 Integration Points

### Upstream Dependencies
- [x] React Portal for rendering outside DOM hierarchy
- [x] Framer Motion for animations
- [x] Date-fns for date/time handling
- [x] API client for backend communication
- [x] Auth context for user/merchant data

### Downstream Impact
- [x] Calendar - Opens BookingSlideOut for new bookings
- [x] Bookings page - Opens BookingDetailsSlideOut
- [x] Payments page - Opens QuickSaleSlideOut
- [x] Orders - Created through slideout workflows
- [x] Analytics - All transactions tracked

### Critical Paths
1. Calendar → Click time slot → BookingSlideOut → Select services → Assign customer → Create booking
2. Payments → Quick Sale → QuickSaleSlideOut → Select services → Process payment
3. Bookings → Click booking → BookingDetailsSlideOut → Update status/Process payment

## ⚠️ Edge Cases & Gotchas

### Handled Edge Cases
- ✅ Z-index stacking with nested slideouts
- ✅ State preservation during close/reopen
- ✅ Mobile touch event handling
- ✅ Keyboard navigation (ESC to close)
- ✅ Scroll locking when open
- ✅ Portal rendering for payment dialogs

### Known Limitations
- ⚠️ Maximum 3 levels of nesting (base + 2 nested)
- ⚠️ Animation performance on low-end devices
- ⚠️ State not persisted on page refresh

### Performance Notes
- Lazy load slideout content
- Use React.memo for expensive child components
- Debounce search inputs
- Virtual scrolling for long lists (not yet implemented)

## 🐛 Debugging Guide

### Common Issues

**Issue**: Slideout appears behind other elements
- Check: Z-index values (50, 60, 70 hierarchy)
- Check: Parent element z-index conflicts
- Fix: Use Portal for problematic elements

**Issue**: State lost when reopening slideout
- Check: useEffect dependencies for reset logic
- Check: Stable default value creation
- Fix: Use useState with initializer function

**Issue**: Infinite re-renders
- Check: Object/array dependencies in useEffect
- Check: Default parameter values in component props
- Fix: Use useMemo/useCallback for stable references

### Debug Commands
```bash
# Check for z-index issues
grep -r "z-\[" apps/merchant-app/src/components/*SlideOut*

# Monitor API calls
pm2 logs api --nostream | grep -E "(booking|order|payment)"

# Check localStorage
# In browser console:
localStorage.getItem('quickSale')
```

## 🔄 Maintenance Notes

### Safe to Modify
- ✅ Styling and animations
- ✅ Width and responsive breakpoints
- ✅ Adding new form fields
- ✅ Search debounce timing

### Modify with Caution
- ⚠️ Z-index hierarchy (maintain 50, 60, 70 pattern)
- ⚠️ State reset logic (can cause data loss)
- ⚠️ Portal rendering (affects event bubbling)
- ⚠️ Focus management (accessibility impact)

### Do NOT Modify Without Full Understanding
- ❌ useEffect dependency arrays (causes infinite loops)
- ❌ Default value creation patterns
- ❌ Event propagation stoppers
- ❌ Animation timing (affects perceived performance)

## 📊 Monitoring

### Metrics to Track
- Slideout open/close frequency
- Time to complete workflows
- Error rates during submission
- Animation frame drops

### Alerts to Configure
- API errors during save operations
- Slow slideout animations (>500ms)
- Memory leaks from unclosed slideouts

## 🔗 Related Documentation

- [Quick Sales Slideout Feature](./quick-sales-slideout.md)
- [Booking Creation and Editing](./booking-creation-and-editing.md)
- [Payment Dialog Documentation](./payment-dialog.md)
- [Real-time Notifications](./real-time-merchant-notifications.md)

## 📝 Additional Notes

### Design Philosophy
The slideout architecture prioritizes:
1. **Context Preservation** - Users can reference underlying content
2. **Progressive Disclosure** - Complex workflows broken into steps
3. **Mobile-First** - Full-screen on mobile, panel on desktop
4. **Performance** - Lazy loading and optimistic updates
5. **Accessibility** - Keyboard navigation and focus management

### Future Enhancements
1. **State Persistence** - Save draft state to localStorage
2. **Gesture Support** - Swipe to close on mobile
3. **Virtual Scrolling** - For long service/customer lists
4. **Keyboard Shortcuts** - Quick actions within slideouts
5. **Animation Preferences** - Respect prefers-reduced-motion

### Component Composition Pattern
```typescript
// Recommended pattern for new slideouts
export function NewFeatureSlideOut({ isOpen, onClose, ...props }) {
  // 1. Track previous state for reset logic
  const prevIsOpenRef = useRef(isOpen);
  
  // 2. Create stable defaults
  const [defaultValue] = useState(() => computeDefault());
  
  // 3. Reset only on open transition
  useEffect(() => {
    if (!prevIsOpenRef.current && isOpen) {
      // Reset logic
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);
  
  // 4. Use SlideOutPanel as base
  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title="New Feature"
      className="custom-classes"
    >
      {/* Content */}
    </SlideOutPanel>
  );
}
```

---

**Last Updated**: July 21, 2025  
**Next Review Date**: October 21, 2025