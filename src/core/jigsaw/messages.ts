import type { JigsawMessage, JigsawState } from './engine';

/** "row 2 column 3" for a cell (1-based for people). */
export function cellName(cell: number, cols: number): string {
  return `row ${Math.floor(cell / cols) + 1} column ${(cell % cols) + 1}`;
}

/** Player-facing (and screen-reader) text for a jigsaw message. */
export function jigsawMessageText(message: JigsawMessage, state: JigsawState): string {
  const { cols } = state.layout;
  switch (message.kind) {
    case 'selected':
      return `Picked the tile at ${cellName(message.cell, cols)}. Choose another tile to swap it with.`;
    case 'deselected':
      return 'Tile put back.';
    case 'locked':
      return 'That tile is already in its place.';
    case 'swapped': {
      const placed =
        message.nowInPlace === 2 ? ' Both are now in place.' : message.nowInPlace === 1 ? ' One is now in place.' : '';
      return `Swapped ${cellName(message.a, cols)} and ${cellName(message.b, cols)}.${placed}`;
    }
    case 'solved':
      return `The picture is complete: ${state.puzzle.title}.`;
    case 'revealed':
      return `Here is the whole picture: ${state.puzzle.title}.`;
  }
}
