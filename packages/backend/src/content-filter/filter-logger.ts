/**
 * Filter logging for content filter events.
 *
 * Logs metadata about blocked content (category, serviceId, timestamp)
 * without ever persisting the blocked content itself.
 */

import { randomUUID } from 'node:crypto';
import type { BlockCategory, ContentFilterLogEntry } from '@trixy/shared';

export interface CreateFilterLogEntryParams {
  category: BlockCategory;
  serviceId: 'game_master' | 'npc';
  campaignId?: string;
  blockedText: string;
}

/**
 * Creates a ContentFilterLogEntry with metadata only.
 * The blockedText is intentionally NOT included in the returned entry.
 */
export function createFilterLogEntry(params: CreateFilterLogEntryParams): ContentFilterLogEntry {
  return {
    id: randomUUID(),
    campaignId: params.campaignId,
    serviceId: params.serviceId,
    category: params.category,
    timestamp: new Date(),
  };
}

/**
 * Interface for persisting and retrieving filter log entries.
 */
export interface FilterLogStore {
  save(entry: ContentFilterLogEntry): Promise<void>;
  getEntries(campaignId: string): Promise<ContentFilterLogEntry[]>;
}

/**
 * In-memory implementation of FilterLogStore for testing purposes.
 */
export class InMemoryFilterLogStore implements FilterLogStore {
  private entries: ContentFilterLogEntry[] = [];

  async save(entry: ContentFilterLogEntry): Promise<void> {
    this.entries.push(entry);
  }

  async getEntries(campaignId: string): Promise<ContentFilterLogEntry[]> {
    return this.entries.filter((e) => e.campaignId === campaignId);
  }

  /** Helper for tests: get all stored entries regardless of campaignId. */
  getAll(): ContentFilterLogEntry[] {
    return [...this.entries];
  }

  /** Helper for tests: clear all entries. */
  clear(): void {
    this.entries = [];
  }
}
