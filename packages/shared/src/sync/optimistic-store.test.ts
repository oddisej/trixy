import { describe, it, expect, beforeEach } from 'vitest';
import { OptimisticStore } from './optimistic-store.js';

// Simple counter state for testing
interface CounterState {
  count: number;
  history: string[];
}

type CounterAction =
  | { type: 'increment'; amount: number }
  | { type: 'decrement'; amount: number }
  | { type: 'reset' };

function counterReducer(state: CounterState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'increment':
      return { count: state.count + action.amount, history: [...state.history, `+${action.amount}`] };
    case 'decrement':
      return { count: state.count - action.amount, history: [...state.history, `-${action.amount}`] };
    case 'reset':
      return { count: 0, history: [...state.history, 'reset'] };
  }
}

describe('OptimisticStore', () => {
  let store: OptimisticStore<CounterState, CounterAction>;
  const initialState: CounterState = { count: 0, history: [] };

  beforeEach(() => {
    store = new OptimisticStore(initialState, counterReducer);
  });

  describe('initial state', () => {
    it('should return the initial state as local state when no actions are pending', () => {
      expect(store.getLocalState()).toEqual(initialState);
    });

    it('should have zero pending actions initially', () => {
      expect(store.getSyncStatus().pending).toBe(0);
    });

    it('should have null lastSyncedAt initially', () => {
      expect(store.getSyncStatus().lastSyncedAt).toBeNull();
    });

    it('should return the initial state as server state', () => {
      expect(store.getServerState()).toEqual(initialState);
    });
  });

  describe('addAction', () => {
    it('should add an action to the pending queue', () => {
      store.addAction({ type: 'increment', amount: 5 });
      expect(store.getSyncStatus().pending).toBe(1);
    });

    it('should reflect the action in local state', () => {
      store.addAction({ type: 'increment', amount: 5 });
      expect(store.getLocalState()).toEqual({ count: 5, history: ['+5'] });
    });

    it('should preserve action order', () => {
      store.addAction({ type: 'increment', amount: 3 });
      store.addAction({ type: 'decrement', amount: 1 });
      store.addAction({ type: 'increment', amount: 7 });

      expect(store.getLocalState()).toEqual({
        count: 9,
        history: ['+3', '-1', '+7'],
      });
      expect(store.getSyncStatus().pending).toBe(3);
    });

    it('should not modify the server state', () => {
      store.addAction({ type: 'increment', amount: 10 });
      expect(store.getServerState()).toEqual(initialState);
    });
  });

  describe('getLocalState', () => {
    it('should compute state by applying all pending actions in order to server state', () => {
      store.addAction({ type: 'increment', amount: 2 });
      store.addAction({ type: 'increment', amount: 3 });
      store.addAction({ type: 'decrement', amount: 1 });

      const localState = store.getLocalState();
      expect(localState.count).toBe(4);
      expect(localState.history).toEqual(['+2', '+3', '-1']);
    });

    it('should recompute from server state each time (no stale cache)', () => {
      store.addAction({ type: 'increment', amount: 5 });
      expect(store.getLocalState().count).toBe(5);

      // Simulate sync that updates server state
      store.syncSuccess({ count: 5, history: ['+5'] }, 1);
      expect(store.getLocalState().count).toBe(5);

      store.addAction({ type: 'increment', amount: 3 });
      expect(store.getLocalState().count).toBe(8);
    });
  });

  describe('syncSuccess', () => {
    it('should update the server state', () => {
      store.addAction({ type: 'increment', amount: 5 });
      const newServerState: CounterState = { count: 5, history: ['+5'] };

      store.syncSuccess(newServerState, 1);
      expect(store.getServerState()).toEqual(newServerState);
    });

    it('should remove the first syncedCount actions from the queue', () => {
      store.addAction({ type: 'increment', amount: 1 });
      store.addAction({ type: 'increment', amount: 2 });
      store.addAction({ type: 'increment', amount: 3 });

      store.syncSuccess({ count: 3, history: ['+1', '+2'] }, 2);
      expect(store.getSyncStatus().pending).toBe(1);
      expect(store.getPendingActions()).toEqual([{ type: 'increment', amount: 3 }]);
    });

    it('should update lastSyncedAt', () => {
      const before = new Date();
      store.addAction({ type: 'increment', amount: 1 });
      store.syncSuccess({ count: 1, history: ['+1'] }, 1);
      const after = new Date();

      const { lastSyncedAt } = store.getSyncStatus();
      expect(lastSyncedAt).not.toBeNull();
      expect(lastSyncedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(lastSyncedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should correctly compute local state after partial sync', () => {
      store.addAction({ type: 'increment', amount: 1 });
      store.addAction({ type: 'increment', amount: 2 });
      store.addAction({ type: 'increment', amount: 3 });

      // Server synced first 2 actions
      store.syncSuccess({ count: 3, history: ['+1', '+2'] }, 2);

      // Local state should be server state + remaining pending action
      expect(store.getLocalState()).toEqual({
        count: 6,
        history: ['+1', '+2', '+3'],
      });
    });

    it('should handle syncing all pending actions', () => {
      store.addAction({ type: 'increment', amount: 5 });
      store.addAction({ type: 'decrement', amount: 2 });

      store.syncSuccess({ count: 3, history: ['+5', '-2'] }, 2);
      expect(store.getSyncStatus().pending).toBe(0);
      expect(store.getLocalState()).toEqual({ count: 3, history: ['+5', '-2'] });
    });
  });

  describe('syncFailed', () => {
    it('should not modify pending actions', () => {
      store.addAction({ type: 'increment', amount: 1 });
      store.addAction({ type: 'increment', amount: 2 });

      const pendingBefore = store.getPendingActions();
      store.syncFailed();
      const pendingAfter = store.getPendingActions();

      expect(pendingAfter).toEqual(pendingBefore);
    });

    it('should not modify server state', () => {
      store.addAction({ type: 'increment', amount: 5 });
      const serverBefore = store.getServerState();

      store.syncFailed();
      expect(store.getServerState()).toEqual(serverBefore);
    });

    it('should not modify lastSyncedAt', () => {
      expect(store.getSyncStatus().lastSyncedAt).toBeNull();
      store.syncFailed();
      expect(store.getSyncStatus().lastSyncedAt).toBeNull();
    });

    it('should preserve local state after failure', () => {
      store.addAction({ type: 'increment', amount: 3 });
      store.addAction({ type: 'increment', amount: 7 });

      const localBefore = store.getLocalState();
      store.syncFailed();
      expect(store.getLocalState()).toEqual(localBefore);
    });
  });

  describe('key invariant: state survives network failure', () => {
    it('after network failure and reconnection, local state = last synced server state + all pending actions in original order', () => {
      // Initial sync
      store.addAction({ type: 'increment', amount: 5 });
      store.syncSuccess({ count: 5, history: ['+5'] }, 1);

      // Player performs actions while online
      store.addAction({ type: 'increment', amount: 3 });
      store.addAction({ type: 'decrement', amount: 1 });
      store.addAction({ type: 'increment', amount: 2 });

      // Network failure — sync fails
      store.syncFailed();

      // Verify: local state = last synced server state + pending actions in order
      const expectedState = [
        { type: 'increment' as const, amount: 3 },
        { type: 'decrement' as const, amount: 1 },
        { type: 'increment' as const, amount: 2 },
      ].reduce(counterReducer, { count: 5, history: ['+5'] });

      expect(store.getLocalState()).toEqual(expectedState);
      expect(store.getLocalState().count).toBe(9);
      expect(store.getLocalState().history).toEqual(['+5', '+3', '-1', '+2']);
    });

    it('after reconnection, pending actions sync in original order', () => {
      // Actions added during offline period
      store.addAction({ type: 'increment', amount: 1 });
      store.addAction({ type: 'increment', amount: 2 });
      store.addAction({ type: 'increment', amount: 3 });

      // Network failure
      store.syncFailed();

      // Reconnection — server syncs first 2 actions
      store.syncSuccess({ count: 3, history: ['+1', '+2'] }, 2);

      // Remaining action still pending
      expect(store.getSyncStatus().pending).toBe(1);
      expect(store.getPendingActions()).toEqual([{ type: 'increment', amount: 3 }]);
      expect(store.getLocalState()).toEqual({ count: 6, history: ['+1', '+2', '+3'] });
    });

    it('multiple sync failures preserve all pending actions', () => {
      store.addAction({ type: 'increment', amount: 1 });
      store.syncFailed();
      store.addAction({ type: 'increment', amount: 2 });
      store.syncFailed();
      store.addAction({ type: 'increment', amount: 3 });
      store.syncFailed();

      expect(store.getSyncStatus().pending).toBe(3);
      expect(store.getLocalState().count).toBe(6);
    });
  });

  describe('getSyncStatus', () => {
    it('should return correct pending count', () => {
      expect(store.getSyncStatus().pending).toBe(0);

      store.addAction({ type: 'increment', amount: 1 });
      expect(store.getSyncStatus().pending).toBe(1);

      store.addAction({ type: 'increment', amount: 2 });
      expect(store.getSyncStatus().pending).toBe(2);

      store.syncSuccess({ count: 3, history: ['+1', '+2'] }, 2);
      expect(store.getSyncStatus().pending).toBe(0);
    });
  });

  describe('getPendingActions', () => {
    it('should return a copy of pending actions (not a reference)', () => {
      store.addAction({ type: 'increment', amount: 1 });
      const actions = store.getPendingActions();
      actions.push({ type: 'increment', amount: 999 });

      expect(store.getSyncStatus().pending).toBe(1);
    });
  });
});
