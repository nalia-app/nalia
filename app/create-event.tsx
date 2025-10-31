
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";

const EVENT_ICONS = ["☕", "🍷", "🏃", "🏀", "🎮", "🎵", "🍕", "📚"];

export default function CreateEventScreen() {
  const router = useRouter();
  const [selectedIcon, setSelectedIcon] = useState("☕");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const handleCreate = () => {
    if (!description.trim()) {
      Alert.alert("Error", "Please add a description");
      return;
    }
    if (!location.trim()) {
      Alert.alert("Error", "Please add a location");
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
          <View style={styles.iconsContainer}>
            {EVENT_ICONS.map((icon) => (
              <Pressable
                key={icon}
                style={[
                  styles.iconButton,
                  selectedIcon === icon && styles.iconButtonSelected,
                ]}
                onPress={() => setSelectedIcon(icon)}
              >
                <Text style={styles.iconText}>{icon}</Text>
              </Pressable>
            ))}
          </View>

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
          <TextInput
            style={styles.input}
            placeholder="Where will this happen?"
            placeholderTextColor={colors.textSecondary}
            value={location}
            onChangeText={setLocation}
          />

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
  iconsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  iconButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.card,
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
    fontSize: 32,
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
