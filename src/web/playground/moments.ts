export type MomentChoice = 'breathing' | 'pond' | 'grounding';

export const MOMENTS: { value: MomentChoice; label: string; blurb: string }[] = [
  { value: 'breathing', label: 'Breathing Garden', blurb: 'A flower that opens and closes with your breath.' },
  { value: 'pond', label: 'Ripple Pond', blurb: 'Tap the water and watch the rings spread.' },
  { value: 'grounding', label: 'Grounding', blurb: '5-4-3-2-1, one step at a time.' },
];
