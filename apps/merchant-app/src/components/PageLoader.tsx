'use client';

import React from 'react';

interface PageLoaderProps {
  pageName?: string;
}

export function PageLoader({ pageName }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      {/* Spinner */}
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-gray-200"></div>
        <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
      </div>
      
      {/* Loading text */}
      <div className="text-center">
        <p className="text-gray-600 font-medium">
          Loading {pageName || 'page'}...
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Please wait a moment
        </p>
      </div>
    </div>
  );
}

// Skeleton loader for table-based pages
export function TablePageLoader() {
  return (
    <div className="p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-100 rounded w-64"></div>
      </div>
      
      {/* Search bar skeleton */}
      <div className="mb-4 flex gap-2">
        <div className="h-10 bg-gray-200 rounded flex-1 max-w-md"></div>
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>
      
      {/* Table skeleton */}
      <div className="bg-white rounded-lg shadow">
        {/* Table header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex gap-4">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
        
        {/* Table rows */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border-b border-gray-100 p-4">
            <div className="flex gap-4">
              <div className="h-4 bg-gray-100 rounded w-32"></div>
              <div className="h-4 bg-gray-100 rounded w-48"></div>
              <div className="h-4 bg-gray-100 rounded w-24"></div>
              <div className="h-4 bg-gray-100 rounded w-32"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Card-based loader for dashboard-style pages
export function CardPageLoader() {
  return (
    <div className="p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-100 rounded w-64"></div>
      </div>
      
      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-100 rounded w-full"></div>
              <div className="h-4 bg-gray-100 rounded w-5/6"></div>
              <div className="h-4 bg-gray-100 rounded w-4/6"></div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="h-8 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}