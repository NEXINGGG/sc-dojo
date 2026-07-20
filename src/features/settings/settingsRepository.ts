import type { A1DojoDatabase } from '../../database/database';
import type { SettingRow } from '../../database/types';
import { isSubjectId, type SubjectId } from '../../domain/subject';
import {
  defaultDisplaySettings,
  normalizeDisplaySettings,
  toSettingRow,
  type DisplaySettings,
} from './displaySettings';

export class SettingsRepository {
  constructor(private readonly database: A1DojoDatabase) {}

  async getDisplaySettings(): Promise<DisplaySettings> {
    await this.database.open();
    const row = await this.database.settings.get('appearance');
    return row === undefined ? { ...defaultDisplaySettings } : normalizeDisplaySettings(row);
  }

  async saveDisplaySettings(
    settings: DisplaySettings,
    updatedAt = new Date().toISOString(),
  ): Promise<DisplaySettings> {
    const normalized = normalizeDisplaySettings(settings);
    await this.database.transaction('rw', this.database.settings, async () => {
      const current = await this.database.settings.get('appearance');
      await this.database.settings.put(
        toSettingRow(normalized, updatedAt, current?.selectedSubject ?? 'a1'),
      );
    });
    return normalized;
  }

  async getStoredAppearance(): Promise<SettingRow | undefined> {
    await this.database.open();
    return this.database.settings.get('appearance');
  }

  async getSelectedSubject(): Promise<SubjectId> {
    await this.database.open();
    const row = await this.database.settings.get('appearance');
    return isSubjectId(row?.selectedSubject) ? row.selectedSubject : 'a1';
  }

  async saveSelectedSubject(
    subjectId: SubjectId,
    updatedAt = new Date().toISOString(),
  ): Promise<void> {
    await this.database.transaction('rw', this.database.settings, async () => {
      const current = await this.database.settings.get('appearance');
      await this.database.settings.put(
        toSettingRow(
          current === undefined ? defaultDisplaySettings : normalizeDisplaySettings(current),
          updatedAt,
          subjectId,
        ),
      );
    });
  }
}
