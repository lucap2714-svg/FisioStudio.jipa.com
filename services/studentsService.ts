import { supabase, isSupabaseConfigured, supabaseHost } from '../lib/supabaseClient';
import { BillingStatus, Student, StudentSchedule, StudentType, UserRole } from '../types';

const CACHE_KEY = 'students_cache_v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PENDING_KEY = 'students_pending_ops_v1';
const traceId = (scope: string) => `${scope}-${Date.now().toString(36)}-${Math.random().toString(36).slice(-4)}`;
let lastKnownStudents: { updatedAt: string; data: Student[] } | null = null;

type StudentColumns = {
  nameColumn: 'full_name' | 'name' | string;
  available: Set<string>;
  hasBillingStatus: boolean;
  hasFixedMonthlyFee: boolean;
  hasFixedDueDay: boolean;
  hasWellhubEligibilityStatus: boolean;
};

const STUDENT_NAME_CANDIDATES: Array<StudentColumns['nameColumn']> = ['full_name', 'name'];
let studentColumnsCache: { expiresAt: number; data: StudentColumns } | null = null;
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

const STUDENT_COLUMNS_CACHE_MS = 5 * 60 * 1000;

const resolveStudentColumns = async (): Promise<StudentColumns> => {
  if (studentColumnsCache && studentColumnsCache.expiresAt > Date.now()) {
    return studentColumnsCache.data;
  }
  if (studentColumnsPromise) return studentColumnsPromise;

  studentColumnsPromise = (async () => {
    let available = new Set<string>();
    let infoSchemaError: any = null;

    const addIfExists = async (column: string) => {
      try {
        const { error } = await supabase.from('students').select(`id, ${column}`).limit(1);
        if (!error) {
          available.add(column);
        } else {
          console.debug(`[Supabase][Students][Diag] Coluna ausente ou inacessÃ­vel (${column})`, error);
        }
      } catch (e) {
        console.debug(`[Supabase][Students][Diag] Coluna indisponÃ­vel (${column})`, e);
      }
    };

    try {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'students');

      if (error) {
        infoSchemaError = error;
      } else if (Array.isArray(data)) {
        available = new Set(data.map((row: any) => String(row.column_name)));
      }
    } catch (e) {
      infoSchemaError = e;
    }

    if (available.size === 0) {
      console.warn(
        '[Supabase][Students][Diag] Falha ao ler information_schema.columns, fallback para detecÃ§Ã£o tentativa.',
        infoSchemaError
      );
      for (const candidate of STUDENT_NAME_CANDIDATES) {
        const { error } = await supabase.from('students').select(`id, ${candidate}`).limit(1);
        if (!error) {
          available.add('id');
          available.add(candidate);
          break;
        }
      }

      await addIfExists('phone');
      await addIfExists('student_type');
      await addIfExists('weekly_schedule');
      await addIfExists('active');
    }

    // Garante colunas bÃ¡sicas suspeitas de existirem mesmo quando o info_schema falha.
    if (!available.has('id')) available.add('id');

    const nameColumn = STUDENT_NAME_CANDIDATES.find((c) => available.has(c)) || STUDENT_NAME_CANDIDATES[0];

    const resolved: StudentColumns = {
      nameColumn,
      available,
      hasBillingStatus: available.has('billing_status'),
      hasFixedMonthlyFee: available.has('fixed_monthly_fee'),
      hasFixedDueDay: available.has('fixed_due_day'),
      hasWellhubEligibilityStatus: available.has('wellhub_eligibility_status'),
    };

    studentColumnsCache = { expiresAt: Date.now() + STUDENT_COLUMNS_CACHE_MS, data: resolved };
    return resolved;
  })().finally(() => {
    studentColumnsPromise = null;
  });

  return studentColumnsPromise;
};

const hasColumn = (columns: StudentColumns, name: string) =>
  columns.available.size === 0 || columns.available.has(name);

