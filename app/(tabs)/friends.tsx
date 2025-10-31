
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import { LinearGradient } from "expo-linear-gradient";

interface Friend {
  id: string;
  name: string;
  bio: string;
  mutualEvents: number;
  interests: string[];
}

const MOCK_FRIENDS: Friend[] = [
  {
    id: "1",
    name: "Anna Martinez",
    bio: "Coffee enthusiast & social butterfly",
    mutualEvents: 3,
    interests: ["#coffee", "#drinks", "#networking"],
  },
  {
    id: "2",
    name: "Tom Wilson",
    bio: "Fitness lover, always up for a run",
    mutualEvents: 2,
    interests: ["#fitness", "#running", "#sports"],
  },
  {
    id: "3",
    name: "Sarah Chen",
    bio: "Tech professional, love meeting new people",
    mutualEvents: 5,
    interests: ["#coffee", "#networking", "#tech"],
  },
];

export default function FriendsScreen() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFriends = MOCK_FRIENDS.filter((friend) =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => Alert.alert("Add Friend", "Search for friends nearby")}
        >
          <IconSymbol name="person.badge.plus" size={24} color={colors.primary} />
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search friends..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredFriends.map((friend) => (
          <Pressable
            key={friend.id}
            style={styles.friendCard}
            onPress={() =>
              Alert.alert(
                friend.name,
                `${friend.bio}\n\nMutual Events: ${friend.mutualEvents}\nInterests: ${friend.interests.join(", ")}`
              )
            }
          >
            <LinearGradient
              colors={["rgba(187, 134, 252, 0.1)", "rgba(3, 218, 198, 0.1)"]}
              style={styles.friendCardGradient}
            >
              <View style={styles.friendAvatar}>
                <IconSymbol name="person.fill" size={28} color={colors.text} />
              </View>
              <View style={styles.friendContent}>
                <Text style={styles.friendName}>{friend.name}</Text>
                <Text style={styles.friendBio}>{friend.bio}</Text>
                <View style={styles.mutualEvents}>
                  <IconSymbol
                    name="calendar.badge.clock"
                    size={14}
                    color={colors.secondary}
                  />
                  <Text style={styles.mutualEventsText}>
                    {friend.mutualEvents} mutual events
                  </Text>
                </View>
                <View style={styles.interestsContainer}>
                  {friend.interests.slice(0, 3).map((interest, index) => (
                    <View key={index} style={styles.interestTag}>
                      <Text style={styles.interestText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Pressable
                style={styles.messageButton}
                onPress={() => Alert.alert("Message", `Send message to ${friend.name}`)}
              >
                <IconSymbol name="message.fill" size={20} color={colors.primary} />
              </Pressable>
            </LinearGradient>
          </Pressable>
        ))}

        {filteredFriends.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol
              name="person.2.slash"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyStateText}>No friends found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery
                ? "Try a different search"
                : "Add friends to see them here"}
            </Text>
          </View>
        )}
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
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  friendCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  friendCardGradient: {
    padding: 16,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  friendAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  friendContent: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  friendBio: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  mutualEvents: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  mutualEventsText: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: "500",
  },
  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  interestTag: {
    backgroundColor: colors.highlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  interestText: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: "500",
  },
  messageButton: {
    padding: 8,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
});
