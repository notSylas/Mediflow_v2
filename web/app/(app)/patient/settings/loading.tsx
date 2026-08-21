import { PageSkeleton } from "@/components/common/PageSkeleton";

export default function Loading() {
  return <PageSkeleton maxWidthClass="max-w-2xl" statCells={0} cards={2} />;
}
