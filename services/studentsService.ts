import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { BillingStatus, Student, StudentSchedule, StudentType, UserRole } from '../types';

const CACHE_KEY = 'students_cache_v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PENDING_KEY = 'students_pending_ops_v1';

type PendingChange =
  | { op: 'create'; payload: Partial<Student>; timestamp: string }
  | { op: 'update'; id: string; payload: Partial<Student>; timestamp: string }
  | { op: 'delete'; id: string; timestamp: string };

const nowIso = () => new Date().toISOString();

const safeLocalStorage = () => (typeof localStorage === 'undefined' ? null : localStorage);

const normalizeId = (id: string | number): number => {
  if (typeof id === 'number') return id;
  const numeric = parseInt(String(id).replace('s-', '').trim(), 10);
  if (Number.isNaN(numeric)) throw new Error(`ID de aluno inválido: ${id}`);
  return numeric;
};

const annotateError = (message: string) => {
  const lower = (message || '').toLowerCase();
  if (lower.includes('permission') || lower.includes('policy')) {
    return `${message} (possível bloqueio de RLS/policy no Supabase).`;
  }
  return message;
};

const mapFromDb = (row: any): Student => {
  const weeklySchedule: StudentSchedule[] = Array.isArray(row.weekly_schedule) ? row.weekly_schedule : [];
  return {
    id: `s-${row.id}`,
    name: row.full_name || row.name || 'Aluno',
    phone: row.phone || '',
    studentType: (row.student_type as StudentType) || 'Fixo',
    weeklySchedule,
    weeklyDays: Array.from(new Set(weeklySchedule.map((s) => s.day))).filter(Boolean),
    active: row.active !== false,
    role: UserRole.STUDENT,
    billingStatus: (row.billing_status as BillingStatus) || BillingStatus.SEM_INFO,
    fixedMonthlyFee: row.fixed_monthly_fee ?? undefined,
    fixedDueDay: row.fixed_due_day ?? undefined,
    wellhubEligibilityStatus: row.wellhub_eligibility_status ?? undefined,
  };
};

const mapToDb = (payload: Partial<Student>) => {
  const body: any = {};
  if (payload.name !== undefined) body.full_name = payload.name.trim();
  if (payload.phone !== undefined) body.phone = payload.phone;
  if (payload.studentType !== undefined) body.student_type = payload.studentType;
  if (payload.weeklySchedule !== undefined) body.weekly_schedule = payload.weeklySchedule;
  if (payload.active !== undefined) body.active = payload.active;
  if (payload.billingStatus !== undefined) body.billing_status = payload.billingStatus;
  if (payload.fixedMonthlyFee !== undefined) body.fixed_monthly_fee = payload.fixedMonthlyFee;
  if (payload.fixedDueDay !== undefined) body.fixed_due_day = payload.fixedDueDay;
  if (payload.wellhubEligibilityStatus !== undefined) body.wellhub_eligibility_status = payload.wellhubEligibilityStatus;
  return body;
};

const readCache = (): { updatedAt: number; data: Student[] } | null => {
  const ls = safeLocalStorage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.updatedAt || !Array.isArray(parsed.data)) return null;
    if (Date.now() - parsed.updatedAt > CACHE_TTL_MS) return null;
    return { updatedAt: parsed.updatedAt, data: parsed.data };
  } catch {
    return null;
  }
};

const writeCache = (data: Student[]) => {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(CACHE_KEY, JSON.stringify({ updatedAt: Date.now(), data }));
  } catch (e) {
    console.warn('[Students][Cache] Falha ao salvar cache', e);
  }
};

const clearCache = () => {
  const ls = safeLocalStorage();
  if (!ls) return;
  ls.removeItem(CACHE_KEY);
};

