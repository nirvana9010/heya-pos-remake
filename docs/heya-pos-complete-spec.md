# 🎯 HEYA POS - Complete Implementation Specification

## 📋 **PROJECT OVERVIEW**

Heya POS is a comprehensive multi-tenant SaaS business management platform for service-based businesses (spas, salons, wellness centers). This specification covers the complete rebuild using modern technologies.

### **Platform Architecture**
- **Frontend**: 3 Next.js apps (merchant-app, booking-app, admin-dashboard)
- **Backend**: NestJS API with PostgreSQL
- **Multi-tenancy**: Schema-level separation for better isolation
- **Real-time**: WebSockets with 10-second polling fallback
- **Payments**: Stripe integration (Tyro placeholder for MVP)

---

## 🏗️ **MONOREPO STRUCTURE** ✅ Complete

```
heya-pos/
├── apps/
│   ├── merchant-app/      # Staff POS (Next.js) - Port 3001
│   ├── booking-app/       # Customer bookings (Next.js) - Port 3002  
│   ├── admin-dashboard/   # Platform admin (Next.js) - Port 3003
│   └── api/              # NestJS backend - Port 3000
├── packages/
│   ├── ui/               # Shared shadcn/ui components
│   ├── types/            # TypeScript definitions
│   └── utils/            # Shared utilities
├── package.json          # npm workspaces configuration
├── turbo.json           # Turborepo build configuration
└── tsconfig.json        # Root TypeScript config
```

---

## 🔐 **AUTHENTICATION SYSTEM** ✅ Complete

### **Dual Authentication Flow**
1. **Merchant Login**: Shared username/password for business account
2. **Staff PIN**: Individual 4-6 digit PINs for action authorization

### **PIN-Protected Actions**
- Booking cancellations
- Payment refunds
- Modifying past appointments
- Accessing reports
- Managing staff/settings

### **Access Levels**
- **Level 1**: Employee (basic booking, checkout)
- **Level 2**: Manager (reports, staff management)
- **Level 3**: Owner (full access, settings)

---

## 💾 **COMPLETE DATABASE SCHEMA**

### **Multi-tenant & Package Management**
```sql
-- Subscription Packages
Package
- id (uuid) PRIMARY KEY
- name VARCHAR(50) -- Starter/Professional/Enterprise
- monthlyPrice DECIMAL(10,2) -- 99/199/399 AUD
- trialDays INTEGER DEFAULT 30
- maxLocations INTEGER -- 1/2/5
- maxStaff INTEGER -- 3/10/50
- maxCustomers INTEGER -- 500/2000/10000
- features JSON -- Array of enabled features
- createdAt TIMESTAMP
- updatedAt TIMESTAMP

-- Core Business Entity
Merchant
- id UUID PRIMARY KEY
- name VARCHAR(255) NOT NULL
- email VARCHAR(255) UNIQUE NOT NULL
- phone VARCHAR(20)
- abn VARCHAR(11) -- Australian Business Number
- subdomain VARCHAR(50) UNIQUE NOT NULL
- packageId UUID REFERENCES Package(id)
- subscriptionStatus ENUM('trial','active','cancelled','suspended')
- trialEndsAt TIMESTAMP
- stripeCustomerId VARCHAR(255)
- settings JSON -- bookingAdvanceHours, cancellationHours, loyaltyType, loyaltyRate, requirePinForRefunds
- createdAt TIMESTAMP
- updatedAt TIMESTAMP
```

### **Business Operations**
```sql
-- Business Locations
Location
- id UUID PRIMARY KEY
- merchantId UUID REFERENCES Merchant(id) ON DELETE CASCADE
- name VARCHAR(255) NOT NULL
- address TEXT
- city VARCHAR(100)
- state VARCHAR(50)
- postcode VARCHAR(10)
- country VARCHAR(50) DEFAULT 'Australia'
- timezone VARCHAR(50) DEFAULT 'Australia/Sydney'
- currency VARCHAR(3) DEFAULT 'AUD'
- coordinates JSON -- {lat, lng}
- businessHours JSON -- {monday: {open: '09:00', close: '17:00'}, ...}
- settings JSON -- Location-specific settings
- createdAt TIMESTAMP
- updatedAt TIMESTAMP

-- Staff Management
Staff
- id UUID PRIMARY KEY
- merchantId UUID REFERENCES Merchant(id) ON DELETE CASCADE
- locationId UUID REFERENCES Location(id) ON DELETE CASCADE
- email VARCHAR(255) UNIQUE NOT NULL
- firstName VARCHAR(100) NOT NULL
- lastName VARCHAR(100) NOT NULL
- phone VARCHAR(20)
- avatar TEXT -- URL to profile image
- role ENUM('owner','manager','staff')
- permissions JSON -- Granular permissions array
- workingHours JSON -- Weekly schedule
- color VARCHAR(7) -- Hex color for calendar
- pin VARCHAR(255) -- Hashed 4-6 digit PIN
- accessLevel INTEGER CHECK (accessLevel IN (1,2,3))
- isActive BOOLEAN DEFAULT true
- lastLoginAt TIMESTAMP
- createdAt TIMESTAMP
- updatedAt TIMESTAMP

-- Customer Database
Customer
- id UUID PRIMARY KEY
- merchantId UUID REFERENCES Merchant(id) ON DELETE CASCADE
- email VARCHAR(255)
- phone VARCHAR(20)
- firstName VARCHAR(100) NOT NULL
- lastName VARCHAR(100) NOT NULL
- dateOfBirth DATE
- address TEXT
- suburb VARCHAR(100)
- postcode VARCHAR(10)
- notes TEXT
- tags JSON -- Array of customer tags
- loyaltyPoints INTEGER DEFAULT 0
- totalSpent DECIMAL(10,2) DEFAULT 0
- visitCount INTEGER DEFAULT 0
- source ENUM('online','walkin','import') DEFAULT 'online'
- createdAt TIMESTAMP
- updatedAt TIMESTAMP
```

