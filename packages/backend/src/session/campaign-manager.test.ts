import { describe, it, expect, beforeEach } from 'vitest';
import {
  CampaignManager,
  InMemoryCampaignStore,
  MAX_CAMPAIGNS,
} from './campaign-manager.js';
import type { SceneSnapshot, WorldState } from '@trixy/shared';

describe('CampaignManager', () => {
  let store: InMemoryCampaignStore;
  let manager: CampaignManager;

  const userId = 'user-1';

  const defaultSetting: SceneSnapshot = {
    locationName: 'Tavern',
    description: 'A cozy tavern in the village center.',
    presentNPCs: ['Barkeeper'],
  };

  const defaultWorldState: WorldState = {
    knownNPCs: [],
    knownLocations: [],
    establishedFacts: [],
    timeline: [],
  };

  function makeInput(title: string) {
    return {
      characterId: 'char-1',
      title,
      setting: defaultSetting,
      worldState: defaultWorldState,
    };
  }

  beforeEach(() => {
    store = new InMemoryCampaignStore();
    manager = new CampaignManager(store);
  });

  it('should create a campaign successfully when under capacity', async () => {
    const result = await manager.createCampaign(userId, makeInput('Campaign 1'));

    expect(result).not.toHaveProperty('kind', 'capacity_exceeded');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('userId', userId);
    expect(result).toHaveProperty('title', 'Campaign 1');
  });

  it('should allow creating up to 5 campaigns without error', async () => {
    for (let i = 1; i <= MAX_CAMPAIGNS; i++) {
      const result = await manager.createCampaign(
        userId,
        makeInput(`Campaign ${i}`),
      );
      expect(result).not.toHaveProperty('kind', 'capacity_exceeded');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title', `Campaign ${i}`);
    }

    const list = await manager.listCampaigns(userId);
    expect(list).toHaveLength(MAX_CAMPAIGNS);
  });

  it('should reject the 6th campaign with capacity_exceeded', async () => {
    // Create 5 campaigns
    for (let i = 1; i <= MAX_CAMPAIGNS; i++) {
      await manager.createCampaign(userId, makeInput(`Campaign ${i}`));
    }

    // The 6th should be rejected
    const result = await manager.createCampaign(
      userId,
      makeInput('Campaign 6'),
    );
    expect(result).toEqual({ kind: 'capacity_exceeded' });
  });

  it('should not add the rejected campaign to the store', async () => {
    for (let i = 1; i <= MAX_CAMPAIGNS; i++) {
      await manager.createCampaign(userId, makeInput(`Campaign ${i}`));
    }

    await manager.createCampaign(userId, makeInput('Campaign 6'));

    const list = await manager.listCampaigns(userId);
    expect(list).toHaveLength(MAX_CAMPAIGNS);
  });

  it('should list campaigns for a specific user only', async () => {
    await manager.createCampaign('user-a', makeInput('A Campaign'));
    await manager.createCampaign('user-b', makeInput('B Campaign'));

    const listA = await manager.listCampaigns('user-a');
    const listB = await manager.listCampaigns('user-b');

    expect(listA).toHaveLength(1);
    expect(listA[0].title).toBe('A Campaign');
    expect(listB).toHaveLength(1);
    expect(listB[0].title).toBe('B Campaign');
  });

  it('should return an empty list for a user with no campaigns', async () => {
    const list = await manager.listCampaigns('unknown-user');
    expect(list).toHaveLength(0);
  });

  it('should enforce capacity per user independently', async () => {
    // Fill user-a to capacity
    for (let i = 1; i <= MAX_CAMPAIGNS; i++) {
      await manager.createCampaign('user-a', makeInput(`A-${i}`));
    }

    // user-b should still be able to create campaigns
    const result = await manager.createCampaign(
      'user-b',
      makeInput('B Campaign'),
    );
    expect(result).not.toHaveProperty('kind', 'capacity_exceeded');
    expect(result).toHaveProperty('title', 'B Campaign');
  });

  it('should populate campaign fields correctly', async () => {
    const result = await manager.createCampaign(userId, makeInput('My Quest'));

    // Type guard: ensure it's a Campaign, not an error
    if ('kind' in result) {
      throw new Error('Expected a Campaign, got capacity_exceeded');
    }

    expect(result.userId).toBe(userId);
    expect(result.characterId).toBe('char-1');
    expect(result.title).toBe('My Quest');
    expect(result.setting).toEqual(defaultSetting);
    expect(result.worldState).toEqual(defaultWorldState);
    expect(result.questLog).toEqual([]);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.lastPlayedAt).toBeInstanceOf(Date);
  });

  it('MAX_CAMPAIGNS constant should be 5', () => {
    expect(MAX_CAMPAIGNS).toBe(5);
  });
});
