import type { A1DojoDatabase } from '../../database/database';
import type { SettingRow } from '../../database/types';
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
      await this.database.settings.put(toSettingRow(normalized, updatedAt));
    });
    return normalized;
  }

  async getStoredAppearance(): Promise<SettingRow | undefined> {
    await this.database.open();
    return this.database.settings.get('appearance');
  }
}
