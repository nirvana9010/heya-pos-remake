'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@heya-pos/ui';
import { Button } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Label } from '@heya-pos/ui';
import { Textarea } from '@heya-pos/ui';
import { useToast } from '@heya-pos/ui';
import { Gift, Star, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-wrapper';

interface LoyaltyDialogProps {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    loyaltyPoints?: number;
    loyaltyVisits?: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function LoyaltyDialog({ customer, open, onOpenChange, onSuccess }: LoyaltyDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [program, setProgram] = useState<any>(null);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  useEffect(() => {
    if (open && customer.id) {
      loadLoyaltyData();
    }
  }, [open, customer.id]);

  const loadLoyaltyData = async () => {
    try {
      setLoading(true);
      const [programData, loyaltyData] = await Promise.all([
        api.get('/loyalty/program'),
        api.get(`/loyalty/customers/${customer.id}`)
      ]);
      
      setProgram(programData);
      setLoyalty(loyaltyData);
    } catch (error) {
      console.error('Failed to load loyalty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemVisits = async () => {
    setProcessing(true);
    try {
      await api.post('/loyalty/redeem-visit', {
        customerId: customer.id
      });

      toast({
        title: 'Success',
        description: 'Visit reward redeemed successfully',
      });

      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to redeem visit reward',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRedeemPoints = async () => {
    const points = parseInt(pointsToRedeem);
    if (!points || points <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid number of points',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      await api.post('/loyalty/redeem-points', {
        customerId: customer.id,
        points
      });

      toast({
        title: 'Success',
        description: `Redeemed ${points} points successfully`,
      });

      setPointsToRedeem('');
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to redeem points',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleAdjustment = async (type: 'visits' | 'points', value: number) => {
    if (!adjustmentReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for the adjustment',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      const payload: any = {
        customerId: customer.id,
        reason: adjustmentReason
      };

      if (type === 'visits') {
        payload.visits = value;
      } else {
        payload.points = value;
      }

      await api.post('/loyalty/adjust', payload);

      toast({
        title: 'Success',
        description: 'Loyalty adjustment completed',
      });

      setAdjustmentReason('');
      if (onSuccess) onSuccess();
      await loadLoyaltyData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to adjust loyalty',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {program?.type === 'VISITS' ? (
              <>
                <Gift className="h-5 w-5 text-teal-600" />
                Loyalty Management
              </>
            ) : (
              <>
                <Star className="h-5 w-5 text-yellow-600" />
                Loyalty Points
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Manage loyalty for {customer.firstName} {customer.lastName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !program?.isActive ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No active loyalty program</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              {program.type === 'VISITS' ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Current Visits</span>
                    <span className="text-2xl font-bold text-teal-600">
                      {loyalty?.currentVisits || 0}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-teal-600"
                      style={{ 
                        width: `${Math.min(((loyalty?.currentVisits || 0) / program.visitsRequired) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-600">
                    {program.visitsRequired - (loyalty?.currentVisits || 0)} more visits until reward
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Available Points</span>
                    <span className="text-2xl font-bold text-yellow-600">
                      {loyalty?.currentPoints || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Point Value</span>
                    <span className="text-sm font-medium">
                      ${((loyalty?.currentPoints || 0) * program.pointsValue).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Redemption */}
            {program.type === 'VISITS' && loyalty?.canRedeem && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Redeem Reward</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-green-800">
                    {program.visitRewardType === 'FREE' 
                      ? 'Customer has earned a free service!' 
                      : `Customer has earned a ${program.visitRewardValue}% discount!`}
                  </p>
                </div>
                <Button
                  onClick={handleRedeemVisits}
                  disabled={processing}
                  className="w-full"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Gift className="h-4 w-4 mr-2" />
                  )}
                  Redeem Visit Reward
                </Button>
              </div>
            )}

            {program.type === 'POINTS' && (loyalty?.currentPoints || 0) > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Redeem Points</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[100, 200, 500].map((points) => (
                      <Button
                        key={points}
                        variant="outline"
                        size="sm"
                        onClick={() => setPointsToRedeem(points.toString())}
                        disabled={(loyalty?.currentPoints || 0) < points}
                      >
                        {points} pts
                        <br />
                        <span className="text-xs">
                          ${(points * program.pointsValue).toFixed(2)}
                        </span>
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Custom amount"
                      value={pointsToRedeem}
                      onChange={(e) => setPointsToRedeem(e.target.value)}
                      max={loyalty?.currentPoints || 0}
                    />
                    <Button
                      onClick={handleRedeemPoints}
                      disabled={processing || !pointsToRedeem}
                    >
                      Redeem
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Adjustment */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Manual Adjustment</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="reason">Reason for adjustment</Label>
                  <Textarea
                    id="reason"
                    placeholder="e.g., Compensation for service issue"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {program.type === 'VISITS' ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdjustment('visits', 1)}
                        disabled={processing}
                      >
                        +1 Visit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdjustment('visits', -1)}
                        disabled={processing || (loyalty?.currentVisits || 0) === 0}
                      >
                        -1 Visit
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdjustment('points', 50)}
                        disabled={processing}
                      >
                        +50 Points
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdjustment('points', -50)}
                        disabled={processing || (loyalty?.currentPoints || 0) < 50}
                      >
                        -50 Points
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}