"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

/**
 * Component that automatically syncs the logged-in user from Clerk to Supabase
 * This component should be included in protected layouts to ensure users are synced
 */
export function UserSync() {
  const { userId, isLoaded } = useAuth();

  useEffect(() => {
    // Only sync if user is loaded and authenticated
    if (isLoaded && userId) {
      syncUser();
    }
  }, [isLoaded, userId]);

  const syncUser = async () => {
    try {
      const response = await fetch("/api/auth/sync-user", {
        method: "POST",
      });

      if (!response.ok) {
        console.error("Failed to sync user:", await response.text());
      } else {
        console.log("User synced successfully");
      }
    } catch (error) {
      console.error("Error syncing user:", error);
    }
  };

  // This component doesn't render anything
  return null;
}
