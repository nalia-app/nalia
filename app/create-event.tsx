
import { IconSymbol } from "@/components/IconSymbol";
import { useUser } from "@/contexts/UserContext";
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState, useEffect, useRef } from "react";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/styles/commonStyles";
import { WebView } from "react-native-webview";
import { supabase } from "@/app/integrations/supabase/client";
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
import { stripEmojis } from "@/utils/emojiUtils";

const EMOJI_CATEGORIES = {
  Social: ["☕", "🍺", "🍕", "🍔", "🎉", "🎊", "🎈"],
  Sports: ["⚽", "🏀", "🎾", "🏐", "🏈", "⛳", "🏃"],
  Culture: ["🎨", "🎭", "🎪", "🎬", "📚", "🎵", "🎸"],
  Outdoor: ["🏕️", "🚴", "🏊", "⛰️", "🌳", "🌊", "🌅"],
  Gaming: ["🎮", "🎯", "🎲", "🃏", "♟️", "🎰", "🕹️"],
  Other: ["💼", "🛍️", "✈️", "🚗", "📷", "🎓", "💡"],
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK_OF_MONTH = ["First", "Second", "Third", "Fourth", "Last"];

const { width, height } = Dimensions.get("window");

export default function CreateEventScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("☕");
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof EMOJI_CATEGORIES>("Social");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<"weekly" | "monthly">("weekly");
  
  // For weekly recurring
  const [selectedWeekday, setSelectedWeekday] = useState(new Date().getDay());
  
  // For monthly recurring
  const [selectedWeekOfMonth, setSelectedWeekOfMonth] = useState(0); // 0=first, 1=second, etc.
  const [selectedMonthlyWeekday, setSelectedMonthlyWeekday] = useState(new Date().getDay());
  
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [mapKey, setMapKey] = useState(0);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    loadLocation();
  }, []);

  const loadLocation = async () => {
    try {
      console.log('[CreateEvent] Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required to create events");
        return;
      }
      console.log('[CreateEvent] Getting current position...');
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setSelectedLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      console.log("[CreateEvent] Location obtained:", loc.coords);
      
      // Force map to reload with new location
      setTimeout(() => {
        setMapKey(prev => prev + 1);
      }, 100);
    } catch (error) {
      console.error("[CreateEvent] Error getting location:", error);
      Alert.alert("Error", "Failed to get your location");
    }
  };

  const generateMapHTML = () => {
    if (!location) {
      console.log('[CreateEvent] No location available yet');
      return '<html><body style="background:#0a0a0a;display:flex;align-items:center;justify-content:center;height:100%;margin:0;"><div style="color:white;font-family:sans-serif;">Loading map...</div></body></html>';
    }

    const lat = selectedLocation?.lat || location.coords.latitude;
    const lng = selectedLocation?.lng || location.coords.longitude;

    console.log('[CreateEvent] Generating map HTML for location:', lat, lng);

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
          .leaflet-container {
            background: #0a0a0a;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 16px;
          }
          .leaflet-marker-icon {
            cursor: grab !important;
          }
          .leaflet-marker-icon:active {
            cursor: grabbing !important;
          }
          .custom-marker {
            background: linear-gradient(135deg, rgba(255, 64, 129, 0.9), rgba(187, 134, 252, 0.9));
            border: 3px solid rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            box-shadow: 0 8px 24px rgba(255, 64, 129, 0.5);
            animation: pulse 2s infinite ease-in-out;
            cursor: grab;
            margin-left: -20px;
            margin-top: -20px;
          }
          .custom-marker:active {
            cursor: grabbing;
            animation: none;
            transform: scale(1.1);
          }
          @keyframes pulse {
            0%, 100% { 
              transform: scale(1); 
              box-shadow: 0 8px 24px rgba(255, 64, 129, 0.5);
            }
            50% { 
              transform: scale(1.05); 
              box-shadow: 0 12px 32px rgba(255, 64, 129, 0.7);
            }
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          console.log('[CreateEvent Map] Starting initialization...');
          console.log('[CreateEvent Map] Target location: ${lat}, ${lng}');
          
          try {
            // Initialize map WITHOUT zoom control buttons
            const map = L.map('map', {
              zoomControl: false,
              attributionControl: false,
              minZoom: 3,
              maxZoom: 20,
              tap: true,
              tapTolerance: 20,
              touchZoom: true,
              dragging: true,
              scrollWheelZoom: true,
              doubleClickZoom: true,
              boxZoom: false
            });
            
            console.log('[CreateEvent Map] Map object created successfully');
            
            // Set the view immediately
            map.setView([${lat}, ${lng}], 15);
            console.log('[CreateEvent Map] View set to:', ${lat}, ${lng});
            
            // Add MapTiler Streets tile layer
            const tileLayer = L.tileLayer('https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}@2x.png?key=DRK7TsTMDfLaHMdlzmoz', {
              attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>',
              maxZoom: 20,
              minZoom: 3,
              tileSize: 512,
              zoomOffset: -1
            });
            
            tileLayer.on('loading', () => {
              console.log('[CreateEvent Map] Tiles loading...');
            });
            
            tileLayer.on('load', () => {
              console.log('[CreateEvent Map] Tiles loaded successfully');
            });
            
            tileLayer.on('tileerror', (error) => {
              console.error('[CreateEvent Map] Tile error:', error);
            });
            
            tileLayer.addTo(map);
            console.log('[CreateEvent Map] Tile layer added');
            
            // Create marker variable
            let marker = null;
            let isDraggingMarker = false;
            
            // Wait for map to be ready before adding marker
            map.whenReady(() => {
              console.log('[CreateEvent Map] Map is ready');
              
              // Force map to recalculate size and invalidate
              setTimeout(() => {
                map.invalidateSize(true);
                console.log('[CreateEvent Map] Map size invalidated');
                
                // Pan to center to ensure proper positioning
                map.panTo([${lat}, ${lng}], { animate: false });
                
                // Now add the marker at the center with proper anchor
                marker = L.marker([${lat}, ${lng}], {
                  icon: L.divIcon({
                    className: 'custom-marker-wrapper',
                    html: '<div class="custom-marker">${selectedIcon}</div>',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                    popupAnchor: [0, -20]
                  }),
                  draggable: true,
                  autoPan: true,
                  autoPanPadding: [50, 50],
                  autoPanSpeed: 10
                }).addTo(map);
                
                console.log('[CreateEvent Map] Marker added at:', ${lat}, ${lng});
                
                // Ensure marker is visible by panning to it
                setTimeout(() => {
                  map.panTo([${lat}, ${lng}], { animate: false });
                  console.log('[CreateEvent Map] Final pan to marker position');
                }, 100);
                
                // Handle marker drag events
                marker.on('dragstart', (e) => {
                  isDraggingMarker = true;
                  console.log('[CreateEvent Map] Marker drag started');
                  map.dragging.disable();
                });
                
                marker.on('drag', (e) => {
                  const position = e.target.getLatLng();
                  console.log('[CreateEvent Map] Marker dragging:', position.lat, position.lng);
                });
                
                marker.on('dragend', (e) => {
                  const position = e.target.getLatLng();
                  console.log('[CreateEvent Map] Marker drag ended at:', position.lat, position.lng);
                  
                  // Send location update
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'locationSelected',
                      lat: position.lat,
                      lng: position.lng
                    }));
                  }
                  
                  // Re-enable map dragging after a short delay
                  setTimeout(() => {
                    isDraggingMarker = false;
                    map.dragging.enable();
                    console.log('[CreateEvent Map] Map dragging re-enabled');
                  }, 200);
                });
                
                // Handle map clicks to move marker (only if not dragging)
                map.on('click', (e) => {
                  if (isDraggingMarker) {
                    console.log('[CreateEvent Map] Ignoring click - marker is being dragged');
                    return;
                  }
                  console.log('[CreateEvent Map] Map clicked at:', e.latlng.lat, e.latlng.lng);
                  
                  if (marker) {
                    marker.setLatLng(e.latlng);
                    map.panTo(e.latlng, { animate: true, duration: 0.5 });
                    
                    if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'locationSelected',
                        lat: e.latlng.lat,
                        lng: e.latlng.lng
                      }));
                    }
                  }
                });
                
                console.log('[CreateEvent Map] All event handlers attached');
              }, 500);
            });
            
            // Log map events for debugging
            map.on('dragstart', () => {
              console.log('[CreateEvent Map] Map drag started');
            });
            
            map.on('dragend', () => {
              console.log('[CreateEvent Map] Map drag ended');
            });
            
            map.on('zoomstart', () => {
              console.log('[CreateEvent Map] Zoom started');
            });
            
            map.on('zoomend', () => {
              console.log('[CreateEvent Map] Zoom ended, level:', map.getZoom());
            });
            
            console.log('[CreateEvent Map] Initialization complete');
          } catch (error) {
            console.error('[CreateEvent Map] Error during initialization:', error);
            document.body.innerHTML = '<div style="color:white;padding:20px;font-family:sans-serif;">Error loading map: ' + error.message + '</div>';
          }
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('[CreateEvent] WebView message received:', data);
      if (data.type === 'locationSelected') {
        setSelectedLocation({ lat: data.lat, lng: data.lng });
        console.log('[CreateEvent] Location updated to:', data.lat, data.lng);
      }
    } catch (error) {
      console.log('[CreateEvent] Error parsing WebView message:', error);
    }
  };

  const getNextOccurrenceDate = () => {
    if (!isRecurring) {
      return date.toISOString().split("T")[0];
    }

    const now = new Date();
    
    if (recurrenceType === "weekly") {
      // Find next occurrence of selected weekday
      const today = now.getDay();
      let daysUntilNext = selectedWeekday - today;
      if (daysUntilNext <= 0) {
        daysUntilNext += 7;
      }
      const nextDate = new Date(now);
      nextDate.setDate(now.getDate() + daysUntilNext);
      return nextDate.toISOString().split("T")[0];
    } else {
      // Monthly: find next occurrence of selected week and weekday
      const nextDate = new Date(now);
      nextDate.setDate(1); // Start from first of month
      
      // Move to next month if we're past the target date this month
      const testDate = new Date(now.getFullYear(), now.getMonth(), 1);
      let occurrenceCount = 0;
      let targetDate = null;
      
      // Find the nth occurrence of the weekday in current month
      for (let day = 1; day <= 31; day++) {
        testDate.setDate(day);
        if (testDate.getMonth() !== now.getMonth()) break;
        if (testDate.getDay() === selectedMonthlyWeekday) {
          if (occurrenceCount === selectedWeekOfMonth) {
            targetDate = new Date(testDate);
            break;
          }
          occurrenceCount++;
        }
      }
      
      // If target date is in the past or doesn't exist, move to next month
      if (!targetDate || targetDate < now) {
        nextDate.setMonth(now.getMonth() + 1);
        nextDate.setDate(1);
        occurrenceCount = 0;
        
        for (let day = 1; day <= 31; day++) {
          nextDate.setDate(day);
          if (nextDate.getDay() === selectedMonthlyWeekday) {
            if (occurrenceCount === selectedWeekOfMonth) {
              return nextDate.toISOString().split("T")[0];
            }
            occurrenceCount++;
          }
        }
      }
      
      return targetDate ? targetDate.toISOString().split("T")[0] : now.toISOString().split("T")[0];
    }
  };

  const handleCreate = async () => {
    if (!description.trim()) {
      Alert.alert("Missing Information", "Please enter a description");
      return;
    }

    if (!selectedLocation) {
      Alert.alert("Missing Information", "Please select a location on the map");
      return;
    }

    if (!user) {
      Alert.alert("Error", "You must be logged in to create an event");
      return;
    }

    try {
      console.log("[CreateEvent] Creating event...");

      // Parse tags and strip emojis to ensure consistency
      // This ensures #coffee and #☕️ coffee are treated as the same tag
      const tagArray = tags
        .split(",")
        .map((tag) => {
          const trimmed = tag.trim();
          const withoutEmojis = stripEmojis(trimmed);
          return withoutEmojis.toLowerCase();
        })
        .filter((tag) => tag.length > 0);

      console.log("[CreateEvent] Tags after emoji stripping:", tagArray);

      // Format date and time
      const eventDate = isRecurring ? getNextOccurrenceDate() : date.toISOString().split("T")[0];
      const eventTime = time.toTimeString().split(" ")[0].substring(0, 5);

      // Create event
      const eventData: any = {
        host_id: user.id,
        host_name: user.name,
        description: description.trim(),
        icon: selectedIcon,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        location_name: locationName.trim() || null,
        event_date: eventDate,
        event_time: eventTime,
        is_public: isPublic,
        is_recurring: isRecurring,
        recurrence_type: isRecurring ? recurrenceType : null,
        tags: tagArray,
      };

      // Add recurring event fields
      if (isRecurring) {
        if (recurrenceType === "weekly") {
          eventData.recurrence_day_of_week = selectedWeekday;
          eventData.recurrence_day_name = WEEKDAYS[selectedWeekday];
        } else {
          eventData.recurrence_week_of_month = selectedWeekOfMonth + 1; // Store as 1-based
          eventData.recurrence_day_of_week = selectedMonthlyWeekday;
          eventData.recurrence_day_name = WEEKDAYS[selectedMonthlyWeekday];
        }
      }

      const { data: createdEvent, error: eventError } = await supabase
        .from("events")
        .insert(eventData)
        .select()
        .single();

      if (eventError) {
        console.error("[CreateEvent] Error creating event:", eventError);
        Alert.alert("Error", "Failed to create event. Please try again.");
        return;
      }

      console.log("[CreateEvent] Event created successfully:", createdEvent.id);

      // Add host as attendee
      const { error: attendeeError } = await supabase
        .from("event_attendees")
        .insert({
          event_id: createdEvent.id,
          user_id: user.id,
          status: "approved",
        });

      if (attendeeError) {
        console.error("[CreateEvent] Error adding host as attendee:", attendeeError);
      }

      Alert.alert("Success", "Event created successfully!", [
        {
          text: "OK",
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error("[CreateEvent] Error in handleCreate:", error);
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <LinearGradient colors={[colors.background, colors.card]} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Create Event</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>I wanna...</Text>
            <TextInput
              style={styles.input}
              placeholder="grab a coffee, go running, etc."
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              maxLength={100}
            />
          </View>

          {/* Icon Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Choose an Icon</Text>
            <View style={styles.categoryTabs}>
              {Object.keys(EMOJI_CATEGORIES).map((category) => (
                <Pressable
                  key={category}
                  style={[
                    styles.categoryTab,
                    selectedCategory === category && styles.categoryTabActive,
                  ]}
                  onPress={() => setSelectedCategory(category as keyof typeof EMOJI_CATEGORIES)}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      selectedCategory === category && styles.categoryTabTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.iconGrid}>
              {EMOJI_CATEGORIES[selectedCategory].map((icon) => (
                <Pressable
                  key={icon}
                  style={[styles.iconButton, selectedIcon === icon && styles.iconButtonActive]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <Text style={styles.iconText}>{icon}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Map */}
          <View style={styles.section}>
            <Text style={styles.label}>Location (tap map or drag marker to set)</Text>
            <View style={styles.mapContainer}>
              {location ? (
                <WebView
                  key={mapKey}
                  ref={webViewRef}
                  source={{ html: generateMapHTML() }}
                  style={styles.map}
                  onMessage={handleWebViewMessage}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                  scrollEnabled={false}
                  bounces={false}
                  allowsInlineMediaPlayback={true}
                  scalesPageToFit={true}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error('[CreateEvent] WebView error:', nativeEvent);
                  }}
                  onHttpError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error('[CreateEvent] WebView HTTP error:', nativeEvent);
                  }}
                  onLoad={() => {
                    console.log('[CreateEvent] WebView loaded successfully');
                  }}
                  onLoadStart={() => {
                    console.log('[CreateEvent] WebView load started');
                  }}
                  onLoadEnd={() => {
                    console.log('[CreateEvent] WebView load ended');
                  }}
                  onLoadProgress={({ nativeEvent }) => {
                    console.log('[CreateEvent] WebView load progress:', nativeEvent.progress);
                  }}
                />
              ) : (
                <View style={styles.mapLoadingContainer}>
                  <Text style={styles.mapLoadingText}>Loading map...</Text>
                </View>
              )}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Location name (optional)"
              placeholderTextColor={colors.textSecondary}
              value={locationName}
              onChangeText={setLocationName}
            />
          </View>

          {/* Recurring Event Checkbox */}
          <View style={styles.section}>
            <View style={styles.checkboxRow}>
              <Pressable
                style={styles.checkbox}
                onPress={() => setIsRecurring(!isRecurring)}
              >
                {isRecurring && <IconSymbol name="checkmark" size={20} color={colors.text} />}
              </Pressable>
              <Text style={styles.checkboxLabel}>Recurring Event</Text>
            </View>
            {isRecurring && (
              <View style={styles.toggleRow}>
                <Pressable
                  style={[
                    styles.toggleButton,
                    recurrenceType === "weekly" && styles.toggleButtonActive,
                  ]}
                  onPress={() => setRecurrenceType("weekly")}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      recurrenceType === "weekly" && styles.toggleTextActive,
                    ]}
                  >
                    Weekly
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.toggleButton,
                    recurrenceType === "monthly" && styles.toggleButtonActive,
                  ]}
                  onPress={() => setRecurrenceType("monthly")}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      recurrenceType === "monthly" && styles.toggleTextActive,
                    ]}
                  >
                    Monthly
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Date & Time - Different UI for recurring events */}
          <View style={styles.section}>
            <Text style={styles.label}>
              {isRecurring ? "Time" : "Date & Time"}
            </Text>
            
            {!isRecurring ? (
              <View style={styles.dateTimeRow}>
                <Pressable style={styles.dateTimeButton} onPress={() => setShowDatePicker(true)}>
                  <IconSymbol name="calendar" size={20} color={colors.text} />
                  <Text style={styles.dateTimeText}>{date.toLocaleDateString()}</Text>
                </Pressable>
                <Pressable style={styles.dateTimeButton} onPress={() => setShowTimePicker(true)}>
                  <IconSymbol name="clock" size={20} color={colors.text} />
                  <Text style={styles.dateTimeText}>
                    {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                {recurrenceType === "weekly" ? (
                  <View style={styles.weekdaySelector}>
                    {WEEKDAYS.map((day, index) => (
                      <Pressable
                        key={day}
                        style={[
                          styles.weekdayButton,
                          selectedWeekday === index && styles.weekdayButtonActive,
                        ]}
                        onPress={() => setSelectedWeekday(index)}
                      >
                        <Text
                          style={[
                            styles.weekdayText,
                            selectedWeekday === index && styles.weekdayTextActive,
                          ]}
                        >
                          {day.substring(0, 3)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={styles.monthlySelector}>
                    <View style={styles.pickerRow}>
                      <Text style={styles.pickerLabel}>Every</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                        {WEEK_OF_MONTH.map((week, index) => (
                          <Pressable
                            key={week}
                            style={[
                              styles.pickerButton,
                              selectedWeekOfMonth === index && styles.pickerButtonActive,
                            ]}
                            onPress={() => setSelectedWeekOfMonth(index)}
                          >
                            <Text
                              style={[
                                styles.pickerButtonText,
                                selectedWeekOfMonth === index && styles.pickerButtonTextActive,
                              ]}
                            >
                              {week}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                    <View style={styles.pickerRow}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                        {WEEKDAYS.map((day, index) => (
                          <Pressable
                            key={day}
                            style={[
                              styles.pickerButton,
                              selectedMonthlyWeekday === index && styles.pickerButtonActive,
                            ]}
                            onPress={() => setSelectedMonthlyWeekday(index)}
                          >
                            <Text
                              style={[
                                styles.pickerButtonText,
                                selectedMonthlyWeekday === index && styles.pickerButtonTextActive,
                              ]}
                            >
                              {day}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                      <Text style={styles.pickerLabel}>of every month</Text>
                    </View>
                  </View>
                )}
                
                <Pressable style={styles.timeButton} onPress={() => setShowTimePicker(true)}>
                  <IconSymbol name="clock" size={20} color={colors.text} />
                  <Text style={styles.dateTimeText}>
                    {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </Pressable>
              </>
            )}
            
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDate(selectedDate);
                }}
                minimumDate={new Date()}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={time}
                mode="time"
                display="default"
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false);
                  if (selectedTime) setTime(selectedTime);
                }}
              />
            )}
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.label}>Tags (comma-separated)</Text>
            <Text style={styles.hint}>
              Emojis will be removed to ensure #coffee and #☕ coffee match
            </Text>
            <TextInput
              style={styles.input}
              placeholder="coffee, networking, casual"
              placeholderTextColor={colors.textSecondary}
              value={tags}
              onChangeText={setTags}
            />
          </View>

          {/* Privacy */}
          <View style={styles.section}>
            <Text style={styles.label}>Privacy</Text>
            <View style={styles.toggleRow}>
              <Pressable
                style={[styles.toggleButton, isPublic && styles.toggleButtonActive]}
                onPress={() => setIsPublic(true)}
              >
                <Text style={[styles.toggleText, isPublic && styles.toggleTextActive]}>
                  Open to everyone
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleButton, !isPublic && styles.toggleButtonActive]}
                onPress={() => setIsPublic(false)}
              >
                <Text style={[styles.toggleText, !isPublic && styles.toggleTextActive]}>
                  I approve who joins
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Create Button */}
          <Pressable style={styles.createButton} onPress={handleCreate}>
            <LinearGradient
              colors={[colors.accent, colors.primary]}
              style={styles.createButtonGradient}
            >
              <Text style={styles.createButtonText}>Create Event</Text>
            </LinearGradient>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.highlight,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    fontStyle: "italic",
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  categoryTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryTabText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  categoryTabTextActive: {
    color: colors.text,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.highlight,
  },
  iconButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.highlight,
  },
  iconText: {
    fontSize: 28,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.highlight,
    backgroundColor: colors.card,
  },
  map: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  mapLoadingText: {
    fontSize: 16,
    color: colors.text,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.highlight,
    marginTop: 12,
  },
  dateTimeText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "500",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.text,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "500",
  },
  weekdaySelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  weekdayButton: {
    flex: 1,
    minWidth: 45,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  weekdayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekdayText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  weekdayTextActive: {
    color: colors.text,
  },
  monthlySelector: {
    gap: 12,
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pickerLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  pickerScroll: {
    flex: 1,
  },
  pickerButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.highlight,
    marginRight: 8,
  },
  pickerButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickerButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  pickerButtonTextActive: {
    color: colors.text,
  },
  createButton: {
    marginTop: 32,
    borderRadius: 12,
    overflow: "hidden",
  },
  createButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
});
