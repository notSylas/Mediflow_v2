import { PageSkeleton } from "@/components/PageSkeleton";

export default function Loading() {
  return <PageSkeleton maxWidthClass="max-w-5xl" statCells={4} cards={2} />;
}
