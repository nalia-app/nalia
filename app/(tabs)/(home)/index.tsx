
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import * as Location from "expo-location";
import { useUser } from "@/contexts/UserContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { supabase } from "@/app/integrations/supabase/client";
import { calculateDistance } from "@/utils/locationUtils";

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
  const webViewRef = useRef<WebView>(null);
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    console.log('[HomeScreen] Initializing...');
    loadLocation();
    loadEvents();
    
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
          // Force map to reload with new events
          setMapKey(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      console.log('[HomeScreen] Cleaning up subscriptions');
      supabase.removeChannel(eventsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (location) {
      loadNearbyCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

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
      
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch events from database
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });

      if (eventsError) {
        console.error('[HomeScreen] Error loading events:', eventsError);
        setLoading(false);
        return;
      }

      console.log('[HomeScreen] Loaded events:', eventsData?.length || 0);

      // Filter out expired non-recurring events
      const activeEvents = (eventsData || []).filter(event => 
        !isEventExpired(event.event_date, event.event_time, event.is_recurring)
      );

      // Get attendee counts for each event
      const eventsWithAttendees = await Promise.all(
        activeEvents.map(async (event) => {
          const { count } = await supabase
            .from('event_attendees')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'approved');

          return {
            id: event.id,
            hostName: event.host_name,
            description: event.description,
            attendees: (count || 0) + 1, // +1 for host
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

      setEvents(eventsWithAttendees);
      setLoading(false);
    } catch (error) {
      console.error('[HomeScreen] Error in loadEvents:', error);
      setLoading(false);
    }
  };

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
    if (location) {
      const newCenter = { lat: location.coords.latitude, lng: location.coords.longitude };
      setMapCenter(newCenter);
      
      // Send message to WebView to center map
      webViewRef.current?.injectJavaScript(`
        if (window.map) {
          window.map.setView([${newCenter.lat}, ${newCenter.lng}], 15);
        }
        true;
      `);
      
      Alert.alert("Map Centered", "View centered on your location");
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

  const handleEventClick = (event: EventBubble) => {
    setSelectedEvent(event);
    setShowEventPreview(true);
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

  // Generate HTML for the map with smaller, more colorful, translucent bubbles
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

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            overflow: hidden;
            background: #0a0a0a;
          }
          #map {
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
          
          /* Smaller, more colorful, translucent bubble container */
          .bubble-marker {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          /* Main bubble body - more colorful with app colors (purple, cyan, pink) and more translucent */
          .bubble-body {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: radial-gradient(
              circle at 35% 35%,
              rgba(187, 134, 252, 0.25) 0%,
              rgba(255, 64, 129, 0.22) 25%,
              rgba(3, 218, 198, 0.2) 50%,
              rgba(139, 92, 246, 0.18) 75%,
              rgba(187, 134, 252, 0.15) 100%
            );
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 2px solid rgba(187, 134, 252, 0.35);
            box-shadow: 
              inset 0 0 30px rgba(187, 134, 252, 0.18),
              inset -12px -12px 40px rgba(255, 64, 129, 0.12),
              0 8px 30px rgba(187, 134, 252, 0.25),
              0 0 50px rgba(3, 218, 198, 0.15);
            animation: bubblePulse 3s ease-in-out infinite;
          }
          
          /* Shimmer highlight effect - purple/pink tint */
          .bubble-shimmer {
            position: absolute;
            top: 15%;
            left: 20%;
            width: 40%;
            height: 40%;
            border-radius: 50%;
            background: radial-gradient(
              circle at center,
              rgba(187, 134, 252, 0.4) 0%,
              rgba(255, 64, 129, 0.25) 30%,
              transparent 70%
            );
            filter: blur(10px);
            animation: shimmerPulse 3s ease-in-out infinite;
          }
          
          /* Secondary shimmer - cyan tint */
          .bubble-shimmer-secondary {
            position: absolute;
            bottom: 20%;
            right: 25%;
            width: 30%;
            height: 30%;
            border-radius: 50%;
            background: radial-gradient(
              circle at center,
              rgba(3, 218, 198, 0.35) 0%,
              rgba(139, 92, 246, 0.2) 40%,
              transparent 70%
            );
            filter: blur(8px);
            animation: shimmerPulse 3s ease-in-out infinite 1.5s;
          }
          
          /* Outer glow aura - colorful gradient with app colors */
          .bubble-glow {
            position: absolute;
            width: 140%;
            height: 140%;
            border-radius: 50%;
            background: radial-gradient(
              circle at center,
              rgba(187, 134, 252, 0.25) 0%,
              rgba(255, 64, 129, 0.18) 30%,
              rgba(3, 218, 198, 0.12) 50%,
              rgba(139, 92, 246, 0.08) 70%,
              transparent 100%
            );
            filter: blur(20px);
            animation: glowPulse 3s ease-in-out infinite;
          }
          
          /* Icon container */
          .bubble-icon {
            position: relative;
            z-index: 10;
            filter: drop-shadow(0 2px 8px rgba(187, 134, 252, 0.6))
                    drop-shadow(0 0 15px rgba(255, 64, 129, 0.4));
            animation: iconFloat 3s ease-in-out infinite;
          }
          
          /* Hover effects */
          .bubble-marker:hover {
            transform: scale(1.12);
          }
          
          .bubble-marker:hover .bubble-body {
            background: radial-gradient(
              circle at 35% 35%,
              rgba(187, 134, 252, 0.35) 0%,
              rgba(255, 64, 129, 0.32) 25%,
              rgba(3, 218, 198, 0.3) 50%,
              rgba(139, 92, 246, 0.28) 75%,
              rgba(187, 134, 252, 0.25) 100%
            );
            border-color: rgba(187, 134, 252, 0.5);
            box-shadow: 
              inset 0 0 40px rgba(187, 134, 252, 0.25),
              inset -12px -12px 50px rgba(255, 64, 129, 0.2),
              0 12px 40px rgba(187, 134, 252, 0.4),
              0 0 70px rgba(3, 218, 198, 0.3);
            animation-play-state: paused;
          }
          
          .bubble-marker:hover .bubble-glow {
            background: radial-gradient(
              circle at center,
              rgba(187, 134, 252, 0.35) 0%,
              rgba(255, 64, 129, 0.28) 30%,
              rgba(3, 218, 198, 0.22) 50%,
              rgba(139, 92, 246, 0.15) 70%,
              transparent 100%
            );
            animation-play-state: paused;
          }
          
          /* Soft pulsing animation for live events */
          @keyframes bubblePulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
              box-shadow: 
                inset 0 0 30px rgba(187, 134, 252, 0.18),
                inset -12px -12px 40px rgba(255, 64, 129, 0.12),
                0 8px 30px rgba(187, 134, 252, 0.25),
                0 0 50px rgba(3, 218, 198, 0.15);
            }
            50% {
              transform: scale(1.05);
              opacity: 0.95;
              box-shadow: 
                inset 0 0 40px rgba(187, 134, 252, 0.25),
                inset -12px -12px 50px rgba(255, 64, 129, 0.2),
                0 12px 40px rgba(187, 134, 252, 0.35),
                0 0 70px rgba(3, 218, 198, 0.25);
            }
          }
          
          @keyframes shimmerPulse {
            0%, 100% {
              opacity: 0.5;
              transform: scale(1);
            }
            50% {
              opacity: 0.9;
              transform: scale(1.15);
            }
          }
          
          @keyframes glowPulse {
            0%, 100% {
              opacity: 0.5;
              transform: scale(1);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.08);
            }
          }
          
          @keyframes iconFloat {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-3px);
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
          const events = ${eventsJSON};
          const userLocation = ${userLocationJSON};
          
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
          
          // Calculate bubble size based on attendees - SMALLER BASE SIZE
          function calculateBubbleSize(attendees) {
            // Base size: 45px for 1 person (reduced from 60px)
            // Scale: +8px per additional attendee (reduced from 10px)
            // Max: 120px (reduced from 140px)
            const baseSize = 45;
            const scale = 8;
            const maxSize = 120;
            const calculatedSize = baseSize + ((attendees - 1) * scale);
            return Math.min(calculatedSize, maxSize);
          }
          
          // Add event markers with smaller, colorful, translucent bubbles
          events.forEach(event => {
            const size = calculateBubbleSize(event.attendees);
            const iconSize = Math.min(20 + (event.attendees * 1.5), 38);
            
            const eventIcon = L.divIcon({
              className: 'custom-marker',
              html: \`
                <div class="bubble-marker" style="width:\${size}px; height:\${size}px;">
                  <div class="bubble-glow"></div>
                  <div class="bubble-body"></div>
                  <div class="bubble-shimmer"></div>
                  <div class="bubble-shimmer-secondary"></div>
                  <div class="bubble-icon" style="font-size:\${iconSize}px;">\${event.icon}</div>
                </div>
              \`,
              iconSize: [size, size],
              iconAnchor: [size/2, size/2]
            });
            
            const marker = L.marker([event.latitude, event.longitude], { icon: eventIcon })
              .addTo(map);
            
            // Only send click event to React Native - no popup
            marker.on('click', () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'eventClick',
                event: event
              }));
            });
          });
          
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
                    {selectedEvent && formatDate(selectedEvent.eventDate)} at {selectedEvent?.eventTime}
                  </Text>
                </View>
                <View style={styles.previewDetailRow}>
                  <IconSymbol name="location" size={18} color={colors.primary} />
                  <Text style={styles.previewDetailText}>
                    {selectedEvent?.locationName || "Location set"}
                  </Text>
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
