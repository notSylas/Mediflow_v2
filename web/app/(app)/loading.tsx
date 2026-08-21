import { BootLoader } from "@/components/common/BootLoader";

// Boundary for the (app) layout's session check (src/app/(app)/layout.tsx),
// not for individual pages — those keep their own PageSkeleton loading.tsx.
export default function Loading() {
  return <BootLoader />;
}
