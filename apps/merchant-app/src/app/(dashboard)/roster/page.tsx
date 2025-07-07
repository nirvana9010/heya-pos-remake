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

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  color: string;
  status: string;
}

interface Schedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface StaffSchedule {
  staffId: string;
  schedules: Schedule[];
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

export default function RosterPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [schedules, setSchedules] = useState<Map<string, Schedule[]>>(new Map());
  const [editingCell, setEditingCell] = useState<{ staffId: string; dayOfWeek: number } | null>(null);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  
  const staffClient = new StaffClient();

  // Load staff and their schedules
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all staff and their schedules in parallel
      const [staffData, schedulesData] = await Promise.all([
        apiClient.getStaff(),
        staffClient.getAllSchedules()
      ]);
      
      console.log('Loaded staff data:', staffData);
      const activeStaff = staffData.filter((s: any) => s.status === 'ACTIVE' || s.isActive === true);
      console.log('Active staff:', activeStaff);
      setStaff(activeStaff);
      
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

  const updateSchedule = async (staffId: string, dayOfWeek: number, startTime: string | null, endTime: string | null) => {
    try {
      setSaving(`${staffId}-${dayOfWeek}`);
      
      const currentSchedules = schedules.get(staffId) || [];
      let newSchedules: Schedule[];
      
      if (!startTime || !endTime) {
        // Remove this day's schedule
        newSchedules = currentSchedules.filter(s => s.dayOfWeek !== dayOfWeek);
      } else {
        // Update or add this day's schedule
        const existingIndex = currentSchedules.findIndex(s => s.dayOfWeek === dayOfWeek);
        if (existingIndex >= 0) {
          newSchedules = [...currentSchedules];
          newSchedules[existingIndex] = { dayOfWeek, startTime, endTime };
        } else {
          newSchedules = [...currentSchedules, { dayOfWeek, startTime, endTime }];
        }
      }
      
      // Update on server
      await staffClient.updateSchedule(staffId, { schedules: newSchedules });
      
      // Update local state
      setSchedules(prev => new Map(prev).set(staffId, newSchedules));
      
      toast({
        title: 'Schedule updated',
        description: 'Changes saved successfully'
      });
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
    toast({
      title: 'Coming soon',
      description: 'Copy previous week functionality will be available soon'
    });
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

  const formatScheduleTime = (schedule: Schedule | undefined) => {
    if (!schedule) return '-';
    return `${schedule.startTime} - ${schedule.endTime}`;
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
                      <div className="flex items-center gap-3">
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
                      </div>
                    </td>
                    {Array.from({ length: 7 }, (_, dayIndex) => {
                      const schedule = getScheduleForDay(staffMember.id, dayIndex);
                      const isEditing = editingCell?.staffId === staffMember.id && editingCell?.dayOfWeek === dayIndex;
                      const isSaving = saving === `${staffMember.id}-${dayIndex}`;
                      const date = addDays(weekStart, dayIndex);
                      const isCurrentDay = isToday(date);
                      
                      return (
                        <td 
                          key={dayIndex} 
                          className={cn(
                            "p-2 text-center relative group",
                            isCurrentDay && "bg-teal-50"
                          )}
                        >
                          {isEditing ? (
                            <div className="flex flex-col gap-1 p-2 bg-white rounded border">
                              <select
                                className="text-sm border rounded px-2 py-1"
                                defaultValue={schedule?.startTime || ''}
                                onChange={(e) => {
                                  const endTime = schedule?.endTime || '17:00';
                                  if (e.target.value) {
                                    updateSchedule(staffMember.id, dayIndex, e.target.value, endTime);
                                  }
                                }}
                                disabled={isSaving}
                              >
                                <option value="">Off</option>
                                {TIME_OPTIONS.slice(0, 36).map(time => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                              <select
                                className="text-sm border rounded px-2 py-1"
                                defaultValue={schedule?.endTime || ''}
                                onChange={(e) => {
                                  const startTime = schedule?.startTime || '09:00';
                                  if (e.target.value) {
                                    updateSchedule(staffMember.id, dayIndex, startTime, e.target.value);
                                  }
                                }}
                                disabled={isSaving || !schedule?.startTime}
                              >
                                <option value="">-</option>
                                {TIME_OPTIONS.slice(12).map(time => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs"
                                onClick={() => setEditingCell(null)}
                                disabled={isSaving}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <button
                              className={cn(
                                "w-full py-2 px-3 rounded text-sm transition-colors",
                                schedule 
                                  ? "bg-teal-100 text-teal-700 hover:bg-teal-200" 
                                  : "text-gray-400 hover:bg-gray-100",
                                "group-hover:ring-2 group-hover:ring-teal-300"
                              )}
                              onClick={() => setEditingCell({ staffId: staffMember.id, dayOfWeek: dayIndex })}
                              disabled={isSaving}
                            >
                              {isSaving ? (
                                <div className="flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600" />
                                </div>
                              ) : (
                                formatScheduleTime(schedule)
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
    </div>
  );
}