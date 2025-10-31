
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Alert,
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

const { width, height } = Dimensions.get("window");

interface EventBubble {
  id: string;
  hostName: string;
  description: string;
  attendees: number;
  x: number;
  y: number;
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
    x: 0.3,
    y: 0.4,
    icon: "🍷",
    isPublic: true,
    tags: ["#drinks", "#social"],
  },
  {
    id: "2",
    hostName: "Tom",
    description: "go running",
    attendees: 3,
    x: 0.6,
    y: 0.3,
    icon: "🏃",
    isPublic: true,
    tags: ["#fitness", "#running"],
  },
  {
    id: "3",
    hostName: "Sarah",
    description: "grab coffee",
    attendees: 8,
    x: 0.5,
    y: 0.6,
    icon: "☕",
    isPublic: false,
    tags: ["#coffee", "#networking"],
  },
  {
    id: "4",
    hostName: "Mike",
    description: "play basketball",
    attendees: 12,
    x: 0.7,
    y: 0.5,
    icon: "🏀",
    isPublic: true,
    tags: ["#sports", "#basketball"],
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "interests">("all");
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Location permission denied");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      console.log("Location obtained:", loc.coords);
    })();
  }, []);

  const centerMap = () => {
    if (location) {
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

  return (
    <View style={styles.container}>
      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <LinearGradient
          colors={["#1a1a2e", "#16213e", "#0f3460"]}
          style={styles.mapGradient}
        >
          <Text style={styles.mapNotice}>📍 Interactive Map View</Text>
          <Text style={styles.mapSubtext}>
            Note: react-native-maps is not supported in Natively.{"\n"}
            This is a visual representation of the map interface.
          </Text>

          {/* Event Bubbles */}
          {MOCK_EVENTS.map((event) => (
            <EventBubbleComponent key={event.id} event={event} />
          ))}

          {/* Center Map Button */}
          <Pressable style={styles.centerButton} onPress={centerMap}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.centerButtonGradient}
            >
              <IconSymbol name="location.fill" size={24} color={colors.text} />
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </View>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarContent}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>nalia</Text>
          </View>
          <View style={styles.topBarRight}>
            <Pressable style={styles.iconButton} onPress={handleNotifications}>
              <IconSymbol name="bell.fill" size={24} color={colors.text} />
            </Pressable>
            <Pressable style={styles.avatarButton} onPress={handleProfile}>
              <View style={styles.avatar}>
                <IconSymbol name="person.fill" size={20} color={colors.text} />
              </View>
            </Pressable>
          </View>
        </View>
      </View>

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

function EventBubbleComponent({ event }: { event: EventBubble }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1500 }),
        withTiming(0.7, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const size = 40 + event.attendees * 4;

  return (
    <Pressable
      style={[
        styles.bubble,
        {
          left: event.x * width,
          top: event.y * height * 0.6,
          width: size,
          height: size,
        },
      ]}
      onPress={() =>
        Alert.alert(
          `${event.hostName} wanna...`,
          `${event.description}\n\nAttendees: ${event.attendees}\nType: ${
            event.isPublic ? "Public" : "Private"
          }\nTags: ${event.tags.join(", ")}`
        )
      }
    >
      <Animated.View style={[styles.bubbleInner, animatedStyle]}>
        <LinearGradient
          colors={["rgba(187, 134, 252, 0.3)", "rgba(3, 218, 198, 0.3)"]}
          style={styles.bubbleGradient}
        >
          <Text style={styles.bubbleIcon}>{event.icon}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
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
  mapGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mapNotice: {
    fontSize: 24,
    color: colors.text,
    fontWeight: "600",
    marginBottom: 8,
  },
  mapSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "rgba(18, 18, 18, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: colors.highlight,
  },
  topBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoContainer: {
    flex: 1,
    alignItems: "center",
  },
  logo: {
    fontSize: 32,
    fontFamily: "PlayfairDisplay_400Regular_Italic",
    color: colors.primary,
    letterSpacing: 1,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    position: "absolute",
    right: 0,
  },
  iconButton: {
    padding: 8,
  },
  avatarButton: {
    padding: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
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
  bubble: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  bubbleInner: {
    width: "100%",
    height: "100%",
    borderRadius: 1000,
    overflow: "hidden",
  },
  bubbleGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 1000,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  bubbleIcon: {
    fontSize: 24,
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
