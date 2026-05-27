/**
 * Conversation context builder.
 *
 * Pure function that extracts the most recent messages for LLM context.
 * Reusable for both Game Master and NPC conversation contexts.
 *
 * Design: The LLM context window uses the last 50 messages (or fewer if
 * the conversation is shorter) in chronological order (oldest first).
 */

import type { ConversationMessage } from '@trixy/shared';

/** Maximum number of messages to include in the LLM context window. */
export const MAX_CONTEXT_MESSAGES = 50;

/**
 * Builds the conversation context for LLM prompts.
 *
 * 1. Sorts messages by `createdAt` ascending (chronological order).
 * 2. Takes the last `min(messages.length, 50)` messages.
 * 3. Returns them in chronological order (oldest first).
 *
 * @param messages - Full conversation message history (any order).
 * @returns The most recent messages (up to 50) in chronological order.
 */
export function buildConversationContext(
  messages: ConversationMessage[],
): ConversationMessage[] {
  // Sort by createdAt ascending (oldest first)
  const sorted = [...messages].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  // Take the last min(N, 50) messages
  const count = Math.min(sorted.length, MAX_CONTEXT_MESSAGES);
  return sorted.slice(sorted.length - count);
}