### **Service & Booking Management**
```sql
-- Service Catalog
Service
- id UUID PRIMARY KEY
- merchantId UUID REFERENCES Merchant(id) ON DELETE CASCADE
- name VARCHAR(255) NOT NULL
- description TEXT
- category VARCHAR(100)
- duration INTEGER NOT NULL -- minutes
- price DECIMAL(10,2) NOT NULL
- requiresDeposit BOOLEAN DEFAULT false
- depositAmount DECIMAL(10,2)
- isActive BOOLEAN DEFAULT true
- displayOrder INTEGER DEFAULT 0
- variants JSON -- Service variations/options
- createdAt TIMESTAMP
- updatedAt TIMESTAMP

-- Appointment Booking
Booking
- id UUID PRIMARY KEY
- locationId UUID REFERENCES Location(id) ON DELETE CASCADE
- customerId UUID REFERENCES Customer(id) ON DELETE CASCADE
- staffId UUID REFERENCES Staff(id) ON DELETE SET NULL
- startTime TIMESTAMP NOT NULL
- endTime TIMESTAMP NOT NULL
- totalAmount DECIMAL(10,2) DEFAULT 0
- status ENUM('confirmed','in_progress','completed','cancelled','noshow') DEFAULT 'confirmed'
- notes TEXT -- Customer-visible notes
- internalNotes TEXT -- Staff-only notes
- paymentStatus ENUM('pending','paid','partially_paid','refunded') DEFAULT 'pending'
- source ENUM('online','pos','phone') DEFAULT 'online'
- createdByStaffId UUID REFERENCES Staff(id)
- createdAt TIMESTAMP
- updatedAt TIMESTAMP

-- Booking-Service Junction (Many-to-Many)
ServiceItem
- id UUID PRIMARY KEY
- bookingId UUID REFERENCES Booking(id) ON DELETE CASCADE
- serviceId UUID REFERENCES Service(id) ON DELETE CASCADE
- staffId UUID REFERENCES Staff(id) ON DELETE SET NULL
- price DECIMAL(10,2) NOT NULL
- duration INTEGER NOT NULL -- minutes
- startTime TIMESTAMP NOT NULL
- createdAt TIMESTAMP
```

### **Financial Management**
```sql
-- Invoice Generation
Invoice
- id UUID PRIMARY KEY
- bookingId UUID REFERENCES Booking(id) ON DELETE CASCADE
- merchantId UUID REFERENCES Merchant(id) ON DELETE CASCADE
- customerId UUID REFERENCES Customer(id) ON DELETE CASCADE
- invoiceNumber VARCHAR(50) UNIQUE NOT NULL
- totalAmount DECIMAL(10,2) NOT NULL
- taxAmount DECIMAL(10,2) DEFAULT 0
- status ENUM('pending','paid','partially_paid','refunded','cancelled') DEFAULT 'pending'
- dueDate TIMESTAMP
- stripePaymentIntentId VARCHAR(255)
- createdAt TIMESTAMP
- updatedAt TIMESTAMP

-- Payment Tracking
Payment
- id UUID PRIMARY KEY
- invoiceId UUID REFERENCES Invoice(id) ON DELETE CASCADE
- amount DECIMAL(10,2) NOT NULL
- method ENUM('cash','card_stripe','card_tyro','wallet','voucher')
- stripePaymentIntentId VARCHAR(255)
- tyroTransactionId VARCHAR(255) -- Placeholder for future
- status ENUM('pending','completed','failed','refunded') DEFAULT 'pending'
- fees DECIMAL(10,2) DEFAULT 0
- processedAt TIMESTAMP
- processedByStaffId UUID REFERENCES Staff(id)
- createdAt TIMESTAMP
```

### **Loyalty System**
```sql
-- Loyalty Program Configuration
LoyaltyProgram
- id UUID PRIMARY KEY
- merchantId UUID REFERENCES Merchant(id) ON DELETE CASCADE
- type ENUM('visit','spend') DEFAULT 'visit'
- pointsPerVisit INTEGER DEFAULT 1
- pointsPerDollar DECIMAL(5,2) DEFAULT 0.10
- isActive BOOLEAN DEFAULT true
- minimumSpend DECIMAL(10,2) DEFAULT 0
- expirationDays INTEGER -- NULL = no expiration
- createdAt TIMESTAMP
- updatedAt TIMESTAMP

-- Loyalty Points Tracking
LoyaltyTransaction
- id UUID PRIMARY KEY
- customerId UUID REFERENCES Customer(id) ON DELETE CASCADE
- merchantId UUID REFERENCES Merchant(id) ON DELETE CASCADE
- points INTEGER NOT NULL -- Positive for earned, negative for redeemed
- type ENUM('earned','redeemed','adjusted','expired')
- bookingId UUID REFERENCES Booking(id) ON DELETE SET NULL
- description TEXT
- createdByStaffId UUID REFERENCES Staff(id)
- createdAt TIMESTAMP
```

