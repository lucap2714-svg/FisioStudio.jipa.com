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
  record_id: string; // id da tabela kiosk_session_students
  session_id: string;
  student_id: string;
  status: string;
  confirmed_at: string | null;
  full_name: string;
  phone?: string;
}

const traceId = (scope: string) => `${scope}-${Date.now().toString(36)}-${Math.random().toString(36).slice(-4)}`;

const ensure = () => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }
};

const isRelationMissing = (error: any) => {
  const code = error?.code || error?.details || error?.hint;
  const msg = (error?.message || '').toLowerCase();
  return code === '42P01' || msg.includes('does not exist') || msg.includes('relation') || msg.includes('table');
};

const normalizeStudentId = (id: string | number): number => {
  if (typeof id === 'number') return id;
  const normalized = parseInt(String(id).replace(/^s[-_]?/, '').trim(), 10);
  if (Number.isNaN(normalized)) throw new Error(`ID de aluno inválido: ${id}`);
  return normalized;
};

const mapSession = (row: any): KioskSession => ({
  id: String(row.id),
  title: row.title ?? null,
  start_at: row.start_at,
  end_at: row.end_at,
  is_active: !!row.is_active,
});

const mapStudent = (row: any, nameCol: string): KioskSessionStudent => ({
  record_id: String(row.id),
  session_id: String(row.session_id),
  student_id: String(row.student_id),
  status: row.status || 'scheduled',
  confirmed_at: row.confirmed_at || null,
  full_name: row.students?.[nameCol] || row.students?.full_name || row.students?.name || 'Aluno',
  phone: row.students?.phone || undefined,
});

export const kioskService = {
  async getActiveSession(now: Date = new Date()): Promise<KioskSession | null> {
    ensure();
    const trace = traceId('kiosk:getSession');
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
        console.error(`[Trace ${trace}] [Kiosk] Erro ao buscar sessão ativa`, error);
        if (isRelationMissing(error)) return null;
        throw error;
      }
      if (!data || data.length === 0) return null;
      return mapSession(data[0]);
    } catch (e) {
      console.error(`[Trace ${trace}] [Kiosk] Falha inesperada getActiveSession`, e);
      return null;
    }
  },

  async listSessionStudents(sessionId: string): Promise<KioskSessionStudent[]> {
    ensure();
    const trace = traceId('kiosk:listStudents');
    const columns = await getStudentColumns();
    const nameCol = columns.nameColumn;
    const selectClause = `
      id,
      session_id,
      student_id,
      status,
      confirmed_at,
      students!inner (
        id,
        ${nameCol},
        phone
      )
    `;
    console.debug(`[Trace ${trace}] [Kiosk][Supabase] list students session=${sessionId} select=${selectClause.replace(/\s+/g,' ').trim()}`);
    try {
      const { data, error } = await supabase
        .from('kiosk_session_students')
        .select(selectClause)
        .eq('session_id', sessionId)
        .order(nameCol, { foreignTable: 'students', ascending: true });
      if (error) {
        console.error(`[Trace ${trace}] [Kiosk] Erro list students`, error);
        if (isRelationMissing(error)) return [];
        throw error;
      }
      return (data || []).map((row: any) => mapStudent(row, nameCol));
    } catch (e) {
      console.error(`[Trace ${trace}] [Kiosk] Falha inesperada list students`, e);
      return [];
    }
  },

  async upsertSession(params: { id?: string | null; startAt: Date; isActive?: boolean; title?: string | null }): Promise<KioskSession> {
    ensure();
    const trace = traceId('kiosk:upsertSession');
    const start_at = params.startAt.toISOString();
    const end_at = new Date(params.startAt.getTime() + 90 * 60 * 1000).toISOString();
    const payload: any = {
      start_at,
      end_at,
      is_active: params.isActive ?? true,
      title: params.title ?? null,
    };
    console.debug(`[Trace ${trace}] [Kiosk] upsertSession id=${params.id ?? 'new'} start=${start_at} end=${end_at}`);
    try {
      if (params.id) {
        const { data, error } = await supabase
          .from('kiosk_sessions')
          .update(payload)
          .eq('id', params.id)
          .select('id,title,start_at,end_at,is_active')
          .single();
        if (error) throw error;
        return mapSession(data);
      }
      const { data, error } = await supabase
        .from('kiosk_sessions')
        .insert(payload)
        .select('id,title,start_at,end_at,is_active')
        .single();
      if (error) throw error;
      return mapSession(data);
    } catch (e: any) {
      console.error(`[Trace ${trace}] [Kiosk] Erro ao upsertSession`, e);
      throw e;
    }
  },

  async addStudentsToSession(sessionId: string, studentIds: Array<string | number>): Promise<void> {
    ensure();
    const trace = traceId('kiosk:addStudents');
    const uniqueIds = Array.from(new Set(studentIds.map(normalizeStudentId)));
    console.debug(`[Trace ${trace}] [Kiosk] addStudents session=${sessionId} count=${uniqueIds.length}`);
    try {
      const { data: existing, error: existingErr } = await supabase
        .from('kiosk_session_students')
        .select('student_id')
        .eq('session_id', sessionId);
      if (existingErr) throw existingErr;

      const existingSet = new Set((existing || []).map((r: any) => Number(r.student_id)));
      const toInsert = uniqueIds.filter((id) => !existingSet.has(id)).map((id) => ({
        session_id: sessionId,
        student_id: id,
        status: 'scheduled',
      }));
      if (toInsert.length === 0) return;
      const { error: insertErr } = await supabase.from('kiosk_session_students').insert(toInsert);
      if (insertErr) throw insertErr;
    } catch (e) {
      console.error(`[Trace ${trace}] [Kiosk] Erro addStudents`, e);
      throw e;
    }
  },

  async confirmAttendance(recordId: string): Promise<string> {
    ensure();
    const trace = traceId('kiosk:confirm');
    const confirmed_at = new Date().toISOString();
    try {
      const { error } = await supabase
        .from('kiosk_session_students')
        .update({ status: 'confirmed', confirmed_at })
        .eq('id', recordId);
      if (error) throw error;
      console.debug(`[Trace ${trace}] [Kiosk] confirm ok record=${recordId}`);
      return confirmed_at;
    } catch (e) {
      console.error(`[Trace ${trace}] [Kiosk] confirmAttendance erro`, e);
      throw e;
    }
  },

  async resetAttendance(recordId: string): Promise<void> {
    ensure();
    const trace = traceId('kiosk:reset');
    try {
      const { error } = await supabase
        .from('kiosk_session_students')
        .update({ status: 'scheduled', confirmed_at: null })
        .eq('id', recordId);
      if (error) throw error;
      console.debug(`[Trace ${trace}] [Kiosk] reset ok record=${recordId}`);
    } catch (e) {
      console.error(`[Trace ${trace}] [Kiosk] resetAttendance erro`, e);
      throw e;
    }
  },
};

export default kioskService;
