import type { A1DojoDatabase } from '../../database/database';
import type { PracticeSessionRow } from '../../database/types';
import type { SubjectId } from '../../domain/subject';

export class PracticeSessionRepository {
  constructor(
    private readonly database: A1DojoDatabase,
    private readonly subjectId: SubjectId = 'a1',
  ) {}

  async get(sessionId: string): Promise<PracticeSessionRow | undefined> {
    return this.database.practiceSessions
      .where('[subjectId+id]')
      .equals([this.subjectId, sessionId])
      .first();
  }

  async getInProgress(): Promise<PracticeSessionRow | undefined> {
    return this.database.practiceSessions
      .where('[subjectId+status]')
      .equals([this.subjectId, 'in_progress'])
      .first();
  }

  async createInProgress(session: PracticeSessionRow): Promise<void> {
    await this.database.transaction('rw', this.database.practiceSessions, async () => {
      const existing = await this.getInProgress();
      if (existing !== undefined) {
        throw new ActivePracticeSessionExistsError(existing.id);
      }

      await this.database.practiceSessions.put(session);
    });
  }

  async replaceInProgress(session: PracticeSessionRow): Promise<void> {
    await this.database.transaction('rw', this.database.practiceSessions, async () => {
      const existing = await this.getInProgress();
      if (existing !== undefined) {
        await this.database.practiceSessions.delete(existing.id);
      }

      await this.database.practiceSessions.put(session);
    });
  }

  async save(session: PracticeSessionRow): Promise<void> {
    if (session.subjectId !== this.subjectId) {
      throw new ActivePracticeSessionExistsError(session.id);
    }
    await this.database.practiceSessions.put(session);
  }

  async remove(sessionId: string): Promise<void> {
    await this.database.practiceSessions.delete(sessionId);
  }
}

export class ActivePracticeSessionExistsError extends Error {
  constructor(readonly sessionId: string) {
    super('通常演習の途中セッションが既にあります。');
    this.name = 'ActivePracticeSessionExistsError';
  }
}
