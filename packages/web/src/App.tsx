/**
 * App.tsx — main app with routing between Login, CharacterCreation,
 * CampaignList, and GameSession views.
 *
 * Flow: Login → Campaigns → New Campaign (Character Creation → auto-create Campaign) → Game Session
 */

import React, { useState } from 'react';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CharacterCreationPage } from './pages/CharacterCreationPage';
import { CampaignListPage } from './pages/CampaignListPage';
import { GameSessionPage } from './pages/GameSessionPage';
import { useApi } from './hooks/useApi';

type AppView =
  | { kind: 'login' }
  | { kind: 'register' }
  | { kind: 'campaigns' }
  | { kind: 'character-creation' }
  | { kind: 'game-session'; campaignId: string };

export function App(): React.JSX.Element {
  const [view, setView] = useState<AppView>({ kind: 'login' });
  const [_userId, setUserId] = useState<string | null>(null);
  const api = useApi();

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

  async function handleCharacterCreated(characterId: string) {
    // After character creation, automatically create a campaign with this character
    try {
      const campaign = await api.createCampaign(characterId, 'New Adventure');
      setView({ kind: 'game-session', campaignId: campaign.id });
    } catch {
      // If campaign creation fails, go back to campaign list
      setView({ kind: 'campaigns' });
    }
  }

  switch (view.kind) {
    case 'login':
      return (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onNavigateToRegister={() => setView({ kind: 'register' })}
        />
      );
    case 'register':
      return (
        <RegisterPage
          onRegisterSuccess={handleLoginSuccess}
          onNavigateToLogin={() => setView({ kind: 'login' })}
        />
      );
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
