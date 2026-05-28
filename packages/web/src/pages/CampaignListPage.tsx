/**
 * CampaignListPage — Dungeon-themed list of saved campaigns + new adventure button.
 * Requirements: 7.3
 */

import React, { useEffect, useState } from 'react';
import type { Campaign } from '../types';
import { useApi } from '../hooks/useApi';

export interface CampaignListPageProps {
  onSelectCampaign: (campaignId: string) => void;
  onNewCampaign: () => void;
}

export function CampaignListPage({
  onSelectCampaign,
  onNewCampaign,
}: CampaignListPageProps): React.JSX.Element {
  const api = useApi();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const list = await api.listCampaigns();
        if (!cancelled) {
          setCampaigns(list);
        }
      } catch {
        if (!cancelled) {
          setError('Kampagnen konnten nicht geladen werden.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <header style={styles.header}>
          <div style={styles.titleRow}>
            <span style={styles.crestIcon}>📜</span>
            <div>
              <h1 style={styles.title}>Meine Kampagnen</h1>
              <p style={styles.subtitle}>The Dungeons of Arhenzech</p>
            </div>
          </div>
        </header>

        {error && (
          <div style={styles.error} role="alert">
            <span>⚠️</span> {error}
          </div>
        )}

        {loading ? (
          <div style={styles.loading} aria-busy="true">
            <div style={styles.spinner}>🔮</div>
            <p>Lade Kampagnen...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🗺️</div>
            <h2 style={styles.emptyTitle}>Noch keine Kampagne</h2>
            <p style={styles.emptyText}>
              Starte deine erste Kampagne und beginne dein Abenteuer.
            </p>
          </div>
        ) : (
          <ul style={styles.list} role="list">
            {campaigns.map((campaign) => (
              <li key={campaign.id} style={styles.listItem}>
                <button
                  type="button"
                  onClick={() => onSelectCampaign(campaign.id)}
                  style={styles.campaignButton}
                >
                  <div style={styles.campaignIcon}>⚔️</div>
                  <div style={styles.campaignInfo}>
                    <span style={styles.campaignTitle}>{campaign.title}</span>
                    <span style={styles.campaignDate}>
                      Zuletzt gespielt: {new Date(campaign.lastPlayedAt).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                  <span style={styles.campaignArrow}>→</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={onNewCampaign}
          style={styles.newButton}
        >
          + Neue Kampagne
        </button>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0d0d1a 50%, #000000 100%)',
    padding: '32px 24px',
  },
  content: {
    maxWidth: '720px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  crestIcon: {
    fontSize: '40px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#e2d9f3',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#a78bfa',
    fontStyle: 'italic',
    margin: 0,
  },
  error: {
    background: 'rgba(220, 38, 38, 0.15)',
    border: '1px solid rgba(220, 38, 38, 0.4)',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '20px',
    color: '#fca5a5',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  loading: {
    textAlign: 'center',
    padding: '64px 24px',
    color: '#8b7faa',
  },
  spinner: {
    fontSize: '48px',
    marginBottom: '16px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  empty: {
    textAlign: 'center',
    padding: '64px 24px',
    background: 'rgba(20, 10, 40, 0.5)',
    borderRadius: '16px',
    border: '1px dashed rgba(139, 92, 246, 0.3)',
    marginBottom: '24px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    filter: 'drop-shadow(0 0 20px rgba(167, 139, 250, 0.4))',
  },
  emptyTitle: {
    fontSize: '20px',
    color: '#e2d9f3',
    marginBottom: '8px',
  },
  emptyText: {
    color: '#8b7faa',
    fontSize: '14px',
    lineHeight: '1.6',
    maxWidth: '400px',
    margin: '0 auto',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 24px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  listItem: {
    margin: 0,
  },
  campaignButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    background: 'linear-gradient(145deg, rgba(20, 10, 40, 0.95), rgba(10, 5, 25, 0.98))',
    border: '1px solid rgba(139, 92, 246, 0.25)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'border-color 0.2s, transform 0.15s, box-shadow 0.2s',
    textAlign: 'left',
    color: '#e2d9f3',
  },
  campaignIcon: {
    fontSize: '28px',
    width: '40px',
    textAlign: 'center',
  },
  campaignInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  campaignTitle: {
    fontSize: '17px',
    fontWeight: '600',
    color: '#e2d9f3',
  },
  campaignDate: {
    fontSize: '12px',
    color: '#8b7faa',
  },
  campaignArrow: {
    fontSize: '20px',
    color: '#a78bfa',
  },
  newButton: {
    width: '100%',
    padding: '18px',
    fontSize: '16px',
    fontWeight: '700',
    color: '#ffffff',
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)',
    transition: 'transform 0.15s',
  },
};
