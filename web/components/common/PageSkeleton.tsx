import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic page-shaped loading state: heading, optional stat row, and a stack
 * of card placeholders. Used by the per-route loading.tsx files.
 */
export function PageSkeleton({
  maxWidthClass = "max-w-4xl",
  statCells = 0,
  cards = 2,
}: {
  maxWidthClass?: string;
  statCells?: number;
  cards?: number;
}) {
  return (
    <div className={`mx-auto ${maxWidthClass} space-y-8 px-4 py-10 sm:px-6`}>
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {statCells > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: statCells }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}

      {Array.from({ length: cards }).map((_, i) => (
        <Skeleton key={i} className="h-44 rounded-xl" />
      ))}
    </div>
  );
}
