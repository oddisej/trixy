/**
 * Lokaler optimistischer State-Manager.
 *
 * Hält Aktionen seit dem letzten Server-Sync in einer Queue und synchronisiert
 * sie bei Wiederverbindung in der ursprünglichen Reihenfolge.
 *
 * Key invariant: nach Netzwerkausfall und Wiederverbindung gilt:
 *   localState = serverState + alle pendingActions in Originalreihenfolge
 */

export interface SyncStatus {
  pending: number;
  lastSyncedAt: Date | null;
}

export class OptimisticStore<TState, TAction> {
  private serverState: TState;
  private pendingActions: TAction[];
  private lastSyncedAt: Date | null;
  private readonly reducer: (state: TState, action: TAction) => TState;

  constructor(initialState: TState, reducer: (state: TState, action: TAction) => TState) {
    this.serverState = initialState;
    this.pendingActions = [];
    this.lastSyncedAt = null;
    this.reducer = reducer;
  }

  /**
   * Computes the local state by applying all pending actions to the server state
   * in their original order.
   */
  getLocalState(): TState {
    return this.pendingActions.reduce(
      (state, action) => this.reducer(state, action),
      this.serverState,
    );
  }

  /**
   * Appends an action to the pending queue.
   */
  addAction(action: TAction): void {
    this.pendingActions.push(action);
  }

  /**
   * Called when the server confirms that the first `syncedCount` actions
   * have been successfully persisted.
   * Updates the server state and removes the synced actions from the queue.
   */
  syncSuccess(newServerState: TState, syncedCount: number): void {
    this.serverState = newServerState;
    this.pendingActions = this.pendingActions.slice(syncedCount);
    this.lastSyncedAt = new Date();
  }

  /**
   * Called when a sync attempt fails.
   * No-op: all pending actions are preserved for the next sync attempt.
   */
  syncFailed(): void {
    // Intentionally no-op — pending actions remain intact
  }

  /**
   * Returns the current sync status.
   */
  getSyncStatus(): SyncStatus {
    return {
      pending: this.pendingActions.length,
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  /**
   * Returns the current server state (last synced snapshot).
   */
  getServerState(): TState {
    return this.serverState;
  }

  /**
   * Returns a copy of the pending actions queue.
   */
  getPendingActions(): TAction[] {
    return [...this.pendingActions];
  }
}
