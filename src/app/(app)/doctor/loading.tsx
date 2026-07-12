import { PageSkeleton } from "@/components/common/PageSkeleton";

export default function Loading() {
  return <PageSkeleton maxWidthClass="max-w-5xl" statCells={4} cards={2} />;
}
