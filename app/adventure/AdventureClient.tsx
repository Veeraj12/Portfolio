"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Adventure } from "@/components/adventure/Adventure";
import { ARRIVAL_FLAG } from "@/components/adventure/config";

/**
 * Thin client boundary for the /adventure route. Owns nothing except the
 * "how do we leave" decision: set the arrival flag the portfolio reads to
 * fade in from the portal, then navigate home.
 */
export function AdventureClient() {
  const router = useRouter();

  const handleExit = useCallback(() => {
    try {
      sessionStorage.setItem(ARRIVAL_FLAG, "1");
    } catch {
      // sessionStorage can throw in locked-down environments; exiting still works without it.
    }
    router.push("/");
  }, [router]);

  return <Adventure onExit={handleExit} />;
}
