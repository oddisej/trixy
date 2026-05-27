/**
 * Campaign Manager — manages campaign creation and listing with capacity limits.
 *
 * Each user account may have at most MAX_CAMPAIGNS (5) active campaigns.
 * Creating a campaign beyond this limit returns a capacity_exceeded error.
 */

import type { Campaign, SceneSnapshot, WorldState } from '@trixy/shared';

/** Maximum number of active campaigns per user account. */
export const MAX_CAMPAIGNS = 5;

/**
 * Injectable persistence layer for campaigns.
 */
export interface CampaignStore {
  listByUser(userId: string): Promise<Campaign[]>;
  create(campaign: Campaign): Promise<void>;
}

/**
 * Service that manages campaign creation with capacity enforcement.
 */
export class CampaignManager {
  constructor(private readonly store: CampaignStore) {}

  /**
   * Returns all campaigns for a given user.
   */
  async listCampaigns(userId: string): Promise<Campaign[]> {
    return this.store.listByUser(userId);
  }

  /**
   * Creates a new campaign if the user has fewer than MAX_CAMPAIGNS.
   * Returns the created Campaign on success, or { kind: 'capacity_exceeded' } if the limit is reached.
   */
  async createCampaign(
    userId: string,
    input: {
      characterId: string;
      title: string;
      setting: SceneSnapshot;
      worldState: WorldState;
    },
  ): Promise<Campaign | { kind: 'capacity_exceeded' }> {
    const existing = await this.store.listByUser(userId);

    if (existing.length >= MAX_CAMPAIGNS) {
      return { kind: 'capacity_exceeded' };
    }

    const now = new Date();
    const campaign: Campaign = {
      id: generateId(),
      userId,
      characterId: input.characterId,
      title: input.title,
      setting: input.setting,
      worldState: input.worldState,
      questLog: [],
      createdAt: now,
      lastPlayedAt: now,
    };

    await this.store.create(campaign);
    return campaign;
  }
}

/**
 * In-memory implementation of CampaignStore for testing.
 */
export class InMemoryCampaignStore implements CampaignStore {
  private readonly campaigns: Campaign[] = [];

  async listByUser(userId: string): Promise<Campaign[]> {
    return this.campaigns.filter((c) => c.userId === userId);
  }

  async create(campaign: Campaign): Promise<void> {
    this.campaigns.push(campaign);
  }

  /** Clears all stored data (useful in tests). */
  clear(): void {
    this.campaigns.length = 0;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let idCounter = 0;

/** Simple ID generator (sufficient for in-memory usage and tests). */
function generateId(): string {
  return `campaign-${Date.now()}-${++idCounter}`;
}
