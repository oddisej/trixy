import { describe, it, expect, beforeEach } from 'vitest';
import {
  createFilterLogEntry,
  InMemoryFilterLogStore,
  type CreateFilterLogEntryParams,
} from './filter-logger.js';
import type { BlockCategory } from '@trixy/shared';

describe('filter-logger', () => {
  describe('createFilterLogEntry', () => {
    it('creates an entry with correct category, serviceId, and timestamp', () => {
      const params: CreateFilterLogEntryParams = {
        category: 'graphic_violence',
        serviceId: 'game_master',
        campaignId: 'campaign-123',
        blockedText: 'This is some blocked violent content that should never appear in the log',
      };

      const entry = createFilterLogEntry(params);

      expect(entry.id).toBeDefined();
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.category).toBe('graphic_violence');
      expect(entry.serviceId).toBe('game_master');
      expect(entry.campaignId).toBe('campaign-123');
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it('generates unique ids for each entry', () => {
      const params: CreateFilterLogEntryParams = {
        category: 'sexual_content',
        serviceId: 'npc',
        blockedText: 'Some blocked content here for testing purposes',
      };

      const entry1 = createFilterLogEntry(params);
      const entry2 = createFilterLogEntry(params);

      expect(entry1.id).not.toBe(entry2.id);
    });

    it('does not include any substring of the blocked text (length >= 8)', () => {
      const blockedText =
        'The dragon violently ripped apart the villagers in a gruesome display of carnage and destruction';
      const params: CreateFilterLogEntryParams = {
        category: 'graphic_violence',
        serviceId: 'game_master',
        campaignId: 'camp-1',
        blockedText,
      };

      const entry = createFilterLogEntry(params);
      const serialized = JSON.stringify(entry);

      // Check that no substring of length >= 8 from the blocked text appears in the serialized entry
      for (let i = 0; i <= blockedText.length - 8; i++) {
        const substring = blockedText.substring(i, i + 8);
        expect(serialized).not.toContain(substring);
      }
    });

    it('does not include blocked text even when text contains special characters', () => {
      const blockedText = 'He said: "Kill them all!" — a horrific command';
      const params: CreateFilterLogEntryParams = {
        category: 'hate_speech',
        serviceId: 'npc',
        blockedText,
      };

      const entry = createFilterLogEntry(params);
      const serialized = JSON.stringify(entry);

      for (let i = 0; i <= blockedText.length - 8; i++) {
        const substring = blockedText.substring(i, i + 8);
        expect(serialized).not.toContain(substring);
      }
    });

    it('works with all block categories', () => {
      const categories: BlockCategory[] = [
        'graphic_violence',
        'sexual_content',
        'hate_speech',
        'substance_abuse_glorification',
      ];

      for (const category of categories) {
        const entry = createFilterLogEntry({
          category,
          serviceId: 'game_master',
          blockedText: 'Some inappropriate content that must be filtered out completely',
        });

        expect(entry.category).toBe(category);
        expect(entry.serviceId).toBe('game_master');
        expect(entry.timestamp).toBeInstanceOf(Date);
      }
    });

    it('handles campaignId being undefined', () => {
      const entry = createFilterLogEntry({
        category: 'substance_abuse_glorification',
        serviceId: 'npc',
        blockedText: 'Glorifying substance abuse in a detailed manner here',
      });

      expect(entry.campaignId).toBeUndefined();
    });
  });

  describe('InMemoryFilterLogStore', () => {
    let store: InMemoryFilterLogStore;

    beforeEach(() => {
      store = new InMemoryFilterLogStore();
    });

    it('saves and retrieves entries by campaignId', async () => {
      const entry = createFilterLogEntry({
        category: 'graphic_violence',
        serviceId: 'game_master',
        campaignId: 'campaign-abc',
        blockedText: 'Violent content that should not be stored anywhere in the system',
      });

      await store.save(entry);
      const results = await store.getEntries('campaign-abc');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(entry);
    });

    it('returns empty array for unknown campaignId', async () => {
      const results = await store.getEntries('nonexistent');
      expect(results).toEqual([]);
    });

    it('filters entries by campaignId correctly', async () => {
      const entry1 = createFilterLogEntry({
        category: 'graphic_violence',
        serviceId: 'game_master',
        campaignId: 'campaign-1',
        blockedText: 'First blocked content that is violent and inappropriate',
      });
      const entry2 = createFilterLogEntry({
        category: 'sexual_content',
        serviceId: 'npc',
        campaignId: 'campaign-2',
        blockedText: 'Second blocked content that is inappropriate for minors',
      });
      const entry3 = createFilterLogEntry({
        category: 'hate_speech',
        serviceId: 'game_master',
        campaignId: 'campaign-1',
        blockedText: 'Third blocked content containing hateful language and slurs',
      });

      await store.save(entry1);
      await store.save(entry2);
      await store.save(entry3);

      const campaign1Entries = await store.getEntries('campaign-1');
      const campaign2Entries = await store.getEntries('campaign-2');

      expect(campaign1Entries).toHaveLength(2);
      expect(campaign2Entries).toHaveLength(1);
      expect(campaign1Entries[0].category).toBe('graphic_violence');
      expect(campaign1Entries[1].category).toBe('hate_speech');
      expect(campaign2Entries[0].category).toBe('sexual_content');
    });

    it('getAll returns all entries regardless of campaignId', async () => {
      await store.save(
        createFilterLogEntry({
          category: 'graphic_violence',
          serviceId: 'game_master',
          campaignId: 'c1',
          blockedText: 'Blocked content number one for testing the store',
        })
      );
      await store.save(
        createFilterLogEntry({
          category: 'hate_speech',
          serviceId: 'npc',
          blockedText: 'Blocked content number two without a campaign identifier',
        })
      );

      expect(store.getAll()).toHaveLength(2);
    });

    it('clear removes all entries', async () => {
      await store.save(
        createFilterLogEntry({
          category: 'graphic_violence',
          serviceId: 'game_master',
          campaignId: 'c1',
          blockedText: 'Some content that will be cleared from the store',
        })
      );

      store.clear();
      expect(store.getAll()).toHaveLength(0);
    });
  });
});
