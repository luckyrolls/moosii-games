import type { GameMessage } from './engine';
import type { GroupsPuzzle } from './types';

/** Player-facing text for a game message. Kept in core so every renderer says the same thing. */
export function messageText(message: GameMessage, puzzle: GroupsPuzzle): string {
  switch (message.kind) {
    case 'need_four':
      return 'Pick four tiles, then check your guess.';
    case 'correct':
      return `You found a group: ${puzzle.groups[message.groupIndex]?.label ?? ''}`;
    case 'incorrect':
      return 'Those four don’t share a group. Try another mix.';
    case 'one_away':
      return 'Close: three of those four belong together.';
    case 'already_guessed':
      return 'You’ve tried that set already. It didn’t count again.';
    case 'solved':
      return 'All four groups found. Well done!';
    case 'revealed':
      return message.reason === 'mistakes'
        ? 'That was the last try. Here are all the groups.'
        : 'Here are all the groups.';
  }
}
