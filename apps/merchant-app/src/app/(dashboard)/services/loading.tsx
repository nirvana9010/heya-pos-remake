import { Skeleton, TableSkeleton } from '@heya-pos/ui'

export default function ServicesLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-in fade-in-0 duration-200">
      {/* Header skeleton */}
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="container max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1 max-w-lg">
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="container max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border">
          <TableSkeleton rows={8} columns={7} />
        </div>
      </div>
    </div>
  )
}