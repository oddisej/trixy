/**
 * CampaignListPage — list of saved campaigns + "New Campaign" button.
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
          setError('Failed to load campaigns.');
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

  if (loading) {
    return <div className="campaign-list-page" aria-busy="true">Loading campaigns...</div>;
  }

  return (
    <div className="campaign-list-page">
      <h1>Your Campaigns</h1>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      {campaigns.length === 0 ? (
        <p>No campaigns yet. Start a new adventure!</p>
      ) : (
        <ul className="campaign-list" role="list">
          {campaigns.map((campaign) => (
            <li key={campaign.id} className="campaign-list__item">
              <button
                type="button"
                onClick={() => onSelectCampaign(campaign.id)}
                className="campaign-list__button"
              >
                <span className="campaign-list__title">{campaign.title}</span>
                <span className="campaign-list__date">
                  Last played: {new Date(campaign.lastPlayedAt).toLocaleDateString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onNewCampaign}
        className="campaign-list__new-button"
      >
        + New Campaign
      </button>
    </div>
  );
}
