import type { A1DojoDatabase } from '../../database/database';
import type { B1PreferenceRow } from '../../database/types';
import { defaultB1RelevanceFilter, type B1RelevanceFilter } from '../../domain/b1LearningSupport';

export class B1PreferencesRepository {
  constructor(private readonly database: A1DojoDatabase) {}

  async get(): Promise<B1PreferenceRow> {
    await this.database.open();
    const current = await this.database.b1Preferences.get('b1-learning-preferences');
    return current ?? this.createDefault();
  }

  async save(
    relevanceFilter: B1RelevanceFilter,
    updatedAt = new Date().toISOString(),
  ): Promise<B1PreferenceRow> {
    const row: B1PreferenceRow = {
      key: 'b1-learning-preferences',
      version: 1,
      relevanceFilter: { ...relevanceFilter },
      updatedAt,
    };
    await this.database.b1Preferences.put(row);
    return row;
  }

  async reset(): Promise<B1PreferenceRow> {
    return this.save(defaultB1RelevanceFilter);
  }

  private createDefault(): B1PreferenceRow {
    return {
      key: 'b1-learning-preferences',
      version: 1,
      relevanceFilter: { ...defaultB1RelevanceFilter },
      updatedAt: new Date(0).toISOString(),
    };
  }
}
