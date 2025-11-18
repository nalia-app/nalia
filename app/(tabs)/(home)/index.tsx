
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Alert,
  Platform,
  Image,
  Modal,
} from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useUser } from "@/contexts/UserContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { supabase } from "@/app/integrations/supabase/client";
import { calculateDistance, getEventLocationDisplay } from "@/utils/locationUtils";
import { useFocusEffect } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");

interface EventBubble {
  id: string;
  hostName: string;
  description: string;
  attendees: number;
  latitude: number;
  longitude: number;
  icon: string;
  isPublic: boolean;
  tags: string[];
  eventDate: string;
  eventTime: string;
  locationName: string | null;
  isRecurring: boolean;
  recurrenceType: string | null;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [filter, setFilter] = useState<"all" | "interests">("all");
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7849, lng: -122.4094 });
  const [events, setEvents] = useState<EventBubble[]>([]);
  const [loading, setLoading] = useState(true);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<EventBubble | null>(null);
  const [showEventPreview, setShowEventPreview] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const webViewRef = useRef<WebView>(null);
  const [mapKey, setMapKey] = useState(0);
  const lastReloadTimeRef = useRef<number>(0);
  const [previewLocation, setPreviewLocation] = useState<string>("Location set");
  const [loadingPreviewLocation, setLoadingPreviewLocation] = useState(false);

  const loadLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("[HomeScreen] Location permission denied");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setMapCenter({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      console.log("[HomeScreen] Location obtained:", loc.coords);

      // Update user's location in database
      if (user) {
        await supabase
          .from("profiles")
          .update({
            last_latitude: loc.coords.latitude,
            last_longitude: loc.coords.longitude,
            last_location_updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      }
    } catch (error) {
      console.error("[HomeScreen] Error getting location:", error);
    }
  };

  const loadNearbyCount = async () => {
    try {
      if (!location || !user) return;

      console.log("[HomeScreen] Loading nearby users count...");

      // Fetch all users who want to appear in nearby (excluding current user)
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, last_latitude, last_longitude")
        .eq("show_in_nearby", true)
        .neq("id", user.id)
        .not("last_latitude", "is", null)
        .not("last_longitude", "is", null);

      if (error) {
        console.error("[HomeScreen] Error loading nearby count:", error);
        return;
      }

      // Calculate distances and count users within 50km
      const nearbyUsers = (profiles || []).filter((profile) => {
        const distance = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          profile.last_latitude!,
          profile.last_longitude!
        );
        return distance <= 50;
      });

      console.log(`[HomeScreen] Found ${nearbyUsers.length} users nearby`);
      setNearbyCount(nearbyUsers.length);
    } catch (error) {
      console.error("[HomeScreen] Error in loadNearbyCount:", error);
    }
  };

  const loadUnreadNotificationsCount = async () => {
    try {
      if (!user) return;

      console.log("[HomeScreen] Loading unread notifications count...");

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) {
        console.error("[HomeScreen] Error loading unread notifications count:", error);
        return;
      }

      console.log(`[HomeScreen] Found ${count || 0} unread notifications`);
      setUnreadNotificationsCount(count || 0);
    } catch (error) {
      console.error("[HomeScreen] Error in loadUnreadNotificationsCount:", error);
    }
  };

  const isEventExpired = (eventDate: string, eventTime: string, isRecurring: boolean): boolean => {
    if (isRecurring) {
      return false; // Recurring events never expire
    }
    
    const eventDateTime = new Date(`${eventDate}T${eventTime}`);
    const expirationTime = new Date(eventDateTime.getTime() + 6 * 60 * 60 * 1000); // 6 hours after event
    const now = new Date();
    
    return now > expirationTime;
  };

  const loadEvents = async () => {
    try {
      console.log('[HomeScreen] Loading events...');
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      console.log('[HomeScreen] Today\'s date:', today);
      
      // Fetch events from database - get all events (we'll filter expired ones in code)
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });

      if (eventsError) {
        console.error('[HomeScreen] Error loading events:', eventsError);
        setLoading(false);
        return;
      }

      console.log('[HomeScreen] Raw events from database:', eventsData?.length || 0);
      if (eventsData && eventsData.length > 0) {
        console.log('[HomeScreen] Sample event dates:', eventsData.slice(0, 3).map(e => ({ date: e.event_date, time: e.event_time, desc: e.description })));
      }

      // Filter out expired non-recurring events
      const activeEvents = (eventsData || []).filter(event => {
        const expired = isEventExpired(event.event_date, event.event_time, event.is_recurring);
        if (expired) {
          console.log('[HomeScreen] Filtering out expired event:', event.description, event.event_date);
        }
        return !expired;
      });

      console.log('[HomeScreen] Active events after filtering:', activeEvents.length);

      // Get attendee counts for each event
      const eventsWithAttendees = await Promise.all(
        activeEvents.map(async (event) => {
          // Count all approved attendees (including host, since host is in event_attendees table)
          const { count } = await supabase
            .from('event_attendees')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'approved');

          const attendeeCount = count || 0; // No need to add 1 since host is already in the table
          console.log(`[HomeScreen] Event "${event.description}" has ${attendeeCount} attendees (including host)`);

          return {
            id: event.id,
            hostName: event.host_name,
            description: event.description,
            attendees: attendeeCount,
            latitude: event.latitude,
            longitude: event.longitude,
            icon: event.icon,
            isPublic: event.is_public || false,
            tags: event.tags || [],
            eventDate: event.event_date,
            eventTime: event.event_time,
            locationName: event.location_name,
            isRecurring: event.is_recurring || false,
            recurrenceType: event.recurrence_type,
          };
        })
      );

      console.log('[HomeScreen] Events with attendees:', eventsWithAttendees.length);
      setEvents(eventsWithAttendees);
      setLoading(false);
      lastReloadTimeRef.current = Date.now();
    } catch (error) {
      console.error('[HomeScreen] Error in loadEvents:', error);
      setLoading(false);
    }
  };

  // New function to reload events (called when screen is focused)
  const reloadEvents = React.useCallback(async () => {
    console.log('[HomeScreen] Reloading events...');
    await loadEvents();
  }, []);

  useEffect(() => {
    console.log('[HomeScreen] Initializing...');
    loadLocation();
    loadEvents();
    
    if (user) {
      loadUnreadNotificationsCount();
    }
    
    // Subscribe to real-time event changes
    const eventsChannel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        (payload) => {
          console.log('[HomeScreen] Event change detected:', payload);
          loadEvents();
        }
      )
      .subscribe();

    // Subscribe to real-time event_attendees changes
    const attendeesChannel = supabase
      .channel('attendees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_attendees'
        },
        (payload) => {
          console.log('[HomeScreen] Attendee change detected:', payload);
          loadEvents();
        }
      )
      .subscribe();

    // Subscribe to real-time notifications changes
    let notificationsChannel: any = null;
    if (user) {
      notificationsChannel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[HomeScreen] Notification change detected:', payload);
            loadUnreadNotificationsCount();
          }
        )
        .subscribe();
    }

    return () => {
      console.log('[HomeScreen] Cleaning up subscriptions');
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(attendeesChannel);
      if (notificationsChannel) {
        supabase.removeChannel(notificationsChannel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Use useFocusEffect to reload events and notifications when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('[HomeScreen] Screen focused, checking if reload needed');
      const now = Date.now();
      const timeSinceLastReload = now - lastReloadTimeRef.current;
      
      // Only reload if it's been more than 1 second since last reload
      // This prevents double-reloading on initial mount
      if (timeSinceLastReload > 1000) {
        console.log('[HomeScreen] Reloading events due to screen focus');
        reloadEvents();
        if (user) {
          loadUnreadNotificationsCount();
        }
      }
    }, [reloadEvents, user])
  );

  useEffect(() => {
    if (location) {
      loadNearbyCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // Force map reload when events change
  useEffect(() => {
    if (events.length > 0) {
      console.log('[HomeScreen] Events updated, reloading map. Event count:', events.length);
      setMapKey(prev => prev + 1);
    }
  }, [events]);

  // Filter events based on user interests
  const filteredEvents = filter === "interests" && user?.interests
    ? events.filter(event =>
        event.tags.some(tag =>
          user.interests.some(interest =>
            interest.toLowerCase().includes(tag.toLowerCase()) ||
            tag.toLowerCase().includes(interest.toLowerCase())
          )
        )
      )
    : events;

  const centerMap = () => {
    if (location && webViewRef.current) {
      const newCenter = { lat: location.coords.latitude, lng: location.coords.longitude };
      setMapCenter(newCenter);
      
      // Send message to WebView to center map
      webViewRef.current.injectJavaScript(`
        if (window.map) {
          window.map.setView([${newCenter.lat}, ${newCenter.lng}], 15);
        }
        true;
      `);
    } else {
      Alert.alert("Location Unavailable", "Unable to get your location");
    }
  };

  const handleCreateEvent = () => {
    console.log("Create event pressed");
    router.push("/create-event" as any);
  };

  const handleNotifications = () => {
    console.log("Notifications pressed");
    router.push("/notifications" as any);
  };

  const handleProfile = () => {
    console.log("Profile pressed");
    router.push("/(tabs)/profile" as any);
  };

  const handlePeopleNearby = () => {
    console.log("People nearby pressed");
    router.push("/people-nearby" as any);
  };

  const handleEventClick = async (event: EventBubble) => {
    console.log('[HomeScreen] Event clicked, fetching fresh data for event:', event.id);
    
    // Fetch fresh attendee count for this specific event
    try {
      const { count } = await supabase
        .from('event_attendees')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('status', 'approved');

      const freshAttendeeCount = count || 0; // No need to add 1 since host is already in the table
      console.log(`[HomeScreen] Fresh attendee count for "${event.description}": ${freshAttendeeCount}`);

      // Update the event with fresh data
      const updatedEvent = {
        ...event,
        attendees: freshAttendeeCount
      };

      setSelectedEvent(updatedEvent);
      setShowEventPreview(true);
      
      // Load location display for preview
      loadPreviewLocation(event.locationName, event.latitude, event.longitude);
    } catch (error) {
      console.error('[HomeScreen] Error fetching fresh attendee count:', error);
      // Fall back to cached data
      setSelectedEvent(event);
      setShowEventPreview(true);
      
      // Load location display for preview
      loadPreviewLocation(event.locationName, event.latitude, event.longitude);
    }
  };

  const loadPreviewLocation = async (
    locationName: string | null,
    latitude: number,
    longitude: number
  ) => {
    try {
      setLoadingPreviewLocation(true);
      console.log("[HomeScreen] Loading preview location for:", locationName, latitude, longitude);
      
      const location = await getEventLocationDisplay(locationName, latitude, longitude);
      setPreviewLocation(location);
      
      console.log("[HomeScreen] Preview location set to:", location);
    } catch (error) {
      console.error("[HomeScreen] Error loading preview location:", error);
      setPreviewLocation("Location set");
    } finally {
      setLoadingPreviewLocation(false);
    }
  };

  const handleViewDetails = () => {
    if (selectedEvent) {
      setShowEventPreview(false);
      router.push(`/event/${selectedEvent.id}` as any);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  // Format time from hh:mm:ss to hh:mm
  const formatTime = (timeString: string) => {
    if (!timeString) return "";
    // Split by colon and take only hours and minutes
    const parts = timeString.split(":");
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeString;
  };

  // Generate HTML for the map with the same bubble style as Create Event page
  const generateMapHTML = () => {
    const eventsJSON = JSON.stringify(filteredEvents.map(event => ({
      ...event,
      // Format description to always start with lowercase
      description: event.description.charAt(0).toLowerCase() + event.description.slice(1)
    })));
    const userLocationJSON = location ? JSON.stringify({
      lat: location.coords.latitude,
      lng: location.coords.longitude
    }) : 'null';

    console.log('[HomeScreen] Generating map HTML with', filteredEvents.length, 'events');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            overflow: hidden;
            background: #0a0a0a;
          }
          #map {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            height: 100%;
            width: 100%;
            background: #0a0a0a;
          }
          
          /* Custom styling for map elements */
          .leaflet-container {
            background: #0a0a0a;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 16px;
          }
          
          /* Make map labels bigger and more readable */
          .leaflet-tile-pane {
            filter: contrast(1.1) brightness(1.05);
          }
          
          /* Hide default popups completely */
          .leaflet-popup {
            display: none !important;
          }
          
          .custom-marker {
            background: transparent;
            border: none;
            text-align: center;
            line-height: 1;
            cursor: pointer;
          }
          
          /* Bubble marker container - matching Create Event style */
          .bubble-marker {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          /* Main bubble body - matching Create Event gradient and translucency */
          .bubble-body {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(255, 64, 129, 0.9), rgba(187, 134, 252, 0.9));
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 3px solid rgba(255, 255, 255, 0.8);
            box-shadow: 0 8px 24px rgba(255, 64, 129, 0.5);
            animation: bubblePulse 2s infinite ease-in-out;
          }
          
          /* Icon container - matching Create Event style */
          .bubble-icon {
            position: relative;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: center;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
          }
          
          /* Hover effects - matching Create Event */
          .bubble-marker:hover {
            transform: scale(1.1);
          }
          
          .bubble-marker:hover .bubble-body {
            animation: none;
            box-shadow: 0 12px 32px rgba(255, 64, 129, 0.7);
          }
          
          /* Pulsing animation - matching Create Event */
          @keyframes bubblePulse {
            0%, 100% { 
              transform: scale(1); 
              box-shadow: 0 8px 24px rgba(255, 64, 129, 0.5);
            }
            50% { 
              transform: scale(1.05); 
              box-shadow: 0 12px 32px rgba(255, 64, 129, 0.7);
            }
          }
          
          /* User location marker */
          .user-marker {
            background: radial-gradient(circle, rgba(3, 218, 198, 1), rgba(3, 218, 198, 0.4));
            border: 3px solid rgba(255, 255, 255, 0.9);
            border-radius: 50%;
            width: 20px;
            height: 20px;
            box-shadow: 0 0 30px rgba(3, 218, 198, 1),
                        0 0 60px rgba(3, 218, 198, 0.5);
            animation: userPulse 2s infinite ease-in-out;
          }
          
          @keyframes userPulse {
            0%, 100% { 
              box-shadow: 0 0 30px rgba(3, 218, 198, 1),
                          0 0 60px rgba(3, 218, 198, 0.5);
            }
            50% { 
              box-shadow: 0 0 40px rgba(3, 218, 198, 1),
                          0 0 80px rgba(3, 218, 198, 0.7);
            }
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          console.log('[Map] Initializing with', ${filteredEvents.length}, 'events');
          const events = ${eventsJSON};
          const userLocation = ${userLocationJSON};
          
          console.log('[Map] Events to display:', events.length);
          events.forEach((e, i) => {
            console.log('[Map] Event', i, ':', e.description, 'with', e.attendees, 'attendees at', e.latitude, e.longitude);
          });
          
          // Initialize map with extended zoom range
          const map = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            minZoom: 3,
            maxZoom: 20
          }).setView([${mapCenter.lat}, ${mapCenter.lng}], 14);
          
          // Store map globally for external access
          window.map = map;
          
          // Add MapTiler Streets tile layer
          L.tileLayer('https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}@2x.png?key=DRK7TsTMDfLaHMdlzmoz', {
            attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 20,
            minZoom: 3,
            tileSize: 512,
            zoomOffset: -1
          }).addTo(map);
          
          // Add user location marker if available
          if (userLocation) {
            const userIcon = L.divIcon({
              className: 'custom-marker',
              html: '<div class="user-marker"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            
            L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
              .addTo(map);
          }
          
          // Calculate bubble size based on attendees
          function calculateBubbleSize(attendees) {
            // Base size: 60px for 1 person (increased from 40px)
            // Scale: +8px per additional attendee
            // Max: 140px (increased from 120px)
            const baseSize = 60;
            const scale = 8;
            const maxSize = 140;
            const calculatedSize = baseSize + ((attendees - 1) * scale);
            return Math.min(calculatedSize, maxSize);
          }
          
          // Add event markers with Create Event bubble style
          console.log('[Map] Adding', events.length, 'event markers to map');
          events.forEach((event, index) => {
            const size = calculateBubbleSize(event.attendees);
            const iconSize = Math.min(24 + (event.attendees * 1.5), 42);
            
            console.log('[Map] Adding marker', index, 'for event:', event.description, 'with', event.attendees, 'attendees, bubble size:', size, 'px');
            
            const eventIcon = L.divIcon({
              className: 'custom-marker',
              html: \`
                <div class="bubble-marker" style="width:\${size}px; height:\${size}px;">
                  <div class="bubble-body"></div>
                  <div class="bubble-icon" style="font-size:\${iconSize}px;">\${event.icon}</div>
                </div>
              \`,
              iconSize: [size, size],
              iconAnchor: [size/2, size/2]
            });
            
            const marker = L.marker([event.latitude, event.longitude], { icon: eventIcon })
              .addTo(map);
            
            console.log('[Map] Marker', index, 'added successfully');
            
            // Only send click event to React Native - no popup
            marker.on('click', () => {
              console.log('[Map] Marker clicked:', event.description);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'eventClick',
                event: event
              }));
            });
          });
          
          console.log('[Map] All markers added. Total markers:', events.length);
          
          // Handle map clicks
          map.on('click', (e) => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapClick',
              lat: e.latlng.lat,
              lng: e.latlng.lng
            }));
          });
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'eventClick') {
        const eventData = data.event;
        console.log('Event clicked:', eventData.id);
        handleEventClick(eventData);
      } else if (data.type === 'mapClick') {
        console.log('Map clicked at:', data.lat, data.lng);
      }
    } catch (error) {
      console.log('Error parsing WebView message:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Map Container */}
      <View style={styles.mapContainer}>
        <WebView
          key={mapKey}
          ref={webViewRef}
          source={{ html: generateMapHTML() }}
          style={styles.webView}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          scrollEnabled={false}
        />

        {filteredEvents.length === 0 && filter === "interests" && !loading && (
          <View style={styles.noEventsOverlay}>
            <View style={styles.noEventsContainer}>
              <Text style={styles.noEventsText}>
                No events match your interests nearby
              </Text>
            </View>
          </View>
        )}

        {loading && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Loading events...</Text>
          </View>
        )}

        {/* Center Map Button */}
        <Pressable style={styles.centerButton} onPress={centerMap}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.centerButtonGradient}
          >
            <IconSymbol name="location.fill" size={24} color={colors.text} />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Top Bar - Compact Single Row with SafeAreaView */}
      <SafeAreaView edges={['top']} style={styles.topBarSafeArea}>
        <View style={styles.topBar}>
          <View style={styles.topBarContent}>
            <Text style={styles.logo}>nalia</Text>
            <View style={styles.topBarRight}>
              <Pressable style={styles.iconButton} onPress={handleNotifications}>
                <IconSymbol name="bell.fill" size={20} color={colors.text} />
                {unreadNotificationsCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <View style={styles.notificationDot} />
                  </View>
                )}
              </Pressable>
              <Pressable style={styles.avatarButton} onPress={handleProfile}>
                {user?.photoUri ? (
                  <Image 
                    source={{ uri: user.photoUri }} 
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatar}>
                    <IconSymbol name="person.fill" size={16} color={colors.text} />
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Floating Filter Toggle */}
      <View style={styles.floatingFilterContainer}>
        <Pressable
          style={[
            styles.filterButton,
            filter === "all" && styles.filterButtonActive,
          ]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "all" && styles.filterTextActive,
            ]}
          >
            All Events
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.filterButton,
            filter === "interests" && styles.filterButtonActive,
          ]}
          onPress={() => setFilter("interests")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "interests" && styles.filterTextActive,
            ]}
          >
            My Interests
          </Text>
        </Pressable>
      </View>

      {/* People Nearby Indicator */}
      {nearbyCount > 0 && (
        <Pressable style={styles.nearbyContainer} onPress={handlePeopleNearby}>
          <LinearGradient
            colors={["rgba(187, 134, 252, 0.95)", "rgba(3, 218, 198, 0.95)"]}
            style={styles.nearbyGradient}
          >
            <IconSymbol name="person.2.fill" size={16} color={colors.text} />
            <Text style={styles.nearbyText}>
              {nearbyCount} {nearbyCount === 1 ? "person" : "people"} nearby
            </Text>
            <IconSymbol name="chevron.right" size={14} color={colors.text} />
          </LinearGradient>
        </Pressable>
      )}

      {/* Floating Create Button */}
      <Pressable style={styles.createButton} onPress={handleCreateEvent}>
        <LinearGradient
          colors={[colors.accent, colors.primary]}
          style={styles.createButtonGradient}
        >
          <IconSymbol name="plus" size={32} color={colors.text} />
        </LinearGradient>
      </Pressable>

      {/* Event Preview Modal */}
      <Modal
        visible={showEventPreview}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEventPreview(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowEventPreview(false)}
        >
          <Pressable 
            style={styles.eventPreviewCard}
            onPress={(e) => e.stopPropagation()}
          >
            <LinearGradient
              colors={["rgba(30, 30, 30, 0.98)", "rgba(20, 20, 20, 0.98)"]}
              style={styles.eventPreviewGradient}
            >
              {/* Event Icon */}
              <View style={styles.previewIconContainer}>
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  style={styles.previewIconGradient}
                >
                  <Text style={styles.previewIcon}>{selectedEvent?.icon}</Text>
                </LinearGradient>
              </View>

              {/* Event Title */}
              <Text style={styles.previewTitle}>
                <Text style={styles.previewHostName}>{selectedEvent?.hostName}</Text>
                <Text style={styles.previewWanna}> wanna </Text>
                <Text style={styles.previewDescription}>
                  {selectedEvent?.description && 
                    selectedEvent.description.charAt(0).toLowerCase() + selectedEvent.description.slice(1)}
                </Text>
              </Text>

              {/* Event Details */}
              <View style={styles.previewDetails}>
                <View style={styles.previewDetailRow}>
                  <IconSymbol name="calendar" size={18} color={colors.primary} />
                  <Text style={styles.previewDetailText}>
                    {selectedEvent && formatDate(selectedEvent.eventDate)} at {selectedEvent && formatTime(selectedEvent.eventTime)}
                  </Text>
                </View>
                <View style={styles.previewDetailRow}>
                  <IconSymbol name="location" size={18} color={colors.primary} />
                  {loadingPreviewLocation ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 12 }} />
                  ) : (
                    <Text style={styles.previewDetailText}>
                      {previewLocation}
                    </Text>
                  )}
                </View>
                <View style={styles.previewDetailRow}>
                  <IconSymbol name="person.2.fill" size={18} color={colors.primary} />
                  <Text style={styles.previewDetailText}>
                    {selectedEvent?.attendees} {selectedEvent?.attendees === 1 ? "person" : "people"} attending
                  </Text>
                </View>
                <View style={styles.previewDetailRow}>
                  <IconSymbol 
                    name={selectedEvent?.isPublic ? "globe" : "lock"} 
                    size={18} 
                    color={colors.primary} 
                  />
                  <Text style={styles.previewDetailText}>
                    {selectedEvent?.isPublic ? "Public Event" : "Private Event"}
                  </Text>
                </View>
              </View>

              {/* Tags */}
              {selectedEvent && selectedEvent.tags.length > 0 && (
                <View style={styles.previewTags}>
                  {selectedEvent.tags.map((tag, index) => (
                    <View key={index} style={styles.previewTag}>
                      <Text style={styles.previewTagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* More Details Button */}
              <Pressable style={styles.moreDetailsButton} onPress={handleViewDetails}>
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  style={styles.moreDetailsGradient}
                >
                  <Text style={styles.moreDetailsText}>View Full Details</Text>
                  <IconSymbol name="arrow.right" size={18} color={colors.text} />
                </LinearGradient>
              </Pressable>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  noEventsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  noEventsContainer: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  noEventsText: {
    fontSize: 16,
    color: colors.text,
    textAlign: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
  },
  topBarSafeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(18, 18, 18, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: colors.highlight,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
  },
  logo: {
    fontSize: 26,
    fontFamily: "PlayfairDisplay-Italic",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    position: "absolute",
    right: 0,
  },
  iconButton: {
    padding: 6,
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF4081",
  },
  avatarButton: {
    padding: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  floatingFilterContainer: {
    position: "absolute",
    top: 120,
    left: 20,
    right: 20,
    flexDirection: "row",
    backgroundColor: "rgba(30, 30, 30, 0.95)",
    borderRadius: 12,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.highlight,
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.3)",
    elevation: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.text,
  },
  nearbyContainer: {
    position: "absolute",
    top: 190,
    left: 20,
    right: 20,
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0px 4px 12px rgba(187, 134, 252, 0.4)",
    elevation: 8,
  },
  nearbyGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  nearbyText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  centerButton: {
    position: "absolute",
    bottom: 120,
    right: 20,
    borderRadius: 28,
    overflow: "hidden",
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.3)",
    elevation: 8,
  },
  centerButtonGradient: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  createButton: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    borderRadius: 32,
    overflow: "hidden",
    boxShadow: "0px 6px 16px rgba(255, 64, 129, 0.4)",
    elevation: 10,
  },
  createButtonGradient: {
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  eventPreviewCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    overflow: "hidden",
    boxShadow: "0px 12px 40px rgba(187, 134, 252, 0.4)",
    elevation: 20,
  },
  eventPreviewGradient: {
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  previewIconContainer: {
    alignSelf: "center",
    marginBottom: 20,
    borderRadius: 40,
    overflow: "hidden",
  },
  previewIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  previewIcon: {
    fontSize: 40,
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 30,
  },
  previewHostName: {
    color: colors.text,
  },
  previewWanna: {
    color: colors.text,
  },
  previewDescription: {
    color: colors.secondary,
  },
  previewDetails: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  previewDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewDetailText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  previewTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  previewTag: {
    backgroundColor: "rgba(187, 134, 252, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(187, 134, 252, 0.4)",
  },
  previewTagText: {
    fontSize: 13,
    color: colors.secondary,
    fontWeight: "600",
  },
  moreDetailsButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  moreDetailsGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  moreDetailsText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
});
