import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Strings } from '../../constants/strings.fr';
import type { ToolCall } from '../../types/chat';

interface Props {
  toolCall: ToolCall;
}

export function SmsProposalCard({ toolCall }: Props) {
  const input = toolCall.input as {
    persona_name?: string;
    phone?: string;
    message?: string;
  };

  const phone = input.phone;
  const message = input.message || '';
  const name = input.persona_name || 'Contact';

  const handleSendSms = () => {
    if (!phone) return;
    const encodedMessage = encodeURIComponent(message);
    const smsUrl = Platform.select({
      ios: `sms:${phone}&body=${encodedMessage}`,
      android: `sms:${phone}?body=${encodedMessage}`,
      default: `sms:${phone}?body=${encodedMessage}`,
    });
    Linking.openURL(smsUrl);
  };

  if (!phone) {
    return (
      <View style={[styles.card, { borderLeftColor: Colors.textLight }]}>
        <View style={styles.header}>
          <Ionicons name="alert-circle" size={14} color={Colors.textLight} style={styles.headerIcon} />
          <Text style={styles.label}>{Strings.smartAssistant.noPhoneNumber}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderLeftColor: '#0984E3' }]}>
      <View style={styles.header}>
        <Ionicons name="chatbubble-ellipses" size={14} color="#0984E3" style={styles.headerIcon} />
        <Text style={styles.label}>{Strings.smartAssistant.notifyContact} {name}</Text>
      </View>

      <View style={styles.messageBox}>
        <Text style={styles.messageText}>{message}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSendSms}>
        <Ionicons name="send" size={16} color={Colors.textOnPrimary} />
        <Text style={styles.buttonText}>{Strings.smartAssistant.sendSms}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIcon: {
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  messageBox: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  messageText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#0984E3',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: Colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});
