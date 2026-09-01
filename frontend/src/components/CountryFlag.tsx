import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getCountry } from '../utils/countries';

interface CountryFlagProps {
  code?: string | null;
  size?: number;
  borderRadius?: number;
  showFallback?: boolean;
}

/// Displays a country's emoji flag inside a small rounded box.
/// Falls back to a globe icon badge when no country is set.
export const CountryFlag: React.FC<CountryFlagProps> = ({
  code,
  size = 22,
  borderRadius = 4,
}) => {
  const country = getCountry(code);

  if (!country) {
    return (
      <View
        style={[
          styles.container,
          { width: size + 4, height: size + 4, borderRadius },
        ]}
      >
        <Text style={{ fontSize: size * 0.6, lineHeight: size * 0.8 }}>🌍</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { width: size + 4, height: size + 4, borderRadius },
      ]}
    >
      <Text style={{ fontSize: size * 0.85, lineHeight: size + 4 }}>
        {country.flag}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
