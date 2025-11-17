
import React, { useEffect } from 'react';
import { Canvas, Circle, Group, LinearGradient, vec, Blur, Paint, Shadow } from '@shopify/react-native-skia';
import { useSharedValue, withRepeat, withTiming, Easing, useDerivedValue } from 'react-native-reanimated';
import { View, StyleSheet, Text } from 'react-native';

interface SkiaEventBubbleProps {
  size: number;
  icon: string;
  attendees: number;
}

export const SkiaEventBubble: React.FC<SkiaEventBubbleProps> = ({ size, icon, attendees }) => {
  // Animation values for liquid effect
  const pulse = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const wave = useSharedValue(0);

  useEffect(() => {
    // Pulse animation - gentle breathing effect
    pulse.value = withRepeat(
      withTiming(1, {
        duration: 3000,
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

    // Wave animation - liquid distortion
    wave.value = withRepeat(
      withTiming(1, {
        duration: 5000,
        easing: Easing.inOut(Easing.sine),
      }),
      -1,
      true
    );
  }, []);

  // Derived values for smooth animations
  const pulseScale = useDerivedValue(() => {
    return 1 + pulse.value * 0.08;
  });

  const shimmerOpacity = useDerivedValue(() => {
    return 0.3 + shimmer.value * 0.4;
  });

  const waveOffset = useDerivedValue(() => {
    return wave.value * 8 - 4;
  });

  const center = size / 2;
  const radius = size / 2 - 4;

  // Purple color palette inspired by app colors
  const purpleColors = [
    'rgba(187, 134, 252, 0.35)', // Primary purple
    'rgba(139, 92, 246, 0.3)',   // Deep purple
    'rgba(255, 64, 129, 0.28)',  // Pink accent
    'rgba(3, 218, 198, 0.25)',   // Cyan accent
  ];

  const glowColors = [
    'rgba(187, 134, 252, 0.5)',
    'rgba(255, 64, 129, 0.3)',
    'rgba(3, 218, 198, 0.2)',
    'transparent',
  ];

  const shimmerColors = [
    'rgba(255, 255, 255, 0.6)',
    'rgba(187, 134, 252, 0.4)',
    'transparent',
  ];

  // Calculate icon size based on bubble size
  const iconSize = Math.min(20 + (attendees * 1.5), 38);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Canvas style={{ width: size, height: size }}>
        {/* Outer glow layer */}
        <Group>
          <Circle cx={center} cy={center} r={radius * 1.3}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(size, size)}
              colors={glowColors}
            />
            <Blur blur={20} />
          </Circle>
        </Group>

        {/* Main bubble body with liquid gradient */}
        <Group transform={[{ scale: pulseScale.value }]} origin={vec(center, center)}>
          <Circle cx={center} cy={center} r={radius}>
            <LinearGradient
              start={vec(size * 0.2, size * 0.2)}
              end={vec(size * 0.8, size * 0.8)}
              colors={purpleColors}
            />
            <Shadow dx={0} dy={4} blur={15} color="rgba(187, 134, 252, 0.4)" />
          </Circle>
        </Group>

        {/* Inner shimmer highlight - top left */}
        <Group opacity={shimmerOpacity.value}>
          <Circle 
            cx={center - radius * 0.3 + waveOffset.value} 
            cy={center - radius * 0.3} 
            r={radius * 0.4}
          >
            <LinearGradient
              start={vec(center - radius * 0.5, center - radius * 0.5)}
              end={vec(center, center)}
              colors={shimmerColors}
            />
            <Blur blur={12} />
          </Circle>
        </Group>

        {/* Secondary shimmer - bottom right */}
        <Group opacity={shimmerOpacity.value * 0.7}>
          <Circle 
            cx={center + radius * 0.25 - waveOffset.value} 
            cy={center + radius * 0.25} 
            r={radius * 0.3}
          >
            <LinearGradient
              start={vec(center, center)}
              end={vec(center + radius * 0.5, center + radius * 0.5)}
              colors={[
                'rgba(3, 218, 198, 0.5)',
                'rgba(139, 92, 246, 0.3)',
                'transparent',
              ]}
            />
            <Blur blur={10} />
          </Circle>
        </Group>

        {/* Liquid distortion layer - creates organic movement */}
        <Group opacity={0.4}>
          <Circle 
            cx={center + waveOffset.value * 0.5} 
            cy={center - waveOffset.value * 0.3} 
            r={radius * 0.9}
          >
            <LinearGradient
              start={vec(center - radius, center - radius)}
              end={vec(center + radius, center + radius)}
              colors={[
                'rgba(255, 64, 129, 0.2)',
                'rgba(187, 134, 252, 0.15)',
                'transparent',
              ]}
            />
            <Blur blur={15} />
          </Circle>
        </Group>

        {/* Border ring with gradient */}
        <Circle cx={center} cy={center} r={radius} style="stroke" strokeWidth={2}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(size, size)}
            colors={[
              'rgba(187, 134, 252, 0.6)',
              'rgba(255, 64, 129, 0.5)',
              'rgba(3, 218, 198, 0.4)',
            ]}
          />
        </Circle>
      </Canvas>

      {/* Icon overlay */}
      <View style={styles.iconContainer}>
        <Text style={[styles.icon, { fontSize: iconSize }]}>{icon}</Text>
      </View>
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
    textShadowColor: 'rgba(187, 134, 252, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
});
