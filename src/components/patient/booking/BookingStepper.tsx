"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/core/utils";

const STEPS = ["Details", "Time", "Payment", "Done"];

export function BookingStepper({ currentIndex }: { currentIndex: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Booking progress">
      {STEPS.map((label, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                  isDone && "border-primary bg-primary text-primary-foreground",
                  isCurrent && "border-primary text-primary ring-4 ring-primary/10",
                  !isDone && !isCurrent && "border-border text-muted-foreground"
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm sm:block",
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </span>
            {index < STEPS.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1",
                  index < currentIndex ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
