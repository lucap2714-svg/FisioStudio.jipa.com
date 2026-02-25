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
}

const ensureSupabase = () => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }
};

export const kioskSessionsService = {
  async getActiveSession(now: Date = new Date()): Promise<KioskSession | null> {
    ensureSupabase();

    const nowIso = now.toISOString();

    const { data, error } = await supabase
      .from('kiosk_sessions')
      .select('id,title,start_at,end_at,is_active')
      .eq('is_active', true)
      .lte('start_at', nowIso)
      .gte('end_at', nowIso)
      .order('start_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    console.debug(`[Kiosk][Supabase] Sessão ativa consultada (${nowIso}) -> ${data.length} encontrada(s).`);

    const session = data[0];
    return {
      id: String(session.id),
      title: session.title,
      start_at: session.start_at,
      end_at: session.end_at,
      is_active: !!session.is_active,
    };
  },

  async getSessionStudents(sessionId: string): Promise<KioskSessionStudent[]> {
    ensureSupabase();

    const { data, error } = await supabase
      .from('kiosk_session_students')
      .select(
        `
          id,
          session_id,
          student_id,
          status,
          confirmed_at,
          created_at,
          students (
            id,
            full_name
          )
        `
      )
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    console.debug(`[Kiosk][Supabase] Alunos da sessão ${sessionId}: ${data?.length || 0}`);

    return (data || [])
      .map((row: any) => ({
        id: String(row.id),
        session_id: String(row.session_id),
        student_id: String(row.student_id),
        status: row.status || 'scheduled',
        confirmed_at: row.confirmed_at || null,
        full_name: row.students?.full_name || 'Aluno',
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'));
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
