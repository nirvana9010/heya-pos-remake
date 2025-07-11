'use client';

import React from 'react';
import { cn } from '@heya-pos/ui';
import { Clock, Check } from 'lucide-react';

// Mock booking data
const mockBooking = {
  id: '1',
  customerName: 'Sarah Johnson',
  serviceName: 'Hair Cut & Style',
  time: '10:30',
  duration: 60,
  isPaid: false,
};

const mockBookingPaid = {
  ...mockBooking,
  id: '2',
  isPaid: true,
};

const staffColor = '#0F766E'; // Teal color

export default function SamplerPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">PENDING Booking Visual Options</h1>
      <p className="text-gray-600 mb-8">Compare different visual approaches for displaying PENDING bookings</p>

      <div className="space-y-12">
        {/* Option 1: Subtle Overlay with Badge */}
        <DesignOption
          title="Option 1: Subtle Overlay with Badge"
          description="Keep staff color with semi-transparent white overlay, badge aligned with PAID"
        >
          <BookingCard confirmed color={staffColor} />
          <BookingCard 
            pending 
            color={staffColor}
            style={{
              backgroundColor: `${staffColor}CC`, // 80% opacity
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3))',
              backgroundBlendMode: 'overlay',
              borderLeft: `4px dashed ${staffColor}`,
            }}
            badgePosition="bottom"
          />
          <BookingCard 
            pending 
            paid
            color={staffColor}
            style={{
              backgroundColor: `${staffColor}CC`,
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3))',
              backgroundBlendMode: 'overlay',
              borderLeft: `4px dashed ${staffColor}`,
            }}
            badgePosition="bottom"
          />
        </DesignOption>

        {/* Option 2: Desaturated with Indicator */}
        <DesignOption
          title="Option 2: Desaturated with Indicator"
          description="Muted staff color with yellow dot indicator and aligned badges"
        >
          <BookingCard confirmed color={staffColor} />
          <BookingCard 
            pending 
            color={desaturateColor(staffColor)}
            style={{
              borderLeft: `4px dashed ${desaturateColor(staffColor)}`,
            }}
            showDot
            badgePosition="bottom"
          />
          <BookingCard 
            pending 
            paid
            color={desaturateColor(staffColor)}
            style={{
              borderLeft: `4px dashed ${desaturateColor(staffColor)}`,
            }}
            showDot
            badgePosition="bottom"
          />
        </DesignOption>

        {/* Option 3: Outline Style */}
        <DesignOption
          title="Option 3: Outline Style"
          description="Transparent background with staff color as border"
        >
          <BookingCard confirmed color={staffColor} />
          <BookingCard 
            pending 
            color="#F5F5F5"
            textColor="text-gray-800"
            style={{
              backgroundColor: '#FAFAFA',
              border: `3px dashed ${staffColor}`,
              borderLeft: `6px dashed ${staffColor}`,
            }}
            badgePosition="bottom"
          />
          <BookingCard 
            pending 
            paid
            color="#F5F5F5"
            textColor="text-gray-800"
            style={{
              backgroundColor: '#FAFAFA',
              border: `3px dashed ${staffColor}`,
              borderLeft: `6px dashed ${staffColor}`,
            }}
            badgePosition="bottom"
          />
        </DesignOption>

        {/* Option 4: Status Strip */}
        <DesignOption
          title="Option 4: Status Strip"
          description="Normal appearance with yellow status strip on top"
        >
          <BookingCard confirmed color={staffColor} />
          <BookingCard 
            pending 
            color={staffColor}
            showStrip
          />
          <BookingCard 
            pending 
            paid
            color={staffColor}
            showStrip
          />
        </DesignOption>

        {/* Option 5: Icon + Badge Approach */}
        <DesignOption
          title="Option 5: Icon + Badge Approach"
          description="Staff color at reduced opacity with clock icon"
        >
          <BookingCard confirmed color={staffColor} />
          <BookingCard 
            pending 
            color={staffColor}
            style={{
              opacity: 0.85,
              borderLeft: `4px dotted ${staffColor}`,
            }}
            showClockIcon
            badgePosition="inline"
          />
          <BookingCard 
            pending 
            paid
            color={staffColor}
            style={{
              opacity: 0.85,
              borderLeft: `4px dotted ${staffColor}`,
            }}
            showClockIcon
            badgePosition="inline"
          />
        </DesignOption>
      </div>
    </div>
  );
}

function DesignOption({ 
  title, 
  description, 
  children 
}: { 
  title: string; 
  description: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg p-6 bg-gray-50">
      <h2 className="text-xl font-semibold mb-1">{title}</h2>
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-gray-500 mb-2">Confirmed</p>
          {React.Children.toArray(children)[0]}
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-2">Pending</p>
          {React.Children.toArray(children)[1]}
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-2">Pending + Paid</p>
          {React.Children.toArray(children)[2]}
        </div>
      </div>
    </div>
  );
}

function BookingCard({ 
  confirmed = false,
  pending = false,
  paid = false,
  color,
  textColor = 'text-white',
  style = {},
  showDot = false,
  showStrip = false,
  showClockIcon = false,
  badgePosition = 'none'
}: {
  confirmed?: boolean;
  pending?: boolean;
  paid?: boolean;
  color: string;
  textColor?: string;
  style?: React.CSSProperties;
  showDot?: boolean;
  showStrip?: boolean;
  showClockIcon?: boolean;
  badgePosition?: 'bottom' | 'inline' | 'none';
}) {
  return (
    <div 
      className={cn(
        "rounded-lg p-4 relative overflow-hidden h-32",
        textColor
      )}
      style={{
        backgroundColor: color,
        borderLeft: `4px solid ${color}`,
        ...style
      }}
    >
      {/* Status Strip */}
      {showStrip && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-white text-xs font-bold py-1 px-3">
          PENDING CONFIRMATION
        </div>
      )}

      {/* Yellow Dot Indicator */}
      {showDot && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
      )}

      {/* Clock Icon */}
      {showClockIcon && (
        <Clock className="absolute top-2 right-2 w-5 h-5 text-yellow-500" />
      )}

      {/* Content */}
      <div className={showStrip ? 'mt-6' : ''}>
        <div className="text-sm opacity-75">
          {mockBooking.time} • {mockBooking.duration}m
        </div>
        <div className="font-bold text-lg mt-1">
          {mockBooking.customerName}
        </div>
        <div className="text-sm mt-1 opacity-90">
          {mockBooking.serviceName}
        </div>
      </div>

      {/* Badges */}
      {badgePosition === 'bottom' && (
        <div className="absolute bottom-3 right-3 flex gap-2">
          {pending && (
            <div className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded">
              PENDING
            </div>
          )}
          {paid && (
            <div className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
              PAID
            </div>
          )}
        </div>
      )}

      {badgePosition === 'inline' && (
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {paid && (
            <div className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
              PAID
            </div>
          )}
          {pending && (
            <div className="bg-white/20 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded border border-white/30">
              PENDING
            </div>
          )}
        </div>
      )}

      {/* Completed checkmark (for confirmed bookings) */}
      {confirmed && !pending && (
        <div className="absolute top-2 left-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

// Helper function to desaturate color
function desaturateColor(hex: string): string {
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  // Calculate grayscale value
  const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  
  // Mix with original color (50% desaturation)
  const newR = Math.round((r + gray) / 2);
  const newG = Math.round((g + gray) / 2);
  const newB = Math.round((b + gray) / 2);
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}