const mapFromDb = (row: any, columns: StudentColumns): Student => {
  const weeklySchedule: StudentSchedule[] =
    hasColumn(columns, 'weekly_schedule') && Array.isArray(row.weekly_schedule) ? row.weekly_schedule : [];
  const dbActive = hasColumn(columns, 'active') ? row.active : true;
  const nameValue = row?.[columns.nameColumn] ?? row.full_name ?? row.name ?? 'Aluno';
  const billingValue =
    columns.hasBillingStatus && row.billing_status ? (row.billing_status as BillingStatus) : BillingStatus.SEM_INFO;

  return {
    id: `s-${row.id}`,
    name: nameValue,
    phone: hasColumn(columns, 'phone') ? row.phone || '' : '',
    studentType: hasColumn(columns, 'student_type') ? (row.student_type as StudentType) || 'Fixo' : 'Fixo',
    weeklySchedule,
    weeklyDays: Array.from(new Set(weeklySchedule.map((s) => s.day))).filter(Boolean),
    active: dbActive !== false,
    role: UserRole.STUDENT,
    billingStatus: billingValue,
    fixedMonthlyFee: columns.hasFixedMonthlyFee ? row.fixed_monthly_fee ?? undefined : undefined,
    fixedDueDay: columns.hasFixedDueDay ? row.fixed_due_day ?? undefined : undefined,
    wellhubEligibilityStatus: columns.hasWellhubEligibilityStatus ? row.wellhub_eligibility_status ?? undefined : undefined,
  };
};

