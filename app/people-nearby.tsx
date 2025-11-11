
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/app/integrations/supabase/client";
import * as Location from "expo-location";
import { calculateDistance, formatDistance } from "@/utils/locationUtils";

interface NearbyUser {
  id: string;
  name: string;
  bio: string;
  avatar_url: string | null;
  distance: number;
  interests: string[];
  mutualInterests: number;
}

export default function PeopleNearbyScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    loadNearbyUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNearbyUsers = async () => {
    try {
      console.log("[PeopleNearby] Loading nearby users...");
      setLoading(true);

      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Required",
          "Please enable location to see people nearby"
        );
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Update user's location in database
      if (user) {
        await supabase
          .from("profiles")
          .update({
            last_latitude: location.coords.latitude,
            last_longitude: location.coords.longitude,
            last_location_updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      }

      // Fetch all users who want to appear in nearby (excluding current user)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, bio, avatar_url, last_latitude, last_longitude")
        .eq("show_in_nearby", true)
        .neq("id", user?.id || "")
        .not("last_latitude", "is", null)
        .not("last_longitude", "is", null);

      if (profilesError) {
        console.error("[PeopleNearby] Error loading profiles:", profilesError);
        setLoading(false);
        return;
      }

      // Get interests for all users
      const { data: allInterests, error: interestsError } = await supabase
        .from("interests")
        .select("user_id, interest");

      if (interestsError) {
        console.error("[PeopleNearby] Error loading interests:", interestsError);
      }

      // Calculate distances and filter by 50km
      const usersWithDistance: NearbyUser[] = (profiles || [])
        .map((profile) => {
          const distance = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            profile.last_latitude!,
            profile.last_longitude!
          );

          // Get user interests
          const userInterests =
            allInterests
              ?.filter((i) => i.user_id === profile.id)
              .map((i) => i.interest) || [];

          // Calculate mutual interests
          const mutualInterests = user?.interests
            ? userInterests.filter((interest) =>
                user.interests.some(
                  (userInterest) =>
                    userInterest.toLowerCase() === interest.toLowerCase()
                )
              ).length
            : 0;

          return {
            id: profile.id,
            name: profile.name,
            bio: profile.bio || "",
            avatar_url: profile.avatar_url,
            distance,
            interests: userInterests,
            mutualInterests,
          };
        })
        .filter((user) => user.distance <= 50) // Only users within 50km
        .sort((a, b) => a.distance - b.distance); // Sort by distance

      console.log(
        `[PeopleNearby] Found ${usersWithDistance.length} users nearby`
      );
      setNearbyUsers(usersWithDistance);
      setLoading(false);
    } catch (error) {
      console.error("[PeopleNearby] Error in loadNearbyUsers:", error);
      setLoading(false);
    }
  };

  const handleUserPress = (userId: string) => {
    router.push(`/user-profile/${userId}` as any);
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
        <Text style={styles.title}>People Nearby</Text>
        <Pressable style={styles.refreshButton} onPress={loadNearbyUsers}>
          <IconSymbol name="arrow.clockwise" size={24} color={colors.text} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Finding people nearby...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {nearbyUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol
                name="person.2.slash"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No one nearby</Text>
              <Text style={styles.emptyText}>
                There are no users within 50km of your location
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.countText}>
                {nearbyUsers.length} {nearbyUsers.length === 1 ? "person" : "people"} nearby
              </Text>
              {nearbyUsers.map((nearbyUser) => (
                <Pressable
                  key={nearbyUser.id}
                  style={styles.userCard}
                  onPress={() => handleUserPress(nearbyUser.id)}
                >
                  <LinearGradient
                    colors={[
                      "rgba(187, 134, 252, 0.1)",
                      "rgba(3, 218, 198, 0.1)",
                    ]}
                    style={styles.userCardGradient}
                  >
                    <View style={styles.avatarContainer}>
                      {nearbyUser.avatar_url ? (
                        <Image
                          source={{ uri: nearbyUser.avatar_url }}
                          style={styles.avatar}
                        />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <IconSymbol
                            name="person.fill"
                            size={32}
                            color={colors.text}
                          />
                        </View>
                      )}
                    </View>
                    <View style={styles.userInfo}>
                      <View style={styles.userHeader}>
                        <Text style={styles.userName}>{nearbyUser.name}</Text>
                        <Text style={styles.distance}>
                          {formatDistance(nearbyUser.distance)}
                        </Text>
                      </View>
                      {nearbyUser.bio && (
                        <Text style={styles.userBio} numberOfLines={2}>
                          {nearbyUser.bio}
                        </Text>
                      )}
                      {nearbyUser.mutualInterests > 0 && (
                        <View style={styles.mutualContainer}>
                          <IconSymbol
                            name="star.fill"
                            size={12}
                            color={colors.accent}
                          />
                          <Text style={styles.mutualText}>
                            {nearbyUser.mutualInterests} mutual interest
                            {nearbyUser.mutualInterests > 1 ? "s" : ""}
                          </Text>
                        </View>
                      )}
                      {nearbyUser.interests.length > 0 && (
                        <View style={styles.interestsContainer}>
                          {nearbyUser.interests.slice(0, 3).map((interest, index) => (
                            <View key={index} style={styles.interestTag}>
                              <Text style={styles.interestText}>
                                {interest}
                              </Text>
                            </View>
                          ))}
                          {nearbyUser.interests.length > 3 && (
                            <Text style={styles.moreInterests}>
                              +{nearbyUser.interests.length - 3}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                    <IconSymbol
                      name="chevron.right"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </LinearGradient>
                </Pressable>
              ))}
            </>
          )}
        </ScrollView>
      )}
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
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  countText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  userCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  userCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  userInfo: {
    flex: 1,
    gap: 6,
  },
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  distance: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  userBio: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  mutualContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mutualText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: "600",
  },
  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  interestTag: {
    backgroundColor: "rgba(187, 134, 252, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  interestText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "500",
  },
  moreInterests: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
});
