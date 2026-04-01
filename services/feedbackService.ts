import { supabase, isSupabaseConfigured, supabaseHost } from '../lib/supabaseClient';

export type FeedbackStatus = 'pending' | 'sent';

export interface FeedbackMessage {
  id: number;
  created_at: string;
  author: string | null;
  message: string;
  status: FeedbackStatus;
  sent_at: string | null;
  device: string | null;
  page: string;
}

const ensureSupabase = () => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }
};

const traceId = (scope: string) =>
  `${scope}-${Date.now().toString(36)}-${Math.random().toString(36).slice(-4)}`;

const mapRow = (row: any): FeedbackMessage => ({
  id: Number(row.id),
  created_at: row.created_at,
  author: row.author ?? null,
  message: row.message ?? '',
  status: (row.status as FeedbackStatus) ?? 'pending',
  sent_at: row.sent_at ?? null,
  device: row.device ?? null,
  page: row.page ?? 'home'
});

const logPossibleRls = (error: any, trace: string) => {
  try {
    const msg = (error?.message || '').toLowerCase();
    if (msg.includes('permission') || msg.includes('policy') || msg.includes('rls')) {
      console.warn(`[Trace ${trace}] [Feedback] Possível RLS/policy bloqueando feedback_messages`, error);
    }
  } catch (e) {}
};

const safeDeviceInfo = () => {
  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    return ua ? ua.slice(0, 180) : null;
  } catch (e) {
    return null;
  }
};

export const feedbackService = {
  async listFeedback(limit: number = 20): Promise<FeedbackMessage[]> {
    ensureSupabase();
    const trace = traceId('feedback:list');
    console.debug(`[Trace ${trace}] [Feedback][Supabase] list limit=${limit} host=${supabaseHost}`);

    const { data, error } = await supabase
      .from('feedback_messages')
      .select('id,created_at,author,message,status,sent_at,device,page')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logPossibleRls(error, trace);
      console.error(`[Trace ${trace}] [Feedback][Supabase] Erro ao listar feedback`, error);
      throw error;
    }

    return (data || []).map(mapRow);
  },

  async createFeedback(message: string, author?: string | null): Promise<FeedbackMessage> {
    ensureSupabase();
    const trace = traceId('feedback:create');
    const payload = {
      message,
      author: author || null,
      status: 'pending' as FeedbackStatus,
      page: 'home',
      device: safeDeviceInfo()
    };

    console.debug(`[Trace ${trace}] [Feedback][Supabase] create host=${supabaseHost} hasAuthor=${!!author}`);

    const { data, error } = await supabase
      .from('feedback_messages')
      .insert(payload)
      .select('id,created_at,author,message,status,sent_at,device,page')
      .single();

    if (error) {
      logPossibleRls(error, trace);
      console.error(`[Trace ${trace}] [Feedback][Supabase] Erro ao salvar feedback`, error);
      throw error;
    }

    return mapRow(data);
  },

  async markSent(id: number): Promise<FeedbackMessage> {
    ensureSupabase();
    const trace = traceId('feedback:markSent');
    const sent_at = new Date().toISOString();

    console.debug(`[Trace ${trace}] [Feedback][Supabase] markSent id=${id} host=${supabaseHost}`);

    const { data, error } = await supabase
      .from('feedback_messages')
      .update({ status: 'sent', sent_at })
      .eq('id', id)
      .select('id,created_at,author,message,status,sent_at,device,page')
      .single();

    if (error) {
      logPossibleRls(error, trace);
      console.error(`[Trace ${trace}] [Feedback][Supabase] Erro ao marcar como enviado id=${id}`, error);
      throw error;
    }

    return mapRow(data);
  }
};

export default feedbackService;
