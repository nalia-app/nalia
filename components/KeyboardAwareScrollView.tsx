
import React, { useRef, useEffect, useState, ReactNode } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  Keyboard,
  Platform,
  KeyboardEvent,
  Animated,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  children: ReactNode;
  extraScrollHeight?: number;
  enableAutomaticScroll?: boolean;
  enableResetScrollToCoords?: boolean;
  keyboardOpeningTime?: number;
}

export const KeyboardAwareScrollView: React.FC<KeyboardAwareScrollViewProps> = ({
  children,
  extraScrollHeight = 20,
  enableAutomaticScroll = true,
  enableResetScrollToCoords = true,
  keyboardOpeningTime = 250,
  ...scrollViewProps
}) => {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const keyboardHeightAnimated = useRef(new Animated.Value(0)).current;
  const contentBottomPadding = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      handleKeyboardShow
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      handleKeyboardHide
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyboardShow = (event: KeyboardEvent) => {
    const { height, duration } = event.endCoordinates;
    const animationDuration = Platform.OS === 'ios' ? duration : keyboardOpeningTime;

    setKeyboardHeight(height);

    // Animate content padding to account for keyboard
    Animated.parallel([
      Animated.timing(keyboardHeightAnimated, {
        toValue: height,
        duration: animationDuration,
        useNativeDriver: false,
      }),
      Animated.timing(contentBottomPadding, {
        toValue: height + extraScrollHeight,
        duration: animationDuration,
        useNativeDriver: false,
      }),
    ]).start();

    // Auto-scroll to bottom after keyboard animation
    if (enableAutomaticScroll) {
      setTimeout(() => {
        scrollToEnd();
      }, animationDuration + 50);
    }
  };

  const handleKeyboardHide = (event: KeyboardEvent) => {
    const duration = Platform.OS === 'ios' ? event.duration : keyboardOpeningTime;

    setKeyboardHeight(0);

    // Animate content padding back to normal
    Animated.parallel([
      Animated.timing(keyboardHeightAnimated, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }),
      Animated.timing(contentBottomPadding, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const scrollToEnd = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const handleContentSizeChange = () => {
    if (keyboardHeight > 0 && enableAutomaticScroll) {
      // Small delay to ensure layout is complete
      setTimeout(() => {
        scrollToEnd();
      }, 100);
    }
  };

  return (
    <Animated.ScrollView
      ref={scrollViewRef}
      {...scrollViewProps}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      scrollEnabled={scrollEnabled}
      onContentSizeChange={handleContentSizeChange}
      contentContainerStyle={[
        scrollViewProps.contentContainerStyle,
        {
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {children}
    </Animated.ScrollView>
  );
};
