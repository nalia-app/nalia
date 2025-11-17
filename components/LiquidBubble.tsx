
import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
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
  // Animation values for liquid effect
  const pulse = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    // Pulse animation - gentle breathing effect
    pulse.value = withRepeat(
      withTiming(1, {
        duration: 3000 + (attendees * 100),
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    // Shimmer animation - light movement
    shimmer.value = withRepeat(
      withTiming(1, {
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    // Wave animations - liquid distortion
    wave1.value = withRepeat(
      withTiming(1, {
        duration: 5000,
        easing: Easing.inOut(Easing.sine),
      }),
      -1,
      true
    );

    wave2.value = withRepeat(
      withTiming(1, {
        duration: 6500,
        easing: Easing.inOut(Easing.sine),
      }),
      -1,
      true
    );

    // Glow pulsing
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [attendees, pulse, shimmer, wave1, wave2, glow]);

  // Animated styles
  const pulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulse.value, [0, 1], [1, 1.06]);
    return {
      transform: [{ scale }],
    };
  });

  const shimmerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmer.value, [0, 1], [0.4, 0.7]);
    return { opacity };
  });

  const wave1Style = useAnimatedStyle(() => {
    const translateX = interpolate(wave1.value, [0, 1], [-6, 6]);
    const translateY = interpolate(wave1.value, [0, 1], [-4, 4]);
    return {
      transform: [{ translateX }, { translateY }],
    };
  });

  const wave2Style = useAnimatedStyle(() => {
    const translateX = interpolate(wave2.value, [0, 1], [8, -8]);
    const translateY = interpolate(wave2.value, [0, 1], [5, -5]);
    return {
      transform: [{ translateX }, { translateY }],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(glow.value, [0, 1], [0.3, 0.7]);
    const scale = interpolate(glow.value, [0, 1], [1, 1.15]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const radius = size / 2;
  const iconSize = Math.min(18 + (attendees * 1.8), 42);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Outer glow layer - pulsing */}
      <Animated.View 
        style={[
          styles.glowLayer,
          { width: size * 1.4, height: size * 1.4, borderRadius: (size * 1.4) / 2 },
          glowStyle,
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(187, 134, 252, 0.6)',
            'rgba(168, 85, 247, 0.45)',
            'rgba(255, 64, 129, 0.35)',
            'rgba(3, 218, 198, 0.25)',
            'transparent',
          ]}
          style={[styles.gradientFill, { borderRadius: (size * 1.4) / 2 }]}
        />
      </Animated.View>

      {/* Secondary glow ring */}
      <View 
        style={[
          styles.secondaryGlow,
          { width: size * 1.15, height: size * 1.15, borderRadius: (size * 1.15) / 2 },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(187, 134, 252, 0.4)',
            'rgba(168, 85, 247, 0.3)',
            'transparent',
          ]}
          style={[styles.gradientFill, { borderRadius: (size * 1.15) / 2 }]}
        />
      </View>

      {/* Main bubble body with liquid gradient - pulsing */}
      <Animated.View 
        style={[
          styles.mainBubble,
          { width: size, height: size, borderRadius: radius },
          pulseStyle,
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(187, 134, 252, 0.45)',
            'rgba(139, 92, 246, 0.38)',
            'rgba(168, 85, 247, 0.35)',
            'rgba(126, 58, 242, 0.3)',
          ]}
          style={[styles.gradientFill, { borderRadius: radius }]}
        />
      </Animated.View>

      {/* Liquid distortion layer 1 - creates organic movement */}
      <Animated.View 
        style={[
          styles.liquidLayer1,
          { width: size * 0.85, height: size * 0.85, borderRadius: (size * 0.85) / 2 },
          wave1Style,
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255, 64, 129, 0.35)',
            'rgba(236, 72, 153, 0.3)',
            'rgba(219, 39, 119, 0.25)',
          ]}
          style={[styles.gradientFill, { borderRadius: (size * 0.85) / 2 }]}
        />
      </Animated.View>

      {/* Liquid distortion layer 2 - cyan accent */}
      <Animated.View 
        style={[
          styles.liquidLayer2,
          { width: size * 0.75, height: size * 0.75, borderRadius: (size * 0.75) / 2 },
          wave2Style,
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(3, 218, 198, 0.32)',
            'rgba(20, 184, 166, 0.28)',
            'rgba(6, 182, 212, 0.24)',
          ]}
          style={[styles.gradientFill, { borderRadius: (size * 0.75) / 2 }]}
        />
      </Animated.View>

      {/* Top-left shimmer highlight */}
      <Animated.View 
        style={[
          styles.shimmerTop,
          { width: size * 0.45, height: size * 0.45, borderRadius: (size * 0.45) / 2 },
          shimmerStyle,
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.7)',
            'rgba(187, 134, 252, 0.5)',
            'rgba(255, 255, 255, 0.3)',
            'transparent',
          ]}
          style={[styles.gradientFill, { borderRadius: (size * 0.45) / 2 }]}
        />
      </Animated.View>

      {/* Bottom-right shimmer - complementary */}
      <Animated.View 
        style={[
          styles.shimmerBottom,
          { width: size * 0.35, height: size * 0.35, borderRadius: (size * 0.35) / 2 },
          shimmerStyle,
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(3, 218, 198, 0.6)',
            'rgba(20, 184, 166, 0.4)',
            'rgba(139, 92, 246, 0.3)',
            'transparent',
          ]}
          style={[styles.gradientFill, { borderRadius: (size * 0.35) / 2 }]}
        />
      </Animated.View>

      {/* Inner glow for depth */}
      <View 
        style={[
          styles.innerGlow,
          { width: size * 0.6, height: size * 0.6, borderRadius: (size * 0.6) / 2 },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255, 64, 129, 0.25)',
            'rgba(187, 134, 252, 0.2)',
            'transparent',
          ]}
          style={[styles.gradientFill, { borderRadius: (size * 0.6) / 2 }]}
        />
      </View>

      {/* Gradient border ring - multi-color */}
      <View 
        style={[
          styles.borderRing,
          { width: size, height: size, borderRadius: radius },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(187, 134, 252, 0.7)',
            'rgba(168, 85, 247, 0.65)',
            'rgba(255, 64, 129, 0.6)',
            'rgba(3, 218, 198, 0.5)',
            'rgba(187, 134, 252, 0.7)',
          ]}
          style={[styles.gradientFill, { borderRadius: radius }]}
        />
      </View>

      {/* Inner border for extra definition */}
      <View 
        style={[
          styles.innerBorder,
          { width: size - 3, height: size - 3, borderRadius: (size - 3) / 2 },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.5)',
            'rgba(187, 134, 252, 0.4)',
            'rgba(255, 255, 255, 0.3)',
          ]}
          style={[styles.gradientFill, { borderRadius: (size - 3) / 2 }]}
        />
      </View>

      {/* Subtle sparkle effect - top right */}
      <Animated.View 
        style={[
          styles.sparkle,
          { width: size * 0.12, height: size * 0.12, borderRadius: (size * 0.12) / 2 },
          shimmerStyle,
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.9)',
            'rgba(255, 255, 255, 0.5)',
            'transparent',
          ]}
          style={[styles.gradientFill, { borderRadius: (size * 0.12) / 2 }]}
        />
      </Animated.View>

      {/* Icon overlay */}
      <View style={styles.iconContainer}>
        <Text style={[styles.icon, { fontSize: iconSize }]}>{icon}</Text>
      </View>

      {/* Attendee count badge for larger groups */}
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
  secondaryGlow: {
    position: 'absolute',
    opacity: 0.5,
  },
  mainBubble: {
    position: 'absolute',
  },
  liquidLayer1: {
    position: 'absolute',
    opacity: 0.5,
  },
  liquidLayer2: {
    position: 'absolute',
    opacity: 0.45,
  },
  shimmerTop: {
    position: 'absolute',
    top: '15%',
    left: '15%',
  },
  shimmerBottom: {
    position: 'absolute',
    bottom: '20%',
    right: '20%',
    opacity: 0.6,
  },
  innerGlow: {
    position: 'absolute',
    opacity: 0.35,
  },
  borderRing: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  innerBorder: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'transparent',
    opacity: 0.4,
  },
  sparkle: {
    position: 'absolute',
    top: '15%',
    right: '15%',
    opacity: 0.8,
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
    textShadowColor: 'rgba(187, 134, 252, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
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
