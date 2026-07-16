import { PlaceholderNotice } from '../components/PlaceholderNotice';
import { PageHeader } from '../components/PageHeader';

export function SettingsPage() {
  return (
    <>
      <PageHeader description="テーマ、文字サイズ、学習データを管理します。" title="設定" />
      <section className="surface-card">
        <h2>表示設定</h2>
        <p className="muted-text">
          ライト・ダークの配色基盤は利用できます。保存設定はPhase 4で追加します。
        </p>
      </section>
      <PlaceholderNotice
        description="バックアップ、復元、全消去はまだ実行できません。"
        feature="設定"
      />
    </>
  );
}
