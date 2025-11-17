
import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface LiquidBubbleProps {
  size: number;
  icon: string;
  attendees: number;
}

export const LiquidBubble: React.FC<LiquidBubbleProps> = ({ size, icon, attendees }) => {
  // Single animation value for gentle pulsing
  const pulse = useSharedValue(0);

  useEffect(() => {
    // Gentle pulse animation only
    pulse.value = withRepeat(
      withTiming(1, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [pulse]);

  // Single animated style for pulsing
  const pulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulse.value, [0, 1], [1, 1.05]);
    return {
      transform: [{ scale }],
    };
  });

  const radius = size / 2;
  const iconSize = Math.min(18 + (attendees * 1.8), 42);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Outer glow - static */}
      <View 
        style={[
          styles.glowLayer,
          { width: size * 1.3, height: size * 1.3, borderRadius: (size * 1.3) / 2 },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(187, 134, 252, 0.4)',
            'rgba(168, 85, 247, 0.3)',
            'transparent',
          ]}
          style={[styles.gradientFill, { borderRadius: (size * 1.3) / 2 }]}
        />
      </View>

      {/* Main bubble body with gentle pulse */}
      <Animated.View 
        style={[
          styles.mainBubble,
          { width: size, height: size, borderRadius: radius },
          pulseStyle,
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(187, 134, 252, 0.5)',
            'rgba(139, 92, 246, 0.45)',
            'rgba(168, 85, 247, 0.4)',
          ]}
          style={[styles.gradientFill, { borderRadius: radius }]}
        />
      </Animated.View>

      {/* Simple highlight - static */}
      <View 
        style={[
          styles.highlight,
          { width: size * 0.4, height: size * 0.4, borderRadius: (size * 0.4) / 2 },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.5)',
            'rgba(255, 255, 255, 0.2)',
            'transparent',
          ]}
          style={[styles.gradientFill, { borderRadius: (size * 0.4) / 2 }]}
        />
      </View>

      {/* Border ring - static */}
      <View 
        style={[
          styles.borderRing,
          { width: size, height: size, borderRadius: radius },
        ]}
      />

      {/* Icon overlay */}
      <View style={styles.iconContainer}>
        <Text style={[styles.icon, { fontSize: iconSize }]}>{icon}</Text>
      </View>

      {/* Attendee count badge */}
      {attendees > 5 && (
        <View style={styles.badgeContainer}>
          <LinearGradient
            colors={['rgba(255, 64, 129, 0.95)', 'rgba(236, 72, 153, 0.95)']}
            style={styles.badge}
          >
            <Text style={styles.badgeText}>{attendees}</Text>
          </LinearGradient>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientFill: {
    width: '100%',
    height: '100%',
  },
  glowLayer: {
    position: 'absolute',
  },
  mainBubble: {
    position: 'absolute',
  },
  highlight: {
    position: 'absolute',
    top: '15%',
    left: '15%',
  },
  borderRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(187, 134, 252, 0.6)',
  },
  iconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 10,
  },
  icon: {
    textAlign: 'center',
    textShadowColor: 'rgba(187, 134, 252, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    pointerEvents: 'none',
    zIndex: 11,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: 'rgba(255, 64, 129, 1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  badge: {
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
