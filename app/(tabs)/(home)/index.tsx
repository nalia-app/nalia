
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Alert,
  Platform,
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

const MOCK_EVENTS: EventBubble[] = [
  {
    id: "1",
    hostName: "Anna",
    description: "grab a drink",
    attendees: 5,
    latitude: 37.7849,
    longitude: -122.4094,
    icon: "🍷",
    isPublic: true,
    tags: ["drinks", "social"],
  },
  {
    id: "2",
    hostName: "Tom",
    description: "go running",
    attendees: 3,
    latitude: 37.7899,
    longitude: -122.4064,
    icon: "🏃",
    isPublic: true,
    tags: ["fitness", "running"],
  },
  {
    id: "3",
    hostName: "Sarah",
    description: "grab coffee",
    attendees: 8,
    latitude: 37.7829,
    longitude: -122.4124,
    icon: "☕",
    isPublic: false,
    tags: ["coffee", "networking"],
  },
  {
    id: "4",
    hostName: "Mike",
    description: "play basketball",
    attendees: 12,
    latitude: 37.7869,
    longitude: -122.4074,
    icon: "🏀",
    isPublic: true,
    tags: ["sports", "basketball"],
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [filter, setFilter] = useState<"all" | "interests">("all");
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7849, lng: -122.4094 });
  const webViewRef = React.useRef<WebView>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Location permission denied");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setMapCenter({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      console.log("Location obtained:", loc.coords);
    })();
  }, []);

  // Filter events based on user interests
  const filteredEvents = filter === "interests" && user?.interests
    ? MOCK_EVENTS.filter(event =>
        event.tags.some(tag =>
          user.interests.some(interest =>
            interest.toLowerCase().includes(tag.toLowerCase()) ||
            tag.toLowerCase().includes(interest.toLowerCase())
          )
        )
      )
    : MOCK_EVENTS;

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

  // Generate HTML for the map
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
          }
          #map {
            height: 100%;
            width: 100%;
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
            background: linear-gradient(135deg, rgba(187, 134, 252, 0.8), rgba(3, 218, 198, 0.8));
            border: 2px solid rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.9; }
            50% { transform: scale(1.05); opacity: 1; }
          }
          .user-marker {
            background: radial-gradient(circle, rgba(3, 218, 198, 1), rgba(3, 218, 198, 0.3));
            border: 3px solid white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            box-shadow: 0 0 20px rgba(3, 218, 198, 0.8);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const events = ${eventsJSON};
          const userLocation = ${userLocationJSON};
          
          // Initialize map
          const map = L.map('map', {
            zoomControl: true,
            attributionControl: false
          }).setView([${mapCenter.lat}, ${mapCenter.lng}], 14);
          
          // Store map globally for external access
          window.map = map;
          
          // Add dark tile layer
          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
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
              .bindPopup('<b>Your Location</b>');
          }
          
          // Add event markers
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
            
            const popupContent = 
              '<div style="color: #000; font-family: sans-serif;">' +
              '<b>' + event.hostName + ' wanna...</b><br/>' +
              event.description + '<br/>' +
              '<small>Attendees: ' + event.attendees + '</small><br/>' +
              '<small>Type: ' + (event.isPublic ? 'Public' : 'Private') + '</small>' +
              '</div>';
            
            marker.bindPopup(popupContent);
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
        const event = data.event;
        Alert.alert(
          `${event.hostName} wanna...`,
          `${event.description}\n\nAttendees: ${event.attendees}\nType: ${
            event.isPublic ? "Public" : "Private"
          }\nTags: ${event.tags.map((t: string) => `#${t}`).join(", ")}`
        );
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

        {filteredEvents.length === 0 && filter === "interests" && (
          <View style={styles.noEventsOverlay}>
            <View style={styles.noEventsContainer}>
              <Text style={styles.noEventsText}>
                No events match your interests nearby
              </Text>
            </View>
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
                <View style={styles.avatar}>
                  <IconSymbol name="person.fill" size={16} color={colors.text} />
                </View>
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
  floatingFilterContainer: {
    position: "absolute",
    top: 100,
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
