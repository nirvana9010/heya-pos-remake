'use client';

import { useState, useEffect } from 'react';
import { Button } from '@heya-pos/ui';
import { Label } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Alert, AlertDescription } from '@heya-pos/ui';
import { useToast } from '@heya-pos/ui';
import { Clock, Copy, Info } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface ScheduleDay {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface StaffScheduleData {
  staffId: string;
  staffName: string;
  schedules: ScheduleDay[];
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

interface StaffScheduleTabProps {
  staffId: string;
}

export function StaffScheduleTab({ staffId }: StaffScheduleTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scheduleData, setScheduleData] = useState<StaffScheduleData | null>(null);
  const [editableSchedule, setEditableSchedule] = useState<Record<number, { startTime: string; endTime: string }>>({});
  const [businessHours, setBusinessHours] = useState<any>(null);

  useEffect(() => {
    if (staffId) {
      loadSchedule();
      loadBusinessHours();
    }
  }, [staffId]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const data = await apiClient.staff.getSchedule(staffId);
      console.log('Schedule response:', data); // Debug log
      
      setScheduleData(data);
      
      // Initialize editable schedule
      const scheduleMap: Record<number, { startTime: string; endTime: string }> = {};
      
      // Initialize all days with empty values
      DAYS_OF_WEEK.forEach(day => {
        scheduleMap[day.value] = { startTime: '', endTime: '' };
      });
      
      // Fill in existing schedule
      if (data.schedules) {
        data.schedules.forEach((schedule: ScheduleDay) => {
          scheduleMap[schedule.dayOfWeek] = {
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          };
        });
      }
      
      setEditableSchedule(scheduleMap);
    } catch (error: any) {
      console.error('Failed to load schedule:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load staff schedule',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessHours = async () => {
    try {
      const locations = await apiClient.locations.getLocations();
      // Get the first location's business hours as default
      if (locations && locations.length > 0) {
        setBusinessHours(locations[0].businessHours);
      }
    } catch (err) {
      console.error('Failed to load business hours:', err);
    }
  };

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
      
      await apiClient.staff.updateSchedule(staffId, {
        schedules,
      });
      
      toast({
        title: 'Success',
        description: 'Staff schedule updated successfully',
      });
      
      // Reload to get updated data
      await loadSchedule();
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

  if (loading) {
    return <div className="text-center py-8">Loading schedule...</div>;
  }

  return (
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

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Schedule'}
        </Button>
      </div>
    </div>
  );
}