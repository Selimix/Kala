import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { ChatInput } from '../../components/chat/ChatInput';
import { TypingIndicator } from '../../components/chat/TypingIndicator';
import { MicButton } from '../../components/ui/MicButton';
import { ConversationHistory } from '../../components/chat/ConversationHistory';
import { useChat } from '../../hooks/useChat';
import { useLocation } from '../../hooks/useLocation';
import { Colors } from '../../constants/colors';
import { Strings } from '../../constants/strings.fr';
import type { Message } from '../../types/chat';

export default function ChatScreen() {
  const flatListRef = useRef<FlatList>(null);
  const {
    messages,
    sending,
    sendMessage,
    conversations,
    activeConversationId,
    loadConversations,
    switchConversation,
    startNewConversation,
  } = useChat();
  const { location } = useLocation();
  const [isListening, setIsListening] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);

  const handleSend = useCallback(
    async (text: string) => {
      await sendMessage(text, location);
    },
    [sendMessage, location]
  );

  const handleMicPress = () => {
    setIsListening(prev => !prev);
    // TODO: Integrer expo-av ou expo-speech pour la vraie reconnaissance vocale
  };

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => <MessageBubble message={item} onSendMessage={sendMessage} />,
    [sendMessage]
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const hasMessages = messages.length > 0;

  // Chat header bar
  const renderHeader = () => (
    <View style={styles.headerBar}>
      <TouchableOpacity
        style={styles.headerBtn}
        onPress={() => setHistoryVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="time-outline" size={22} color={Colors.authGold} />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <Image
          source={require('../../../assets/kala-logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>KALA</Text>
      </View>

      <TouchableOpacity
        style={styles.headerBtn}
        onPress={startNewConversation}
        activeOpacity={0.7}
      >
        <Ionicons name="create-outline" size={22} color={Colors.authGold} />
      </TouchableOpacity>
    </View>
  );

  // Empty state -- Home screen with logo + mic
  const renderHomeScreen = () => (
    <View style={styles.homeContainer}>
      {/* Logo + Title + Tagline */}
      <View style={styles.homeHeader}>
        <Image
          source={require('../../../assets/kala-logo.png')}
          style={styles.homeLogo}
          resizeMode="contain"
        />
        <Text style={styles.homeTitle}>KALA काल AI</Text>
        <Text style={styles.homeTagline}>{Strings.app.taglineUpper}</Text>
      </View>

      {/* Microphone Button */}
      <View style={styles.micArea}>
        <MicButton isListening={isListening} onPress={handleMicPress} />
        <Text style={styles.micLabel}>
          {isListening ? Strings.chat.listening : Strings.chat.tapToSpeak}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {renderHeader()}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {hasMessages ? (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={keyExtractor}
              inverted
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
            />
            {sending && <TypingIndicator />}
          </>
        ) : (
          renderHomeScreen()
        )}
        <ChatInput
          onSend={handleSend}
          disabled={sending}
          onMicPress={handleMicPress}
          isListening={isListening}
        />
      </KeyboardAvoidingView>

      {/* Conversation history modal */}
      <ConversationHistory
        visible={historyVisible}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={switchConversation}
        onNewConversation={startNewConversation}
        onClose={() => setHistoryVisible(false)}
        onLoad={loadConversations}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.homeBg,
  },
  flex: {
    flex: 1,
  },

  // ── Header bar ──
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(184,149,106,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.authTitle,
    letterSpacing: 2,
    ...Platform.select({
      ios: { fontFamily: 'AvenirNextCondensed-Bold' },
      android: { fontFamily: 'sans-serif-condensed' },
      web: { fontFamily: 'Arial Narrow, sans-serif' },
    }),
  },

  // ── Messages ──
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  // ── Home (empty state) ──
  homeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  homeHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  homeLogo: {
    width: 80,
    height: 80,
    marginBottom: 16,
    borderRadius: 16,
  },
  homeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.authTitle,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 8,
    ...Platform.select({
      ios: { fontFamily: 'AvenirNextCondensed-Bold' },
      android: { fontFamily: 'sans-serif-condensed' },
      web: { fontFamily: 'Arial Narrow, sans-serif' },
    }),
  },
  homeTagline: {
    fontSize: 11,
    color: Colors.homeTagline,
    textAlign: 'center',
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '600',
  },

  // ── Microphone area ──
  micArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micLabel: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.homeTextMuted,
    letterSpacing: 0.5,
  },
});
