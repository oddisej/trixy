/**
 * App.tsx — main app with routing between Login, CharacterCreation,
 * CampaignList, and GameSession views.
 *
 * Uses a simple state-based router (no external routing library needed for this scaffold).
 */

import React, { useState } from 'react';
import { LoginPage } from './pages/LoginPage';
import { CharacterCreationPage } from './pages/CharacterCreationPage';
import { CampaignListPage } from './pages/CampaignListPage';
import { GameSessionPage } from './pages/GameSessionPage';

type AppView =
  | { kind: 'login' }
  | { kind: 'campaigns' }
  | { kind: 'character-creation' }
  | { kind: 'game-session'; campaignId: string };

export function App(): React.JSX.Element {
  const [view, setView] = useState<AppView>({ kind: 'login' });
  const [_userId, setUserId] = useState<string | null>(null);

  function handleLoginSuccess(userId: string) {
    setUserId(userId);
    setView({ kind: 'campaigns' });
  }

  function handleSelectCampaign(campaignId: string) {
    setView({ kind: 'game-session', campaignId });
  }

  function handleNewCampaign() {
    setView({ kind: 'character-creation' });
  }

  function handleCharacterCreated(_characterId: string) {
    // After character creation, go back to campaign list
    // (in a full implementation, this would create a campaign with the character)
    setView({ kind: 'campaigns' });
  }

  switch (view.kind) {
    case 'login':
      return <LoginPage onLoginSuccess={handleLoginSuccess} />;
    case 'campaigns':
      return (
        <CampaignListPage
          onSelectCampaign={handleSelectCampaign}
          onNewCampaign={handleNewCampaign}
        />
      );
    case 'character-creation':
      return <CharacterCreationPage onCharacterCreated={handleCharacterCreated} />;
    case 'game-session':
      return <GameSessionPage campaignId={view.campaignId} />;
  }
}
