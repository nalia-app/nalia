
import React, { useEffect } from 'react';
import { Canvas, Circle, Group, LinearGradient, vec, Blur } from '@shopify/react-native-skia';
import { useSharedValue, withRepeat, withTiming, Easing, useDerivedValue, withSequence } from 'react-native-reanimated';
import { View, StyleSheet, Text } from 'react-native';

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
        duration: 3000 + (attendees * 100), // Larger bubbles pulse slower
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
  }, [attendees]);

  // Derived values for smooth animations
  const pulseScale = useDerivedValue(() => {
    return 1 + pulse.value * 0.06;
  });

  const shimmerOpacity = useDerivedValue(() => {
    return 0.4 + shimmer.value * 0.3;
  });

  const wave1Offset = useDerivedValue(() => {
    return Math.sin(wave1.value * Math.PI * 2) * 6;
  });

  const wave2Offset = useDerivedValue(() => {
    return Math.cos(wave2.value * Math.PI * 2) * 8;
  });

  const glowIntensity = useDerivedValue(() => {
    return 0.3 + glow.value * 0.4;
  });

  const center = size / 2;
  const radius = size / 2 - 6;

  // Enhanced purple color palette with more vibrant colors
  const purpleGradient = [
    'rgba(187, 134, 252, 0.45)', // Primary purple - more opaque
    'rgba(139, 92, 246, 0.38)',   // Deep purple
    'rgba(168, 85, 247, 0.35)',   // Violet
    'rgba(126, 58, 242, 0.3)',    // Dark purple
  ];

  const accentGradient = [
    'rgba(255, 64, 129, 0.35)',  // Pink accent
    'rgba(236, 72, 153, 0.3)',   // Rose
    'rgba(219, 39, 119, 0.25)',  // Deep pink
  ];

  const cyanGradient = [
    'rgba(3, 218, 198, 0.32)',   // Cyan accent
    'rgba(20, 184, 166, 0.28)',  // Teal
    'rgba(6, 182, 212, 0.24)',   // Sky
  ];

  // Outer glow colors - more vibrant
  const glowColors = [
    'rgba(187, 134, 252, 0.6)',
    'rgba(168, 85, 247, 0.45)',
    'rgba(255, 64, 129, 0.35)',
    'rgba(3, 218, 198, 0.25)',
    'transparent',
  ];

  // Shimmer highlight colors
  const shimmerColors = [
    'rgba(255, 255, 255, 0.7)',
    'rgba(187, 134, 252, 0.5)',
    'rgba(255, 255, 255, 0.3)',
    'transparent',
  ];

  // Inner glow colors
  const innerGlowColors = [
    'rgba(255, 64, 129, 0.25)',
    'rgba(187, 134, 252, 0.2)',
    'transparent',
  ];

  // Calculate icon size based on bubble size and attendees
  const iconSize = Math.min(18 + (attendees * 1.8), 42);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Canvas style={{ width: size, height: size }}>
        {/* Outer glow layer - pulsing */}
        <Group opacity={glowIntensity}>
          <Circle cx={center} cy={center} r={radius * 1.4}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(size, size)}
              colors={glowColors}
            />
            <Blur blur={25} />
          </Circle>
        </Group>

        {/* Secondary glow ring */}
        <Group opacity={0.5}>
          <Circle cx={center} cy={center} r={radius * 1.15}>
            <LinearGradient
              start={vec(size * 0.3, size * 0.3)}
              end={vec(size * 0.7, size * 0.7)}
              colors={[
                'rgba(187, 134, 252, 0.4)',
                'rgba(168, 85, 247, 0.3)',
                'transparent',
              ]}
            />
            <Blur blur={18} />
          </Circle>
        </Group>

        {/* Main bubble body with liquid gradient - pulsing */}
        <Group transform={[{ scale: pulseScale }]} origin={vec(center, center)}>
          <Circle cx={center} cy={center} r={radius}>
            <LinearGradient
              start={vec(size * 0.15, size * 0.15)}
              end={vec(size * 0.85, size * 0.85)}
              colors={purpleGradient}
            />
          </Circle>
        </Group>

        {/* Liquid distortion layer 1 - creates organic movement */}
        <Group opacity={0.5}>
          <Circle 
            cx={center + wave1Offset} 
            cy={center - wave2Offset * 0.7} 
            r={radius * 0.85}
          >
            <LinearGradient
              start={vec(center - radius * 0.5, center - radius * 0.5)}
              end={vec(center + radius * 0.5, center + radius * 0.5)}
              colors={accentGradient}
            />
            <Blur blur={16} />
          </Circle>
        </Group>

        {/* Liquid distortion layer 2 - cyan accent */}
        <Group opacity={0.45}>
          <Circle 
            cx={center - wave2Offset * 0.6} 
            cy={center + wave1Offset * 0.8} 
            r={radius * 0.75}
          >
            <LinearGradient
              start={vec(center, center)}
              end={vec(center + radius, center + radius)}
              colors={cyanGradient}
            />
            <Blur blur={14} />
          </Circle>
        </Group>

        {/* Top-left shimmer highlight */}
        <Group opacity={shimmerOpacity}>
          <Circle 
            cx={center - radius * 0.35 + wave1Offset * 0.5} 
            cy={center - radius * 0.35 - wave2Offset * 0.3} 
            r={radius * 0.45}
          >
            <LinearGradient
              start={vec(center - radius * 0.6, center - radius * 0.6)}
              end={vec(center - radius * 0.1, center - radius * 0.1)}
              colors={shimmerColors}
            />
            <Blur blur={14} />
          </Circle>
        </Group>

        {/* Bottom-right shimmer - complementary */}
        <Group opacity={shimmerOpacity * 0.6}>
          <Circle 
            cx={center + radius * 0.3 - wave1Offset * 0.4} 
            cy={center + radius * 0.3 + wave2Offset * 0.4} 
            r={radius * 0.35}
          >
            <LinearGradient
              start={vec(center, center)}
              end={vec(center + radius * 0.6, center + radius * 0.6)}
              colors={[
                'rgba(3, 218, 198, 0.6)',
                'rgba(20, 184, 166, 0.4)',
                'rgba(139, 92, 246, 0.3)',
                'transparent',
              ]}
            />
            <Blur blur={12} />
          </Circle>
        </Group>

        {/* Inner glow for depth */}
        <Group opacity={0.35}>
          <Circle cx={center} cy={center} r={radius * 0.6}>
            <LinearGradient
              start={vec(center, center)}
              end={vec(center + radius * 0.6, center + radius * 0.6)}
              colors={innerGlowColors}
            />
            <Blur blur={20} />
          </Circle>
        </Group>

        {/* Gradient border ring - multi-color */}
        <Circle cx={center} cy={center} r={radius} style="stroke" strokeWidth={2.5}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(size, size)}
            colors={[
              'rgba(187, 134, 252, 0.7)',
              'rgba(168, 85, 247, 0.65)',
              'rgba(255, 64, 129, 0.6)',
              'rgba(3, 218, 198, 0.5)',
              'rgba(187, 134, 252, 0.7)',
            ]}
          />
        </Circle>

        {/* Inner border for extra definition */}
        <Circle cx={center} cy={center} r={radius - 1.5} style="stroke" strokeWidth={1} opacity={0.4}>
          <LinearGradient
            start={vec(size, 0)}
            end={vec(0, size)}
            colors={[
              'rgba(255, 255, 255, 0.5)',
              'rgba(187, 134, 252, 0.4)',
              'rgba(255, 255, 255, 0.3)',
            ]}
          />
        </Circle>

        {/* Subtle sparkle effect - top right */}
        <Group opacity={shimmerOpacity * 0.8}>
          <Circle 
            cx={center + radius * 0.5} 
            cy={center - radius * 0.5} 
            r={radius * 0.12}
          >
            <LinearGradient
              start={vec(center + radius * 0.4, center - radius * 0.6)}
              end={vec(center + radius * 0.6, center - radius * 0.4)}
              colors={[
                'rgba(255, 255, 255, 0.9)',
                'rgba(255, 255, 255, 0.5)',
                'transparent',
              ]}
            />
            <Blur blur={4} />
          </Circle>
        </Group>
      </Canvas>

      {/* Icon overlay */}
      <View style={styles.iconContainer}>
        <Text style={[styles.icon, { fontSize: iconSize }]}>{icon}</Text>
      </View>

      {/* Attendee count badge for larger groups */}
      {attendees > 5 && (
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{attendees}</Text>
          </View>
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
  iconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
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
  },
  badge: {
    backgroundColor: 'rgba(255, 64, 129, 0.95)',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: 'rgba(255, 64, 129, 1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
