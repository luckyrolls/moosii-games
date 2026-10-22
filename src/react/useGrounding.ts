import { useCallback, useReducer } from 'react';
import { createGroundingState, groundingReducer, type GroundingScript, type GroundingStep } from '../core';

export interface Grounding {
  step: GroundingStep;
  /** 0-based. */
  index: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  back: () => void;
  restart: () => void;
}

/** One step at a time. Nothing is typed and nothing is stored. */
export function useGrounding(script: GroundingScript): Grounding {
  const [state, dispatch] = useReducer(groundingReducer, script, createGroundingState);
  const next = useCallback(() => dispatch({ type: 'next' }), []);
  const back = useCallback(() => dispatch({ type: 'back' }), []);
  const restart = useCallback(() => dispatch({ type: 'restart' }), []);
  const index = Math.min(state.index, script.steps.length - 1);
  return {
    step: script.steps[index] as GroundingStep,
    index,
    total: script.steps.length,
    isFirst: index === 0,
    isLast: index === script.steps.length - 1,
    next,
    back,
    restart,
  };
}
