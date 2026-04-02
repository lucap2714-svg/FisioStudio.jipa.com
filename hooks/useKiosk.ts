import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import kioskService, { KioskSession, KioskSessionStudent } from '../services/kioskService';

const POLL_MS = 10_000;
const traceId = (scope: string) => `${scope}-${Date.now().toString(36)}-${Math.random().toString(36).slice(-4)}`;

interface UseKioskResult {
  session: KioskSession | null;
  students: KioskSessionStudent[];
  loading: boolean;
  error: string | null;
  isReconnecting: boolean;
  lastSync: Date | null;
  refresh: () => Promise<void>;
  confirm: (recordId: string, sessionId: string, studentId: string) => Promise<void>;
  reset: (recordId: string, sessionId: string, studentId: string) => Promise<void>;
}

const isWithinWindow = (session: KioskSession | null, now: Date) => {
  if (!session) return false;
  const start = Date.parse(session.start_at);
  const end = Date.parse(session.end_at);
  const ts = now.getTime();
  return session.is_active && !Number.isNaN(start) && !Number.isNaN(end) && start <= ts && ts < end;
};

export const useKiosk = (): UseKioskResult => {
  const [session, setSession] = useState<KioskSession | null>(null);
  const [students, setStudents] = useState<KioskSessionStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

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
    const trace = traceId('kiosk:refresh');
    console.debug(`[Trace ${trace}] [Kiosk][Hook] refresh start @${now.toISOString()}`);
    try {
      setError(null);
      setIsReconnecting(false);

      const activeSession = await kioskService.getActiveSession(now);

      if (!activeSession) {
        const last = lastSessionRef.current;
        if (isWithinWindow(last, now)) {
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
        const attendees = await kioskService.listSessionStudents(activeSession.id);
        applyState(activeSession, attendees);
        setLastSync(new Date());
        setLoading(false);
        console.debug(
          `[Trace ${trace}] [Kiosk][Hook] session=${activeSession.id} students=${attendees.length} changed=${sessionChanged}`
        );
      } catch (studentErr: any) {
        console.error(`[Trace ${trace}] [Kiosk] Falha ao carregar alunos`, studentErr);
        const stillActive = !sessionChanged && isWithinWindow(lastSessionRef.current, now);
        if (stillActive) {
          setIsReconnecting(true);
          setError(studentErr?.message || 'Reconectando ao Supabase...');
          setLoading(false);
          return;
        }
        applyState(activeSession, []);
        setError(studentErr?.message || 'Não foi possível carregar alunos.');
        setLoading(false);
      }
    } catch (e: any) {
      console.error(`[Trace ${trace}] [Kiosk] Falha ao atualizar sessão ativa`, e);
      const last = lastSessionRef.current;
      if (isWithinWindow(last, new Date())) {
        setIsReconnecting(true);
        setError(e?.message || 'Reconectando ao Supabase...');
        setLoading(false);
        return;
      }
      applyState(null, []);
      setError(e?.message || 'Não foi possível carregar sessão ativa.');
      setLoading(false);
    }
  }, [applyState]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [refresh]);

  const confirm = useCallback(async (recordId: string, sessionId: string, studentId: string) => {
    const trace = traceId('kiosk:confirmAction');
    console.debug(`[Trace ${trace}] [Kiosk][Hook] confirm record=${recordId} session=${sessionId} student=${studentId}`);
    const confirmedAt = await kioskService.confirmAttendance(recordId, sessionId, studentId);
    setStudents((prev) => {
      const updated = prev.map((s) =>
        s.student_id === studentId && s.session_id === sessionId
          ? { ...s, status: 'confirmed', confirmed_at: confirmedAt }
          : s
      );
      lastStudentsRef.current = updated;
      return updated;
    });
    setLastSync(new Date());
  }, []);

  const reset = useCallback(async (recordId: string, sessionId: string, studentId: string) => {
    const trace = traceId('kiosk:resetAction');
    console.debug(`[Trace ${trace}] [Kiosk][Hook] reset record=${recordId} session=${sessionId} student=${studentId}`);
    await kioskService.resetAttendance(recordId, sessionId, studentId);
    setStudents((prev) => {
      const updated = prev.map((s) =>
        s.student_id === studentId && s.session_id === sessionId
          ? { ...s, status: 'scheduled', confirmed_at: null }
          : s
      );
      lastStudentsRef.current = updated;
      return updated;
    });
    setLastSync(new Date());
  }, []);

  return useMemo(
    () => ({
      session,
      students: Array.isArray(students) ? students : [],
      loading,
      error,
      isReconnecting,
      lastSync,
      refresh,
      confirm,
      reset,
    }),
    [session, students, loading, error, isReconnecting, lastSync, refresh, confirm, reset]
  );
};

export default useKiosk;
