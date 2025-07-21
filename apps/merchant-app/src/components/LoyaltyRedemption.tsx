import React, { useState, useEffect } from 'react';
import { Gift, Star, ChevronDown, Check } from 'lucide-react';
import { Button } from '@heya-pos/ui';
import { apiClient } from '../lib/api-client';
import type { Customer } from './customers';
import type { LoyaltyCheckResponse } from '../lib/clients/loyalty-client';
import { cn } from '@heya-pos/ui';

interface LoyaltyRedemptionProps {
  customer: Customer | null;
  onRedemption: (discount: number, description: string) => void;
  currentDiscount?: number;
}

export const LoyaltyRedemption: React.FC<LoyaltyRedemptionProps> = ({
  customer,
  onRedemption,
  currentDiscount = 0,
}) => {
  const [loyalty, setLoyalty] = useState<LoyaltyCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  // Check loyalty status when customer changes
  useEffect(() => {
    if (!customer) {
      setLoyalty(null);
      setExpanded(false);
      return;
    }

    const checkLoyalty = async () => {
      setLoading(true);
      try {
        const response = await apiClient.loyalty.check(customer.id);
        setLoyalty(response);
        // Auto-expand if reward is available
        if (response.rewardAvailable) {
          setExpanded(true);
        }
      } catch (error) {
        console.error('Failed to check loyalty:', error);
        setLoyalty(null);
      } finally {
        setLoading(false);
      }
    };

    checkLoyalty();
  }, [customer?.id]);

  const handleRedeemVisit = async () => {
    if (!customer || !loyalty || loyalty.type !== 'VISITS') return;

    setRedeeming(true);
    try {
      // First, refresh loyalty status to ensure we have current data
      const currentLoyalty = await apiClient.loyalty.check(customer.id);
      setLoyalty(currentLoyalty);
      
      // Check if reward is actually available with fresh data
      if (!currentLoyalty.rewardAvailable) {
        alert(`Not enough visits. You have ${currentLoyalty.currentVisits}/${currentLoyalty.visitsRequired} visits.`);
        setRedeeming(false);
        return;
      }
      
      // DO NOT actually redeem yet - just prepare the discount
      // The actual redemption will happen after successful payment
      
      // Calculate discount based on reward type
      let discountAmount = 0;
      let description = '';
      
      if (currentLoyalty.rewardType === 'FREE') {
        // For free service, apply 100% discount
        discountAmount = 100; // 100% off
        description = '100% Off - Free Service (Loyalty Reward)';
      } else if (currentLoyalty.rewardType === 'PERCENTAGE') {
        // Percentage discount
        discountAmount = currentLoyalty.rewardValue || 0; // This is a percentage
        description = `${currentLoyalty.rewardValue}% Off (Loyalty Reward)`;
      }
      
      // Pass the discount info without actually redeeming
      onRedemption(discountAmount, description);
      
      // Don't update loyalty status - keep showing as available
      // The UI will show it as "Applied" based on currentDiscount prop
    } catch (error: any) {
      console.error('Failed to prepare loyalty discount:', error);
      alert('Failed to apply loyalty discount. Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

  const handleRedeemPoints = async () => {
    if (!customer || !loyalty || loyalty.type !== 'POINTS' || pointsToRedeem <= 0) return;

    setRedeeming(true);
    try {
      // DO NOT actually redeem yet - just prepare the discount
      // The actual redemption will happen after successful payment
      
      // Calculate dollar value based on points
      const dollarValue = (pointsToRedeem / (loyalty.currentPoints || 1)) * (loyalty.dollarValue || 0);
      
      // Apply dollar value discount
      onRedemption(dollarValue, `$${dollarValue.toFixed(2)} Loyalty Points Redemption (${pointsToRedeem} points)`);
      
      // Don't update loyalty status - keep showing current points
      // Don't reset pointsToRedeem so user can adjust if needed
    } catch (error) {
      console.error('Failed to prepare points discount:', error);
      alert('Failed to apply points discount. Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

  if (!customer || loading || !loyalty?.hasProgram) {
    return null;
  }

  const hasAppliedDiscount = currentDiscount > 0;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        disabled={hasAppliedDiscount}
      >
        <div className="flex items-center gap-2">
          {loyalty.type === 'VISITS' ? (
            <Gift className="h-5 w-5 text-yellow-600" />
          ) : (
            <Star className="h-5 w-5 text-yellow-600" />
          )}
          <span className="font-medium">Loyalty Rewards</span>
          {loyalty.rewardAvailable && !hasAppliedDiscount && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
              Available!
            </span>
          )}
          {hasAppliedDiscount && (
            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
              <Check className="h-3 w-3" />
              Applied
            </span>
          )}
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform",
          expanded ? "rotate-180" : ""
        )} />
      </button>

      {expanded && (
        <div className="p-4 bg-white border-t">
          {loyalty.type === 'VISITS' ? (
            // Visit-based rewards
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Visits</span>
                <span className="font-medium">
                  {loyalty.currentVisits} / {loyalty.visitsRequired}
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      ((loyalty.currentVisits || 0) / (loyalty.visitsRequired || 1)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>

              {loyalty.rewardAvailable && !hasAppliedDiscount && (
                <div className="pt-2">
                  <p className="text-sm text-gray-600 mb-2">
                    Reward: {loyalty.rewardType === 'FREE' ? 'Free Service' : `${loyalty.rewardValue}% Off`}
                  </p>
                  <Button
                    onClick={handleRedeemVisit}
                    disabled={redeeming}
                    className="w-full"
                    variant="primary"
                  >
                    {redeeming ? 'Redeeming...' : 'Redeem Reward'}
                  </Button>
                </div>
              )}

              {hasAppliedDiscount && (
                <p className="text-sm text-green-600 text-center">
                  Loyalty discount has been applied to this order
                </p>
              )}
            </div>
          ) : (
            // Points-based rewards
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Available Points</span>
                <span className="font-medium">{loyalty.currentPoints || 0}</span>
              </div>
              
              {loyalty.dollarValue && loyalty.dollarValue > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Point Value</span>
                  <span className="font-medium text-green-600">
                    ${loyalty.dollarValue.toFixed(2)}
                  </span>
                </div>
              )}

              {loyalty.dollarValue && loyalty.dollarValue > 0 && !hasAppliedDiscount && (
                <div className="pt-2">
                  <label className="text-sm text-gray-600 block mb-2">
                    Points to Redeem (max: {loyalty.currentPoints})
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max={loyalty.currentPoints || 0}
                      value={pointsToRedeem}
                      onChange={(e) => setPointsToRedeem(Math.min(
                        parseInt(e.target.value) || 0,
                        loyalty.currentPoints || 0
                      ))}
                      className="flex-1 px-3 py-2 border rounded-md"
                      placeholder="Enter points"
                    />
                    <Button
                      onClick={handleRedeemPoints}
                      disabled={redeeming || pointsToRedeem <= 0}
                      variant="primary"
                    >
                      {redeeming ? 'Redeeming...' : 'Redeem'}
                    </Button>
                  </div>
                  {pointsToRedeem > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Value: ${((pointsToRedeem / (loyalty.currentPoints || 1)) * (loyalty.dollarValue || 0)).toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {hasAppliedDiscount && (
                <p className="text-sm text-green-600 text-center">
                  Loyalty points have been redeemed for this order
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};