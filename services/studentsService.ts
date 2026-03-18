import { supabase, isSupabaseConfigured, supabaseHost } from '../lib/supabaseClient';
import { BillingStatus, Student, StudentSchedule, StudentType, UserRole } from '../types';

const CACHE_KEY = 'students_cache_v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PENDING_KEY = 'students_pending_ops_v1';

type StudentColumns = {
  nameColumn: 'full_name' | 'name' | string;
  hasBillingStatus: boolean;
};

const STUDENT_NAME_CANDIDATES: Array<StudentColumns['nameColumn']> = ['full_name', 'name'];
let studentColumnsPromise: Promise<StudentColumns> | null = null;

type PendingChange =
  | { op: 'create'; payload: Partial<Student>; timestamp: string }
  | { op: 'update'; id: string; payload: Partial<Student>; timestamp: string }
  | { op: 'delete'; id: string; timestamp: string };

const nowIso = () => new Date().toISOString();

const safeLocalStorage = () => (typeof localStorage === 'undefined' ? null : localStorage);

const readBooleanEnv = (name: string): boolean => {
  try {
    const fromImportMeta = (import.meta as any).env?.[name];
    if (typeof fromImportMeta === 'string') return ['true', '1', 'yes', 'on'].includes(fromImportMeta.toLowerCase());
  } catch (e) {}
  if (typeof process !== 'undefined' && process.env?.[name]) {
    return ['true', '1', 'yes', 'on'].includes(String(process.env[name]).toLowerCase());
  }
  try {
    const g = (globalThis as any)[name];
    if (typeof g === 'string') return ['true', '1', 'yes', 'on'].includes(g.toLowerCase());
  } catch (e) {}
  return false;
};

const ALLOW_DESTRUCTIVE_STUDENT_DELETE = readBooleanEnv('ALLOW_DESTRUCTIVE_STUDENT_DELETE');

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

const logWrite = (op: 'CREATE' | 'UPDATE' | 'DELETE', info: { id?: string; name?: string; payload?: any }) => {
  try {
    const stack = new Error().stack;
    console.debug(
      `[Supabase][Students][${op}] id=${info.id ?? 'n/a'} name=${info.name ?? 'n/a'}`,
      { payload: info.payload, stack }
    );
  } catch (e) {
    console.debug(`[Supabase][Students][${op}] id=${info.id ?? 'n/a'} name=${info.name ?? 'n/a'}`);
  }
};

const resolveStudentColumns = async (): Promise<StudentColumns> => {
  if (studentColumnsPromise) return studentColumnsPromise;

  studentColumnsPromise = (async () => {
    const resolved: StudentColumns = { nameColumn: STUDENT_NAME_CANDIDATES[0], hasBillingStatus: true };

    for (const candidate of STUDENT_NAME_CANDIDATES) {
      const { error } = await supabase.from('students').select(`id, ${candidate}`).limit(1);
      if (!error) {
        resolved.nameColumn = candidate;
        break;
      }
      console.debug(`[Supabase][Students][Diag] Coluna de nome ausente: ${candidate}`, error);
    }

    const { error: billingErr } = await supabase.from('students').select('id, billing_status').limit(1);
    if (billingErr) {
      resolved.hasBillingStatus = false;
      console.debug('[Supabase][Students][Diag] billing_status ausente. Usando fallback SEM_INFO.', billingErr);
    }

    console.debug(
      `[Supabase][Students][Diag] Colunas resolvidas name=${resolved.nameColumn} billing=${resolved.hasBillingStatus}`
    );

    return resolved;
  })();

  return studentColumnsPromise;
};

