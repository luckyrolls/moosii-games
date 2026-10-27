import { useState } from 'react';
import { GAME_DISPLAY_NAME, JIGSAW_DISPLAY_NAME, WORD_DISPLAY_NAME } from '../../core';
import { GroupsPlayground } from './GroupsPlayground';
import { JigsawPlayground } from './JigsawPlayground';
import { MomentView } from './MomentPlayground';
import { MOMENTS, type MomentChoice } from './moments';
import { WordPlayground } from './WordPlayground';

type GameChoice = 'groups' | 'word' | 'jigsaw';

const GAMES: { value: GameChoice; label: string }[] = [
  { value: 'groups', label: GAME_DISPLAY_NAME },
  { value: 'word', label: WORD_DISPLAY_NAME },
  { value: 'jigsaw', label: JIGSAW_DISPLAY_NAME },
];

function initialGame(): GameChoice {
  const value = new URLSearchParams(window.location.search).get('game');
  return GAMES.some((g) => g.value === value) ? (value as GameChoice) : 'groups';
}

function initialMoment(): MomentChoice | null {
  const value = new URLSearchParams(window.location.search).get('moment');
  return MOMENTS.some((m) => m.value === value) ? (value as MomentChoice) : null;
}

function setParam(name: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value === null) url.searchParams.delete(name);
  else url.searchParams.set(name, value);
  window.history.replaceState(null, '', url);
}

export function App() {
  const [game, setGame] = useState<GameChoice>(initialGame);
  const [moment, setMoment] = useState<MomentChoice | null>(initialMoment);

  function choose(next: GameChoice) {
    setGame(next);
    setParam('game', next);
  }

  function openMoment(next: MomentChoice | null) {
    setMoment(next);
    setParam('moment', next);
  }

  // A Take a Moment activity gets the whole page, with its own Back.
  if (moment) {
    return (
      <div className="pg pg--moment">
        <MomentView moment={moment} onLeave={() => openMoment(null)} />
      </div>
    );
  }

  return (
    <div className="pg">
      <header className="pg-header">
        <h1>Moosii games playground</h1>
        <p className="pg-note">Test scaffolding. Fixtures are not reviewed content.</p>
      </header>

      <section className="pg-section" aria-labelledby="pg-games-heading">
        <h2 id="pg-games-heading" className="pg-section__heading">
          Daily games
        </h2>
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

        {game === 'groups' && <GroupsPlayground />}
        {game === 'word' && <WordPlayground />}
        {game === 'jigsaw' && <JigsawPlayground onBack={() => choose('groups')} />}
      </section>

      <section className="pg-section pg-moments" aria-labelledby="pg-moments-heading">
        <h2 id="pg-moments-heading" className="pg-section__heading">
          Take a Moment
        </h2>
        <p className="pg-note">A separate, quiet space. Nothing to win, score or finish.</p>
        <ul className="pg-moment-list">
          {MOMENTS.map((m) => (
            <li key={m.value}>
              <button type="button" className="pg-moment-card" onClick={() => openMoment(m.value)}>
                <span className="pg-moment-card__title">{m.label}</span>
                <span className="pg-moment-card__blurb">{m.blurb}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
