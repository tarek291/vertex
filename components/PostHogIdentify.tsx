"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import posthog from "posthog-js";

/**
 * Identifies the signed-in Clerk user to PostHog so that client-side events
 * and server-side events share the same distinct ID.
 * Rendered inside the ClerkProvider in the root layout.
 */
export function PostHogIdentify() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
      });
    } else {
      // User signed out — reset to a fresh anonymous session
      posthog.reset();
    }
  }, [isLoaded, user]);

  return null;
}
