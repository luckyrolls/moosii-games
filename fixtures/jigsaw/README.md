# Jigsaw fixtures

Placeholder puzzles for the playground and tests. **Not reviewed content.** In the real
product the image is the approved illustration from a lesson the person has completed.

## Images (generated, original)

`images/*.png` are original artwork drawn by `scripts/generate-jigsaw-images.mjs` (soft
gradients and simple shapes, no third-party assets). Regenerate with:

```bash
node scripts/generate-jigsaw-images.mjs
```

| Image | Size | Used by |
| --- | --- | --- |
| `park-afternoon.png` | 1600 × 900 (aspect 1.78) | `moosii-park-afternoon.json` |
| `growing-savings.png` | 1600 × 900 (aspect 1.78) | `financial-growing-savings.json` |
| `quiet-garden.png` | 1600 × 900 (aspect 1.78) | `cancer-quiet-garden.json` |

## Alt text: please review

The alt text was written to describe the generated pictures and **needs human review**:

- **park-afternoon:** "A sunny park with rolling green hills, three round trees, a winding
  sandy path, white clouds and a pink and purple kite."
- **growing-savings:** "Three glass jars on a wooden shelf holding a small, a medium and a tall
  stack of gold coins, beside a potted plant with a new shoot, above a striped rug."
- **quiet-garden:** "A quiet garden at sunrise with a wooden bench, three stepping stones, rows
  of pink, lilac and white flowers, and birds in a peach sky."

`invalid/broken-jigsaw-example.json` is deliberately invalid (aspect 1.2) to exercise the
validation-error screen.
