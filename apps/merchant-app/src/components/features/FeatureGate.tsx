import React from 'react';
import { useFeatures } from '../../lib/features/feature-service';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  dependencies?: string[];
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback = null,
  dependencies = []
}: FeatureGateProps) {
  const { hasFeature } = useFeatures();

  // Check main feature
  const hasMainFeature = hasFeature(feature);
  
  // Check all dependencies
  const hasDependencies = dependencies.length === 0 || 
    dependencies.every(dep => hasFeature(dep));

  if (hasMainFeature && hasDependencies) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

// Hook for conditional feature logic
export function useFeatureGate(feature: string, dependencies: string[] = []) {
  const { hasFeature } = useFeatures();
  
  const hasMainFeature = hasFeature(feature);
  const hasDependencies = dependencies.length === 0 || 
    dependencies.every(dep => hasFeature(dep));

  return hasMainFeature && hasDependencies;
}