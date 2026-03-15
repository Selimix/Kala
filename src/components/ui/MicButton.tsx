import { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
  Platform,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const MIC_SIZE = 110;
const GAUGE_SIZE = 140;
const STROKE_WIDTH = 4;
const RADIUS = (GAUGE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  isListening: boolean;
  onPress: () => void;
}

export function MicButton({ isListening, onPress }: Props) {
  // ── Idle pulse (always running, subtle) ──
  const idlePulse = useRef(new Animated.Value(1)).current;

  // ── Active pulse (stronger when listening) ──
  const activePulse = useRef(new Animated.Value(1)).current;

  // ── Ripple rings ──
  const rippleAnim = useRef(new Animated.Value(0)).current;

  // ── Circular gauge progress ──
  const gaugeProgress = useRef(new Animated.Value(0)).current;

  // Idle pulse — always running
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(idlePulse, {
          toValue: 1.04,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(idlePulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // Active animations (when listening)
  useEffect(() => {
    if (isListening) {
      // Stronger pulse
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(activePulse, {
            toValue: 1.08,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(activePulse, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      // Ripple outward
      const ripple = Animated.loop(
        Animated.timing(rippleAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      );

      // Gauge fills up over 30s (max recording time)
      const gauge = Animated.timing(gaugeProgress, {
        toValue: 1,
        duration: 30000,
        easing: Easing.linear,
        useNativeDriver: false, // strokeDashoffset needs JS driver
      });

      pulse.start();
      ripple.start();
      gauge.start();

      return () => {
        pulse.stop();
        ripple.stop();
        gauge.stop();
        activePulse.setValue(1);
        rippleAnim.setValue(0);
        gaugeProgress.setValue(0);
      };
    } else {
      activePulse.setValue(1);
      rippleAnim.setValue(0);
      gaugeProgress.setValue(0);
    }
  }, [isListening]);

  // Compute the animated strokeDashoffset
  const strokeDashoffset = gaugeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  // Combine idle + active scales
  const combinedScale = isListening
    ? Animated.multiply(idlePulse, activePulse)
    : idlePulse;

  return (
    <View style={styles.container}>
      {/* Ripple rings (only when listening) */}
      {isListening && (
        <>
          <Animated.View
            style={[
              styles.rippleRing,
              {
                opacity: rippleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.35, 0],
                }),
                transform: [
                  {
                    scale: rippleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 2.2],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.rippleRing,
              {
                opacity: rippleAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.25, 0],
                }),
                transform: [
                  {
                    scale: rippleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.7],
                    }),
                  },
                ],
              },
            ]}
          />
        </>
      )}

      {/* Circular gauge (SVG) */}
      {isListening && (
        <View style={styles.gaugeContainer}>
          <Svg width={GAUGE_SIZE} height={GAUGE_SIZE}>
            {/* Background track */}
            <Circle
              cx={GAUGE_SIZE / 2}
              cy={GAUGE_SIZE / 2}
              r={RADIUS}
              stroke={Colors.homeInputBorder}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            {/* Animated fill */}
            <AnimatedCircle
              cx={GAUGE_SIZE / 2}
              cy={GAUGE_SIZE / 2}
              r={RADIUS}
              stroke={Colors.authGold}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2})`}
            />
          </Svg>
        </View>
      )}

      {/* Mic button */}
      <Animated.View style={{ transform: [{ scale: combinedScale }] }}>
        <TouchableOpacity
          testID="mic-button"
          accessibilityRole="button"
          accessibilityLabel="Microphone"
          style={[styles.micButton, isListening && styles.micButtonActive]}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isListening ? 'mic' : 'mic-outline'}
            size={48}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleRing: {
    position: 'absolute',
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    backgroundColor: Colors.homeMicRipple,
  },
  gaugeContainer: {
    position: 'absolute',
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
  },
  micButton: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    backgroundColor: Colors.homeMicBg,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.homeMicBg,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: `0 6px 24px ${Colors.homeMicRipple}`,
      },
    }),
  },
  micButtonActive: {
    backgroundColor: Colors.authGoldDark,
  },
});
