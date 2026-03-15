import { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { EventConfirmationCard } from './EventConfirmationCard';
import { TaskConfirmationCard } from './TaskConfirmationCard';
import { SmsProposalCard } from './SmsProposalCard';
import { RestaurantCarousel } from './RestaurantCarousel';
import { RestaurantDetailModal } from './RestaurantDetailModal';
import type { Message } from '../../types/chat';
import type { RestaurantResult, SearchRestaurantsResult } from '../../types/restaurants';

interface Props {
  message: Message;
  onSendMessage?: (text: string) => void;
}

const TASK_TOOL_NAMES = ['create_task', 'update_task', 'complete_task', 'create_task_category'];
const SMS_TOOL_NAMES = ['propose_sms'];
const RESTAURANT_TOOL_NAMES = ['search_restaurants'];

export function MessageBubble({ message, onSendMessage }: Props) {
  const isUser = message.role === 'user';
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantResult | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const hasEventToolCall = message.tool_calls?.some(
    tc => tc.name === 'create_event' || tc.name === 'update_event'
  );
  const hasTaskToolCall = message.tool_calls?.some(
    tc => TASK_TOOL_NAMES.includes(tc.name)
  );
  const hasSmsToolCall = message.tool_calls?.some(
    tc => SMS_TOOL_NAMES.includes(tc.name)
  );
  const hasRestaurantToolCall = message.tool_calls?.some(
    tc => RESTAURANT_TOOL_NAMES.includes(tc.name)
  );

  // Parse restaurant data from tool_results
  const restaurantData = useMemo(() => {
    if (!hasRestaurantToolCall || !message.tool_results) return null;

    const restaurantToolCall = message.tool_calls?.find(
      tc => tc.name === 'search_restaurants'
    );
    if (!restaurantToolCall) return null;

    const result = message.tool_results.find(
      tr => tr.tool_use_id === restaurantToolCall.id
    );
    if (!result || result.is_error) return null;

    try {
      const parsed = JSON.parse(result.content) as SearchRestaurantsResult;
      const allRestaurants = [
        ...(parsed.favorites || []),
        ...(parsed.external_results || []),
      ];
      return allRestaurants.length > 0 ? allRestaurants : null;
    } catch {
      return null;
    }
  }, [message.tool_calls, message.tool_results, hasRestaurantToolCall]);

  return (
    <View style={[
      styles.container,
      isUser ? styles.userContainer : styles.assistantContainer,
      restaurantData && styles.wideContainer,
    ]}>
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
      {hasTaskToolCall &&
        message.tool_calls
          ?.filter(tc => TASK_TOOL_NAMES.includes(tc.name))
          .map(tc => (
            <TaskConfirmationCard key={tc.id} toolCall={tc} />
          ))}
      {hasSmsToolCall &&
        message.tool_calls
          ?.filter(tc => SMS_TOOL_NAMES.includes(tc.name))
          .map(tc => (
            <SmsProposalCard key={tc.id} toolCall={tc} />
          ))}

      {/* Restaurant carousel */}
      {restaurantData && (
        <RestaurantCarousel
          restaurants={restaurantData}
          onSelect={(r) => {
            setSelectedRestaurant(r);
            setModalVisible(true);
          }}
        />
      )}

      {/* Restaurant detail modal */}
      <RestaurantDetailModal
        restaurant={selectedRestaurant}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onChoose={(r) => {
          setModalVisible(false);
          onSendMessage?.(`Je choisis ${r.name}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  wideContainer: {
    maxWidth: '95%',
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
