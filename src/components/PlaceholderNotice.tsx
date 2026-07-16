interface PlaceholderNoticeProps {
  feature: string;
  description: string;
}

export function PlaceholderNotice({ feature, description }: PlaceholderNoticeProps) {
  return (
    <section aria-labelledby={`${feature}-status`} className="placeholder-notice">
      <p className="status-label">Phase 2 基盤</p>
      <h2 id={`${feature}-status`}>この機能は準備中です</h2>
      <p>{description}</p>
      <button className="secondary-button" disabled type="button">
        次のPhaseで実装予定
      </button>
    </section>
  );
}
