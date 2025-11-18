
import * as Location from 'expo-location';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 * @param distanceKm Distance in kilometers
 * @returns Formatted string
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m away`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km away`;
  } else {
    return `${Math.round(distanceKm)}km away`;
  }
}

/**
 * Reverse geocode coordinates to get neighborhood/district and city name
 * Uses expo-location's reverseGeocodeAsync
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Formatted location string like "Near Hollywood, Los Angeles" or null if failed
 */
export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    console.log('[LocationUtils] Reverse geocoding:', latitude, longitude);
    
    const results = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });
    
    if (results && results.length > 0) {
      const location = results[0];
      console.log('[LocationUtils] Reverse geocode result:', location);
      
      // Try to build a location string from available data
      // Priority: sublocality (neighborhood) > district > city
      const neighborhood = location.sublocality || location.district;
      const city = location.city;
      
      if (neighborhood && city) {
        return `Near ${neighborhood}, ${city}`;
      } else if (city) {
        return `Near ${city}`;
      } else if (neighborhood) {
        return `Near ${neighborhood}`;
      } else if (location.region) {
        // Fallback to region if nothing else available
        return `Near ${location.region}`;
      }
    }
    
    console.log('[LocationUtils] No usable location data found');
    return null;
  } catch (error) {
    console.error('[LocationUtils] Error reverse geocoding:', error);
    return null;
  }
}

/**
 * Get display location for an event
 * Returns custom location name if provided, otherwise reverse geocodes coordinates
 * @param locationName Custom location name (can be null)
 * @param latitude Event latitude
 * @param longitude Event longitude
 * @returns Promise<string> Location string to display
 */
export async function getEventLocationDisplay(
  locationName: string | null,
  latitude: number,
  longitude: number
): Promise<string> {
  // If custom location name is provided, use it
  if (locationName && locationName.trim()) {
    return locationName;
  }
  
  // Otherwise, try to reverse geocode
  const geocodedLocation = await reverseGeocodeLocation(latitude, longitude);
  
  // Return geocoded location or fallback
  return geocodedLocation || "Location set";
}
