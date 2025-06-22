'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Loader2, Save, Gift, CreditCard } from 'lucide-react';

interface LoyaltyProgram {
  id: string;
  type: 'VISITS' | 'POINTS';
  name: string;
  description?: string;
  isActive: boolean;
  // Visit-based
  visitsRequired?: number;
  visitRewardType?: 'FREE' | 'PERCENTAGE';
  visitRewardValue?: number;
  // Points-based
  pointsPerDollar?: number;
  pointsValue?: number;
}

export default function LoyaltyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [formData, setFormData] = useState({
    type: 'VISITS' as 'VISITS' | 'POINTS',
    name: '',
    description: '',
    isActive: true,
    // Visit-based
    visitsRequired: 10,
    visitRewardType: 'FREE' as 'FREE' | 'PERCENTAGE',
    visitRewardValue: 100,
    // Points-based
    pointsPerDollar: 1,
    pointsValue: 0.01,
  });

  useEffect(() => {
    loadProgram();
  }, []);

  const loadProgram = async () => {
    try {
      const data = await api.get('/loyalty/program');
      setProgram(data);
      if (data) {
        setFormData({
          type: data.type,
          name: data.name || '',
          description: data.description || '',
          isActive: data.isActive,
          visitsRequired: data.visitsRequired || 10,
          visitRewardType: data.visitRewardType || 'FREE',
          visitRewardValue: data.visitRewardValue || 100,
          pointsPerDollar: data.pointsPerDollar || 1,
          pointsValue: data.pointsValue || 0.01,
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
      const payload: any = {
        type: formData.type,
        name: formData.name,
        description: formData.description,
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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
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
            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Program Active</Label>
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            {/* Program Type */}
            <div className="space-y-3">
              <Label>Program Type</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value: 'VISITS' | 'POINTS') => setFormData({ ...formData, type: value })}
              >
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
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
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
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

            {/* Program Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Program Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={formData.type === 'VISITS' ? 'Punch Card Rewards' : 'Beauty Points'}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your loyalty program benefits"
                rows={3}
              />
            </div>

            {/* Type-specific Settings */}
            {formData.type === 'VISITS' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="visitsRequired">Visits Required for Reward</Label>
                  <Input
                    id="visitsRequired"
                    type="number"
                    min="1"
                    value={formData.visitsRequired}
                    onChange={(e) => setFormData({ ...formData, visitsRequired: parseInt(e.target.value) || 1 })}
                    required
                  />
                  <p className="text-sm text-gray-600">
                    After this many visits, customer gets a reward
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rewardType">Reward Type</Label>
                  <Select
                    value={formData.visitRewardType}
                    onValueChange={(value: 'FREE' | 'PERCENTAGE') => 
                      setFormData({ ...formData, visitRewardType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FREE">Free Service</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage Discount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.visitRewardType === 'PERCENTAGE' && (
                  <div className="space-y-2">
                    <Label htmlFor="rewardValue">Discount Percentage</Label>
                    <Input
                      id="rewardValue"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.visitRewardValue}
                      onChange={(e) => setFormData({ ...formData, visitRewardValue: parseInt(e.target.value) || 1 })}
                      required
                    />
                    <p className="text-sm text-gray-600">
                      Percentage off their next service (1-100)
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pointsPerDollar">Points per Dollar Spent</Label>
                  <Input
                    id="pointsPerDollar"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={formData.pointsPerDollar}
                    onChange={(e) => setFormData({ ...formData, pointsPerDollar: parseFloat(e.target.value) || 1 })}
                    required
                  />
                  <p className="text-sm text-gray-600">
                    How many points customers earn per $1 spent
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pointsValue">Dollar Value per Point</Label>
                  <Input
                    id="pointsValue"
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={formData.pointsValue}
                    onChange={(e) => setFormData({ ...formData, pointsValue: parseFloat(e.target.value) || 0.01 })}
                    required
                  />
                  <p className="text-sm text-gray-600">
                    How much each point is worth when redeemed (e.g., 0.01 = 1 cent)
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Program
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}