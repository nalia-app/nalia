
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  Keyboard,
  Animated,
  KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

interface KeyboardAwareComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
  maxLines?: number;
  sendButtonColor?: string;
  autoFocus?: boolean;
}

export const KeyboardAwareComposer: React.FC<KeyboardAwareComposerProps> = ({
  value,
  onChangeText,
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
  sending = false,
  maxLines = 5,
  sendButtonColor = colors.primary,
  autoFocus = false,
}) => {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [inputHeight, setInputHeight] = useState(40);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const composerBottom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardWillShow = Keyboard.addListener(showEvent, handleKeyboardShow);
    const keyboardWillHide = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyboardShow = (event: KeyboardEvent) => {
    const { height, duration } = event.endCoordinates;
    const animationDuration = Platform.OS === 'ios' ? duration : 250;
    
    setKeyboardHeight(height);
    
    Animated.timing(composerBottom, {
      toValue: height,
      duration: animationDuration,
      useNativeDriver: false,
    }).start();
  };

  const handleKeyboardHide = (event: KeyboardEvent) => {
    const duration = Platform.OS === 'ios' ? event.duration : 250;
    
    setKeyboardHeight(0);
    
    Animated.timing(composerBottom, {
      toValue: 0,
      duration,
      useNativeDriver: false,
    }).start();
  };

  const handleSend = () => {
    if (!value.trim() || disabled || sending) return;
    
    // Call the parent's onSend function
    onSend();
    
    // Reset input height
    setInputHeight(40);
    
    // Keep the input focused to maintain keyboard visibility
    // Use requestAnimationFrame to ensure this happens after the state update
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleContentSizeChange = (event: any) => {
    const { height } = event.nativeEvent.contentSize;
    const lineHeight = 20;
    const maxHeight = lineHeight * maxLines + 20; // padding
    setInputHeight(Math.min(Math.max(40, height), maxHeight));
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: composerBottom,
        },
      ]}
    >
      <View
        style={[
          styles.innerContainer,
          {
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { height: Math.max(40, inputHeight) },
            ]}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            value={value}
            onChangeText={onChangeText}
            multiline
            editable={!disabled && !sending}
            blurOnSubmit={false}
            returnKeyType="default"
            autoFocus={autoFocus}
            onContentSizeChange={handleContentSizeChange}
            scrollEnabled={inputHeight >= 20 * maxLines}
          />
          <Pressable
            style={[
              styles.sendButton,
              (!value.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!value.trim() || sending || disabled}
          >
            <IconSymbol
              name="arrow.up.circle.fill"
              size={36}
              color={
                value.trim() && !sending
                  ? sendButtonColor
                  : colors.textSecondary
              }
            />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.highlight,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  innerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: colors.highlight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    marginRight: 8,
    minHeight: 40,
  },
  sendButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
