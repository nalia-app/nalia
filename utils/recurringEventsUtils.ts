
import { supabase } from "@/app/integrations/supabase/client";

/**
 * Check if an event has expired (6 hours after event time)
 * Recurring events never expire
 */
export const isEventExpired = (
  eventDate: string,
  eventTime: string,
  isRecurring: boolean
): boolean => {
  if (isRecurring) {
    return false; // Recurring events never expire
  }

  const eventDateTime = new Date(`${eventDate}T${eventTime}`);
  const expirationTime = new Date(eventDateTime.getTime() + 6 * 60 * 60 * 1000); // 6 hours after event
  const now = new Date();

  return now > expirationTime;
};

/**
 * Call the Edge Function to update all recurring events
 * This should be called periodically (e.g., when app opens)
 */
export const updateRecurringEvents = async (): Promise<void> => {
  try {
    console.log("[RecurringEvents] Calling update function...");
    
    const { data, error } = await supabase.functions.invoke("update-recurring-events", {
      body: {},
    });

    if (error) {
      console.error("[RecurringEvents] Error updating recurring events:", error);
      return;
    }

    console.log("[RecurringEvents] Update result:", data);
  } catch (error) {
    console.error("[RecurringEvents] Exception updating recurring events:", error);
  }
};

/**
 * Format recurring event description for display
 */
export const formatRecurringDescription = (
  recurrenceType: string | null,
  recurrenceDayName: string | null,
  recurrenceWeekOfMonth: number | null
): string => {
  if (!recurrenceType) {
    return "";
  }

  if (recurrenceType === "weekly") {
    return `Every ${recurrenceDayName}`;
  } else if (recurrenceType === "monthly" && recurrenceWeekOfMonth && recurrenceDayName) {
    const weekNames = ["First", "Second", "Third", "Fourth", "Last"];
    const weekName = weekNames[recurrenceWeekOfMonth - 1] || "First";
    return `${weekName} ${recurrenceDayName} of every month`;
  }

  return "Recurring event";
};
