
import React, { useState } from "react";
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
  const [location, setLocation] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Food & Drink');
  const [mapLocation, setMapLocation] = useState<{ x: number; y: number } | null>(null);

  const handleMapPress = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    setMapLocation({ x: locationX, y: locationY });
    setLocation(`Location: ${Math.round(locationX)}, ${Math.round(locationY)}`);
    Alert.alert('Location Selected', 'Tap on the map to select a different location');
  };

  const handleCreate = () => {
    if (!description.trim()) {
      Alert.alert("Error", "Please add a description");
      return;
    }
    if (!location.trim()) {
      Alert.alert("Error", "Please select a location on the map");
      return;
    }

    console.log("Creating event:", {
      icon: selectedIcon,
      description,
      location,
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
          <Text style={styles.locationHint}>Tap on the map to select a location</Text>
          <Pressable style={styles.mapContainer} onPress={handleMapPress}>
            <LinearGradient
              colors={["#1a1a2e", "#16213e", "#0f3460"]}
              style={styles.mapGradient}
            >
              <Text style={styles.mapText}>📍 Tap to select location</Text>
              {mapLocation && (
                <View
                  style={[
                    styles.mapMarker,
                    { left: mapLocation.x - 15, top: mapLocation.y - 30 },
                  ]}
                >
                  <Text style={styles.mapMarkerText}>📍</Text>
                </View>
              )}
            </LinearGradient>
          </Pressable>
          {location && (
            <Text style={styles.locationText}>{location}</Text>
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
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  mapGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  mapMarker: {
    position: 'absolute',
  },
  mapMarkerText: {
    fontSize: 30,
  },
  locationText: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: 20,
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
