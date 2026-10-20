import { useState } from 'react';
import { GAME_DISPLAY_NAME, WORD_DISPLAY_NAME } from '../../core';
import { GroupsPlayground } from './GroupsPlayground';
import { WordPlayground } from './WordPlayground';

type GameChoice = 'groups' | 'word';

const GAMES: { value: GameChoice; label: string }[] = [
  { value: 'groups', label: GAME_DISPLAY_NAME },
  { value: 'word', label: WORD_DISPLAY_NAME },
];

function initialGame(): GameChoice {
  return new URLSearchParams(window.location.search).get('game') === 'word' ? 'word' : 'groups';
}

export function App() {
  const [game, setGame] = useState<GameChoice>(initialGame);

  function choose(next: GameChoice) {
    setGame(next);
    const url = new URL(window.location.href);
    url.searchParams.set('game', next);
    window.history.replaceState(null, '', url);
  }

  return (
    <div className="pg">
      <header className="pg-header">
        <h1>Moosii games playground</h1>
        <p className="pg-note">Test scaffolding. Fixtures are not reviewed content.</p>
      </header>

      <fieldset className="pg-controls pg-games">
        <legend>Game</legend>
        {GAMES.map((g) => (
          <label key={g.value} className="pg-radio">
            <input
              type="radio"
              name="pg-game"
              value={g.value}
              checked={game === g.value}
              onChange={() => choose(g.value)}
            />
            <span>{g.label}</span>
          </label>
        ))}
      </fieldset>

      {game === 'groups' ? <GroupsPlayground /> : <WordPlayground />}
    </div>
  );
}
