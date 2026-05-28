/**
 * App.tsx — Demo-Modus: Charakter erstellen → direkt spielen.
 * Kein Backend nötig.
 */

import React, { useState } from 'react';
import { CharacterCreationPage } from './pages/CharacterCreationPage';
import { GameSessionPage } from './pages/GameSessionPage';

interface CharacterData {
  name: string;
  className: string;
  attributes: Record<string, number>;
}

type AppView =
  | { kind: 'character-creation' }
  | { kind: 'game-session'; character: CharacterData };

export function App(): React.JSX.Element {
  const [view, setView] = useState<AppView>({ kind: 'character-creation' });

  function handleCharacterCreated(characterData: CharacterData) {
    setView({ kind: 'game-session', character: characterData });
  }

  switch (view.kind) {
    case 'character-creation':
      return <CharacterCreationPage onCharacterCreated={handleCharacterCreated} />;
    case 'game-session':
      return (
        <GameSessionPage
          character={view.character}
          onBack={() => setView({ kind: 'character-creation' })}
        />
      );
  }
}