const mapFromDb = (row: any, columns: StudentColumns): Student => {
  const weeklySchedule: StudentSchedule[] = Array.isArray(row.weekly_schedule) ? row.weekly_schedule : [];
  const dbActive = row.active;
  const nameValue = row?.[columns.nameColumn] ?? row.full_name ?? row.name ?? 'Aluno';
  const billingValue =
    columns.hasBillingStatus && row.billing_status ? (row.billing_status as BillingStatus) : BillingStatus.SEM_INFO;
  return {
    id: `s-${row.id}`,
    name: nameValue,
    phone: row.phone || '',
    studentType: (row.student_type as StudentType) || 'Fixo',
    weeklySchedule,
    weeklyDays: Array.from(new Set(weeklySchedule.map((s) => s.day))).filter(Boolean),
    active: dbActive !== false,
    role: UserRole.STUDENT,
    billingStatus: billingValue,
    fixedMonthlyFee: row.fixed_monthly_fee ?? undefined,
    fixedDueDay: row.fixed_due_day ?? undefined,
    wellhubEligibilityStatus: row.wellhub_eligibility_status ?? undefined,
  };
};

const mapToDb = (payload: Partial<Student>, columns: StudentColumns) => {
  const body: any = {};
  if (payload.name !== undefined) body[columns.nameColumn] = payload.name.trim();
  if (payload.phone !== undefined) body.phone = payload.phone;
  if (payload.studentType !== undefined) body.student_type = payload.studentType;
  if (payload.weeklySchedule !== undefined) body.weekly_schedule = payload.weeklySchedule;
  if (payload.active !== undefined) body.active = payload.active;
  if (columns.hasBillingStatus && payload.billingStatus !== undefined) body.billing_status = payload.billingStatus;
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
    throw new Error('[Supabase] Credenciais n??o configuradas. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }

  const { forceRefresh = false, allowCache = true } = options;
  const columns = await resolveStudentColumns();

  console.info(
    `[Supabase][Students] list() table=students filter=active=true host=${supabaseHost} configured=${isSupabaseConfigured}`
  );
  console.debug(
    `[Supabase][Students][Diag] selectColumns name=${columns.nameColumn} billing=${columns.hasBillingStatus} filter=active=true order=${columns.nameColumn}`
  );

  if (!forceRefresh && allowCache) {
    const cached = readCache();
    if (cached) {
      console.debug(`[Supabase][Students] Usando cache local (${cached.data.length} registros).`);
      return cached.data;
    }
  }

  try {
    const { count: totalCount, error: totalErr } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });
    if (totalErr) {
      console.warn('[Supabase][Students][Diag] Falha ao contar total:', totalErr);
    } else {
      console.info(`[Supabase][Students][Diag] total (sem filtro) = ${totalCount ?? 'n/a'}`);
    }

    const { count: activeOnlyCount, error: activeErr } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);
    if (activeErr) {
      console.warn('[Supabase][Students][Diag] Falha ao contar active=true:', activeErr);
    } else {
      console.info(`[Supabase][Students][Diag] active=true = ${activeOnlyCount ?? 'n/a'}`);
    }
  } catch (diagErr) {
    console.warn('[Supabase][Students][Diag] Erro inesperado ao contar registros:', diagErr);
  }

  const selectFields = [
    'id',
    columns.nameColumn,
    'phone',
    'student_type',
    'weekly_schedule',
    'active',
    'fixed_monthly_fee',
    'fixed_due_day',
    'wellhub_eligibility_status',
  ];

  if (columns.hasBillingStatus) {
    selectFields.push('billing_status');
  }

  const { data, error } = await supabase
    .from('students')
    .select(selectFields.join(', '))
    .eq('active', true)
    .order(columns.nameColumn, { ascending: true });

  if (error) {
    console.error('[Supabase][Students] Erro no SELECT:', error);
    console.debug('[Supabase][Students] Erro completo no SELECT:', error);
    throw new Error(`Falha ao carregar alunos: ${annotateError(error.message)}`);
  }

  const totalRows = Array.isArray(data) ? data.length : 0;
  const activeRows = (data || []).filter((row) => row.active !== false).length;
  console.debug(`[Supabase][Students] SELECT retornou total=${totalRows} ativo=${activeRows} inativo=${totalRows - activeRows}.`);

  const mapped = (data || []).map((row) => mapFromDb(row, columns));
  const activeCount = mapped.filter((s) => s.active !== false).length;
  writeCache(mapped);
  console.debug(
    `[Supabase][Students] Fetched da nuvem (${mapped.length}). Ativos=${activeCount} Inativos=${mapped.length - activeCount}`
  );
  return mapped;
}

