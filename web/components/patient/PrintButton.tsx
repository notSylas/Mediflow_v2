"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({
  label = "Print / Save as PDF",
  targetId,
}: {
  label?: string;
  targetId?: string;
}) {
  const print = () => {
    if (!targetId) {
      window.print();
      return;
    }

    const target = document.getElementById(targetId);
    if (!target) {
      window.print();
      return;
    }

    document.body.classList.add("printing-selected-prescription");
    target.classList.add("is-printing-target");

    const cleanup = () => {
      document.body.classList.remove("printing-selected-prescription");
      target.classList.remove("is-printing-target");
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);
    window.print();
    window.setTimeout(cleanup, 1000);
  };

  return (
    <Button variant="outline" onClick={print} className="print:hidden">
      <Printer className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
