import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface Props {
  rating: number;
  maxStars?: number;
  size?: number;
  color?: string;
}

export function StarRating({ rating, maxStars = 5, size = 14, color = Colors.authGold }: Props) {
  const stars = [];
  const clamped = Math.max(0, Math.min(rating, maxStars));

  for (let i = 1; i <= maxStars; i++) {
    if (clamped >= i) {
      stars.push(<Ionicons key={i} name="star" size={size} color={color} />);
    } else if (clamped >= i - 0.5) {
      stars.push(<Ionicons key={i} name="star-half" size={size} color={color} />);
    } else {
      stars.push(<Ionicons key={i} name="star-outline" size={size} color={Colors.borderLight} />);
    }
  }

  return <View style={styles.container}>{stars}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
});