### **Security & Audit**
```sql
-- Security Audit Trail
AuditLog
- id UUID PRIMARY KEY
- merchantId UUID REFERENCES Merchant(id) ON DELETE CASCADE
- staffId UUID REFERENCES Staff(id) ON DELETE SET NULL
- action VARCHAR(100) NOT NULL -- booking.cancel, payment.refund, etc.
- entityType VARCHAR(50) NOT NULL -- booking, payment, customer, etc.
- entityId UUID NOT NULL
- details JSON -- Action-specific details
- ipAddress INET
- userAgent TEXT
- timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP

-- Database Indexes for Performance
CREATE INDEX idx_merchant_subdomain ON Merchant(subdomain);
CREATE INDEX idx_staff_email ON Staff(email);
CREATE INDEX idx_customer_merchant ON Customer(merchantId);
CREATE INDEX idx_customer_email ON Customer(email);
CREATE INDEX idx_customer_phone ON Customer(phone);
CREATE INDEX idx_booking_start_time ON Booking(startTime);
CREATE INDEX idx_booking_status ON Booking(status);
CREATE INDEX idx_booking_staff_date ON Booking(staffId, startTime);
CREATE INDEX idx_service_merchant ON Service(merchantId);
CREATE INDEX idx_invoice_merchant ON Invoice(merchantId);
CREATE INDEX idx_payment_invoice ON Payment(invoiceId);
```

---

## 🎨 **COMPLETE DESIGN SYSTEM**

### **Color Palette**
```css
:root {
  /* Primary Brand Colors */
  --primary: #0066CC;        /* Professional blue */
  --primary-foreground: #FFFFFF;
  
  /* Secondary Colors */
  --secondary: #F7F7F7;      /* Light gray */
  --secondary-foreground: #1F2937;
  
  /* Accent Colors */
  --accent: #00D4AA;         /* Teal for CTAs */
  --accent-foreground: #FFFFFF;
  
  /* Status Colors */
  --destructive: #DC2626;    /* Red for errors/delete */
  --destructive-foreground: #FFFFFF;
  --success: #16A34A;        /* Green for success */
  --success-foreground: #FFFFFF;
  --warning: #D97706;        /* Orange for warnings */
  --warning-foreground: #FFFFFF;
  
  /* Neutral Colors */
  --muted: #6B7280;          /* Muted gray text */
  --muted-foreground: #374151;
  --border: #E5E7EB;         /* Subtle borders */
  --background: #FFFFFF;     /* Page background */
  --foreground: #111827;     /* Primary text */
  
  /* Calendar Status Colors */
  --available: #FFFFFF;      /* Available slots */
  --booked: #0066CC;         /* Booked appointments */
  --in-progress: #16A34A;    /* Currently happening */
  --completed: #6B7280;      /* Finished appointments */
  --cancelled: #DC2626;      /* Cancelled/no-show */
}

/* Dark Mode Support */
[data-theme="dark"] {
  --background: #111827;
  --foreground: #F9FAFB;
  --secondary: #374151;
  --border: #4B5563;
  /* ... other dark mode overrides */
}
```

### **Typography System**
```css
/* Font Configuration */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
}

/* Typography Scale */
.text-xs { font-size: 0.75rem; line-height: 1rem; }     /* 12px */
.text-sm { font-size: 0.875rem; line-height: 1.25rem; } /* 14px */
.text-base { font-size: 1rem; line-height: 1.5rem; }    /* 16px */
.text-lg { font-size: 1.125rem; line-height: 1.75rem; } /* 18px */
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }  /* 20px */
.text-2xl { font-size: 1.5rem; line-height: 2rem; }     /* 24px */
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; } /* 30px */
```

### **Component Design Patterns**

#### **Button Variants**
```tsx
// Button Component Specifications
<Button variant="default">     {/* Blue #0066CC with white text */}
<Button variant="secondary">   {/* Gray #F7F7F7 with dark text */}
<Button variant="destructive"> {/* Red #DC2626 with white text */}
<Button variant="outline">     {/* Transparent with border */}
<Button variant="ghost">       {/* Transparent, no border */}
<Button variant="link">        {/* Text-only, underlined */}

// Size Options
<Button size="sm">   {/* Small: px-3 py-1.5 text-sm */}
<Button size="default"> {/* Default: px-4 py-2 text-base */}
<Button size="lg">   {/* Large: px-6 py-3 text-lg */}
<Button size="icon"> {/* Square: p-2 */}
```

#### **Card Hover Effects**
```css
.card {
  transition: all 200ms ease-in-out;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--background);
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: var(--primary);
}

.card-interactive {
  cursor: pointer;
}

.card-interactive:active {
  transform: translateY(0);
  transition: transform 100ms;
}
```

#### **Form Input States**
```css
/* Floating Label Animation */
.input-group {
  position: relative;
}

.input-floating {
  padding: 12px 16px 8px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 200ms;
}

.input-floating:focus {
  border-color: var(--primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.floating-label {
  position: absolute;
  left: 16px;
  top: 12px;
  color: var(--muted);
  transition: all 200ms;
  pointer-events: none;
}

.input-floating:focus + .floating-label,
.input-floating:not(:placeholder-shown) + .floating-label {
  top: 4px;
  font-size: 12px;
  color: var(--primary);
}
```

#### **Loading States**
```css
/* Skeleton Loading Animation */
@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-text {
  height: 1rem;
  margin-bottom: 0.5rem;
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.skeleton-button {
  height: 2.5rem;
  width: 100px;
}
```

