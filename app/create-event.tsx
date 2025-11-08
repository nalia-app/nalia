
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";

const { width } = Dimensions.get("window");

// Comprehensive emoji list organized by category
const EMOJI_CATEGORIES = {
  'Food & Drink': ['☕', '🍷', '🍺', '🍕', '🍔', '🍟', '🌮', '🍣', '🍜', '🍰', '🍪', '🥗', '🍱', '🥘', '🍝'],
  'Activities': ['🏃', '🏀', '⚽', '🎾', '🏐', '🏊', '🚴', '🧘', '🏋️', '⛷️', '🏄', '🤸', '🧗', '🎯', '🎳'],
  'Entertainment': ['🎮', '🎵', '🎸', '🎬', '🎭', '🎨', '📚', '🎲', '🎪', '🎤', '🎧', '🎹', '🎺', '🎻', '🥁'],
  'Social': ['💬', '🤝', '👥', '🎉', '🎊', '🎈', '🎁', '💼', '🌟', '✨', '💫', '🔥', '❤️', '👋', '🙌'],
  'Nature': ['🌿', '🌳', '🌲', '🌺', '🌸', '🌼', '🌻', '🌞', '🌙', '⭐', '🌈', '🦋', '🐕', '🐈', '🦜'],
  'Travel': ['✈️', '🚗', '🚲', '🏖️', '🏔️', '🏕️', '🗺️', '🧳', '📷', '🎒', '🚂', '🚢', '🏰', '🗼', '🌍'],
};

