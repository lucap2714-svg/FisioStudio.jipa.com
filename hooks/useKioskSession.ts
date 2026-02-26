import { useCallback, useEffect, useMemo, useState } from 'react';
import { kioskSessionsService, KioskSession, KioskSessionStudent } from '../services/kioskSessionsService';

const POLLING_INTERVAL_MS = 10_000;

interface UseKioskSessionResult {
  session: KioskSession | null;
  students: KioskSessionStudent[];
  loading: boolean;
  error: string | null;
  lastSync: Date | null;
  refresh: () => Promise<void>;
  confirmAttendance: (recordId: string) => Promise<void>;
}

export const useKioskSession = (): UseKioskSessionResult => {
  const [session, setSession] = useState<KioskSession | null>(null);
  const [students, setStudents] = useState<KioskSessionStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const activeSession = await kioskSessionsService.getActiveSession();

      if (!activeSession) {
        console.debug('[Kiosk][Hook] Nenhuma sessao ativa encontrada.');
        setSession(null);
        setStudents([]);
        setLoading(false);
        setLastSync(new Date());
        return;
      }

      const attendees = await kioskSessionsService.getSessionStudents(activeSession.id);
      console.debug(`[Kiosk][Hook] Sessao ${activeSession.id} retornou ${attendees.length} alunos vinculados.`);
      setSession(activeSession);
      setStudents(attendees);
      setLoading(false);
      setLastSync(new Date());
    } catch (e: any) {
      console.error('[Kiosk] Falha ao atualizar sessao ativa', e);
      setSession(null);
      setStudents([]);
      setError(e?.message || 'Nao foi possivel carregar a sessao ativa.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const confirmAttendance = useCallback(async (recordId: string) => {
    const confirmedAt = await kioskSessionsService.confirmAttendance(recordId);
    setStudents(prev =>
      prev.map(student =>
        student.id === recordId
          ? { ...student, status: 'confirmed', confirmed_at: confirmedAt }
          : student
      )
    );
    setLastSync(new Date());
  }, []);

  return useMemo(() => ({
    session,
    students,
    loading,
    error,
    lastSync,
    refresh,
    confirmAttendance,
  }), [session, students, loading, error, lastSync, refresh, confirmAttendance]);
};