---

## 📱 **APP LAYOUTS & COMPONENTS**

### **Merchant App (POS) - Complete Layout**
```tsx
// Main POS Layout Structure
<div className="flex h-screen bg-gray-50">
  {/* Left Sidebar - Collapsible */}
  <Sidebar className="w-64 bg-white border-r">
    <SidebarHeader>
      <BusinessLogo />
      <LocationSelector />
    </SidebarHeader>
    
    <SidebarNavigation>
      <NavItem href="/dashboard" icon={<LayoutDashboard />}>Dashboard</NavItem>
      <NavItem href="/calendar" icon={<Calendar />}>Calendar</NavItem>
      <NavItem href="/customers" icon={<Users />}>Customers</NavItem>
      <NavItem href="/services" icon={<Scissors />}>Services</NavItem>
      <NavItem href="/reports" icon={<BarChart3 />}>Reports</NavItem>
      <NavItem href="/settings" icon={<Settings />}>Settings</NavItem>
    </SidebarNavigation>
    
    <SidebarFooter>
      <StaffStatusIndicator />
      <CollapseToggle />
    </SidebarFooter>
  </Sidebar>
  
  {/* Main Content Area */}
  <div className="flex-1 flex flex-col">
    {/* Top Navigation Bar */}
    <TopBar className="h-16 bg-white border-b flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Breadcrumbs />
        <LiveClock />
      </div>
      
      <div className="flex items-center gap-4">
        <SearchCommand trigger={<Search className="w-5 h-5" />} />
        <NotificationCenter />
        <UserMenu />
      </div>
    </TopBar>
    
    {/* Content Area with Right Panel */}
    <main className="flex-1 flex">
      {/* Primary Content */}
      <div className="flex-1 p-6">
        <Outlet /> {/* Router content */}
      </div>
      
      {/* Right Panel - Contextual */}
      <RightPanel className="w-80 bg-white border-l">
        <PanelContent />
      </RightPanel>
    </main>
  </div>
</div>
```

### **Booking Calendar Component - Detailed Specification**
```tsx
// Calendar Component Features
interface BookingCalendarProps {
  view: 'week' | 'day';
  selectedDate: Date;
  staff: Staff[];
  bookings: Booking[];
  onBookingSelect: (booking: Booking) => void;
  onTimeSlotClick: (staffId: string, startTime: Date) => void;
  onBookingDrop: (bookingId: string, newStartTime: Date, newStaffId: string) => void;
}

// Calendar Layout Specification
<BookingCalendar>
  {/* Header with controls */}
  <CalendarHeader>
    <ViewToggle /> {/* Week/Day switcher */}
    <DateNavigation />
    <TodayButton />
    <AddBookingButton />
  </CalendarHeader>
  
  {/* Time column + Staff columns */}
  <CalendarGrid className="grid" style={{
    gridTemplateColumns: '80px repeat(auto-fit, minmax(200px, 1fr))',
    gridTemplateRows: 'auto repeat(48, 30px)' /* 15-min intervals */
  }}>
    {/* Time Labels */}
    <TimeColumn>
      {timeSlots.map(time => (
        <TimeSlot key={time}>{formatTime(time)}</TimeSlot>
      ))}
    </TimeColumn>
    
    {/* Staff Columns */}
    {staff.map(member => (
      <StaffColumn key={member.id} staff={member}>
        <StaffHeader color={member.color}>
          {member.firstName} {member.lastName}
        </StaffHeader>
        
        {/* Booking blocks */}
        <DndContext onDragEnd={handleBookingDrop}>
          {getBookingsForStaff(member.id).map(booking => (
            <BookingBlock
              key={booking.id}
              booking={booking}
              draggable
              style={{
                gridRow: `${getGridRow(booking.startTime)} / ${getGridRow(booking.endTime)}`,
                backgroundColor: getStatusColor(booking.status)
              }}
              onClick={() => onBookingSelect(booking)}
            >
              <BookingDetails booking={booking} />
            </BookingBlock>
          ))}
          
          {/* Available time slots */}
          {getAvailableSlots(member.id).map(slot => (
            <AvailableSlot
              key={slot.time}
              onClick={() => onTimeSlotClick(member.id, slot.time)}
              className="hover:bg-blue-50 cursor-pointer"
            />
          ))}
        </DndContext>
      </StaffColumn>
    ))}
  </CalendarGrid>
</BookingCalendar>

// Color Coding System
const statusColors = {
  available: '#FFFFFF',      // White background
  confirmed: '#0066CC',      // Primary blue
  'in-progress': '#16A34A',  // Green
  completed: '#6B7280',      // Gray
  cancelled: '#DC2626',      // Red
  noshow: '#DC2626'          // Red
};
```

