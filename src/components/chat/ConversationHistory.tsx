import { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import type { Conversation } from '../../types/chat';

interface Props {
  visible: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  onClose: () => void;
  onLoad: () => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return `Aujourd'hui ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function ConversationHistory({
  visible,
  conversations,
  activeConversationId,
  onSelect,
  onNewConversation,
  onClose,
  onLoad,
}: Props) {
  useEffect(() => {
    if (visible) {
      onLoad();
    }
  }, [visible]);

  const renderItem = ({ item }: { item: Conversation }) => {
    const isActive = item.id === activeConversationId;
    return (
      <TouchableOpacity
        style={[styles.item, isActive && styles.itemActive]}
        onPress={() => {
          onSelect(item.id);
          onClose();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.itemIcon}>
          <Ionicons
            name={isActive ? 'chatbubble' : 'chatbubble-outline'}
            size={18}
            color={isActive ? Colors.primary : Colors.textSecondary}
          />
        </View>
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, isActive && styles.itemTitleActive]} numberOfLines={1}>
            {item.title || 'Conversation'}
          </Text>
          <Text style={styles.itemDate}>{formatDate(item.updated_at)}</Text>
        </View>
        {isActive && (
          <View style={styles.activeDot} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      transparent={Platform.OS !== 'ios'}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.dragPill} />
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Conversations</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* New conversation button */}
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => {
              onNewConversation();
              onClose();
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.newBtnText}>Nouvelle conversation</Text>
          </TouchableOpacity>

          {/* List */}
          {conversations.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.borderLight} />
              <Text style={styles.emptyText}>Aucune conversation</Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: 400,
    paddingBottom: Platform.OS === 'ios' ? 16 : 32,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  newBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  list: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 2,
  },
  itemActive: {
    backgroundColor: 'rgba(108,92,231,0.08)',
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  itemTitleActive: {
    fontWeight: '700',
    color: Colors.primary,
  },
  itemDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 12,
  },
});
