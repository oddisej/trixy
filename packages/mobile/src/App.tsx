import React, { useState } from 'react';
import { LoginScreen } from './screens/LoginScreen';
import { CharacterCreationScreen } from './screens/CharacterCreationScreen';
import { CampaignListScreen } from './screens/CampaignListScreen';
import { GameSessionScreen } from './screens/GameSessionScreen';

type Screen =
  | { name: 'login' }
  | { name: 'register' }
  | { name: 'campaignList' }
  | { name: 'characterCreation' }
  | { name: 'gameSession'; sessionId: string };

/**
 * Main app component with simple stack-based navigation between screens.
 * Supports the core flow: Login → Campaign List → Character Creation / Game Session.
 * Requirements: 6.1, 6.2
 */
export function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>({ name: 'login' });

  switch (screen.name) {
    case 'login':
      return (
        <LoginScreen
          onLoginSuccess={() => setScreen({ name: 'campaignList' })}
          onNavigateToRegister={() => setScreen({ name: 'register' })}
        />
      );

    case 'register':
      // Registration uses the same LoginScreen layout; in a full implementation
      // this would be a separate RegisterScreen. For now, navigate back to login.
      return (
        <LoginScreen
          onLoginSuccess={() => setScreen({ name: 'campaignList' })}
          onNavigateToRegister={() => setScreen({ name: 'login' })}
        />
      );

    case 'campaignList':
      return (
        <CampaignListScreen
          onSelectCampaign={(campaignId) => setScreen({ name: 'gameSession', sessionId: campaignId })}
          onNewCampaign={() => setScreen({ name: 'characterCreation' })}
          onLogout={() => setScreen({ name: 'login' })}
        />
      );

    case 'characterCreation':
      return (
        <CharacterCreationScreen
          onCharacterCreated={(_characterId) => setScreen({ name: 'campaignList' })}
          onBack={() => setScreen({ name: 'campaignList' })}
        />
      );

    case 'gameSession':
      return (
        <GameSessionScreen
          sessionId={screen.sessionId}
          onBack={() => setScreen({ name: 'campaignList' })}
        />
      );
  }
}

export default App;