### **POS Checkout Flow - Complete Specification**
```tsx
// Multi-step Checkout Process
<CheckoutFlow>
  {/* Step 1: Service Selection */}
  <ServiceSelection>
    <ServiceSearch />
    <ServiceGrid>
      {services.map(service => (
        <ServiceCard
          key={service.id}
          service={service}
          onSelect={addToCart}
          showDuration
          showPrice
        />
      ))}
    </ServiceGrid>
  </ServiceSelection>
  
  {/* Step 2: Cart Management */}
  <CartSummary>
    <LineItemList>
      {cartItems.map(item => (
        <LineItem key={item.id}>
          <ServiceDetails service={item.service} />
          <StaffSelector staffId={item.staffId} />
          <DurationDisplay duration={item.duration} />
          <PriceDisplay price={item.price} />
          <QuantitySelector quantity={item.quantity} />
          <RemoveButton onClick={() => removeFromCart(item.id)} />
        </LineItem>
      ))}
    </LineItemList>
    
    <DiscountSection>
      <PromoCodeInput />
      <AutoDiscountDisplay />
      <LoyaltyPointsRedemption />
    </DiscountSection>
    
    <TotalSummary>
      <Subtotal />
      <DiscountAmount />
      <TaxAmount />
      <FinalTotal />
    </TotalSummary>
  </CartSummary>
  
  {/* Step 3: Payment Processing */}
  <PaymentMethods>
    <PaymentTabs>
      <TabContent value="card">
        <StripeElements>
          <CardElement />
          <PaymentButton />
        </StripeElements>
      </TabContent>
      
      <TabContent value="cash">
        <CashPayment>
          <AmountDue />
          <AmountReceived />
          <ChangeCalculation />
          <ConfirmCashButton />
        </CashPayment>
      </TabContent>
      
      <TabContent value="split">
        <SplitPayment>
          <PaymentMethodList />
          <AddPaymentMethodButton />
          <RemainingBalance />
        </SplitPayment>
      </TabContent>
    </PaymentTabs>
  </PaymentMethods>
  
  {/* Step 4: Receipt & Completion */}
  <ReceiptGeneration>
    <ReceiptPreview />
    <DeliveryOptions>
      <EmailReceipt />
      <SMSReceipt />
      <PrintReceipt />
      <NoReceiptOption />
    </DeliveryOptions>
    <CompleteSaleButton />
  </ReceiptGeneration>
</CheckoutFlow>
```

### **Customer Booking App Layout**
```tsx
// Customer-Facing Booking Experience
<BookingAppLayout>
  {/* Header */}
  <Header className="bg-white shadow-sm">
    <Container>
      <BusinessBranding>
        <BusinessLogo />
        <BusinessName />
        <ContactInfo />
      </BusinessBranding>
      
      <NavigationMenu>
        <NavLink href="/services">Services</NavLink>
        <NavLink href="/about">About</NavLink>
        <NavLink href="/contact">Contact</NavLink>
        <BookNowButton />
      </NavigationMenu>
    </Container>
  </Header>
  
  {/* Hero Section */}
  <HeroSection className="bg-gradient-to-r from-primary to-accent">
    <Container>
      <HeroContent>
        <Headline>Professional Beauty Services</Headline>
        <Subheadline>Experience luxury treatments in a relaxing environment</Subheadline>
        <CTAButton size="lg">Book Your Appointment</CTAButton>
      </HeroContent>
      <HeroImage />
    </Container>
  </HeroSection>
  
  {/* Service Showcase */}
  <ServicesSection className="py-16">
    <Container>
      <SectionHeader>
        <SectionTitle>Our Services</SectionTitle>
        <SectionSubtitle>Choose from our range of professional treatments</SectionSubtitle>
      </SectionHeader>
      
      <ServiceFilters>
        <CategoryFilter />
        <PriceRangeFilter />
        <DurationFilter />
      </ServiceFilters>
      
      <ServiceGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(service => (
          <ServiceCard key={service.id}>
            <ServiceImage src={service.image} />
            <ServiceInfo>
              <ServiceName>{service.name}</ServiceName>
              <ServiceDescription>{service.description}</ServiceDescription>
              <ServiceMeta>
                <Duration>{service.duration} min</Duration>
                <Price>${service.price}</Price>
              </ServiceMeta>
              <BookServiceButton service={service} />
            </ServiceInfo>
          </ServiceCard>
        ))}
      </ServiceGrid>
    </Container>
  </ServicesSection>
  
  {/* Booking Flow Modal/Page */}
  <BookingFlowContainer>
    <ProgressIndicator steps={6} currentStep={currentStep} />
    
    <BookingSteps>
      {/* Step 1: Service Selection */}
      <StepContent step={1}>
        <SelectedServices />
        <AdditionalServices />
        <ContinueButton />
      </StepContent>
      
      {/* Step 2: Staff Selection */}
      <StepContent step={2}>
        <StaffGrid>
          {availableStaff.map(staff => (
            <StaffCard key={staff.id}>
              <StaffPhoto src={staff.avatar} />
              <StaffName>{staff.firstName}</StaffName>
              <StaffSpecialties />
              <SelectStaffButton />
            </StaffCard>
          ))}
        </StaffGrid>
        <AnyStaffOption />
      </StepContent>
      
      {/* Step 3: Date & Time Selection */}
      <StepContent step={3}>
        <DatePicker />
        <TimeSlotGrid>
          {availableSlots.map(slot => (
            <TimeSlotButton
              key={slot.time}
              available={slot.available}
              time={slot.time}
              onClick={() => selectTimeSlot(slot)}
            />
          ))}
        </TimeSlotGrid>
      </StepContent>
      
      {/* Step 4: Customer Details */}
      <StepContent step={4}>
        <CustomerForm>
          <FormField name="firstName" label="First Name" required />
          <FormField name="lastName" label="Last Name" required />
          <FormField name="email" label="Email" type="email" required />
          <FormField name="phone" label="Phone" type="tel" required />
          <FormField name="notes" label="Special Requests" multiline />
        </CustomerForm>
      </StepContent>
      
      {/* Step 5: Payment */}
      <StepContent step={5}>
        <BookingSummary />
        <PaymentOptions>
          <PayNowOption />
          <PayLaterOption />
          <DepositOption />
        </PaymentOptions>
        <StripePaymentForm />
      </StepContent>
      
      {/* Step 6: Confirmation */}
      <StepContent step={6}>
        <SuccessAnimation />
        <BookingConfirmation />
        <CalendarLinks />
        <WhatsNextInfo />
      </StepContent>
    </BookingSteps>
  </BookingFlowContainer>
  
  {/* Footer */}
  <Footer>
    <Container>
      <FooterContent>
        <BusinessInfo />
        <QuickLinks />
        <SocialMedia />
        <Copyright />
      </FooterContent>
    </Container>
  </Footer>
</BookingAppLayout>
```

