interface TileProps {
  item: string;
  selected: boolean;
  /** True when four tiles are already picked and this one is not among them. */
  selectionFull: boolean;
  onToggle: (item: string) => void;
}

export function Tile({ item, selected, selectionFull, onToggle }: TileProps) {
  return (
    <button
      type="button"
      className="mg-tile"
      aria-pressed={selected}
      aria-disabled={!selected && selectionFull ? true : undefined}
      onClick={() => onToggle(item)}
    >
      {selected && (
        <svg className="mg-tile__tick" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
        </svg>
      )}
      {item}
    </button>
  );
}
