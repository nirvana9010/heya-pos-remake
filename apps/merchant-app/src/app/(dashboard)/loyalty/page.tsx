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

export default function LoyaltyPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<LoyaltyFormState>(initialFormState);
  const [programMeta, setProgramMeta] = useState({
    name: defaultNameForType(initialFormState.type),
    description: buildDefaultDescription(initialFormState),
  });

  useEffect(() => {
    loadProgram();
  }, []);

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
    </div>
  );
}
