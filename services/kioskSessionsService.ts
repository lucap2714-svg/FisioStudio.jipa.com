import { supabase, isSupabaseConfigured, supabaseHost } from '../lib/supabaseClient';
import { getStudentColumns } from './studentsService';

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

const traceId = (scope: string) => `${scope}-${Date.now().toString(36)}-${Math.random().toString(36).slice(-4)}`;

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
    const trace = traceId('kiosk:getActiveSession');
    const nowIso = now.toISOString();

    console.debug(`[Trace ${trace}] [Kiosk][Supabase] getActiveSession host=${supabaseHost} now=${nowIso}`);

    try {
      const { data, error } = await supabase
        .from('kiosk_sessions')
        .select('id,title,start_at,end_at,is_active')
        .eq('is_active', true)
        .lte('start_at', nowIso)
        .gt('end_at', nowIso)
        .order('start_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error(`[Trace ${trace}] [Kiosk][Supabase] Erro ao buscar sessÃ£o ativa`, error);
        throw error;
      }
      if (!data || data.length === 0) {
        console.info(`[Trace ${trace}] [Kiosk][Supabase] Nenhuma sessÃ£o ativa encontrada.`);
        return null;
      }

      const session = mapSessionRow(data[0]);
      console.debug(
        `[Trace ${trace}] [Kiosk][Supabase] activeSession id=${session.id} start=${session.start_at} end=${session.end_at} is_active=${session.is_active}`
      );
      return session;
    } catch (e) {
      console.error(`[Trace ${trace}] [Kiosk][Supabase] Falha inesperada ao resolver sessÃ£o ativa`, e);
      throw e;
    }
  },

  async getSessionStudents(sessionId: string): Promise<KioskSessionStudent[]> {
    ensureSupabase();
    if (!sessionId) {
      throw new Error('Sessao ativa nao encontrada para carregar alunos.');
    }

    const trace = traceId('kiosk:listSessionStudents');
    const columns = await getStudentColumns();
    const studentNameColumn = columns.nameColumn;
    const selectClause = `
          id,
          session_id,
          student_id,
          status,
          confirmed_at,
          students!inner (
            id,
            ${studentNameColumn},
            phone
          )
        `;

    console.debug(
      `[Trace ${trace}] [Kiosk][Supabase] listSessionStudents host=${supabaseHost} session=${sessionId} nameCol=${studentNameColumn} select=${selectClause.replace(/\s+/g, ' ').trim()}`
    );

    try {
      const { data, error } = await supabase
        .from('kiosk_session_students')
        .select(selectClause)
        .eq('session_id', sessionId)
        .order(studentNameColumn, { foreignTable: 'students', ascending: true });

      if (error) {
        console.error(`[Trace ${trace}] [Kiosk][Supabase] Erro ao carregar alunos da sessao ${sessionId}`, error);
        throw error;
      }

      const rawCount = data?.length || 0;
      const mapped = (data || []).map((row: any) => ({
        id: String(row.id),
        session_id: String(row.session_id),
        student_id: String(row.student_id),
        status: row.status || 'scheduled',
        confirmed_at: row.confirmed_at || null,
        full_name: row.students?.[studentNameColumn] || row.students?.full_name || row.students?.name || 'Aluno',
        phone: row.students?.phone || undefined,
      }));

      console.debug(
        `[Trace ${trace}] [Kiosk][Supabase] session=${sessionId} students=${mapped.length} raw=${rawCount} ids=[${mapped
          .map((s) => s.student_id)
          .join(',')}]`
      );

      return mapped;
    } catch (e) {
      console.error(`[Trace ${trace}] [Kiosk][Supabase] Falha inesperada ao listar alunos da sessao ${sessionId}`, e);
      throw e;
    }
  },
  async upsertSessionWithStudents(params: {
    id?: string;
    title?: string | null;
    startAt: Date;
    studentIds: Array<string | number>;
    isActive?: boolean;
  }): Promise<KioskSession> {
    ensureSupabase();

    const trace = traceId('kiosk:upsertSession');
    const start_at = params.startAt.toISOString();
    const end_at = new Date(params.startAt.getTime() + 60 * 60 * 1000).toISOString();
    const is_active = params.isActive ?? true;

    const payload: any = { start_at, end_at, is_active, title: params.title ?? null };
    let sessionId = params.id || null;

    console.debug(
      `[Trace ${trace}] [Kiosk][Supabase] upsert sessionId=${sessionId ?? 'new'} start=${start_at} end=${end_at} host=${supabaseHost}`
    );

    if (sessionId) {
      const { data, error } = await supabase
        .from('kiosk_sessions')
        .update(payload)
        .eq('id', sessionId)
        .select('id,title,start_at,end_at,is_active')
        .single();

      if (error) {
        console.error(`[Trace ${trace}] [Kiosk][Supabase] Erro ao atualizar sessao ${sessionId}`, error);
        throw error;
      }
      sessionId = String(data.id);
    } else {
      const { data, error } = await supabase
        .from('kiosk_sessions')
        .insert({ ...payload })
        .select('id,title,start_at,end_at,is_active')
        .single();

      if (error) {
        console.error(`[Trace ${trace}] [Kiosk][Supabase] Erro ao criar sessao`, error);
        throw error;
      }
      sessionId = String(data.id);
    }

    const uniqueStudentIds = Array.from(new Set(params.studentIds.map(normalizeStudentId)));

    const { data: existingLinks, error: existingError } = await supabase
      .from('kiosk_session_students')
      .select('student_id')
      .eq('session_id', sessionId);

    if (existingError) {
      console.error(`[Trace ${trace}] [Kiosk][Supabase] Erro ao ler vinculos atuais da sessao ${sessionId}`, existingError);
      throw existingError;
    }

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
      if (insertError) {
        console.error(`[Trace ${trace}] [Kiosk][Supabase] Erro ao inserir vinculos`, insertError);
        throw insertError;
      }
    }

    if (toRemove.length > 0) {
      console.warn(`[Trace ${trace}] [Kiosk][Guard] Removendo ${toRemove.length} vinculos de alunos da sessao ${sessionId}`);
      const { error: deleteError } = await supabase
        .from('kiosk_session_students')
        .delete()
        .eq('session_id', sessionId)
        .in('student_id', toRemove);
      if (deleteError) {
        console.error(`[Trace ${trace}] [Kiosk][Supabase] Erro ao remover vinculos`, deleteError);
        throw deleteError;
      }
    }

    console.debug(
      `[Trace ${trace}] [Kiosk][Supabase] upsert session=${sessionId} add=${toInsert.length} remove=${toRemove.length} total=${uniqueStudentIds.length} existing=${existingIds.size}`
    );

    return mapSessionRow({ id: sessionId, ...payload });
  },
  async confirmAttendance(recordId: string): Promise<string> {
    ensureSupabase();

    const trace = traceId('kiosk:confirmAttendance');
    const confirmedAt = new Date().toISOString();
    console.debug(`[Trace ${trace}] [Kiosk][Supabase] confirmAttendance record=${recordId} at=${confirmedAt}`);
    const { error } = await supabase
      .from('kiosk_session_students')
      .update({ status: 'confirmed', confirmed_at: confirmedAt })
      .eq('id', recordId);

    if (error) {
      console.error(`[Trace ${trace}] [Kiosk][Supabase] Erro ao confirmar presenca record=${recordId}`, error);
      throw error;
    }
    return confirmedAt;
  },
};





