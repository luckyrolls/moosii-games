export function ValidationErrors({ source, errors }: { source: string; errors: string[] }) {
  return (
    <div className="pg-error" role="alert">
      <h2>This puzzle can’t be played</h2>
      <p>
        <code>{source}</code> failed validation:
      </p>
      <ul>
        {errors.map((e) => (
          <li key={e}>
            <code>{e}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CompletionOutput({
  event,
  deliveries,
  shareText,
}: {
  event: unknown;
  deliveries: number;
  shareText: string | null;
}) {
  return (
    <section className="pg-output" aria-label="Completion output">
      <h2>Completion event</h2>
      <p className="pg-note">
        Delivered to <code>onComplete</code> {deliveries} time{deliveries === 1 ? '' : 's'}. Not sent anywhere.
      </p>
      <pre className="pg-code">{JSON.stringify(event, null, 2)}</pre>
      <h2>Share text</h2>
      <pre className="pg-code">{shareText || '(no guesses)'}</pre>
    </section>
  );
}
