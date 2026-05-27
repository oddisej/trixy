import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface DiceResultProps {
  rollResult: number;
  modifier: number;
  difficulty: number;
  total: number;
  succeeded: boolean;
}

/**
 * Displays a dice roll result with modifier, difficulty, total, and success/failure.
 * Requirements: 9.3
 */
export function DiceResult({ rollResult, modifier, difficulty, total, succeeded }: DiceResultProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={[styles.resultBadge, succeeded ? styles.success : styles.failure]}>
        <Text style={styles.resultLabel}>{succeeded ? 'Erfolg!' : 'Fehlschlag'}</Text>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailValue}>{rollResult}</Text>
          <Text style={styles.detailLabel}>Wurf (d20)</Text>
        </View>

        <Text style={styles.operator}>+</Text>

        <View style={styles.detailItem}>
          <Text style={styles.detailValue}>{modifier}</Text>
          <Text style={styles.detailLabel}>Modifikator</Text>
        </View>

        <Text style={styles.operator}>=</Text>

        <View style={styles.detailItem}>
          <Text style={styles.detailValue}>{total}</Text>
          <Text style={styles.detailLabel}>Gesamt</Text>
        </View>
      </View>

      <View style={styles.difficultyRow}>
        <Text style={styles.difficultyText}>Schwierigkeit: {difficulty}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    alignItems: 'center',
  },
  resultBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  success: {
    backgroundColor: '#2d6a4f',
  },
  failure: {
    backgroundColor: '#9d0208',
  },
  resultLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  detailLabel: {
    color: '#aaaaaa',
    fontSize: 11,
    marginTop: 2,
  },
  operator: {
    color: '#888888',
    fontSize: 20,
    fontWeight: '600',
  },
  difficultyRow: {
    marginTop: 4,
  },
  difficultyText: {
    color: '#cccccc',
    fontSize: 13,
  },
});
