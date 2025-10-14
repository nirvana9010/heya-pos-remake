'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@heya-pos/ui';
import { Button } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Label } from '@heya-pos/ui';
import { Switch } from '@heya-pos/ui';
import { RadioGroup, RadioGroupItem } from '@heya-pos/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@heya-pos/ui';
import { Textarea } from '@heya-pos/ui';
import { useToast } from '@heya-pos/ui';
import { CreditCard, Gift, Loader2, Save } from 'lucide-react';

interface LoyaltyProgram {
  id: string;
  type: 'VISITS' | 'POINTS';
  name?: string | null;
  description?: string | null;
  isActive: boolean;
  visitsRequired?: number | null;
  visitRewardType?: 'FREE' | 'PERCENTAGE' | null;
  visitRewardValue?: number | null;
  pointsPerDollar?: number | null;
  pointsValue?: number | null;
}

type ProgramType = 'VISITS' | 'POINTS';
type VisitRewardType = 'FREE' | 'PERCENTAGE';

interface LoyaltyFormState {
  type: ProgramType;
  isActive: boolean;
  visitsRequired: number;
  visitRewardType: VisitRewardType;
  visitRewardValue: number;
  pointsPerDollar: number;
  pointsValue: number;
}

interface LoyaltyReminderTouchpoint {
  sequence: number;
  thresholdValue: number;
  emailSubject: string;
  emailBody: string;
  smsBody: string;
  isEnabled: boolean;
}

const defaultNameForType = (type: ProgramType) =>
  type === 'VISITS' ? 'Punch Card Rewards' : 'Points Rewards';

const buildDefaultDescription = (state: LoyaltyFormState) => {
  if (state.type === 'VISITS') {
    const rewardText =
      state.visitRewardType === 'FREE'
        ? 'a free reward'
        : `${state.visitRewardValue}% off`;
    return `Get ${rewardText} every ${state.visitsRequired} visits.`;
  }

  const pointsValue = Number(state.pointsValue || 0);
  const formattedValue = pointsValue > 0 ? pointsValue.toFixed(2) : '0.00';
  return `Earn ${state.pointsPerDollar} point(s) per $1 spent. Each point is worth $${formattedValue}.`;
};

const initialFormState: LoyaltyFormState = {
  type: 'VISITS',
  isActive: true,
  visitsRequired: 10,
  visitRewardType: 'FREE',
  visitRewardValue: 100,
  pointsPerDollar: 1,
  pointsValue: 0.01,
};

const defaultReminders: LoyaltyReminderTouchpoint[] = [
  {
    sequence: 1,
    thresholdValue: 1,
    emailSubject: '',
    emailBody: '',
    smsBody: '',
    isEnabled: true,
  },
  {
    sequence: 2,
    thresholdValue: 5,
    emailSubject: '',
    emailBody: '',
    smsBody: '',
    isEnabled: true,
  },
  {
    sequence: 3,
    thresholdValue: 10,
    emailSubject: '',
    emailBody: '',
    smsBody: '',
    isEnabled: false,
  },
];