const readPending = (): PendingChange[] => {
  const ls = safeLocalStorage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writePending = (items: PendingChange[]) => {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(PENDING_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('[Students][Queue] Falha ao salvar fila local', e);
  }
};

const enqueuePending = (change: PendingChange) => {
  const queue = readPending();
  queue.push(change);
  writePending(queue);
};

async function listStudents(options: { forceRefresh?: boolean; allowCache?: boolean } = {}): Promise<Student[]> {
  if (!isSupabaseConfigured) {
    throw new Error('[Supabase] Credenciais não configuradas. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }

  const { forceRefresh = false, allowCache = true } = options;

  if (!forceRefresh && allowCache) {
    const cached = readCache();
    if (cached) {
      console.debug(`[Supabase][Students] Usando cache local (${cached.data.length} registros).`);
      return cached.data;
    }
  }

  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, phone, student_type, weekly_schedule, active, billing_status, fixed_monthly_fee, fixed_due_day, wellhub_eligibility_status')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('[Supabase][Students] Erro no SELECT:', error);
    throw new Error(`Falha ao carregar alunos: ${annotateError(error.message)}`);
  }

  const mapped = (data || []).map(mapFromDb);
  writeCache(mapped);
  console.debug(`[Supabase][Students] Fetched da nuvem (${mapped.length}).`);
  return mapped;
}

async function createStudent(payload: Partial<Student>): Promise<Student> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado. Cadastre as chaves no ambiente.');
  }

  const dbPayload = mapToDb({ ...payload, active: payload.active ?? true, billingStatus: payload.billingStatus ?? BillingStatus.SEM_INFO });
  const { data, error } = await supabase.from('students').insert([dbPayload]).select().single();

  if (error) {
    enqueuePending({ op: 'create', payload, timestamp: nowIso() });
    console.error('[Supabase][Students] Erro no INSERT:', error);
    throw new Error(`Não foi possível criar o aluno: ${annotateError(error.message)}`);
  }

  const student = mapFromDb(data);
  const cached = readCache();
  if (cached) writeCache([student, ...cached.data.filter((s) => s.id !== student.id)]);
  console.debug(`[Supabase][Students] Criado no Supabase: ${student.id} (${student.name}).`);
  return student;
}

async function updateStudent(id: string, payload: Partial<Student>): Promise<Student> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado. Cadastre as chaves no ambiente.');
  }

  const numericId = normalizeId(id);
  const dbPayload = mapToDb(payload);

  const { data, error } = await supabase.from('students').update(dbPayload).eq('id', numericId).select().single();

  if (error) {
    enqueuePending({ op: 'update', id, payload, timestamp: nowIso() });
    console.error('[Supabase][Students] Erro no UPDATE:', error);
    throw new Error(`Não foi possível atualizar o aluno: ${annotateError(error.message)}`);
  }

  const student = mapFromDb(data);
  const cached = readCache();
  if (cached) {
    writeCache(cached.data.map((s) => (s.id === student.id ? student : s)));
  }
  console.debug(`[Supabase][Students] Atualizado: ${student.id} (${student.name}).`);
  return student;
}

async function deleteStudent(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado. Cadastre as chaves no ambiente.');
  }
  const numericId = normalizeId(id);
  const { error } = await supabase.from('students').delete().eq('id', numericId);
  if (error) {
    enqueuePending({ op: 'delete', id, timestamp: nowIso() });
    console.error('[Supabase][Students] Erro no DELETE:', error);
    throw new Error(`Não foi possível remover o aluno: ${annotateError(error.message)}`);
  }
  const cached = readCache();
  if (cached) writeCache(cached.data.filter((s) => s.id !== `s-${numericId}`));
  console.debug(`[Supabase][Students] Removido: s-${numericId}.`);
}

async function pushPendingChanges(): Promise<{ pushed: number; errors: string[] }> {
  if (!isSupabaseConfigured) return { pushed: 0, errors: [] };
  const queue = readPending();
  if (queue.length === 0) return { pushed: 0, errors: [] };

  let pushed = 0;
  const errors: string[] = [];
  const stillPending: PendingChange[] = [];

  for (const change of queue) {
    try {
      if (change.op === 'create') {
        await createStudent(change.payload);
      } else if (change.op === 'update') {
        await updateStudent(change.id, change.payload);
      } else if (change.op === 'delete') {
        await deleteStudent(change.id);
      }
      pushed++;
    } catch (e: any) {
      errors.push(e?.message || 'Erro desconhecido ao reenviar mudança pendente.');
      stillPending.push(change);
    }
  }

  writePending(stillPending);

  return { pushed, errors };
}

export const studentsService = {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getCachedStudents: readCache,
  invalidateCache: clearCache,
  getPendingChanges: readPending,
  pushPendingChanges,
};

export type StudentsService = typeof studentsService;
