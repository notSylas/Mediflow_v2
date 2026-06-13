import { PageSkeleton } from "@/components/PageSkeleton";

export default function Loading() {
  return <PageSkeleton maxWidthClass="max-w-3xl" statCells={0} cards={3} />;
}