### **Admin Dashboard Layout**
```tsx
// Platform Administration Interface
<AdminDashboardLayout>
  {/* Top Navigation */}
  <TopNavigation className="h-16 bg-white border-b">
    <Container fluid>
      <PlatformBranding>
        <Logo />
        <PlatformName>Heya POS Admin</PlatformName>
      </PlatformBranding>
      
      <GlobalSearch>
        <SearchInput placeholder="Search merchants, bookings, customers..." />
        <SearchResults />
      </GlobalSearch>
      
      <AdminActions>
        <NotificationCenter />
        <SupportTickets />
        <AdminProfile />
      </AdminActions>
    </Container>
  </TopNavigation>
  
  {/* Sidebar */}
  <div className="flex h-full">
    <AdminSidebar className="w-64 bg-gray-900 text-white">
      <SidebarContent>
        <NavSection title="Dashboard">
          <NavItem href="/admin" icon={<LayoutDashboard />}>Overview</NavItem>
          <NavItem href="/admin/analytics" icon={<BarChart3 />}>Analytics</NavItem>
        </NavSection>
        
        <NavSection title="Merchants">
          <NavItem href="/admin/merchants" icon={<Building2 />}>All Merchants</NavItem>
          <NavItem href="/admin/merchants/pending" icon={<Clock />}>Pending Approval</NavItem>
          <NavItem href="/admin/merchants/new" icon={<Plus />}>Add Merchant</NavItem>
        </NavSection>
        
        <NavSection title="Subscriptions">
          <NavItem href="/admin/packages" icon={<Package />}>Packages</NavItem>
          <NavItem href="/admin/billing" icon={<CreditCard />}>Billing</NavItem>
          <NavItem href="/admin/trials" icon={<Timer />}>Trials</NavItem>
        </NavSection>
        
        <NavSection title="Platform">
          <NavItem href="/admin/settings" icon={<Settings />}>Settings</NavItem>
          <NavItem href="/admin/support" icon={<HelpCircle />}>Support</NavItem>
          <NavItem href="/admin/logs" icon={<FileText />}>System Logs</NavItem>
        </NavSection>
      </SidebarContent>
    </AdminSidebar>
    
    {/* Main Content */}
    <main className="flex-1 bg-gray-50">
      <ContentHeader>
        <Breadcrumbs />
        <PageActions />
      </ContentHeader>
      
      <ContentArea className="p-6">
        <Outlet />
      </ContentArea>
    </main>
  </div>
</AdminDashboardLayout>
```

---

## 🧩 **SHARED COMPONENT LIBRARY**

### **Core shadcn/ui Components Required**
```bash
# Essential Components to Install
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add command
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add tooltip
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add form
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add radio-group
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add textarea
```

### **Custom Components Specification**

#### **DataTable Component**
```tsx
// Advanced Data Table with @tanstack/react-table
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  selectable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  onRowSelect?: (rows: T[]) => void;
  actions?: {
    create?: () => void;
    edit?: (row: T) => void;
    delete?: (rows: T[]) => void;
    export?: () => void;
  };
}

<DataTable
  data={customers}
  columns={customerColumns}
  searchable
  filterable
  selectable
  pagination
  pageSize={25}
  actions={{
    create: () => openCreateModal(),
    edit: (customer) => openEditModal(customer),
    delete: (customers) => confirmBulkDelete(customers),
    export: () => exportToCSV()
  }}
/>

// Features Include:
- Global search across all columns
- Column-specific filters
- Multi-column sorting
- Row selection (single/multi)
- Pagination with size options
- Bulk actions toolbar
- Loading states
- Empty states
- Export functionality
- Responsive design
```

#### **Time Slot Picker**
```tsx
// Custom Time Selection Component
interface TimeSlotPickerProps {
  availableSlots: TimeSlot[];
  selectedSlot?: TimeSlot;
  onSlotSelect: (slot: TimeSlot) => void;
  timeFormat?: '12h' | '24h';
  interval?: 15 | 30 | 60; // minutes
  workingHours?: { start: string; end: string };
}

<TimeSlotPicker
  availableSlots={slots}
  selectedSlot={selectedTime}
  onSlotSelect={handleTimeSelect}
  timeFormat="12h"
  interval={15}
  workingHours={{ start: '09:00', end: '17:00' }}
/>

// Visual Design:
- Grid layout for time slots
- Available slots: white background, blue border on hover
- Booked slots: gray background, disabled
- Selected slot: blue background, white text
- Touch-friendly sizing for mobile
```

