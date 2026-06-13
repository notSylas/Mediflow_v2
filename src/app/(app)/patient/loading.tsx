import { PageSkeleton } from "@/components/PageSkeleton";

export default function Loading() {
  return <PageSkeleton maxWidthClass="max-w-4xl" statCells={3} cards={1} />;
}
