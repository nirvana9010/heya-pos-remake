'use client';

import { useEffect, useState } from 'react';
import { Card } from '@heya-pos/ui';
import { Badge } from '@heya-pos/ui';
import { Button } from '@heya-pos/ui';
import { Gift, Star, TrendingUp, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api-wrapper';
import { cn } from '@heya-pos/ui';

interface LoyaltyProgram {
  type: 'VISITS' | 'POINTS';
  name: string;
  isActive: boolean;
  visitsRequired?: number;
  visitRewardType?: 'FREE' | 'PERCENTAGE';
  visitRewardValue?: number;
  pointsPerDollar?: number;
  pointsValue?: number;
}

interface CustomerLoyalty {
  currentPoints: number;
  currentVisits: number;
  lifetimePoints: number;
  lifetimeVisits: number;
  canRedeem: boolean;
  nearReward?: boolean;
  visitsUntilReward?: number;
  availableRedemption?: {
    type: 'VISITS' | 'POINTS';
    value: number;
    description: string;
  };
}

interface LoyaltyStatusDisplayProps {
  customerId: string;
  compact?: boolean;
  onRedeem?: () => void;
  showActions?: boolean;
}

export function LoyaltyStatusDisplay({ 
  customerId, 
  compact = false,
  onRedeem,
  showActions = true
}: LoyaltyStatusDisplayProps) {
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [loyalty, setLoyalty] = useState<CustomerLoyalty | null>(null);

  useEffect(() => {
    if (customerId) {
      loadLoyaltyData();
    }
  }, [customerId]);

  const loadLoyaltyData = async () => {
    try {
      setLoading(true);
      const [programData, loyaltyData] = await Promise.all([
        api.get('/loyalty/program'),
        api.get(`/loyalty/customers/${customerId}`)
      ]);
      
      setProgram(programData);
      setLoyalty(loyaltyData);
    } catch (error) {
      console.error('Failed to load loyalty data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !program?.isActive || !loyalty) {
    return null;
  }

  const isVisitsBased = program.type === 'VISITS';
  const progress = isVisitsBased 
    ? (loyalty.currentVisits / (program.visitsRequired || 10)) * 100
    : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isVisitsBased ? (
          <>
            <Gift className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-medium">
              {loyalty.currentVisits}/{program.visitsRequired} visits
            </span>
            {loyalty.canRedeem && (
              <Badge variant="default" className="text-xs">
                Reward Available
              </Badge>
            )}
          </>
        ) : (
          <>
            <Star className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium">
              {loyalty.currentPoints} points
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium flex items-center gap-2">
            {isVisitsBased ? (
              <>
                <Gift className="h-5 w-5 text-teal-600" />
                {program.name}
              </>
            ) : (
              <>
                <Star className="h-5 w-5 text-yellow-600" />
                {program.name}
              </>
            )}
          </h4>
          {loyalty.canRedeem && showActions && (
            <Button size="sm" onClick={onRedeem}>
              Redeem
            </Button>
          )}
        </div>

        {isVisitsBased ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">
                  {loyalty.currentVisits} / {program.visitsRequired} visits
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all",
                    loyalty.canRedeem ? "bg-green-600" : "bg-teal-600"
                  )}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            {loyalty.canRedeem ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <div>
                    <p className="font-medium">
                      {program.visitRewardType === 'FREE' 
                        ? 'Free service earned!' 
                        : `${program.visitRewardValue}% discount earned!`}
                    </p>
                    <p className="text-sm text-green-600">
                      Ready to redeem on next visit
                    </p>
                  </div>
                </div>
              </div>
            ) : loyalty.nearReward ? (
              <p className="text-sm text-gray-600">
                <TrendingUp className="inline h-4 w-4 mr-1" />
                Only {loyalty.visitsUntilReward} more {loyalty.visitsUntilReward === 1 ? 'visit' : 'visits'} until reward!
              </p>
            ) : null}
          </>
        ) : (
          <>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Available Points</span>
                <span className="text-lg font-semibold">{loyalty.currentPoints}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Point Value</span>
                <span className="text-sm font-medium">
                  ${(loyalty.currentPoints * (program.pointsValue || 0.01)).toFixed(2)}
                </span>
              </div>
            </div>

            {loyalty.currentPoints >= 100 && (
              <p className="text-sm text-green-600">
                <CheckCircle className="inline h-4 w-4 mr-1" />
                Points available for redemption
              </p>
            )}
          </>
        )}

        {showActions && (
          <div className="pt-2 border-t text-xs text-gray-500">
            Lifetime: {loyalty.lifetimeVisits} visits • 
            {isVisitsBased 
              ? ` ${Math.floor(loyalty.lifetimeVisits / (program.visitsRequired || 10))} rewards earned`
              : ` ${loyalty.lifetimePoints} points earned`}
          </div>
        )}
      </div>
    </Card>
  );
}