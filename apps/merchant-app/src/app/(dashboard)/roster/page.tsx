'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Copy, Calendar, Clock, Users } from 'lucide-react';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { Badge } from '@heya-pos/ui';
import { Skeleton } from '@heya-pos/ui';
import { cn } from '@heya-pos/ui';
import { useToast } from '@heya-pos/ui';
import { apiClient } from '@/lib/api-client';
import { StaffClient } from '@/lib/clients/staff-client';
import { StaffScheduleModal } from '@/components/roster/StaffScheduleModal';

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  color: string;
  status: string;
  calendarColor?: string;
}

interface Schedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface ScheduleOverride {
  staffId: string;
  date: string; // ISO date string
  startTime: string | null;
  endTime: string | null;
  reason?: string;
}

interface StaffSchedule {
  staffId: string;
  schedules: Schedule[];
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
const formatTime24Hour = (time12: string): string => {
  if (!time12) return '';
  const [time, ampm] = time12.split(' ');
  const [hourStr, minute] = time.split(':');
  let hour = parseInt(hourStr);
  
  if (ampm === 'PM' && hour !== 12) {
    hour += 12;
  } else if (ampm === 'AM' && hour === 12) {
    hour = 0;
  }
  
  return `${hour.toString().padStart(2, '0')}:${minute}`;
};

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const time24 = `${hour.toString().padStart(2, '0')}:${minute}`;
  return {
    value: time24,
    label: formatTime12Hour(time24)
  };
});

