/**
 * Content filter types.
 */

import type { BlockCategory } from './enums.js';

export type FilterVerdict =
  | { kind: 'approved' }
  | { kind: 'blocked'; categories: BlockCategory[] };

export interface ContentFilterLogEntry {
  id: string;
  campaignId?: string;
  serviceId: 'game_master' | 'npc';
  category: BlockCategory;
  timestamp: Date;
  // Intentionally NO blocked content stored
}