const mapToDb = (payload: Partial<Student>, columns: StudentColumns) => {
  const body: any = {};
  if (payload.name !== undefined && hasColumn(columns, columns.nameColumn)) body[columns.nameColumn] = payload.name.trim();
  if (payload.phone !== undefined && hasColumn(columns, 'phone')) body.phone = payload.phone;
  if (payload.studentType !== undefined && hasColumn(columns, 'student_type')) body.student_type = payload.studentType;
  if (payload.weeklySchedule !== undefined && hasColumn(columns, 'weekly_schedule')) body.weekly_schedule = payload.weeklySchedule;
  if (payload.active !== undefined && hasColumn(columns, 'active')) body.active = payload.active;
  if (columns.hasBillingStatus && payload.billingStatus !== undefined) body.billing_status = payload.billingStatus;
  if (columns.hasFixedMonthlyFee && payload.fixedMonthlyFee !== undefined) body.fixed_monthly_fee = payload.fixedMonthlyFee;
  if (columns.hasFixedDueDay && payload.fixedDueDay !== undefined) body.fixed_due_day = payload.fixedDueDay;
  if (columns.hasWellhubEligibilityStatus && payload.wellhubEligibilityStatus !== undefined)
    body.wellhub_eligibility_status = payload.wellhubEligibilityStatus;
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

  const trace = traceId('students:list');
  const { forceRefresh = false, allowCache = true } = options;
  const columns = await resolveStudentColumns();

  console.info(
    `[Trace ${trace}] [Supabase][Students] list() table=students host=${supabaseHost} configured=${isSupabaseConfigured} forceRefresh=${forceRefresh} allowCache=${allowCache}`
  );
  console.debug(
    `[Trace ${trace}] [Supabase][Students][Diag] colunas_detectadas=${Array.from(columns.available).join(',') || 'desconhecido'} name=${columns.nameColumn} billing=${columns.hasBillingStatus}`
  );

  if (columns.available.size > 0) {
    const requiredColumns = ['id', columns.nameColumn, 'phone', 'student_type', 'weekly_schedule', 'active'];
    const missingRequired = requiredColumns.filter((c) => !columns.available.has(c));
    if (missingRequired.length > 0) {
      console.warn(`[Trace ${trace}] [Supabase][Students][Diag] Colunas ausentes no schema: ${missingRequired.join(', ')}`);
    }
    const optionalMissing = ['billing_status', 'fixed_monthly_fee', 'fixed_due_day', 'wellhub_eligibility_status'].filter(
      (c) => !columns.available.has(c)
    );
    if (optionalMissing.length > 0) {
      console.debug(`[Trace ${trace}] [Supabase][Students][Diag] Colunas opcionais ausentes: ${optionalMissing.join(', ')}`);
    }
  }

  if (!forceRefresh && allowCache) {
    const cached = readCache();
    if (cached) {
      console.debug(`[Trace ${trace}] [Supabase][Students] Usando cache local (${cached.data.length} registros) age=${Math.round((Date.now() - cached.updatedAt) / 1000)}s.`);
      if (!lastKnownStudents) {
        lastKnownStudents = { updatedAt: new Date().toISOString(), data: cached.data };
      }
      return cached.data;
    }
  }

  try {
    const { count: totalCount, error: totalErr } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });
    if (totalErr) {
      console.warn(`[Trace ${trace}] [Supabase][Students][Diag] Falha ao contar total:`, totalErr);
    } else {
      console.info(`[Trace ${trace}] [Supabase][Students][Diag] total (sem filtro) = ${totalCount ?? 'n/a'}`);
    }

    if (hasColumn(columns, 'active')) {
      const { count: activeOnlyCount, error: activeErr } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);
      if (activeErr) {
        console.warn(`[Trace ${trace}] [Supabase][Students][Diag] Falha ao contar active=true:`, activeErr);
      } else {
        console.info(`[Trace ${trace}] [Supabase][Students][Diag] active=true = ${activeOnlyCount ?? 'n/a'}`);
      }
    } else {
      console.warn(`[Trace ${trace}] [Supabase][Students][Diag] Coluna active ausente; pulando count active=true.`);
    }
  } catch (diagErr) {
    console.warn(`[Trace ${trace}] [Supabase][Students][Diag] Erro inesperado ao contar registros:`, diagErr);
  }

  const selectFields: string[] = [];
  const requiredSelect = ['id', columns.nameColumn, 'phone', 'student_type', 'weekly_schedule', 'active'];
  for (const col of requiredSelect) {
    if (hasColumn(columns, col) && !selectFields.includes(col)) selectFields.push(col);
  }
  if (columns.hasBillingStatus) selectFields.push('billing_status');
  if (columns.hasFixedMonthlyFee) selectFields.push('fixed_monthly_fee');
  if (columns.hasFixedDueDay) selectFields.push('fixed_due_day');
  if (columns.hasWellhubEligibilityStatus) selectFields.push('wellhub_eligibility_status');

  const requestedColumns = Array.from(new Set(selectFields));
  let query = supabase.from('students').select(requestedColumns.join(', '));

  if (hasColumn(columns, 'active')) {
    query = query.eq('active', true);
  } else {
    console.warn(`[Trace ${trace}] [Supabase][Students][Diag] Coluna active ausente; SELECT sem filtro active=true.`);
  }

  const orderColumn = hasColumn(columns, columns.nameColumn) ? columns.nameColumn : null;
  if (orderColumn) {
    query = query.order(orderColumn, { ascending: true });
  } else {
    console.warn(`[Trace ${trace}] [Supabase][Students][Diag] Ordena????o ignorada; coluna de nome n??o dispon??vel (${columns.nameColumn}).`);
  }

  try {
    const { data, error } = await query;

    if (error) {
      console.error(`[Trace ${trace}] [Supabase][Students] Erro no SELECT:`, error);
      console.debug(`[Trace ${trace}] [Supabase][Students] SELECT debug`, {
        table: 'students',
        requestedColumns,
        detectedColumns: Array.from(columns.available),
        error,
      });
      throw error;
    }

    const totalRows = Array.isArray(data) ? data.length : 0;
    const activeRows = hasColumn(columns, 'active') ? (data || []).filter((row: any) => row.active !== false).length : totalRows;
    console.debug(`[Trace ${trace}] [Supabase][Students] SELECT retornou total=${totalRows} ativo=${activeRows} inativo=${totalRows - activeRows}.`);

    const mapped = (data || []).map((row: any) => mapFromDb(row, columns));
    const activeCount = mapped.filter((s) => s.active !== false).length;
    writeCache(mapped);
    lastKnownStudents = { updatedAt: new Date().toISOString(), data: mapped };
    console.debug(
      `[Trace ${trace}] [Supabase][Students] Fetched da nuvem (${mapped.length}). Ativos=${activeCount} Inativos=${mapped.length - activeCount}`
    );
    return mapped;
  } catch (err: any) {
    console.error(`[Trace ${trace}] [Supabase][Students] Falha ao carregar alunos (mantendo lastKnownGood):`, err);
    if (lastKnownStudents) {
      console.warn(`[Trace ${trace}] [Supabase][Students] Retornando lastKnownGood (${lastKnownStudents.data.length}) atualizado em ${lastKnownStudents.updatedAt}`);
      return lastKnownStudents.data;
    }
    throw new Error(`Falha ao carregar alunos: ${annotateError(err?.message || String(err))}`);
  }
}

