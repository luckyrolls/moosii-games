import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import {
  JIGSAW_DIFFICULTIES,
  JIGSAW_DISPLAY_NAME,
  validateJigsawPuzzle,
  type JigsawCompletionEvent,
  type JigsawDifficulty,
  type JigsawPuzzle,
} from '../../../src/core';
import { useJigsawGame, type JigsawTile } from '../../../src/react';
import { jigsawFixtures, jigsawImages } from './fixtures';
import { useReduceMotion } from './moment/platform';
import { Button, colors, CompletionOutput, LiveMessage, styles as ui, ValidationErrors } from './ui';

const LABEL: Record<JigsawDifficulty, string> = { gentle: 'Gentle', medium: 'Medium', harder: 'Harder' };
const SWAP_MS = 220;

export function JigsawScreen({ onBack }: { onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<JigsawDifficulty>('gentle');
  const [round, setRound] = useState(0);
  const [width, setWidth] = useState(0);
  const fixture = jigsawFixtures[index]!;
  const parsed = useMemo(() => validateJigsawPuzzle(fixture.data), [fixture]);
  const image = parsed.ok ? jigsawImages[parsed.puzzle.image.src] : undefined;

  return (
    <View style={s.screen}>
      <View style={[ui.row, { alignItems: 'center' }]}>
        <Button label="← Back" accessibilityLabel={`Back, leave ${JIGSAW_DISPLAY_NAME}`} onPress={onBack} />
        <Text style={ui.h2} accessibilityRole="header">
          {JIGSAW_DISPLAY_NAME}
        </Text>
      </View>

      <Text style={ui.h3}>Puzzle</Text>
      <View style={ui.row}>
        {jigsawFixtures.map((f, i) => (
          <Button key={f.path} label={f.path.replace('jigsaw/', '').replace('.json', '')} selected={i === index} onPress={() => setIndex(i)} />
        ))}
      </View>

      <Text style={ui.h3}>Difficulty</Text>
      <View style={ui.row} accessibilityRole="radiogroup">
        {JIGSAW_DIFFICULTIES.map((d) => (
          <Button
            key={d}
            label={LABEL[d]}
            selected={d === difficulty}
            onPress={() => {
              setDifficulty(d);
              setRound((r) => r + 1);
            }}
          />
        ))}
      </View>

      {!parsed.ok ? (
        <ValidationErrors source={fixture.path} errors={parsed.errors} />
      ) : image === undefined ? (
        <ValidationErrors source={fixture.path} errors={[`image.src: no bundled image for ${parsed.puzzle.image.src}`]} />
      ) : (
        <View onLayout={(e: LayoutChangeEvent) => setWidth(Math.floor(e.nativeEvent.layout.width))}>
          {width > 0 && (
            <Game key={`${fixture.path}|${difficulty}|${round}`} puzzle={parsed.puzzle} image={image} difficulty={difficulty} width={width} />
          )}
        </View>
      )}
    </View>
  );
}

function Game({ puzzle, image, difficulty, width }: { puzzle: JigsawPuzzle; image: number; difficulty: JigsawDifficulty; width: number }) {
  const [received, setReceived] = useState<JigsawCompletionEvent[]>([]);
  const game = useJigsawGame(puzzle, { difficulty, boardWidthPx: width, onComplete: (e) => setReceived((l) => [...l, e]) });
  const reduced = useReduceMotion();
  const height = width / (puzzle.image.width / puzzle.image.height);
  const { rows, cols, tileWidthPx: tw, tileHeightPx: th } = game.grid;

  if (game.isComplete) {
    return (
      <View style={s.done}>
        <Image source={image} style={{ width, height, borderRadius: 8 }} accessible accessibilityLabel={puzzle.image.alt} />
        <Text style={ui.h3} accessibilityRole="header">
          {puzzle.title}
        </Text>
        <LiveMessage text={game.messageText} />
        <CompletionOutput event={game.completionEvent} deliveries={received.length} shareText={null} />
      </View>
    );
  }

  return (
    <View style={s.gameArea}>
      <View
        style={[s.board, { width, height }]}
        accessibilityLabel={`Puzzle, ${rows} rows by ${cols} columns. Pick a tile, then pick another to swap them.`}
      >
        {game.tiles.map((t) => (
          <Tile key={t.tile} tile={t} tw={tw} th={th} width={width} height={height} image={image} reduced={reduced} onPress={game.tap} />
        ))}
        {game.peeking && <Image source={image} style={[StyleSheet.absoluteFill, s.peek, { width, height }]} pointerEvents="none" />}
      </View>

      <LiveMessage text={game.messageText} />
      <Text style={ui.muted}>
        In place: {game.inPlace} of {game.total}
        {game.grid.difficulty !== game.grid.requested ? ` · Using ${game.grid.difficulty} so tiles stay easy to tap.` : ''}
      </Text>
      <View style={ui.row}>
        <Button label={game.peeking ? 'Hide picture' : 'Peek'} selected={game.peeking} onPress={game.togglePeek} />
        <Button label="Finish it for me" onPress={game.reveal} />
      </View>
    </View>
  );
}

/** One tile: slides to its cell (natively), shows its slice of the image. */
function Tile({
  tile,
  tw,
  th,
  width,
  height,
  image,
  reduced,
  onPress,
}: {
  tile: JigsawTile;
  tw: number;
  th: number;
  width: number;
  height: number;
  image: number;
  reduced: boolean;
  onPress: (cell: number) => void;
}) {
  const target = { x: tile.col * tw, y: tile.row * th };
  const pos = useRef(new Animated.ValueXY(target)).current;

  useEffect(() => {
    if (reduced) {
      pos.setValue(target);
      return;
    }
    const anim = Animated.timing(pos, { toValue: target, duration: SWAP_MS, easing: Easing.out(Easing.quad), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.x, target.y, reduced]);

  const raised = tile.selected && !reduced;
  return (
    <Animated.View
      style={[
        s.tileBox,
        { width: tw, height: th, zIndex: tile.selected ? 2 : 1 },
        { transform: [{ translateX: pos.x }, { translateY: pos.y }, { scale: raised ? 1.06 : 1 }] },
        tile.selected && s.tileRaised,
      ]}
    >
      <Pressable
        onPress={() => onPress(tile.cell)}
        accessibilityRole="button"
        accessibilityLabel={tile.label}
        accessibilityState={{ selected: tile.selected, disabled: tile.inPlace }}
        style={[s.tile, tile.inPlace && s.tileInPlace, tile.selected && s.tileSelected]}
      >
        <View style={s.clip} pointerEvents="none">
          <Image source={image} style={{ position: 'absolute', width, height, left: -tile.correctCol * tw, top: -tile.correctRow * th }} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  screen: { gap: 12 },
  gameArea: { gap: 10 },
  board: { borderRadius: 8, backgroundColor: colors.tile },
  tileBox: { position: 'absolute', left: 0, top: 0 },
  tile: { flex: 1, borderWidth: 1, borderColor: 'rgba(20,18,15,0.28)' },
  tileInPlace: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' },
  tileSelected: { borderWidth: 3, borderColor: colors.text },
  tileRaised: { shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 9, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  clip: { flex: 1, overflow: 'hidden' },
  peek: { opacity: 0.9, borderRadius: 8 },
  done: { gap: 10 },
});
