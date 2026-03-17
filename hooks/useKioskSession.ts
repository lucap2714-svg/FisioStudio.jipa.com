import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { kioskSessionsService, KioskSession, KioskSessionStudent } from '../services/kioskSessionsService';

const POLLING_INTERVAL_MS = 10_000;

interface UseKioskSessionResult {
  session: KioskSession | null;
  students: KioskSessionStudent[];
  loading: boolean;
  error: string | null;
  lastSync: Date | null;
  isReconnecting: boolean;
  refresh: () => Promise<void>;
  confirmAttendance: (recordId: string) => Promise<void>;
}

const isWithinWindow = (session: KioskSession | null, now: Date) => {
  if (!session) return false;
  const start = Date.parse(session.start_at);
  const end = Date.parse(session.end_at);
  const ts = now.getTime();
  return session.is_active && !Number.isNaN(start) && !Number.isNaN(end) && start <= ts && ts < end;
};

export const useKioskSession = (): UseKioskSessionResult => {
  const [session, setSession] = useState<KioskSession | null>(null);
  const [students, setStudents] = useState<KioskSessionStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const lastSessionRef = useRef<KioskSession | null>(null);
  const lastStudentsRef = useRef<KioskSessionStudent[]>([]);
  const mountedRef = useRef(true);

  const applyState = useCallback((nextSession: KioskSession | null, nextStudents: KioskSessionStudent[]) => {
    if (!mountedRef.current) return;
    setSession(nextSession);
    setStudents(nextStudents);
    lastSessionRef.current = nextSession;
    lastStudentsRef.current = nextStudents;
  }, []);

  const refresh = useCallback(async () => {
    const now = new Date();
    const nowIso = now.toISOString();

    try {
      setError(null);
      setIsReconnecting(false);

      const activeSession = await kioskSessionsService.getActiveSession(now);

      if (!activeSession) {
        const lastSession = lastSessionRef.current;
        if (isWithinWindow(lastSession, now)) {
          setIsReconnecting(true);
          setError('Reconectando ao Supabase...');
          setLoading(false);
          return;
        }
        applyState(null, []);
        setLastSync(new Date());
        setLoading(false);
        return;
      }

      const sessionChanged = !lastSessionRef.current || lastSessionRef.current.id !== activeSession.id;

      try {
        const attendees = await kioskSessionsService.getSessionStudents(activeSession.id);
        console.debug(
          `[Kiosk][Hook] refresh @${nowIso} session=${activeSession.id} students=${attendees.length} changed=${sessionChanged}`
        );
        applyState(activeSession, attendees);
        setLastSync(new Date());
        setLoading(false);
      } catch (studentErr: any) {
        console.error('[Kiosk] Falha ao carregar alunos da sessão', studentErr);
        const stillActive = !sessionChanged && isWithinWindow(lastSessionRef.current, now);
        if (stillActive) {
          setIsReconnecting(true);
          setError(studentErr?.message || 'Reconectando ao Supabase...');
          setLoading(false);
          return;
        }
        applyState(activeSession, []);
        setError(studentErr?.message || 'Não foi possível carregar alunos da sessão.');
        setLoading(false);
      }
    } catch (e: any) {
      console.error('[Kiosk] Falha ao atualizar sessão ativa', e);
      const lastSession = lastSessionRef.current;
      if (isWithinWindow(lastSession, new Date())) {
        setIsReconnecting(true);
        setError(e?.message || 'Reconectando ao Supabase...');
        setLoading(false);
        return;
      }
      applyState(null, []);
      setError(e?.message || 'Não foi possível carregar a sessão ativa.');
      setLoading(false);
    }
  }, [applyState]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const interval = setInterval(refresh, POLLING_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [refresh]);

  const confirmAttendance = useCallback(async (recordId: string) => {
    const confirmedAt = await kioskSessionsService.confirmAttendance(recordId);
    setStudents((prev) => {
      const updated = prev.map((student) =>
        student.id === recordId ? { ...student, status: 'confirmed', confirmed_at: confirmedAt } : student
      );
      lastStudentsRef.current = updated;
      return updated;
    });
    setLastSync(new Date());
  }, []);

  return useMemo(
    () => ({
      session,
      students,
      loading,
      error,
      lastSync,
      isReconnecting,
      refresh,
      confirmAttendance,
    }),
    [session, students, loading, error, lastSync, isReconnecting, refresh, confirmAttendance]
  );
};