async function createStudent(payload: Partial<Student>): Promise<Student> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase n??o configurado. Cadastre as chaves no ambiente.');
  }

  const trace = traceId('students:create');
  const columns = await resolveStudentColumns();
  logWrite('CREATE', { id: 'pending', name: payload.name, payload });
  console.debug(`[Trace ${trace}] [Supabase][Students][Diag] INSERT columns name=${columns.nameColumn} billing=${columns.hasBillingStatus}`);
  const dbPayload = mapToDb(
    { ...payload, active: payload.active ?? true, billingStatus: payload.billingStatus ?? BillingStatus.SEM_INFO },
    columns
  );
  const { data, error } = await supabase.from('students').insert([dbPayload]).select().single();

  if (error) {
    enqueuePending({ op: 'create', payload, timestamp: nowIso() });
    console.error(`[Trace ${trace}] [Supabase][Students] Erro no INSERT:`, error);
    console.debug(`[Trace ${trace}] [Supabase][Students] Erro completo no INSERT:`, error);
    throw new Error(`N??o foi poss??vel criar o aluno: ${annotateError(error.message)}`);
  }

  const student = mapFromDb(data, columns);
  clearCache();
  lastKnownStudents = { updatedAt: new Date().toISOString(), data: [...(lastKnownStudents?.data ?? []), student] };
  console.debug(`[Trace ${trace}] [Supabase][Students] Criado no Supabase: ${student.id} (${student.name}).`);
  return student;
}

async function updateStudent(id: string, payload: Partial<Student>): Promise<Student> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase n??o configurado. Cadastre as chaves no ambiente.');
  }

  const trace = traceId('students:update');
  const numericId = normalizeId(id);
  const columns = await resolveStudentColumns();
  const dbPayload = mapToDb(payload, columns);

  logWrite('UPDATE', { id: String(id), name: payload.name, payload });
  console.debug(`[Trace ${trace}] [Supabase][Students][Diag] UPDATE columns name=${columns.nameColumn} billing=${columns.hasBillingStatus}`);
  const { data, error } = await supabase.from('students').update(dbPayload).eq('id', numericId).select().single();

  if (error) {
    enqueuePending({ op: 'update', id, payload, timestamp: nowIso() });
    console.error(`[Trace ${trace}] [Supabase][Students] Erro no UPDATE:`, error);
    console.debug(`[Trace ${trace}] [Supabase][Students] Erro completo no UPDATE:`, error);
    throw new Error(`N??o foi poss??vel atualizar o aluno: ${annotateError(error.message)}`);
  }

  const student = mapFromDb(data, columns);
  clearCache();
  lastKnownStudents = {
    updatedAt: new Date().toISOString(),
    data: (lastKnownStudents?.data || []).map((s) => (s.id === student.id ? student : s)),
  };
  console.debug(`[Trace ${trace}] [Supabase][Students] Atualizado: ${student.id} (${student.name}).`);
  return student;
}
async function deleteStudent(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase nao configurado. Cadastre as chaves no ambiente.');
  }
  const trace = traceId('students:delete');
  logWrite('DELETE', { id });
  const numericId = normalizeId(id);
  if (ALLOW_DESTRUCTIVE_STUDENT_DELETE) {
    console.warn(`[Trace ${trace}] [Supabase][Students][Guard] Flag ALLOW_DESTRUCTIVE_STUDENT_DELETE=true ativa, mas operacao continua como soft-delete (active=false).`, { id });
  }
  const { error } = await supabase.from('students').update({ active: false }).eq('id', numericId);
  if (error) {
    enqueuePending({ op: 'delete', id, timestamp: nowIso() });
    console.error(`[Trace ${trace}] [Supabase][Students] Erro no SOFT DELETE (active=false):`, error);
    console.debug(`[Trace ${trace}] [Supabase][Students] Erro completo no SOFT DELETE (active=false):`, error);
    throw new Error(`Nao foi possivel desativar o aluno: ${annotateError(error.message)}`);
  }
  clearCache();
  lastKnownStudents = lastKnownStudents
    ? {
        updatedAt: new Date().toISOString(),
        data: lastKnownStudents.data.map((s) => (s.id === id ? { ...s, active: false } : s)),
      }
    : null;
  console.debug(`[Trace ${trace}] [Supabase][Students] Soft-delete aplicado (active=false): s-${numericId}.`);
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


