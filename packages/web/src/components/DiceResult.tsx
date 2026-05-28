/**
 * DiceResult component — Dungeon-themed display of dice roll results.
 */

import React from 'react';
import type { ActionResolution } from '../types';

export interface DiceResultProps {
  result: ActionResolution;
}

export function DiceResult({ result }: DiceResultProps): React.JSX.Element {
  const { rollResult, modifier, difficulty, total, succeeded } = result;
  const isCritical = rollResult === 20;
  const isFumble = rollResult === 1;

  return (
    <div
      style={{
        ...styles.container,
        ...(succeeded ? styles.containerSuccess : styles.containerFail),
      }}
      role="status"
    >
      <div style={styles.header}>
        <span style={styles.diceIcon}>🎲</span>
        <span style={styles.headerText}>
          {isCritical ? 'KRITISCHER TREFFER!' : isFumble ? 'PATZER!' : succeeded ? 'Erfolg' : 'Fehlschlag'}
        </span>
      </div>

      <div style={styles.formula}>
        <div style={styles.formulaItem}>
          <span style={styles.formulaValue}>{rollResult}</span>
          <span style={styles.formulaLabel}>d20</span>
        </div>
        <span style={styles.operator}>{modifier >= 0 ? '+' : ''}</span>
        <div style={styles.formulaItem}>
          <span style={styles.formulaValue}>{modifier}</span>
          <span style={styles.formulaLabel}>Mod</span>
        </div>
        <span style={styles.operator}>=</span>
        <div style={{ ...styles.formulaItem, ...styles.formulaTotal }}>
          <span style={styles.formulaValue}>{total}</span>
          <span style={styles.formulaLabel}>Gesamt</span>
        </div>
      </div>

      <div style={styles.difficulty}>
        Schwierigkeit: <strong>{difficulty}</strong>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(0, 0, 0, 0.4)',
    borderRadius: '10px',
    padding: '12px 14px',
    marginTop: '8px',
    fontSize: '13px',
  },
  containerSuccess: {
    border: '1px solid rgba(52, 211, 153, 0.4)',
    background: 'linear-gradient(145deg, rgba(6, 78, 59, 0.3), rgba(0, 0, 0, 0.4))',
  },
  containerFail: {
    border: '1px solid rgba(220, 38, 38, 0.4)',
    background: 'linear-gradient(145deg, rgba(127, 29, 29, 0.3), rgba(0, 0, 0, 0.4))',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  diceIcon: {
    fontSize: '20px',
  },
  headerText: {
    fontWeight: '700',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#e2d9f3',
  },
  formula: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  formulaItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '40px',
    padding: '4px 8px',
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: '6px',
  },
  formulaTotal: {
    background: 'rgba(167, 139, 250, 0.2)',
  },
  formulaValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#e2d9f3',
  },
  formulaLabel: {
    fontSize: '10px',
    color: '#8b7faa',
    textTransform: 'uppercase',
  },
  operator: {
    color: '#8b7faa',
    fontSize: '16px',
    fontWeight: '600',
  },
  difficulty: {
    fontSize: '12px',
    color: '#8b7faa',
  },
};
