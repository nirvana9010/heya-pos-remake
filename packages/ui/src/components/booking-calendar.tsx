import * as React from "react";
import { format, addDays, startOfWeek, addMinutes } from "date-fns";
import { cn } from "../lib/utils";
import { Button } from "./button";
import { Card } from "./card";
import { Badge } from "./badge";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";

interface TimeSlot {
  time: string;
  available: boolean;
  bookingId?: string;
}

interface StaffSchedule {
  staffId: string;
  staffName: string;
  color: string;
  slots: TimeSlot[];
}

interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  startTime: Date;
  endTime: Date;
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  staffId: string;
}

interface BookingCalendarProps {
  date: Date;
  view: 'day' | 'week';
  staffSchedules: StaffSchedule[];
  bookings: Booking[];
  onDateChange: (date: Date) => void;
  onViewChange: (view: 'day' | 'week') => void;
  onSlotClick?: (staffId: string, time: string) => void;
  onBookingClick?: (booking: Booking) => void;
  slotInterval?: number; // in minutes
  startHour?: number;
  endHour?: number;
}

const statusColors = {
  confirmed: 'bg-blue-500',
  'in-progress': 'bg-green-500',
  completed: 'bg-gray-500',
  cancelled: 'bg-red-500',
  'no-show': 'bg-orange-500'
};

export function BookingCalendar({
  date,
  view,
  staffSchedules,
  bookings,
  onDateChange,
  onViewChange,
  onSlotClick,
  onBookingClick,
  slotInterval = 30,
  startHour = 9,
  endHour = 18,
}: BookingCalendarProps) {
  const timeSlots = React.useMemo(() => {
    const slots = [];
    const startTime = new Date(date);
    startTime.setHours(startHour, 0, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(endHour, 0, 0, 0);
    
    let currentTime = new Date(startTime);
    while (currentTime < endTime) {
      slots.push(format(currentTime, 'HH:mm'));
      currentTime = addMinutes(currentTime, slotInterval);
    }
    
    return slots;
  }, [date, slotInterval, startHour, endHour]);

  const weekDays = React.useMemo(() => {
    if (view === 'day') return [date];
    
    const start = startOfWeek(date, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [date, view]);

  const getBookingForSlot = (staffId: string, day: Date, time: string) => {
    const slotStart = new Date(day);
    const [hours, minutes] = time.split(':').map(Number);
    slotStart.setHours(hours, minutes, 0, 0);
    
    return bookings.find(booking => {
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);
      return (
        booking.staffId === staffId &&
        slotStart >= bookingStart &&
        slotStart < bookingEnd
      );
    });
  };

  const renderTimeSlot = (staffId: string, day: Date, time: string) => {
    const booking = getBookingForSlot(staffId, day, time);
    
    if (booking) {
      const bookingStart = format(new Date(booking.startTime), 'HH:mm');
      const isFirstSlot = bookingStart === time;
      
      if (isFirstSlot) {
        return (
          <div
            className={cn(
              "p-2 text-white text-xs rounded cursor-pointer transition-opacity hover:opacity-90",
              statusColors[booking.status]
            )}
            onClick={() => onBookingClick?.(booking)}
          >
            <div className="font-medium truncate">{booking.customerName}</div>
            <div className="truncate opacity-90">{booking.serviceName}</div>
          </div>
        );
      }
      return null; // Don't render anything for continuation slots
    }
    
    return (
      <div
        className="h-full bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200 rounded"
        onClick={() => onSlotClick?.(staffId, time)}
      />
    );
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDateChange(addDays(date, view === 'week' ? -7 : -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDateChange(addDays(date, view === 'week' ? 7 : 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {view === 'week' 
              ? `Week of ${format(weekDays[0], 'MMM d')} - ${format(weekDays[6], 'MMM d, yyyy')}`
              : format(date, 'EEEE, MMMM d, yyyy')
            }
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('day')}
          >
            Day
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('week')}
          >
            Week
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white z-10 p-2 text-left text-sm font-medium border-b border-r">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Time
                </th>
                {view === 'week' ? (
                  weekDays.map(day => (
                    <th key={day.toISOString()} className="p-2 text-center text-sm font-medium border-b" colSpan={staffSchedules.length}>
                      {format(day, 'EEE d')}
                    </th>
                  ))
                ) : (
                  staffSchedules.map(staff => (
                    <th key={staff.staffId} className="p-2 text-center text-sm font-medium border-b min-w-[150px]">
                      <div className="flex items-center justify-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: staff.color }}
                        />
                        {staff.staffName}
                      </div>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(time => (
                <tr key={time}>
                  <td className="sticky left-0 bg-white z-10 p-2 text-sm font-medium border-r border-b">
                    {time}
                  </td>
                  {view === 'week' ? (
                    weekDays.map(day => (
                      <React.Fragment key={day.toISOString()}>
                        {staffSchedules.map(staff => (
                          <td key={`${day.toISOString()}-${staff.staffId}`} className="p-1 border-b border-r h-16">
                            {renderTimeSlot(staff.staffId, day, time)}
                          </td>
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    staffSchedules.map(staff => (
                      <td key={staff.staffId} className="p-1 border-b h-16">
                        {renderTimeSlot(staff.staffId, date, time)}
                      </td>
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Status Legend */}
      <div className="flex items-center gap-4 mt-4">
        <span className="text-sm font-medium">Status:</span>
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={cn("w-4 h-4 rounded", color)} />
            <span className="text-sm capitalize">{status.replace('-', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}