async function createStudent(payload: Partial<Student>): Promise<Student> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase n??o configurado. Cadastre as chaves no ambiente.');
  }

  const columns = await resolveStudentColumns();
  logWrite('CREATE', { name: payload.name, payload });
  console.debug(`[Supabase][Students][Diag] INSERT columns name=${columns.nameColumn} billing=${columns.hasBillingStatus}`);
  const dbPayload = mapToDb(
    { ...payload, active: payload.active ?? true, billingStatus: payload.billingStatus ?? BillingStatus.SEM_INFO },
    columns
  );
  const { data, error } = await supabase.from('students').insert([dbPayload]).select().single();

  if (error) {
    enqueuePending({ op: 'create', payload, timestamp: nowIso() });
    console.error('[Supabase][Students] Erro no INSERT:', error);
    console.debug('[Supabase][Students] Erro completo no INSERT:', error);
    throw new Error(`N??o foi poss??vel criar o aluno: ${annotateError(error.message)}`);
  }

  const student = mapFromDb(data, columns);
  clearCache();
  console.debug(`[Supabase][Students] Criado no Supabase: ${student.id} (${student.name}).`);
  return student;
}

async function updateStudent(id: string, payload: Partial<Student>): Promise<Student> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase n??o configurado. Cadastre as chaves no ambiente.');
  }

  const numericId = normalizeId(id);
  const columns = await resolveStudentColumns();
  const dbPayload = mapToDb(payload, columns);

  logWrite('UPDATE', { id: String(id), name: payload.name, payload });
  console.debug(`[Supabase][Students][Diag] UPDATE columns name=${columns.nameColumn} billing=${columns.hasBillingStatus}`);
  const { data, error } = await supabase.from('students').update(dbPayload).eq('id', numericId).select().single();

  if (error) {
    enqueuePending({ op: 'update', id, payload, timestamp: nowIso() });
    console.error('[Supabase][Students] Erro no UPDATE:', error);
    console.debug('[Supabase][Students] Erro completo no UPDATE:', error);
    throw new Error(`N??o foi poss??vel atualizar o aluno: ${annotateError(error.message)}`);
  }

  const student = mapFromDb(data, columns);
  clearCache();
  console.debug(`[Supabase][Students] Atualizado: ${student.id} (${student.name}).`);
  return student;
}
async function deleteStudent(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado. Cadastre as chaves no ambiente.');
  }
  logWrite('DELETE', { id });
  const numericId = normalizeId(id);
  if (ALLOW_DESTRUCTIVE_STUDENT_DELETE) {
    console.warn('[Supabase][Students][Guard] Flag ALLOW_DESTRUCTIVE_STUDENT_DELETE=true ativa, mas operação continua como soft-delete (active=false).', { id });
  }
  const { error } = await supabase.from('students').update({ active: false }).eq('id', numericId);
  if (error) {
    enqueuePending({ op: 'delete', id, timestamp: nowIso() });
    console.error('[Supabase][Students] Erro no SOFT DELETE (active=false):', error);
    console.debug('[Supabase][Students] Erro completo no SOFT DELETE (active=false):', error);
    throw new Error(`N??o foi poss??vel desativar o aluno: ${annotateError(error.message)}`);
  }
  clearCache();
  console.debug(`[Supabase][Students] Soft-delete aplicado (active=false): s-${numericId}.`);
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

  if (pushed > 0) {
    clearCache();
  }

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
export const getStudentColumns = resolveStudentColumns;
