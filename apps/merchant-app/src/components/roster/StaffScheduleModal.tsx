'use client';

import { useState, useEffect } from 'react';
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
import { Alert, AlertDescription } from '@heya-pos/ui';
import { useToast } from '@heya-pos/ui';
import { Clock, Copy, Info } from 'lucide-react';
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
  const [editableSchedule, setEditableSchedule] = useState<Record<number, { startTime: string; endTime: string }>>({});
  
  const staffClient = new StaffClient();

  useEffect(() => {
    if (isOpen && staff) {
      // Initialize editable schedule
      const scheduleMap: Record<number, { startTime: string; endTime: string }> = {};
      
      // Initialize all days with empty values
      DAYS_OF_WEEK.forEach(day => {
        scheduleMap[day.value] = { startTime: '', endTime: '' };
      });
      
      // Fill in existing schedule
      schedules.forEach((schedule: Schedule) => {
        scheduleMap[schedule.dayOfWeek] = {
          startTime: schedule.startTime,
          endTime: schedule.endTime,
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
      },
    }));
  };

  const copyFromBusinessHours = () => {
    if (!businessHours) return;
    
    const newSchedule: Record<number, { startTime: string; endTime: string }> = {};
    
    DAYS_OF_WEEK.forEach(day => {
      const dayName = day.label.toLowerCase();
      const hours = businessHours[dayName];
      
      if (hours && hours.open && hours.close) {
        newSchedule[day.value] = {
          startTime: hours.open,
          endTime: hours.close,
        };
      } else {
        newSchedule[day.value] = { startTime: '', endTime: '' };
      }
    });
    
    setEditableSchedule(newSchedule);
    toast({
      title: 'Success',
      description: 'Copied business hours to staff schedule',
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Convert schedule to array format, only including days with times
      const schedules = Object.entries(editableSchedule)
        .filter(([_, times]) => times.startTime && times.endTime)
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
                {DAYS_OF_WEEK.map(day => (
                  <div key={day.value} className="grid grid-cols-3 gap-2 items-center">
                    <Label className="text-sm">{day.label}</Label>
                    <div className="relative">
                      <Clock className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        type="time"
                        value={editableSchedule[day.value]?.startTime || ''}
                        onChange={(e) => handleTimeChange(day.value, 'startTime', e.target.value)}
                        className="pl-8"
                        placeholder="Start time"
                      />
                    </div>
                    <div className="relative">
                      <Clock className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        type="time"
                        value={editableSchedule[day.value]?.endTime || ''}
                        onChange={(e) => handleTimeChange(day.value, 'endTime', e.target.value)}
                        className="pl-8"
                        placeholder="End time"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Leave a day empty if the staff member doesn't work that day. If no schedule is set, 
                  the business hours will be used as the default.
                </AlertDescription>
              </Alert>
            </div>
        </div>

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