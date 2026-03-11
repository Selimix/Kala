import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { EventConfirmationCard } from './EventConfirmationCard';
import type { Message } from '../../types/chat';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const hasEventToolCall = message.tool_calls?.some(
    tc => tc.name === 'create_event' || tc.name === 'update_event'
  );

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
          {message.content}
        </Text>
      </View>
      {hasEventToolCall &&
        message.tool_calls
          ?.filter(tc => tc.name === 'create_event' || tc.name === 'update_event')
          .map(tc => (
            <EventConfirmationCard key={tc.id} toolCall={tc} />
          ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: Colors.userBubble,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: Colors.assistantBubble,
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: Colors.textOnPrimary,
  },
  assistantText: {
    color: Colors.text,
  },
});
