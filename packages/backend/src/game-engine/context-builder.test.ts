import { describe, it, expect } from 'vitest';
import { buildConversationContext, MAX_CONTEXT_MESSAGES } from './context-builder.js';
import type { ConversationMessage } from '@trixy/shared';

/** Helper to create a ConversationMessage with a specific createdAt timestamp. */
function makeMessage(
  index: number,
  createdAt: Date,
  overrides?: Partial<ConversationMessage>,
): ConversationMessage {
  return {
    id: `msg-${index}`,
    campaignId: 'campaign-1',
    role: 'player',
    text: `Message ${index}`,
    origin: 'text',
    createdAt,
    ...overrides,
  };
}

describe('buildConversationContext', () => {
  it('returns an empty array when given no messages', () => {
    const result = buildConversationContext([]);
    expect(result).toEqual([]);
  });

  it('returns all messages when fewer than 50', () => {
    const messages = Array.from({ length: 10 }, (_, i) =>
      makeMessage(i, new Date(2024, 0, 1, 0, i)),
    );
    const result = buildConversationContext(messages);
    expect(result).toHaveLength(10);
  });

  it('returns exactly 50 messages when given more than 50', () => {
    const messages = Array.from({ length: 80 }, (_, i) =>
      makeMessage(i, new Date(2024, 0, 1, 0, i)),
    );
    const result = buildConversationContext(messages);
    expect(result).toHaveLength(MAX_CONTEXT_MESSAGES);
  });

  it('returns the most recent messages (not the oldest)', () => {
    const messages = Array.from({ length: 60 }, (_, i) =>
      makeMessage(i, new Date(2024, 0, 1, 0, i)),
    );
    const result = buildConversationContext(messages);

    // Should contain messages 10–59 (the 50 most recent)
    expect(result[0].id).toBe('msg-10');
    expect(result[49].id).toBe('msg-59');
  });

  it('returns messages in chronological order (oldest first)', () => {
    const messages = Array.from({ length: 30 }, (_, i) =>
      makeMessage(i, new Date(2024, 0, 1, 0, i)),
    );
    const result = buildConversationContext(messages);

    for (let i = 1; i < result.length; i++) {
      expect(result[i].createdAt.getTime()).toBeGreaterThanOrEqual(
        result[i - 1].createdAt.getTime(),
      );
    }
  });

  it('sorts unsorted input by createdAt before selecting', () => {
    // Provide messages in reverse chronological order
    const messages = Array.from({ length: 5 }, (_, i) =>
      makeMessage(i, new Date(2024, 0, 1, 0, 4 - i)),
    );
    // messages[0] has the latest timestamp, messages[4] has the earliest

    const result = buildConversationContext(messages);

    // Result should be in chronological order
    expect(result[0].id).toBe('msg-4'); // earliest createdAt
    expect(result[4].id).toBe('msg-0'); // latest createdAt
  });

  it('handles exactly 50 messages', () => {
    const messages = Array.from({ length: 50 }, (_, i) =>
      makeMessage(i, new Date(2024, 0, 1, 0, i)),
    );
    const result = buildConversationContext(messages);
    expect(result).toHaveLength(50);
    expect(result[0].id).toBe('msg-0');
    expect(result[49].id).toBe('msg-49');
  });

  it('handles a single message', () => {
    const messages = [makeMessage(0, new Date(2024, 0, 1))];
    const result = buildConversationContext(messages);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('msg-0');
  });

  it('does not mutate the original array', () => {
    const messages = Array.from({ length: 5 }, (_, i) =>
      makeMessage(i, new Date(2024, 0, 1, 0, 4 - i)),
    );
    const originalIds = messages.map((m) => m.id);

    buildConversationContext(messages);

    // Original array should be unchanged
    expect(messages.map((m) => m.id)).toEqual(originalIds);
  });

  it('works with mixed message roles (player, gm, npc)', () => {
    const messages: ConversationMessage[] = [
      makeMessage(0, new Date(2024, 0, 1, 0, 0), { role: 'player' }),
      makeMessage(1, new Date(2024, 0, 1, 0, 1), { role: 'gm' }),
      makeMessage(2, new Date(2024, 0, 1, 0, 2), { role: 'npc', npcId: 'npc-1' }),
      makeMessage(3, new Date(2024, 0, 1, 0, 3), { role: 'player' }),
      makeMessage(4, new Date(2024, 0, 1, 0, 4), { role: 'gm' }),
    ];

    const result = buildConversationContext(messages);
    expect(result).toHaveLength(5);
    expect(result.map((m) => m.role)).toEqual(['player', 'gm', 'npc', 'player', 'gm']);
  });

  it('handles messages with identical timestamps (stable selection)', () => {
    const sameTime = new Date(2024, 0, 1, 12, 0);
    const messages = Array.from({ length: 5 }, (_, i) =>
      makeMessage(i, sameTime),
    );
    const result = buildConversationContext(messages);
    expect(result).toHaveLength(5);
  });
});
