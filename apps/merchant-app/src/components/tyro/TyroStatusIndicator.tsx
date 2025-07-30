"use client";

import React from 'react';
import { useTyro } from '../../hooks/useTyro';
import { Badge } from '@heya-pos/ui';
import { Button } from '@heya-pos/ui';
import { CheckCircle, AlertCircle, Settings, Loader2 } from 'lucide-react';

interface TyroStatusIndicatorProps {
  onConfigureClick?: () => void;
  showConfigureButton?: boolean;
  className?: string;
}

export const TyroStatusIndicator: React.FC<TyroStatusIndicatorProps> = ({
  onConfigureClick,
  showConfigureButton = true,
  className,
}) => {
  const { isAvailable, isPaired, getPairingInfo, sdkLoaded } = useTyro();

  const available = isAvailable();
  const paired = isPaired();
  const pairingInfo = getPairingInfo();

  const getStatus = () => {
    // Show loading state while SDK is loading
    if (!sdkLoaded) {
      return {
        label: 'Loading...',
        variant: 'secondary' as const,
        icon: Loader2,
        color: 'text-gray-600',
        description: 'Loading Tyro SDK',
        isLoading: true,
      };
    }

    if (!available) {
      return {
        label: 'SDK Not Available',
        variant: 'destructive' as const,
        icon: AlertCircle,
        color: 'text-red-600',
        description: 'Tyro API key not configured',
      };
    }

    if (!paired) {
      return {
        label: 'Not Paired',
        variant: 'secondary' as const,
        icon: AlertCircle,
        color: 'text-orange-600',
        description: 'Terminal needs to be paired',
      };
    }

    return {
      label: 'Ready',
      variant: 'default' as const,
      icon: CheckCircle,
      color: 'text-green-600',
      description: `Paired with Terminal ${pairingInfo.terminalId}`,
    };
  };

  const status = getStatus();
  const Icon = status.icon;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Badge variant={status.variant} className="flex items-center gap-1">
          <Icon className={`h-3 w-3 ${status.isLoading ? 'animate-spin' : ''}`} />
          Tyro: {status.label}
        </Badge>
      </div>

      {showConfigureButton && onConfigureClick && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onConfigureClick}
          className="h-6 px-2"
        >
          <Settings className="h-3 w-3 mr-1" />
          Configure
        </Button>
      )}

      {paired && pairingInfo.terminalId && (
        <span className="text-xs text-muted-foreground">
          Terminal: {pairingInfo.terminalId}
        </span>
      )}
    </div>
  );
};