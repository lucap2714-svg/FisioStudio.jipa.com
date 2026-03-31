import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { kioskSessionsService, KioskSession, KioskSessionStudent } from '../services/kioskSessionsService';

const POLLING_INTERVAL_MS = 10_000;
const traceId = (scope: string) => `${scope}-${Date.now().toString(36)}-${Math.random().toString(36).slice(-4)}`;

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
    const trace = traceId('kiosk:refresh');
    console.debug(`[Trace ${trace}] [Kiosk][Hook] refresh start @${nowIso}`);

    try {
      setError(null);
      setIsReconnecting(false);

      const activeSession = await kioskSessionsService.getActiveSession(now);

      if (!activeSession) {
        const lastSession = lastSessionRef.current;
        if (isWithinWindow(lastSession, now)) {
          setIsReconnecting(true);
          setError('Reconectando ao Supabase...');
          console.warn(`[Trace ${trace}] [Kiosk][Hook] Sessao anterior dentro da janela, aguardando reconexao.`);
          setLoading(false);
          return;
        }
        applyState(null, []);
        console.info(`[Trace ${trace}] [Kiosk][Hook] Nenhuma sessao ativa encontrada.`);
        setLastSync(new Date());
        setLoading(false);
        return;
      }

      const sessionChanged = !lastSessionRef.current || lastSessionRef.current.id !== activeSession.id;

      try {
        const attendees = await kioskSessionsService.getSessionStudents(activeSession.id);
        console.debug(
          `[Trace ${trace}] [Kiosk][Hook] refresh @${nowIso} session=${activeSession.id} students=${attendees.length} changed=${sessionChanged}`
        );
        applyState(activeSession, attendees);
        setLastSync(new Date());
        setLoading(false);
      } catch (studentErr: any) {
        console.error(`[Trace ${trace}] [Kiosk] Falha ao carregar alunos da sessao`, studentErr);
        const stillActive = !sessionChanged && isWithinWindow(lastSessionRef.current, now);
        if (stillActive) {
          setIsReconnecting(true);
          setError(studentErr?.message || 'Reconectando ao Supabase...');
          console.warn(`[Trace ${trace}] [Kiosk][Hook] Mantendo lista anterior durante reconexao.`);
          setLoading(false);
          return;
        }
        applyState(activeSession, []);
        setError(studentErr?.message || 'Nao foi possivel carregar alunos da sessao.');
        setLoading(false);
      }
    } catch (e: any) {
      console.error(`[Trace ${trace}] [Kiosk] Falha ao atualizar sessao ativa`, e);
      const lastSession = lastSessionRef.current;
      if (isWithinWindow(lastSession, new Date())) {
        setIsReconnecting(true);
        setError(e?.message || 'Reconectando ao Supabase...');
        setLoading(false);
        return;
      }
      applyState(null, []);
      setError(e?.message || 'Nao foi possivel carregar a sessao ativa.');
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
    const trace = traceId('kiosk:confirmAction');
    console.debug(`[Trace ${trace}] [Kiosk][Hook] confirmAttendance start record=${recordId}`);
    const confirmedAt = await kioskSessionsService.confirmAttendance(recordId);
    console.debug(`[Trace ${trace}] [Kiosk][Hook] confirmAttendance ok record=${recordId} confirmed_at=${confirmedAt}`);
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