#### **Payment Form Component**
```tsx
// Stripe Integration Component
interface PaymentFormProps {
  amount: number;
  currency?: string;
  onSuccess: (paymentIntent: PaymentIntent) => void;
  onError: (error: string) => void;
  customerEmail?: string;
  savePaymentMethod?: boolean;
}

<PaymentForm
  amount={totalAmount}
  currency="AUD"
  onSuccess={handlePaymentSuccess}
  onError={handlePaymentError}
  customerEmail={customer.email}
  savePaymentMethod={true}
/>

// Features:
- Stripe Elements integration
- Card validation
- Error handling
- Loading states
- Success animations
- Saved payment methods
- Apple Pay / Google Pay support
```

#### **Search Command Palette**
```tsx
// Global Search Interface (cmd+k)
interface SearchCommandProps {
  placeholder?: string;
  trigger?: React.ReactNode;
  onNavigate?: (href: string) => void;
}

<SearchCommand
  placeholder="Search customers, bookings, services..."
  trigger={<Search className="w-5 h-5" />}
  onNavigate={(href) => router.push(href)}
/>

// Search Categories:
- Customers (name, email, phone)
- Bookings (appointment details)
- Services (name, category)
- Navigation (quick page access)
- Actions (create booking, add customer)
```

#### **Stat Card Component**
```tsx
// Dashboard Metrics Display
interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  icon?: React.ReactNode;
  trend?: Array<{ date: string; value: number }>;
}

<StatCard
  title="Total Revenue"
  value="$12,450"
  change={{ value: 12.5, type: 'increase', period: 'vs last month' }}
  icon={<DollarSign className="w-5 h-5" />}
  trend={monthlyRevenue}
/>
```

#### **Empty State Component**
```tsx
// Helpful Empty States
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  illustration?: string;
}

<EmptyState
  icon={<Users className="w-12 h-12" />}
  title="No customers yet"
  description="Start building your customer base by adding your first customer or taking a walk-in appointment."
  action={{
    label: "Add Customer",
    onClick: () => openCreateCustomerModal()
  }}
/>
```

---

## ⚡ **REAL-TIME FEATURES**

### **WebSocket Implementation**
```typescript
// Real-time Update System
interface WebSocketConfig {
  endpoint: string;
  merchantId: string;
  locationId?: string;
  events: {
    booking_created: (booking: Booking) => void;
    booking_updated: (booking: Booking) => void;
    booking_cancelled: (bookingId: string) => void;
    payment_completed: (payment: Payment) => void;
    staff_status_changed: (staff: Staff) => void;
  };
}

// Implementation Strategy:
1. Primary: WebSocket connection
2. Fallback: Server-Sent Events (SSE)
3. Fallback: Long polling
4. Fallback: 10-second interval polling

// Events to Handle:
- Calendar updates (bookings, cancellations)
- Payment status changes
- Staff availability changes
- Customer check-ins
- Real-time notifications
```

### **Calendar Real-time Updates**
```typescript
// Live Calendar Refresh (10-second specification)
const useRealtimeCalendar = (locationId: string, dateRange: DateRange) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>();
  
  useEffect(() => {
    // WebSocket connection
    const ws = new WebSocket(`/ws/calendar/${locationId}`);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      
      switch (update.type) {
        case 'booking_created':
          setBookings(prev => [...prev, update.booking]);
          break;
        case 'booking_updated':
          setBookings(prev => 
            prev.map(b => b.id === update.booking.id ? update.booking : b)
          );
          break;
        case 'booking_cancelled':
          setBookings(prev => 
            prev.filter(b => b.id !== update.bookingId)
          );
          break;
      }
      
      setLastUpdate(new Date());
    };
    
    // Fallback polling every 10 seconds
    const fallback = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        fetchLatestBookings();
      }
    }, 10000);
    
    return () => {
      ws.close();
      clearInterval(fallback);
    };
  }, [locationId, dateRange]);
  
  return { bookings, lastUpdate };
};
```

---

## 💳 **PAYMENT INTEGRATION**

### **Stripe Configuration**
```typescript
// Complete Stripe Setup
const stripeConfig = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  currency: 'AUD',
  features: {
    paymentMethods: ['card', 'apple_pay', 'google_pay'],
    savePaymentMethods: true,
    subscriptionBilling: true,
    invoicing: true,
    refunds: true
  }
};

// Payment Intent Creation
const createPaymentIntent = async (booking: Booking) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(booking.totalAmount * 100), // Convert to cents
    currency: 'aud',
    customer: booking.customer.stripeCustomerId,
    metadata: {
      bookingId: booking.id,
      merchantId: booking.merchantId,
      locationId: booking.locationId
    },
    automatic_payment_methods: {
      enabled: true
    }
  });
  
  return paymentIntent;
};
```

### **Cash Payment Handling**
```tsx
// Cash Payment Component
<CashPayment>
  <AmountDue className="text-2xl font-bold">
    ${totalAmount.toFixed(2)}
  </AmountDue>
  
  <AmountReceivedInput
    value={amountReceived}
    onChange={setAmountReceived}
    onFocus={() => setAmountReceived('')}
    autoFocus
    className="text-xl text-center"
  />
  
  <ChangeCalculation className={
    change >= 0 ? 'text-green-600' : 'text-red-600'
  }>
    Change: ${Math.max(0, change).toFixed(2)}
  </ChangeCalculation>
  
  <QuickAmountButtons>
    {[5, 10, 20, 50, 100].map(amount => (
      <Button
        key={amount}
        variant="outline"
        onClick={() => setAmountReceived(amount)}
      >
        ${amount}
      </Button>
    ))}
    <Button
      variant="outline"
      onClick={() => setAmountReceived(totalAmount)}
    >
      Exact
    </Button>
  </QuickAmountButtons>
  
  <ProcessCashButton
    disabled={amountReceived < totalAmount}
    onClick={processCashPayment}
  >
    Complete Sale
  </ProcessCashButton>
</CashPayment>
```