export default function LoyaltyPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<LoyaltyFormState>(initialFormState);
  const [programMeta, setProgramMeta] = useState({
    name: defaultNameForType(initialFormState.type),
    description: buildDefaultDescription(initialFormState),
  });
  const [reminders, setReminders] = useState<LoyaltyReminderTouchpoint[]>(defaultReminders);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [savingReminders, setSavingReminders] = useState(false);

  useEffect(() => {
    loadProgram();
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      setLoadingReminders(true);
      const data = await api.get('/loyalty/reminders');

      const mapped = new Map<number, LoyaltyReminderTouchpoint>();
      (data || []).forEach((tp: any) => {
        mapped.set(tp.sequence, {
          sequence: tp.sequence,
          thresholdValue: Number(tp.thresholdValue ?? 0),
          emailSubject: tp.emailSubject ?? '',
          emailBody: tp.emailBody ?? '',
          smsBody: tp.smsBody ?? '',
          isEnabled: tp.isEnabled ?? true,
        });
      });

      setReminders((prev) =>
        defaultReminders.map((defaults) =>
          mapped.get(defaults.sequence) ?? defaults,
        ),
      );
    } catch (error) {
      console.error('Failed to load loyalty reminders:', error);
    } finally {
      setLoadingReminders(false);
    }
  };

  const loadProgram = async () => {
    try {
      const data = await api.get('/loyalty/program');
      if (data) {
        const nextForm: LoyaltyFormState = {
          type: data.type,
          isActive: data.isActive,
          visitsRequired: data.visitsRequired ?? 10,
          visitRewardType: (data.visitRewardType as VisitRewardType) ?? 'FREE',
          visitRewardValue: data.visitRewardValue ?? 100,
          pointsPerDollar: data.pointsPerDollar ?? 1,
          pointsValue: data.pointsValue ?? 0.01,
        };

        setFormData(nextForm);
        setProgramMeta({
          name: (data.name ?? '').trim() || defaultNameForType(nextForm.type),
          description:
            (data.description ?? '').trim() || buildDefaultDescription(nextForm),
        });
      } else {
        setFormData(initialFormState);
        setProgramMeta({
          name: defaultNameForType(initialFormState.type),
          description: buildDefaultDescription(initialFormState),
        });
      }
    } catch (error) {
      console.error('Failed to load loyalty program:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReminder = (
    sequence: number,
    changes: Partial<LoyaltyReminderTouchpoint>,
  ) => {
    setReminders((prev) =>
      prev.map((item) =>
        item.sequence === sequence ? { ...item, ...changes } : item,
      ),
    );
  };

  const handleReminderFieldChange = (
    sequence: number,
    field: keyof Omit<LoyaltyReminderTouchpoint, 'sequence'>,
    value: string | number | boolean,
  ) => {
    if (field === 'thresholdValue') {
      const numericValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
      updateReminder(sequence, { thresholdValue: numericValue });
      return;
    }

    updateReminder(sequence, {
      [field]: value,
    } as Partial<LoyaltyReminderTouchpoint>);
  };

  const handleReminderToggle = (sequence: number, enabled: boolean) => {
    updateReminder(sequence, { isEnabled: enabled });
  };

  const handleSaveReminders = async () => {
    try {
      setSavingReminders(true);

      const payload = reminders.map((tp) => ({
        sequence: tp.sequence,
        thresholdValue: Number(tp.thresholdValue),
        emailSubject: tp.emailSubject?.trim() || null,
        emailBody: tp.emailBody?.trim() || null,
        smsBody: tp.smsBody?.trim() || null,
        isEnabled: tp.isEnabled,
      }));

      const hasInvalidThreshold = payload.some((tp) => !tp.thresholdValue || tp.thresholdValue <= 0);

      if (hasInvalidThreshold) {
        toast({
          title: 'Invalid threshold',
          description: 'Threshold values must be greater than 0.',
          variant: 'destructive',
        });
        return;
      }

      await api.post('/loyalty/reminders', { touchpoints: payload });
      toast({
        title: 'Reminders saved',
        description: 'Loyalty reminder touchpoints updated successfully.',
      });
      await loadReminders();
    } catch (error: any) {
      console.error('Failed to save loyalty reminders:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save loyalty reminders.',
        variant: 'destructive',
      });
    } finally {
      setSavingReminders(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const derivedName =
        programMeta.name?.trim() || defaultNameForType(formData.type);
      const derivedDescription =
        programMeta.description?.trim() || buildDefaultDescription(formData);

      const payload: any = {
        type: formData.type,
        name: derivedName,
        description: derivedDescription,
        isActive: formData.isActive,
      };

      if (formData.type === 'VISITS') {
        payload.visitsRequired = formData.visitsRequired;
        payload.visitRewardType = formData.visitRewardType;
        payload.visitRewardValue = formData.visitRewardValue;
      } else {
        payload.pointsPerDollar = formData.pointsPerDollar;
        payload.pointsValue = formData.pointsValue;
      }

      await api.post('/loyalty/program', payload);
      toast({
        title: 'Success',
        description: 'Loyalty program updated successfully',
      });
      await loadProgram();
    } catch (error: any) {
      console.error('Failed to update loyalty program:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update loyalty program',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Loyalty Program</h1>
        <p className="text-gray-600">Configure your customer loyalty rewards</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Program Settings</CardTitle>
            <CardDescription>
              Choose between a simple punch card system or a points-based rewards program
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Program Active</Label>
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>

            <div className="space-y-3">
              <Label>Program Type</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value: ProgramType) => {
                  setFormData((prev) => {
                    const next: LoyaltyFormState = { ...prev, type: value };
                    setProgramMeta((meta) => {
                      const prevDefaultName = defaultNameForType(prev.type);
                      const prevDefaultDescription = buildDefaultDescription(prev);
                      const shouldUpdateName =
                        !meta.name || meta.name === prevDefaultName;
                      const shouldUpdateDescription =
                        !meta.description || meta.description === prevDefaultDescription;
                      return {
                        name: shouldUpdateName
                          ? defaultNameForType(next.type)
                          : meta.name,
                        description: shouldUpdateDescription
                          ? buildDefaultDescription(next)
                          : meta.description,
                      };
                    });
                    return next;
                  });
                }}
              >
                <div className="flex items-center space-x-2 rounded-lg border p-4">
                  <RadioGroupItem value="VISITS" id="visits" />
                  <Label htmlFor="visits" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Gift className="h-5 w-5" />
                      <div>
                        <div className="font-medium">Punch Card (Visits-based)</div>
                        <div className="text-sm text-gray-600">
                          Customers earn rewards after a certain number of visits
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-4">
                  <RadioGroupItem value="POINTS" id="points" />
                  <Label htmlFor="points" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      <div>
                        <div className="font-medium">Points System</div>
                        <div className="text-sm text-gray-600">
                          Customers earn points based on spending
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Program Summary</Label>
              <div className="rounded-md border bg-gray-50 p-4">
                <div className="text-sm font-medium text-gray-800">
                  {programMeta.name || defaultNameForType(formData.type)}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  {programMeta.description || buildDefaultDescription(formData)}
                </div>
              </div>
            </div>

            {formData.type === 'VISITS' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="visitsRequired">Visits Required for Reward</Label>
                  <Input
                    id="visitsRequired"
                    type="number"
                    min="1"
                    value={formData.visitsRequired}
                    onChange={(e) => {
                      const value = Math.max(1, parseInt(e.target.value) || 1);
                      setFormData((prev) => {
                        const next: LoyaltyFormState = { ...prev, visitsRequired: value };
                        setProgramMeta((meta) => {
                          const prevDefault = buildDefaultDescription(prev);
                          const shouldUpdate =
                            !meta.description || meta.description === prevDefault;
                          return shouldUpdate
                            ? {
                                ...meta,
                                description: buildDefaultDescription(next),
                              }
                            : meta;
                        });
                        return next;
                      });
                    }}
                    required
                  />
                  <p className="text-sm text-gray-600">
                    After this many visits, customers receive the configured reward.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rewardType">Reward Type</Label>
                  <Select
                    value={formData.visitRewardType}
                    onValueChange={(value: VisitRewardType) => {
                      setFormData((prev) => {
                        const next: LoyaltyFormState = { ...prev, visitRewardType: value };
                        setProgramMeta((meta) => {
                          const prevDefault = buildDefaultDescription(prev);
                          const shouldUpdate =
                            !meta.description || meta.description === prevDefault;
                          return shouldUpdate
                            ? {
                                ...meta,
                                description: buildDefaultDescription(next),
                              }
                            : meta;
                        });
                        return next;
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FREE">Free reward</SelectItem>
                      <SelectItem value="PERCENTAGE">% discount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.visitRewardType === 'PERCENTAGE' && (
                  <div className="space-y-2">
                    <Label htmlFor="visitRewardValue">Discount Percentage</Label>
                    <Input
                      id="visitRewardValue"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.visitRewardValue}
                      onChange={(e) => {
                        const value = Math.min(
                          100,
                          Math.max(1, parseInt(e.target.value) || 1),
                        );
                        setFormData((prev) => {
                          const next: LoyaltyFormState = {
                            ...prev,
                            visitRewardValue: value,
                          };
                          setProgramMeta((meta) => {
                            const prevDefault = buildDefaultDescription(prev);
                            const shouldUpdate =
                              !meta.description || meta.description === prevDefault;
                            return shouldUpdate
                              ? {
                                  ...meta,
                                  description: buildDefaultDescription(next),
                                }
                              : meta;
                          });
                          return next;
                        });
                      }}
                      required
                    />
                    <p className="text-sm text-gray-600">
                      Customers receive this discount on their next service.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pointsPerDollar">Points Earned per $1</Label>
                  <Input
                    id="pointsPerDollar"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={formData.pointsPerDollar}
                    onChange={(e) => {
                      const value = Math.max(0.1, parseFloat(e.target.value) || 0.1);
                      setFormData((prev) => {
                        const next: LoyaltyFormState = {
                          ...prev,
                          pointsPerDollar: value,
                        };
                        setProgramMeta((meta) => {
                          const prevDefault = buildDefaultDescription(prev);
                          const shouldUpdate =
                            !meta.description || meta.description === prevDefault;
                          return shouldUpdate
                            ? {
                                ...meta,
                                description: buildDefaultDescription(next),
                              }
                            : meta;
                        });
                        return next;
                      });
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pointsValue">Point Value ($)</Label>
                  <Input
                    id="pointsValue"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.pointsValue}
                    onChange={(e) => {
                      const value = Math.max(0.01, parseFloat(e.target.value) || 0.01);
                      setFormData((prev) => {
                        const next: LoyaltyFormState = { ...prev, pointsValue: value };
                        setProgramMeta((meta) => {
                          const prevDefault = buildDefaultDescription(prev);
                          const shouldUpdate =
                            !meta.description || meta.description === prevDefault;
                          return shouldUpdate
                            ? {
                                ...meta,
                                description: buildDefaultDescription(next),
                              }
                            : meta;
                        });
                        return next;
                      });
                    }}
                    required
                  />
                  <p className="text-sm text-gray-600">
                    Set how much each point is worth when redeemed.
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Loyalty Reminder Touchpoints</CardTitle>
            <CardDescription>
              Configure up to three automated reminders that send when a customer reaches a visit or point threshold.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingReminders ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {reminders.map((touchpoint) => (
                  <div
                    key={touchpoint.sequence}
                    className="space-y-4 rounded-lg border p-4"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold">
                          Touchpoint {touchpoint.sequence}
                        </p>
                        <p className="text-sm text-gray-500">
                          Trigger when the customer reaches the threshold below.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Enabled</span>
                        <Switch
                          checked={touchpoint.isEnabled}
                          onCheckedChange={(value) =>
                            handleReminderToggle(touchpoint.sequence, value)
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor={`threshold-${touchpoint.sequence}`}>
                          Threshold
                        </Label>
                        <Input
                          id={`threshold-${touchpoint.sequence}`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={touchpoint.thresholdValue}
                          disabled={!touchpoint.isEnabled}
                          onChange={(e) =>
                            handleReminderFieldChange(
                              touchpoint.sequence,
                              'thresholdValue',
                              parseFloat(e.target.value),
                            )
                          }
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Applies to visits when the loyalty program is visit-based, or points when points are enabled.
                        </p>
                      </div>
                      <div>
                        <Label htmlFor={`emailSubject-${touchpoint.sequence}`}>
                          Email Subject
                        </Label>
                        <Input
                          id={`emailSubject-${touchpoint.sequence}`}
                          value={touchpoint.emailSubject}
                          disabled={!touchpoint.isEnabled}
                          onChange={(e) =>
                            handleReminderFieldChange(
                              touchpoint.sequence,
                              'emailSubject',
                              e.target.value,
                            )
                          }
                          placeholder="Thanks for being a VIP!"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor={`emailBody-${touchpoint.sequence}`}>
                          Email Body
                        </Label>
                        <Textarea
                          id={`emailBody-${touchpoint.sequence}`}
                          rows={4}
                          value={touchpoint.emailBody}
                          disabled={!touchpoint.isEnabled}
                          onChange={(e) =>
                            handleReminderFieldChange(
                              touchpoint.sequence,
                              'emailBody',
                              e.target.value,
                            )
                          }
                          placeholder="Share reward details, expiry info, or a warm thank you."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor={`smsBody-${touchpoint.sequence}`}>
                          SMS Message
                        </Label>
                        <Textarea
                          id={`smsBody-${touchpoint.sequence}`}
                          rows={3}
                          value={touchpoint.smsBody}
                          disabled={!touchpoint.isEnabled}
                          onChange={(e) =>
                            handleReminderFieldChange(
                              touchpoint.sequence,
                              'smsBody',
                              e.target.value,
                            )
                          }
                          placeholder="Eg. You've unlocked a reward! Show this message at your next visit."
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Leave the email or SMS template blank to skip that channel for this touchpoint.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <div className="flex justify-end gap-2 px-6 pb-6">
            <Button
              onClick={handleSaveReminders}
              disabled={savingReminders || loadingReminders}
              type="button"
            >
              {savingReminders ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Reminders
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