export default function RosterPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [schedules, setSchedules] = useState<Map<string, Schedule[]>>(new Map());
  const [overrides, setOverrides] = useState<Map<string, ScheduleOverride[]>>(new Map());
  const [editingCell, setEditingCell] = useState<{ staffId: string; dayOfWeek: number; date: Date } | null>(null);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [businessHours, setBusinessHours] = useState<any>(null);
  
  const staffClient = new StaffClient();

  // Load staff and their schedules
  useEffect(() => {
    loadData();
    loadBusinessHours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load overrides when staff data is available or week changes
  useEffect(() => {
    if (staff.length > 0) {
      loadOverridesForWeek();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, staff.length]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Test authentication first
      console.log('[Roster] Loading staff data...');
      
      // Load all staff and their schedules in parallel
      const [staffData, schedulesData] = await Promise.all([
        apiClient.getStaff(),
        staffClient.getAllSchedules()
      ]);
      
      console.log('Loaded staff data:', staffData);
      const activeStaff = staffData.filter((s: any) => s.status === 'ACTIVE' || s.isActive === true);
      console.log('Active staff:', activeStaff);
      // Ensure color is set for each staff member
      const staffWithColors = activeStaff.map((s: any) => ({
        ...s,
        color: s.calendarColor || s.color || '#4F46E5'
      }));
      setStaff(staffWithColors);
      
      // Create schedule map from bulk data
      const scheduleMap = new Map<string, Schedule[]>();
      
      if (Array.isArray(schedulesData)) {
        schedulesData.forEach((staffSchedule: any) => {
          if (staffSchedule.staffId && Array.isArray(staffSchedule.schedules)) {
            scheduleMap.set(staffSchedule.staffId, staffSchedule.schedules);
          }
        });
      } else {
        // Fallback to individual loading if bulk endpoint doesn't work
        await Promise.all(
          activeStaff.map(async (staffMember: any) => {
            try {
              const scheduleData = await staffClient.getSchedule(staffMember.id);
              if (scheduleData?.schedules) {
                scheduleMap.set(staffMember.id, scheduleData.schedules);
              }
            } catch (error) {
              console.error(`Failed to load schedule for ${staffMember.firstName}:`, error);
              scheduleMap.set(staffMember.id, []);
            }
          })
        );
      }
      
      setSchedules(scheduleMap);
    } catch (error) {
      console.error('Failed to load roster data:', error);
      toast({
        title: 'Error loading roster',
        description: 'Please try refreshing the page',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOverridesForWeek = async () => {
    try {
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      
      console.log('[Roster] Loading overrides for week:', startDate, 'to', endDate, 'for', staff.length, 'staff members');
      console.log('[Roster] Staff IDs:', staff.map(s => s.id));
      
      // Load overrides for all staff in parallel
      const overridesMap = new Map<string, ScheduleOverride[]>();
      
      await Promise.all(
        staff.map(async (staffMember) => {
          try {
            const overrides = await staffClient.getScheduleOverrides(staffMember.id, startDate, endDate);
            console.log(`[Roster] Overrides for ${staffMember.firstName} (${staffMember.id}):`, overrides);
            if (overrides && overrides.length > 0) {
              overridesMap.set(staffMember.id, overrides);
            }
          } catch (error: any) {
            console.error(`Failed to load overrides for ${staffMember.firstName}:`, {
              error,
              message: error?.message,
              response: error?.response,
              status: error?.response?.status
            });
          }
        })
      );
      
      console.log('[Roster] Total overrides loaded:', overridesMap.size, 'staff with overrides');
      setOverrides(overridesMap);
    } catch (error) {
      console.error('Failed to load overrides:', error);
    }
  };

  const loadBusinessHours = async () => {
    try {
      const response = await apiClient.getMerchantSettings();
      const hours = response.businessHours;
      setBusinessHours(hours);
    } catch (error) {
      console.error('Failed to load business hours:', error);
    }
  };

  const handleScheduleModalUpdate = (staffId: string, newSchedules: Schedule[]) => {
    setSchedules(prev => new Map(prev).set(staffId, newSchedules));
  };

  const updateSchedule = async (staffId: string, dayOfWeek: number, date: Date, startTime: string | null, endTime: string | null) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      setSaving(`${staffId}-${dateStr}`);
      
      // Get the regular schedule for this day
      const regularSchedule = getScheduleForDay(staffId, dayOfWeek);
      
      // Check if this is different from the regular schedule
      const isOverride = !regularSchedule || 
        regularSchedule.startTime !== startTime || 
        regularSchedule.endTime !== endTime;
      
      if (isOverride) {
        // Create or update override
        console.log('[Roster] Creating override:', { staffId, date: dateStr, startTime, endTime });
        const override = await staffClient.createOrUpdateScheduleOverride(staffId, {
          date: dateStr,
          startTime,
          endTime,
        });
        console.log('[Roster] Override created:', override);
        
        // Update local overrides state
        const staffOverrides = overrides.get(staffId) || [];
        const existingOverrideIndex = staffOverrides.findIndex(o => o.date === dateStr);
        
        const newOverride: ScheduleOverride = {
          staffId,
          date: dateStr,
          startTime,
          endTime,
        };
        
        let newOverrides: ScheduleOverride[];
        if (existingOverrideIndex >= 0) {
          newOverrides = [...staffOverrides];
          newOverrides[existingOverrideIndex] = newOverride;
        } else {
          newOverrides = [...staffOverrides, newOverride];
        }
        
        setOverrides(prev => new Map(prev).set(staffId, newOverrides));
        
        toast({
          title: 'Schedule override created',
          description: `Schedule changed for ${format(date, 'MMM d, yyyy')}`
        });
      } else {
        // If it matches regular schedule, remove any existing override
        const existingOverride = overrides.get(staffId)?.find(o => o.date === dateStr);
        if (existingOverride) {
          await staffClient.deleteScheduleOverride(staffId, dateStr);
        }
        
        const staffOverrides = overrides.get(staffId) || [];
        const newOverrides = staffOverrides.filter(o => o.date !== dateStr);
        setOverrides(prev => new Map(prev).set(staffId, newOverrides));
        
        toast({
          title: 'Schedule reset',
          description: 'Returned to regular schedule'
        });
      }
    } catch (error) {
      console.error('Failed to update schedule:', error);
      toast({
        title: 'Update failed',
        description: 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setSaving(null);
      setEditingCell(null);
    }
  };

  const copyPreviousWeek = async () => {
    try {
      const previousWeekStart = addDays(weekStart, -7);
      const previousWeekEnd = addDays(previousWeekStart, 6);
      const previousStartDate = format(previousWeekStart, 'yyyy-MM-dd');
      const previousEndDate = format(previousWeekEnd, 'yyyy-MM-dd');
      
      setLoading(true);
      
      // First, load overrides from the previous week
      const previousWeekOverrides = new Map<string, ScheduleOverride[]>();
      
      await Promise.all(
        staff.map(async (staffMember) => {
          try {
            const overrides = await staffClient.getScheduleOverrides(staffMember.id, previousStartDate, previousEndDate);
            if (overrides && overrides.length > 0) {
              previousWeekOverrides.set(staffMember.id, overrides);
            }
          } catch (error) {
            console.error(`Failed to load overrides for ${staffMember.firstName}:`, error);
          }
        })
      );
      
      // Create new overrides for the current week based on previous week
      const newOverrides: ScheduleOverride[] = [];
      
      // For each staff member
      for (const staffMember of staff) {
        const staffOverrides = previousWeekOverrides.get(staffMember.id) || [];
        
        // For each day of the week
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const previousDate = addDays(previousWeekStart, dayOffset);
          const currentDate = addDays(weekStart, dayOffset);
          const previousDateStr = format(previousDate, 'yyyy-MM-dd');
          const currentDateStr = format(currentDate, 'yyyy-MM-dd');
          
          // Find override for this day in previous week
          const previousOverride = staffOverrides.find(o => o.date === previousDateStr);
          
          if (previousOverride) {
            // Create new override for current week
            const newOverride: ScheduleOverride = {
              staffId: staffMember.id,
              date: currentDateStr,
              startTime: previousOverride.startTime,
              endTime: previousOverride.endTime,
              reason: previousOverride.reason ? `Copied from ${format(previousDate, 'MMM d')}` : undefined
            };
            
            newOverrides.push(newOverride);
            
            // Update local state
            const currentStaffOverrides = overrides.get(staffMember.id) || [];
            const filteredOverrides = currentStaffOverrides.filter(o => o.date !== currentDateStr);
            const updatedOverrides = [...filteredOverrides, newOverride];
            setOverrides(prev => new Map(prev).set(staffMember.id, updatedOverrides));
          }
        }
      }
      
      if (newOverrides.length === 0) {
        toast({
          title: 'No overrides to copy',
          description: 'The previous week has no schedule overrides',
        });
      } else {
        // Save all overrides to API
        await Promise.all(
          newOverrides.map(override => 
            staffClient.createOrUpdateScheduleOverride(override.staffId, {
              date: override.date,
              startTime: override.startTime,
              endTime: override.endTime,
              reason: override.reason
            })
          )
        );
        
        toast({
          title: 'Success',
          description: `Copied ${newOverrides.length} schedule override${newOverrides.length > 1 ? 's' : ''} from previous week`,
        });
      }
    } catch (error) {
      console.error('Failed to copy previous week:', error);
      toast({
        title: 'Copy failed',
        description: 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const applyBusinessHours = async () => {
    try {
      setLoading(true);
      
      // Fetch merchant settings to get business hours
      const response = await apiClient.getMerchantSettings();
      console.log('Merchant settings response:', response);
      
      // Business hours should be directly on the response
      const businessHours = response.businessHours;
      console.log('Business hours extracted:', businessHours);
      
      if (!businessHours) {
        toast({
          title: 'No business hours configured',
          description: 'Please set up business hours in settings first',
          variant: 'destructive'
        });
        return;
      }
      
      // Check if there are staff members
      if (!staff || staff.length === 0) {
        toast({
          title: 'No staff members found',
          description: 'Please add staff members before applying business hours',
          variant: 'destructive'
        });
        return;
      }
      
      // Apply business hours to all staff
      const updates = [];
      console.log('Applying to staff:', staff.length, 'members');
      
      for (const staffMember of staff) {
        const newSchedules = [];
        
        // Create schedules based on business hours
        const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        dayMap.forEach((dayName, dayIndex) => {
          const dayHours = businessHours[dayName];
          if (dayHours && dayHours.isOpen) {
            newSchedules.push({
              dayOfWeek: dayIndex,
              startTime: dayHours.open || '09:00',
              endTime: dayHours.close || '17:00'
            });
          }
        });
        
        console.log(`Staff ${staffMember.firstName}: ${newSchedules.length} schedules`);
        
        // Update staff schedule
        if (newSchedules.length > 0) {
          console.log('Updating schedule for:', staffMember.id, newSchedules);
          const updatePromise = staffClient.updateSchedule(staffMember.id, { schedules: newSchedules })
            .then(result => {
              console.log(`Success for ${staffMember.firstName}:`, result);
              return result;
            })
            .catch(err => {
              console.error(`Failed to update ${staffMember.firstName}:`, err);
              console.error('Error details:', {
                message: err?.message,
                response: err?.response,
                data: err?.response?.data,
                status: err?.response?.status
              });
              throw err;
            });
          
          updates.push(updatePromise);
        }
      }
      
      console.log('Waiting for', updates.length, 'updates to complete...');
      
      try {
        const results = await Promise.all(updates);
        console.log('All updates completed successfully:', results);
        
        toast({
          title: 'Success',
          description: `Business hours applied to ${staff.length} staff members`
        });
        
        // Reload data to show updated schedules
        await loadData();
      } catch (promiseError) {
        console.error('Promise.all error:', promiseError);
        throw promiseError;
      }
      
    } catch (error: any) {
      console.error('Error applying business hours:', error);
      console.error('Error type:', typeof error);
      console.error('Error stack:', error?.stack);
      console.error('Error response:', error?.response);
      console.error('Error message:', error?.message);
      
      // Check if it's a network error or API error
      let errorMessage = 'Failed to apply business hours';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getScheduleForDay = (staffId: string, dayOfWeek: number): Schedule | undefined => {
    const staffSchedules = schedules.get(staffId) || [];
    return staffSchedules.find(s => s.dayOfWeek === dayOfWeek);
  };

  const getOverrideForDate = (staffId: string, date: Date): ScheduleOverride | undefined => {
    const staffOverrides = overrides.get(staffId) || [];
    const dateStr = format(date, 'yyyy-MM-dd');
    return staffOverrides.find(o => o.date === dateStr);
  };

  const formatScheduleTime = (schedule: Schedule | undefined, override: ScheduleOverride | undefined) => {
    if (override) {
      if (!override.startTime || !override.endTime) return 'Day off';
      return `${formatTime12Hour(override.startTime)} - ${formatTime12Hour(override.endTime)}`;
    }
    if (!schedule) return '-';
    return `${formatTime12Hour(schedule.startTime)} - ${formatTime12Hour(schedule.endTime)}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Staff Roster</h1>
        <p className="text-gray-600">Manage staff schedules and availability</p>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(prev => addDays(prev, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Week
          </Button>
          
          <div className="text-center">
            <h2 className="text-lg font-medium">
              {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </h2>
            {isSameDay(weekStart, startOfWeek(new Date())) && (
              <p className="text-sm text-gray-500">Current Week</p>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(prev => addDays(prev, 7))}
          >
            Next Week
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            <Calendar className="h-4 w-4 mr-2" />
            This Week
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={copyPreviousWeek}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Previous Week
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={applyBusinessHours}
          >
            <Clock className="h-4 w-4 mr-2" />
            Apply Business Hours
          </Button>
        </div>
      </div>

      {/* Roster Grid */}
      {staff.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Staff Members Found</h3>
            <p className="text-gray-600 mb-4">Add staff members to manage their schedules.</p>
            <Button onClick={() => window.location.href = '/staff'}>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4 font-medium text-gray-900 sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                    Staff Member
                  </th>
                  {Array.from({ length: 7 }, (_, i) => {
                    const date = addDays(weekStart, i);
                    const isCurrentDay = isToday(date);
                    return (
                      <th 
                        key={i} 
                        className={cn(
                          "text-center p-4 font-medium min-w-[140px]",
                          isCurrentDay && "bg-teal-50"
                        )}
                      >
                        <div className="text-sm text-gray-600">{DAYS_OF_WEEK[i]}</div>
                        <div className={cn(
                          "text-lg",
                          isCurrentDay && "text-teal-600 font-semibold"
                        )}>
                          {format(date, 'd')}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {staff.map((staffMember) => (
                  <tr key={staffMember.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 sticky left-0 bg-white z-10 border-r">
                      <button
                        className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors w-full text-left"
                        onClick={() => setSelectedStaff(staffMember)}
                      >
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                          style={{ backgroundColor: staffMember.color }}
                        >
                          {(staffMember.firstName || '?')[0]}{(staffMember.lastName || '?')[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {staffMember.firstName} {staffMember.lastName}
                          </p>
                        </div>
                      </button>
                    </td>
                    {Array.from({ length: 7 }, (_, dayIndex) => {
                      const date = addDays(weekStart, dayIndex);
                      const schedule = getScheduleForDay(staffMember.id, dayIndex);
                      const override = getOverrideForDate(staffMember.id, date);
                      const isEditing = editingCell?.staffId === staffMember.id && 
                        editingCell?.dayOfWeek === dayIndex &&
                        isSameDay(editingCell.date, date);
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const isSaving = saving === `${staffMember.id}-${dateStr}`;
                      const isCurrentDay = isToday(date);
                      const hasOverride = !!override;
                      
                      // Determine current values
                      const currentStartTime = override ? override.startTime : schedule?.startTime;
                      const currentEndTime = override ? override.endTime : schedule?.endTime;
                      
                      return (
                        <td 
                          key={dayIndex} 
                          className={cn(
                            "p-2 text-center relative group",
                            isCurrentDay && "bg-teal-50"
                          )}
                        >
                          {isEditing ? (
                            <div className="flex flex-col gap-1 p-2 bg-white rounded border shadow-lg">
                              <select
                                className="text-sm border rounded px-2 py-1"
                                defaultValue={currentStartTime || ''}
                                id={`start-${staffMember.id}-${dayIndex}`}
                                disabled={isSaving}
                              >
                                <option value="">Off</option>
                                {TIME_OPTIONS.slice(0, 36).map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              <select
                                className="text-sm border rounded px-2 py-1"
                                defaultValue={currentEndTime || ''}
                                id={`end-${staffMember.id}-${dayIndex}`}
                                disabled={isSaving}
                              >
                                <option value="">Off</option>
                                {TIME_OPTIONS.slice(12).map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              <div className="flex gap-1 mt-1">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="text-xs flex-1"
                                  onClick={() => {
                                    const startSelect = document.getElementById(`start-${staffMember.id}-${dayIndex}`) as HTMLSelectElement;
                                    const endSelect = document.getElementById(`end-${staffMember.id}-${dayIndex}`) as HTMLSelectElement;
                                    const newStart = startSelect.value || null;
                                    const newEnd = endSelect.value || null;
                                    updateSchedule(staffMember.id, dayIndex, date, newStart, newEnd);
                                  }}
                                  disabled={isSaving}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs flex-1"
                                  onClick={() => setEditingCell(null)}
                                  disabled={isSaving}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              className={cn(
                                "w-full py-2 px-3 rounded text-sm transition-colors",
                                hasOverride 
                                  ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" 
                                  : schedule 
                                    ? "bg-teal-100 text-teal-700 hover:bg-teal-200" 
                                    : "text-gray-400 hover:bg-gray-100",
                                "group-hover:ring-2",
                                hasOverride ? "group-hover:ring-yellow-300" : "group-hover:ring-teal-300"
                              )}
                              onClick={() => setEditingCell({ staffId: staffMember.id, dayOfWeek: dayIndex, date })}
                              disabled={isSaving}
                            >
                              {isSaving ? (
                                <div className="flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600" />
                                </div>
                              ) : (
                                formatScheduleTime(schedule, override)
                              )}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              Total Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{staff.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              Average Hours/Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {(() => {
                let totalHours = 0;
                let staffWithSchedules = 0;
                
                schedules.forEach((staffSchedules) => {
                  if (staffSchedules && staffSchedules.length > 0) {
                    staffWithSchedules++;
                    staffSchedules.forEach(schedule => {
                      const start = parseInt(schedule.startTime.split(':')[0]) + parseInt(schedule.startTime.split(':')[1]) / 60;
                      const end = parseInt(schedule.endTime.split(':')[0]) + parseInt(schedule.endTime.split(':')[1]) / 60;
                      totalHours += (end - start);
                    });
                  }
                });
                
                return staffWithSchedules > 0 ? (totalHours / staffWithSchedules).toFixed(1) : '0';
              })()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              Coverage Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {(() => {
                const today = new Date().getDay();
                let count = 0;
                schedules.forEach((staffSchedules) => {
                  if (staffSchedules && staffSchedules.find(s => s.dayOfWeek === today)) {
                    count++;
                  }
                });
                return count;
              })()}/{staff.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Schedule Modal */}
      {selectedStaff && (
        <StaffScheduleModal
          isOpen={!!selectedStaff}
          onClose={() => setSelectedStaff(null)}
          staff={selectedStaff}
          schedules={schedules.get(selectedStaff.id) || []}
          businessHours={businessHours}
          onScheduleUpdate={handleScheduleModalUpdate}
        />
      )}
    </div>
  );
}