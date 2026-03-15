import { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Strings } from '../../constants/strings.fr';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  onMicPress?: () => void;
  isListening?: boolean;
}

export function ChatInput({ onSend, disabled, onMicPress, isListening }: Props) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  const hasText = text.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Bouton micro — visible quand pas de texte */}
      {!hasText && onMicPress && (
        <TouchableOpacity
          style={[styles.micButton, isListening && styles.micButtonActive]}
          onPress={onMicPress}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isListening ? 'mic' : 'mic-outline'}
            size={26}
            color={isListening ? '#fff' : Colors.authGold}
          />
        </TouchableOpacity>
      )}

      <TextInput
        style={styles.input}
        placeholder={Strings.chat.placeholder}
        placeholderTextColor={Colors.homeTextMuted}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={500}
        editable={!disabled}
        onSubmitEditing={handleSend}
        blurOnSubmit={false}
      />

      {/* Bouton envoyer — visible quand il y a du texte */}
      <TouchableOpacity
        style={[styles.sendButton, (!hasText || disabled) && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={!hasText || disabled}
      >
        <Ionicons
          name="send"
          size={24}
          color={!hasText || disabled ? Colors.homeTextMuted : Colors.textOnPrimary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.homeBg,
    borderTopWidth: 1,
    borderTopColor: Colors.homeInputBorder,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.homeInputBg,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.authTitle,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.homeInputBorder,
  },
  micButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(184,149,106,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: Colors.authGold,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.authGold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.homeInputBg,
  },
});
