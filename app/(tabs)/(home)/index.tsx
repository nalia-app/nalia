
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
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [filter, setFilter] = useState<"all" | "interests">("all");
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7849, lng: -122.4094 });
  const [events, setEvents] = useState<EventBubble[]>([]);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

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
        }
      )
      .subscribe();

    return () => {
      console.log('[HomeScreen] Cleaning up subscriptions');
      supabase.removeChannel(eventsChannel);
    };
  }, []);

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
    } catch (error) {
      console.error("[HomeScreen] Error getting location:", error);
    }
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

      // Get attendee counts for each event
      const eventsWithAttendees = await Promise.all(
        (eventsData || []).map(async (event) => {
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

  // Generate HTML for the map with MapTiler Streets
  const generateMapHTML = () => {
    const eventsJSON = JSON.stringify(filteredEvents);
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
          }
          
          .leaflet-popup-content-wrapper {
            background: rgba(30, 30, 30, 0.98);
            color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .leaflet-popup-tip {
            background: rgba(30, 30, 30, 0.98);
          }
          
          .leaflet-popup-content {
            margin: 16px;
            font-size: 14px;
            line-height: 1.6;
          }
          
          .custom-marker {
            background: transparent;
            border: none;
            font-size: 32px;
            text-align: center;
            line-height: 1;
            cursor: pointer;
          }
          
          .bubble-marker {
            background: linear-gradient(135deg, rgba(187, 134, 252, 0.9), rgba(3, 218, 198, 0.9));
            border: 2px solid rgba(255, 255, 255, 0.6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            box-shadow: 0 8px 24px rgba(187, 134, 252, 0.4),
                        0 0 40px rgba(3, 218, 198, 0.2);
            animation: pulse 2s infinite ease-in-out;
            transition: all 0.3s ease;
          }
          
          .bubble-marker:hover {
            transform: scale(1.1);
            box-shadow: 0 12px 32px rgba(187, 134, 252, 0.6),
                        0 0 60px rgba(3, 218, 198, 0.4);
          }
          
          @keyframes pulse {
            0%, 100% { 
              transform: scale(1); 
              opacity: 0.95;
              box-shadow: 0 8px 24px rgba(187, 134, 252, 0.4),
                          0 0 40px rgba(3, 218, 198, 0.2);
            }
            50% { 
              transform: scale(1.05); 
              opacity: 1;
              box-shadow: 0 12px 32px rgba(187, 134, 252, 0.6),
                          0 0 60px rgba(3, 218, 198, 0.4);
            }
          }
          
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
          
          /* Style the popup content */
          .popup-host {
            font-weight: 600;
            font-size: 16px;
            color: #ffffff;
            margin-bottom: 8px;
          }
          
          .popup-description {
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 8px;
          }
          
          .popup-detail {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
            margin-top: 4px;
          }
          
          .popup-tag {
            display: inline-block;
            background: rgba(187, 134, 252, 0.3);
            padding: 2px 8px;
            border-radius: 8px;
            font-size: 11px;
            margin-right: 4px;
            margin-top: 4px;
            color: rgba(255, 255, 255, 0.9);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const events = ${eventsJSON};
          const userLocation = ${userLocationJSON};
          
          // Initialize map without zoom controls
          const map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView([${mapCenter.lat}, ${mapCenter.lng}], 14);
          
          // Store map globally for external access
          window.map = map;
          
          // Add MapTiler Streets tile layer
          L.tileLayer('https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=DRK7TsTMDfLaHMdlzmoz', {
            attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 20,
            minZoom: 10
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
              .addTo(map)
              .bindPopup('<div class="popup-host">Your Location</div>');
          }
          
          // Add event markers with enhanced styling
          events.forEach(event => {
            const size = 40 + event.attendees * 3;
            const eventIcon = L.divIcon({
              className: 'custom-marker',
              html: '<div class="bubble-marker" style="width:' + size + 'px;height:' + size + 'px;">' + event.icon + '</div>',
              iconSize: [size, size],
              iconAnchor: [size/2, size/2]
            });
            
            const marker = L.marker([event.latitude, event.longitude], { icon: eventIcon })
              .addTo(map);
            
            marker.on('click', () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'eventClick',
                event: event
              }));
            });
            
            const tags = event.tags.map(tag => '<span class="popup-tag">#' + tag + '</span>').join('');
            
            const popupContent = 
              '<div>' +
              '<div class="popup-host">' + event.hostName + ' wanna...</div>' +
              '<div class="popup-description">' + event.description + '</div>' +
              '<div class="popup-detail">👥 ' + event.attendees + ' attending</div>' +
              '<div class="popup-detail">🔒 ' + (event.isPublic ? 'Public' : 'Private') + '</div>' +
              '<div style="margin-top: 8px;">' + tags + '</div>' +
              '</div>';
            
            marker.bindPopup(popupContent, {
              maxWidth: 250,
              className: 'custom-popup'
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
        router.push(`/event/${eventData.id}` as any);
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

      {/* Floating Create Button */}
      <Pressable style={styles.createButton} onPress={handleCreateEvent}>
        <LinearGradient
          colors={[colors.accent, colors.primary]}
          style={styles.createButtonGradient}
        >
          <IconSymbol name="plus" size={32} color={colors.text} />
        </LinearGradient>
      </Pressable>
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
});
