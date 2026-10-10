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
      ...(await this.get()),
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

  async toggleFavorite(caseId: string): Promise<readonly string[]> {
    return this.database.transaction('rw', this.database.b1Preferences, async () => {
      const row = await this.get();
      const favorites = new Set(row.favoriteCaseIds ?? []);
      if (favorites.has(caseId)) favorites.delete(caseId);
      else favorites.add(caseId);
      const favoriteCaseIds = [...favorites];
      await this.database.b1Preferences.put({
        ...row,
        favoriteCaseIds,
        updatedAt: new Date().toISOString(),
      });
      return favoriteCaseIds;
    });
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
