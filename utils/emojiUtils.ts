
/**
 * Utility functions for handling emojis in interests
 */

/**
 * Removes all emojis from a string
 * This ensures that interests like "☕ Coffee" and "Coffee" are treated as the same
 */
export const stripEmojis = (text: string): string => {
  // Remove emojis using regex
  // This regex matches most emoji characters including:
  // - Standard emojis
  // - Emoji with skin tone modifiers
  // - Emoji with zero-width joiners
  // - Regional indicator symbols (flags)
  // Split into multiple ranges to avoid combined character issues
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F251}]/gu;
  
  return text
    .replace(emojiRegex, '') // Remove emojis
    .trim() // Remove leading/trailing whitespace
    .replace(/\s+/g, ' '); // Normalize multiple spaces to single space
};

/**
 * Capitalizes the first letter of each word in a string
 */
export const capitalizeInterest = (interest: string): string => {
  return interest
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Prepares an interest for database storage
 * - Strips emojis
 * - Capitalizes properly
 * - Trims whitespace
 */
export const prepareInterestForStorage = (interest: string): string => {
  const withoutEmojis = stripEmojis(interest);
  return capitalizeInterest(withoutEmojis);
};

/**
 * Checks if two interests are the same (ignoring emojis)
 */
export const areInterestsEqual = (interest1: string, interest2: string): boolean => {
  const normalized1 = prepareInterestForStorage(interest1);
  const normalized2 = prepareInterestForStorage(interest2);
  return normalized1.toLowerCase() === normalized2.toLowerCase();
};
