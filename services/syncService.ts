import { isSupabaseConfigured } from '../lib/supabaseClient';
import { studentsService } from './studentsService';
import { db } from './db';

const LAST_SYNC_KEY = 'fisiostudio_last_sync_at';

export interface SyncResult {
  studentsCount: number;
  activeCount: number;
  pulled: number;
  pushed: number;
  pendingBefore: number;
  pendingAfter: number;
  errors: string[];
  lastSyncAt: string;
}

export const syncService = {
  async syncAll(options: { mode?: 'full' | 'studentsOnly' } = {}): Promise<SyncResult> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
    }

    const pendingBefore = studentsService.getPendingChanges().length;
    const pushResult = await studentsService.pushPendingChanges();
    studentsService.invalidateCache?.();
    const students = await studentsService.listStudents({ forceRefresh: true, allowCache: false });
    const lastSyncAt = new Date().toISOString();

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LAST_SYNC_KEY, lastSyncAt);
    }

    db.emitUpdate();

    return {
      studentsCount: students.length,
      activeCount: students.filter((s) => s.active).length,
      pulled: students.length,
      pushed: pushResult.pushed,
      pendingBefore,
      pendingAfter: studentsService.getPendingChanges().length,
      errors: pushResult.errors,
      lastSyncAt,
    };
  },

  getLastSyncAt(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(LAST_SYNC_KEY);
  },
};

export type SyncService = typeof syncService;