---

## 📊 **DATA MIGRATION & IMPORT**

### **Hamilton Beauty Migration Data**
```typescript
// Migration Structure
const migrationData = {
  merchantId: '178',
  businessName: 'Hamilton Beauty Services',
  services: {
    count: 54,
    categories: [
      'Waxing', 'Biab/Builder Gel', 'Spa Pedicure & Manicure',
      'Express Service', 'Sns Dipping Powder', 'Tinting', 'Acrylic Nails'
    ]
  },
  customers: {
    count: 91,
    activeCustomers: 4, // With actual visits
    loyaltyPoints: 'Visit-based system'
  }
};

// CSV Import Components
<CSVImporter>
  <FileUpload
    accept=".csv"
    onFileSelect={handleFileSelect}
    maxSize="5MB"
  />
  
  <DataPreview>
    <ColumnMapping />
    <ValidationResults />
    <ImportSummary />
  </DataPreview>
  
  <ImportProgress>
    <ProgressBar />
    <StatusMessages />
    <ErrorReporting />
  </ImportProgress>
  
  <ImportResults>
    <SuccessCount />
    <ErrorCount />
    <SkippedCount />
    <RetryOptions />
  </ImportResults>
</CSVImporter>
```

---

## 🚀 **IMPLEMENTATION PHASES**

### **Phase 1: Foundation** ✅ COMPLETE
- [x] Monorepo structure setup
- [x] Authentication system (merchant login + staff PINs)
- [x] Basic project configuration

### **Phase 2: Database & UI Foundation** 🎯 NEXT
```bash
# Complete database schema setup
claude implement the complete Prisma database schema with all models, relationships, and indexes as specified. Include seed data for Hamilton Beauty (merchant ID 178) and set up database migrations.

# Shared UI package setup  
claude set up the shared UI package with shadcn/ui components, custom components (DataTable, BookingCalendar, TimeSlotPicker, PaymentForm, SearchCommand, StatCard, EmptyState), and configure the design system with the specified color palette and typography.

# App layout implementation
claude create the complete layouts for all three apps - merchant app with sidebar navigation and top bar, booking app with customer-facing design, and admin dashboard with platform management interface.
```

### **Phase 3: Booking System**
```bash
# Service catalog and management
claude implement the service catalog system with category management, pricing, duration settings, and CSV import functionality for the Hamilton Beauty services data.

# Customer management system
claude create the customer database with search functionality, profile management, loyalty points tracking, and CSV import for customer data.

# Booking calendar with real-time updates
claude build the booking calendar component with week/day views, drag-and-drop functionality, real-time WebSocket updates, and availability checking logic.
```

### **Phase 4: POS & Payments**
```bash
# POS checkout system
claude implement the complete checkout flow with service selection, cart management, discount calculations, and multi-payment method support.

# Stripe payment integration
claude integrate Stripe payments with card processing, payment intents, webhook handling, and subscription billing for merchant accounts.

# Invoice and receipt system
claude create invoice generation, receipt printing, email/SMS delivery, and payment tracking functionality.
```

### **Phase 5: Advanced Features**
```bash
# Loyalty program system
claude implement the loyalty program with points earning (visit/spend based), redemption, tier management, and automated notifications.

# Reporting and analytics
claude create business intelligence dashboards with sales reports, customer analytics, staff performance metrics, and export functionality.

# Automated communications
claude set up email/SMS automation for booking confirmations, reminders, follow-ups, and marketing campaigns.
```

---

## 🔧 **TECHNICAL STACK SUMMARY**

### **Frontend Technologies**
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom design tokens
- **Components**: shadcn/ui + custom component library
- **State Management**: Zustand or Redux Toolkit
- **Forms**: React Hook Form with Zod validation
- **Real-time**: Socket.io client
- **Animations**: Framer Motion
- **Date/Time**: date-fns or dayjs
- **Tables**: @tanstack/react-table
- **Drag & Drop**: @dnd-kit
- **Charts**: Recharts
- **Icons**: Lucide React

### **Backend Technologies**
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **Real-time**: Socket.io server
- **Payments**: Stripe SDK
- **Email**: SendGrid or AWS SES
- **SMS**: Twilio
- **File Storage**: AWS S3 or similar
- **Caching**: Redis
- **Background Jobs**: Bull Queue

### **Infrastructure & DevOps**
- **Monorepo**: Turborepo with npm workspaces
- **Database**: PostgreSQL 15+
- **Container**: Docker with multi-stage builds
- **Deployment**: AWS ECS/EKS or similar
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry for error tracking
- **Analytics**: Custom dashboard + Google Analytics

---

## 📝 **NEXT STEPS FOR CLAUDE CODE**

### **Immediate Priority (Phase 2)**
1. **Database Schema**: Implement complete Prisma schema with all models and relationships
2. **Shared UI**: Set up component library with shadcn/ui and custom components
3. **App Layouts**: Create navigation and layout structure for all three apps
4. **Design System**: Configure Tailwind with custom colors and typography

### **Success Criteria**
- All database models created with proper relationships
- Shared component library working across all apps
- Navigation and basic layouts functional
- Design system tokens configured
- Ready for service catalog and booking calendar implementation

The specification is now complete and ready for Claude Code to execute Phase 2 of the implementation!