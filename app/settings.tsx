
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/app/integrations/supabase/client";
import * as WebBrowser from "expo-web-browser";

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [showInNearby, setShowInNearby] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSettings = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("show_in_nearby")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("[Settings] Error loading settings:", error);
        return;
      }

      setShowInNearby(data.show_in_nearby ?? true);
      setLoading(false);
    } catch (error) {
      console.error("[Settings] Error in loadSettings:", error);
      setLoading(false);
    }
  };

  const handleToggleNearby = async (value: boolean) => {
    try {
      if (!user) return;

      setShowInNearby(value);

      const { error } = await supabase
        .from("profiles")
        .update({ show_in_nearby: value })
        .eq("id", user.id);

      if (error) {
        console.error("[Settings] Error updating setting:", error);
        Alert.alert("Error", "Failed to update setting");
        setShowInNearby(!value); // Revert on error
        return;
      }

      console.log("[Settings] Show in nearby updated:", value);
    } catch (error) {
      console.error("[Settings] Error in handleToggleNearby:", error);
      Alert.alert("Error", "Failed to update setting");
      setShowInNearby(!value); // Revert on error
    }
  };

  const handleOpenPrivacyPolicy = async () => {
    try {
      await WebBrowser.openBrowserAsync("https://nalia.app/privacy-policy.html");
    } catch (error) {
      console.error("[Settings] Error opening privacy policy:", error);
      Alert.alert("Error", "Failed to open privacy policy");
    }
  };

  const handleOpenTermsOfService = async () => {
    try {
      await WebBrowser.openBrowserAsync("https://nalia.app/terms.html");
    } catch (error) {
      console.error("[Settings] Error opening terms of service:", error);
      Alert.alert("Error", "Failed to open terms of service");
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          
          <View style={styles.settingCard}>
            <LinearGradient
              colors={["rgba(187, 134, 252, 0.1)", "rgba(3, 218, 198, 0.1)"]}
              style={styles.settingCardGradient}
            >
              <View style={styles.settingIcon}>
                <IconSymbol
                  name="location.fill"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Appear in People Nearby</Text>
                <Text style={styles.settingDescription}>
                  Allow other users to see you in their &quot;People Nearby&quot; list
                </Text>
              </View>
              <Switch
                value={showInNearby}
                onValueChange={handleToggleNearby}
                trackColor={{
                  false: colors.highlight,
                  true: colors.primary,
                }}
                thumbColor={colors.text}
                disabled={loading}
              />
            </LinearGradient>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <Pressable
            style={styles.settingCard}
            onPress={handleOpenPrivacyPolicy}
          >
            <LinearGradient
              colors={["rgba(187, 134, 252, 0.1)", "rgba(3, 218, 198, 0.1)"]}
              style={styles.settingCardGradient}
            >
              <View style={styles.settingIcon}>
                <IconSymbol
                  name="doc.text.fill"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Privacy Policy</Text>
              </View>
              <IconSymbol
                name="chevron.right"
                size={20}
                color={colors.textSecondary}
              />
            </LinearGradient>
          </Pressable>

          <Pressable
            style={styles.settingCard}
            onPress={handleOpenTermsOfService}
          >
            <LinearGradient
              colors={["rgba(187, 134, 252, 0.1)", "rgba(3, 218, 198, 0.1)"]}
              style={styles.settingCardGradient}
            >
              <View style={styles.settingIcon}>
                <IconSymbol
                  name="doc.text.fill"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Terms of Service</Text>
              </View>
              <IconSymbol
                name="chevron.right"
                size={20}
                color={colors.textSecondary}
              />
            </LinearGradient>
          </Pressable>

          <Pressable
            style={styles.settingCard}
            onPress={() => Alert.alert("Nalia", "Version 1.0.0")}
          >
            <LinearGradient
              colors={["rgba(187, 134, 252, 0.1)", "rgba(3, 218, 198, 0.1)"]}
              style={styles.settingCardGradient}
            >
              <View style={styles.settingIcon}>
                <IconSymbol
                  name="info.circle.fill"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Version</Text>
                <Text style={styles.settingDescription}>1.0.0</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
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
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  settingCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  settingCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
