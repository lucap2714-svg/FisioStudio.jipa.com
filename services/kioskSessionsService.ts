import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export interface KioskSession {
  id: string;
  title?: string | null;
  start_at: string;
  end_at: string;
  is_active: boolean;
}

export interface KioskSessionStudent {
  id: string;
  session_id: string;
  student_id: string;
  status: string;
  confirmed_at: string | null;
  full_name: string;
  phone?: string;
}

const ensureSupabase = () => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }
};

const normalizeStudentId = (id: string | number): number => {
  if (typeof id === 'number') return id;
  const normalized = parseInt(String(id).replace(/^s[-_]?/, '').trim(), 10);
  if (Number.isNaN(normalized)) throw new Error(`ID de aluno inválido: ${id}`);
  return normalized;
};

const mapSessionRow = (row: any): KioskSession => ({
  id: String(row.id),
  title: row.title ?? null,
  start_at: row.start_at,
  end_at: row.end_at,
  is_active: !!row.is_active,
});

export const kioskSessionsService = {
  async getActiveSession(now: Date = new Date()): Promise<KioskSession | null> {
    ensureSupabase();

    const nowIso = now.toISOString();

    const { data, error } = await supabase
      .from('kiosk_sessions')
      .select('id,title,start_at,end_at,is_active')
      .eq('is_active', true)
      .lte('start_at', nowIso)
      .gt('end_at', nowIso)
      .order('start_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    const session = mapSessionRow(data[0]);
    console.debug(
      `[Kiosk][Supabase] now=${nowIso} activeSession id=${session.id} start=${session.start_at} end=${session.end_at}`
    );
    return session;
  },

  async getSessionStudents(sessionId: string): Promise<KioskSessionStudent[]> {
    ensureSupabase();
    if (!sessionId) {
      throw new Error('Sessão ativa não encontrada para carregar alunos.');
    }

    const { data, error } = await supabase
      .from('kiosk_session_students')
      .select(
        `
          id,
          session_id,
          student_id,
          status,
          confirmed_at,
          students!inner (
            id,
            full_name,
            phone
          )
        `
      )
      .eq('session_id', sessionId)
      .order('full_name', { foreignTable: 'students', ascending: true });

    if (error) throw error;
    const rawCount = data?.length || 0;
    const mapped = (data || []).map((row: any) => ({
      id: String(row.id),
      session_id: String(row.session_id),
      student_id: String(row.student_id),
      status: row.status || 'scheduled',
      confirmed_at: row.confirmed_at || null,
      full_name: row.students?.full_name || 'Aluno',
      phone: row.students?.phone || undefined,
    }));

    console.debug(`[Kiosk][Supabase] session=${sessionId} students=${mapped.length} (raw=${rawCount})`);

    return mapped;
  },

  async upsertSessionWithStudents(params: {
    id?: string;
    title?: string | null;
    startAt: Date;
    studentIds: Array<string | number>;
    isActive?: boolean;
  }): Promise<KioskSession> {
    ensureSupabase();

    const start_at = params.startAt.toISOString();
    const end_at = new Date(params.startAt.getTime() + 60 * 60 * 1000).toISOString();
    const is_active = params.isActive ?? true;

    const payload: any = { start_at, end_at, is_active, title: params.title ?? null };
    let sessionId = params.id || null;

    if (sessionId) {
      const { data, error } = await supabase
        .from('kiosk_sessions')
        .update(payload)
        .eq('id', sessionId)
        .select('id,title,start_at,end_at,is_active')
        .single();

      if (error) throw error;
      sessionId = String(data.id);
    } else {
      const { data, error } = await supabase
        .from('kiosk_sessions')
        .insert({ ...payload })
        .select('id,title,start_at,end_at,is_active')
        .single();

      if (error) throw error;
      sessionId = String(data.id);
    }

    const uniqueStudentIds = Array.from(new Set(params.studentIds.map(normalizeStudentId)));

    const { data: existingLinks, error: existingError } = await supabase
      .from('kiosk_session_students')
      .select('student_id')
      .eq('session_id', sessionId);

    if (existingError) throw existingError;

    const existingIds = new Set((existingLinks || []).map((row: any) => Number(row.student_id)));
    const toInsert = uniqueStudentIds.filter((id) => !existingIds.has(id));
    const toRemove = Array.from(existingIds).filter((id) => !uniqueStudentIds.includes(id));

    if (toInsert.length > 0) {
      const rows = toInsert.map((studentId) => ({
        session_id: sessionId,
        student_id: studentId,
        status: 'scheduled',
      }));
      const { error: insertError } = await supabase.from('kiosk_session_students').insert(rows);
      if (insertError) throw insertError;
    }

    if (toRemove.length > 0) {
      console.warn(`[Kiosk][Guard] Removendo ${toRemove.length} vínculos de alunos da sessão ${sessionId}`);
      const { error: deleteError } = await supabase
        .from('kiosk_session_students')
        .delete()
        .eq('session_id', sessionId)
        .in('student_id', toRemove);
      if (deleteError) throw deleteError;
    }

    console.debug(
      `[Kiosk][Supabase] upsert session=${sessionId} start=${start_at} end=${end_at} students add=${toInsert.length} remove=${toRemove.length} total=${uniqueStudentIds.length}`
    );

    return mapSessionRow({ id: sessionId, ...payload });
  },

  async confirmAttendance(recordId: string): Promise<string> {
    ensureSupabase();

    const confirmedAt = new Date().toISOString();
    const { error } = await supabase
      .from('kiosk_session_students')
      .update({ status: 'confirmed', confirmed_at: confirmedAt })
      .eq('id', recordId);

    if (error) throw error;
    return confirmedAt;
  },
};