export default function CreateEventScreen() {
  const router = useRouter();
  const [selectedIcon, setSelectedIcon] = useState("☕");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Food & Drink');
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const webViewRef = React.useRef<WebView>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Location permission denied");
          // Use default location if permission denied
          setUserLocation({ lat: 37.7849, lng: -122.4094 });
          setIsLoadingLocation(false);
          return;
        }
        
        const loc = await Location.getCurrentPositionAsync({});
        const newLocation = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setUserLocation(newLocation);
        console.log("User location obtained:", newLocation);
        setIsLoadingLocation(false);
      } catch (error) {
        console.log("Error getting location:", error);
        // Use default location if error occurs
        setUserLocation({ lat: 37.7849, lng: -122.4094 });
        setIsLoadingLocation(false);
      }
    })();
  }, []);

  const generateMapHTML = () => {
    // Use user location as default center, or fallback to San Francisco
    const centerLocation = userLocation || { lat: 37.7849, lng: -122.4094 };
    const markerLocation = mapLocation || null;
    
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
            cursor: crosshair;
            background: #0a0a0a;
          }
          
          /* Custom styling for dark mode map elements */
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
            margin: 12px;
            font-size: 14px;
            color: #ffffff;
          }
          
          .selected-marker {
            background: linear-gradient(135deg, rgba(187, 134, 252, 1), rgba(3, 218, 198, 1));
            border: 3px solid rgba(255, 255, 255, 0.9);
            border-radius: 50%;
            width: 30px;
            height: 30px;
            box-shadow: 0 8px 24px rgba(187, 134, 252, 0.6),
                        0 0 40px rgba(3, 218, 198, 0.4);
            animation: bounce 0.5s ease-out;
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
          
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
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
          let selectedMarker = null;
          
          // Initialize map centered on user location without zoom controls
          const map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView([${centerLocation.lat}, ${centerLocation.lng}], 15);
          
          window.map = map;
          
          // Add CartoDB Dark Matter tile layer for beautiful dark mode
          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
            minZoom: 10
          }).addTo(map);
          
          // Add user location marker
          const userIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div class="user-marker"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          
          L.marker([${centerLocation.lat}, ${centerLocation.lng}], { icon: userIcon })
            .addTo(map)
            .bindPopup('<b style="color: #ffffff;">Your Location</b>');
          
          ${markerLocation ? `
            const markerIcon = L.divIcon({
              className: 'custom-marker',
              html: '<div class="selected-marker"></div>',
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            });
            
            selectedMarker = L.marker([${markerLocation.lat}, ${markerLocation.lng}], { 
              icon: markerIcon,
              draggable: true
            }).addTo(map);
            
            selectedMarker.on('dragend', (e) => {
              const pos = e.target.getLatLng();
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'locationSelected',
                lat: pos.lat,
                lng: pos.lng
              }));
            });
          ` : ''}
          
          map.on('click', (e) => {
            if (selectedMarker) {
              map.removeLayer(selectedMarker);
            }
            
            const markerIcon = L.divIcon({
              className: 'custom-marker',
              html: '<div class="selected-marker"></div>',
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            });
            
            selectedMarker = L.marker([e.latlng.lat, e.latlng.lng], { 
              icon: markerIcon,
              draggable: true
            }).addTo(map);
            
            selectedMarker.on('dragend', (e) => {
              const pos = e.target.getLatLng();
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'locationSelected',
                lat: pos.lat,
                lng: pos.lng
              }));
            });
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'locationSelected',
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
      
      if (data.type === 'locationSelected') {
        setMapLocation({ lat: data.lat, lng: data.lng });
        setLocationName(`Location: ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`);
        console.log('Location selected:', data.lat, data.lng);
      }
    } catch (error) {
      console.log('Error parsing WebView message:', error);
    }
  };

  const handleCreate = () => {
    if (!description.trim()) {
      Alert.alert("Error", "Please add a description");
      return;
    }
    if (!mapLocation) {
      Alert.alert("Error", "Please select a location on the map");
      return;
    }

    console.log("Creating event:", {
      icon: selectedIcon,
      description,
      location: mapLocation,
      hashtags,
      isPublic,
    });

    Alert.alert(
      "Event Created!",
      "Your event has been created successfully",
      [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <LinearGradient colors={[colors.background, "#0a0a0a"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol name="xmark" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Create Event</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Choose an Icon</Text>
          <Pressable
            style={styles.selectedIconButton}
            onPress={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Text style={styles.selectedIconText}>{selectedIcon}</Text>
            <Text style={styles.changeIconText}>Tap to change</Text>
          </Pressable>

          {showEmojiPicker && (
            <View style={styles.emojiPicker}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {Object.keys(EMOJI_CATEGORIES).map((category) => (
                  <Pressable
                    key={category}
                    style={[
                      styles.categoryButton,
                      selectedCategory === category && styles.categoryButtonActive,
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        selectedCategory === category && styles.categoryTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.iconsContainer}>
                {EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES].map((icon) => (
                  <Pressable
                    key={icon}
                    style={[
                      styles.iconButton,
                      selectedIcon === icon && styles.iconButtonSelected,
                    ]}
                    onPress={() => {
                      setSelectedIcon(icon);
                      setShowEmojiPicker(false);
                    }}
                  >
                    <Text style={styles.iconText}>{icon}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>I wanna...</Text>
          <TextInput
            style={styles.input}
            placeholder="grab a coffee, go running, etc."
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            maxLength={50}
          />

          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.locationHint}>
            {isLoadingLocation 
              ? "Loading your location..." 
              : "Tap on the map to select a location (marker is draggable)"}
          </Text>
          <View style={styles.mapContainer}>
            {!isLoadingLocation ? (
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
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading map...</Text>
              </View>
            )}
          </View>
          {locationName && (
            <Text style={styles.locationText}>{locationName}</Text>
          )}

          <Text style={styles.sectionTitle}>Hashtags</Text>
          <TextInput
            style={styles.input}
            placeholder="#coffee #social #networking"
            placeholderTextColor={colors.textSecondary}
            value={hashtags}
            onChangeText={setHashtags}
          />

          <Text style={styles.sectionTitle}>Event Type</Text>
          <View style={styles.typeContainer}>
            <Pressable
              style={[
                styles.typeButton,
                isPublic && styles.typeButtonSelected,
              ]}
              onPress={() => setIsPublic(true)}
            >
              <IconSymbol
                name="globe"
                size={20}
                color={isPublic ? colors.text : colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeText,
                  isPublic && styles.typeTextSelected,
                ]}
              >
                Public
              </Text>
              <Text style={styles.typeDescription}>Anyone can join</Text>
            </Pressable>
            <Pressable
              style={[
                styles.typeButton,
                !isPublic && styles.typeButtonSelected,
              ]}
              onPress={() => setIsPublic(false)}
            >
              <IconSymbol
                name="lock.fill"
                size={20}
                color={!isPublic ? colors.text : colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeText,
                  !isPublic && styles.typeTextSelected,
                ]}
              >
                Private
              </Text>
              <Text style={styles.typeDescription}>Approval required</Text>
            </Pressable>
          </View>

          <Pressable style={styles.createButton} onPress={handleCreate}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.createButtonGradient}
            >
              <Text style={styles.createButtonText}>Create Event</Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.highlight,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  selectedIconButton: {
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedIconText: {
    fontSize: 64,
    marginBottom: 8,
  },
  changeIconText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  emojiPicker: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  categoryScroll: {
    marginBottom: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.highlight,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: colors.text,
  },
  iconsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.highlight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.highlight,
  },
  iconButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(187, 134, 252, 0.2)",
  },
  iconText: {
    fontSize: 28,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.highlight,
    marginBottom: 20,
  },
  locationHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  webView: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  locationText: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: 20,
    fontWeight: '600',
  },
  typeContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  typeButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.highlight,
  },
  typeButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(187, 134, 252, 0.1)",
  },
  typeText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 8,
  },
  typeTextSelected: {
    color: colors.text,
  },
  typeDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  createButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
  },
  createButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
});
