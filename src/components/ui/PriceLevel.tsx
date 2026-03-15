import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  level: number;
  maxLevel?: number;
  size?: number;
}

export function PriceLevel({ level, maxLevel = 4, size = 13 }: Props) {
  const clamped = Math.max(0, Math.min(Math.round(level), maxLevel));

  return (
    <View style={styles.container}>
      {Array.from({ length: maxLevel }, (_, i) => (
        <Text
          key={i}
          style={[
            styles.euro,
            { fontSize: size },
            i < clamped ? styles.active : styles.inactive,
          ]}
        >
          €
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  euro: {
    fontWeight: '700',
  },
  active: {
    color: Colors.text,
  },
  inactive: {
    color: Colors.borderLight,
  },
});
