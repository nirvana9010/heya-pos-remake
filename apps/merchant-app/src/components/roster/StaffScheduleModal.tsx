'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@heya-pos/ui';
import { Button } from '@heya-pos/ui';
import { Label } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Alert, AlertDescription, AlertTitle } from '@heya-pos/ui';
import { useToast } from '@heya-pos/ui';
import { Clock, Copy, Info, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { StaffClient } from '@/lib/clients/staff-client';

interface Schedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  calendarColor?: string;
}

interface StaffScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff;
  schedules: Schedule[];
  businessHours: any;
  onScheduleUpdate: (staffId: string, schedules: Schedule[]) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

// Helper function to convert 24h to 12h format
const formatTime12Hour = (time24: string): string => {
  if (!time24) return '';
  const [hourStr, minute] = time24.split(':');
  const hour = parseInt(hourStr);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minute} ${ampm}`;
};

// Helper function to convert 12h to 24h format for storage
const formatTime24Hour = (hour12: number, minute: string, ampm: string): string => {
  let hour = hour12;
  if (ampm === 'PM' && hour !== 12) {
    hour += 12;
  } else if (ampm === 'AM' && hour === 12) {
    hour = 0;
  }
  return `${hour.toString().padStart(2, '0')}:${minute}`;
};

export function StaffScheduleModal({ 
  isOpen, 
  onClose, 
  staff, 
  schedules, 
  businessHours,
  onScheduleUpdate 
}: StaffScheduleModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [editableSchedule, setEditableSchedule] = useState<Record<number, { startTime: string; endTime: string; isOff: boolean }>>({});
  
  const staffClient = new StaffClient();

  useEffect(() => {
    if (isOpen && staff) {
      // Initialize editable schedule
      const scheduleMap: Record<number, { startTime: string; endTime: string; isOff: boolean }> = {};
      
      // Initialize all days with default off
      DAYS_OF_WEEK.forEach(day => {
        scheduleMap[day.value] = { startTime: '', endTime: '', isOff: true };
      });
      
      // Fill in existing schedule
      schedules.forEach((schedule: Schedule) => {
        scheduleMap[schedule.dayOfWeek] = {
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isOff: false,
        };
      });
      
      setEditableSchedule(scheduleMap);
    }
  }, [isOpen, staff, schedules]);

  const handleTimeChange = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    setEditableSchedule(prev => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        [field]: value,
        isOff: false,
      },
    }));
  };

  const toggleDayOff = (dayOfWeek: number) => {
    setEditableSchedule(prev => {
      const current = prev[dayOfWeek] || { startTime: '', endTime: '', isOff: true };
      const nextIsOff = !current.isOff;
      return {
        ...prev,
        [dayOfWeek]: {
          startTime: nextIsOff ? '' : (current.startTime || '09:00'),
          endTime: nextIsOff ? '' : (current.endTime || '17:00'),
          isOff: nextIsOff,
        },
      };
    });
  };

  const copyFromBusinessHours = () => {
    if (!businessHours) return;
    
    const newSchedule: Record<number, { startTime: string; endTime: string; isOff: boolean }> = {};
    
    DAYS_OF_WEEK.forEach(day => {
      const dayName = day.label.toLowerCase();
      const hours = businessHours[dayName];
      
      if (hours && hours.open && hours.close) {
        newSchedule[day.value] = {
          startTime: hours.open,
          endTime: hours.close,
          isOff: false,
        };
      } else {
        newSchedule[day.value] = { startTime: '', endTime: '', isOff: true };
      }
    });
    
    setEditableSchedule(newSchedule);
    toast({
      title: 'Success',
      description: 'Copied business hours to staff schedule',
    });
  };

  const coverageWarnings = useMemo(() => {
    if (!businessHours || Object.keys(editableSchedule).length === 0) {
      return [];
    }

    const warnings: string[] = [];

    DAYS_OF_WEEK.forEach(day => {
      const dayKey = day.label.toLowerCase();
      const businessDay = businessHours[dayKey];

      const isClosed =
        !businessDay ||
        businessDay.isOpen === false ||
        businessDay.open === 'closed' ||
        !businessDay.open ||
        !businessDay.close;

      if (isClosed) {
        return;
      }

      const schedule = editableSchedule[day.value];

      if (!schedule || schedule.isOff || !schedule.startTime || !schedule.endTime) {
        warnings.push(
          `${day.label}: no staff rostered from ${formatTime12Hour(businessDay.open)} to ${formatTime12Hour(businessDay.close)}.`
        );
        return;
      }

      const startsLate = schedule.startTime > businessDay.open;
      const endsEarly = schedule.endTime < businessDay.close;

      if (startsLate || endsEarly) {
        const parts: string[] = [];
        if (startsLate) {
          parts.push(
            `starts at ${formatTime12Hour(schedule.startTime)} (business opens ${formatTime12Hour(businessDay.open)})`
          );
        }
        if (endsEarly) {
          parts.push(
            `ends at ${formatTime12Hour(schedule.endTime)} (business closes ${formatTime12Hour(businessDay.close)})`
          );
        }
        warnings.push(`${day.label}: ${parts.join(' and ')}.`);
      }
    });

    return warnings;
  }, [businessHours, editableSchedule]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Convert schedule to array format, only including days with times
      const schedules = Object.entries(editableSchedule)
        .filter(([_, times]) => !times.isOff && times.startTime && times.endTime)
        .map(([dayOfWeek, times]) => ({
          dayOfWeek: parseInt(dayOfWeek),
          startTime: times.startTime,
          endTime: times.endTime,
        }));
      
      await staffClient.updateSchedule(staff.id, { schedules });
      
      toast({
        title: 'Success',
        description: 'Staff schedule updated successfully',
      });
      
      // Notify parent of update
      onScheduleUpdate(staff.id, schedules);
      onClose();
    } catch (error) {
      console.error('Failed to save schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to save schedule',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Schedule - {staff.firstName} {staff.lastName}
          </DialogTitle>
          <DialogDescription>
            Manage regular weekly schedule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Weekly Schedule</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyFromBusinessHours}
                  disabled={!businessHours}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy from Business Hours
                </Button>
              </div>

              <div className="space-y-2">
                {DAYS_OF_WEEK.map(day => {
                  const entry = editableSchedule[day.value] || { startTime: '', endTime: '', isOff: true };
                  const { startTime, endTime, isOff } = entry;
                  
                  return (
                    <div key={day.value} className="grid grid-cols-4 gap-2 items-center">
                      <Label className="text-sm">{day.label}</Label>
                      <div className="relative">
                        <Clock className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          type="time"
                          value={isOff ? '' : (startTime || '')}
                          onChange={(e) => handleTimeChange(day.value, 'startTime', e.target.value)}
                          className="pl-8"
                          placeholder="Start time"
                          disabled={isOff || saving}
                        />
                      </div>
                      <div className="relative">
                        <Clock className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          type="time"
                          value={isOff ? '' : (endTime || '')}
                          onChange={(e) => handleTimeChange(day.value, 'endTime', e.target.value)}
                          className="pl-8"
                          placeholder="End time"
                          disabled={isOff || saving}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant={isOff ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleDayOff(day.value)}
                          disabled={saving}
                        >
                          {isOff ? 'Set Working Hours' : 'Mark Day Off'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Use "Mark Day Off" for days the staff member doesn't work. Only days with start and end times will be saved.
                </AlertDescription>
              </Alert>
            </div>
        </div>

        {coverageWarnings.length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Schedule doesn&apos;t cover full opening hours</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 space-y-1 list-disc pl-5">
                {coverageWarnings.map(warning => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
