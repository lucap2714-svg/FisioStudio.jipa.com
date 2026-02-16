
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Student, UserRole, BillingStatus } from '../types';
import { db } from './db';

/**
 * Serviço de Alunos com Fallback Automático para LocalStorage/IndexedDB.
 * Se as chaves do Supabase não estiverem presentes, o sistema salva e lê 
 * os dados localmente no navegador, mantendo a funcionalidade do app.
 */
export const studentsService = {
  async list(): Promise<Student[]> {
    if (!isSupabaseConfigured) {
      throw new Error("[Supabase] Credenciais não configuradas. Defina SUPABASE_URL e SUPABASE_KEY.");
    }

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;

      return (data || []).map(row => ({
        id: `s-${row.id}`,
        name: row.full_name,
        phone: row.phone || '',
        studentType: row.student_type,
        weeklySchedule: row.weekly_schedule || [],
        weeklyDays: Array.from(new Set((row.weekly_schedule || []).map((s: any) => s.day))),
        active: row.active,
        role: UserRole.STUDENT,
        billingStatus: row.billing_status || BillingStatus.SEM_INFO 
      }));
    } catch (e) {
      console.error("[Supabase] Falha ao carregar alunos:", e);
      throw e;
    }
  },

  async create(student: Partial<Student>): Promise<string> {
    if (!isSupabaseConfigured) {
      const id = db.generateId();
      const newStudent = { ...student, id: `s-${id}`, active: true, role: UserRole.STUDENT } as Student;
      const data = await (db as any).getRawDataInternal();
      data.students.push(newStudent);
      await (db as any).saveRawDataInternal(data);
      return newStudent.id;
    }

    const { data, error } = await supabase
      .from('students')
      .insert([{
        full_name: student.name,
        phone: student.phone,
        student_type: student.studentType,
        weekly_schedule: student.weeklySchedule || [],
        active: true
      }])
      .select()
      .single();

    if (error) throw error;
    return `s-${data.id}`;
  },

  async update(id: string, updates: Partial<Student>): Promise<void> {
    if (!isSupabaseConfigured) {
      const data = await (db as any).getRawDataInternal();
      const index = data.students.findIndex((s: any) => s.id === id);
      if (index >= 0) {
        data.students[index] = { ...data.students[index], ...updates };
        await (db as any).saveRawDataInternal(data);
      }
      return;
    }

    const numericId = parseInt(id.replace('s-', ''));
    const dbPayload: any = {};
    if (updates.name !== undefined) dbPayload.full_name = updates.name;
    if (updates.phone !== undefined) dbPayload.phone = updates.phone;
    if (updates.studentType !== undefined) dbPayload.student_type = updates.studentType;
    if (updates.weeklySchedule !== undefined) dbPayload.weekly_schedule = updates.weeklySchedule;
    if (updates.active !== undefined) dbPayload.active = updates.active;

    const { error } = await supabase
      .from('students')
      .update(dbPayload)
      .eq('id', numericId);

    if (error) throw error;
  },

  async softDelete(id: string): Promise<void> {
    await this.update(id, { active: false });
  }
};
