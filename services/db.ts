
import { 
  Student, ClassSession, Booking, Evolution, AppSettings,
  EvolutionStatus, AttendanceStatus, TrainingPlan, Assessment, BillingEvent, BillingStatus,
  BackupRecord, UserRole, RestoreResult, AuditLog
} from '../types';
import { INITIAL_SETTINGS, MOCK_STUDENTS } from '../constants';
import { studentsService } from './studentsService';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const DB_NAME = 'FisioStudioDB_v5';
const STORE_NAME = 'master_store';
const DB_VERSION = 5; 
const STORAGE_MIRROR_KEY = 'fisiostudio_data_v5_mirror';

const syncChannel = new BroadcastChannel('fisiostudio_sync');

// Helper para normalização de chaves de busca
const normalizePhone = (p: string) => (p || '').replace(/\D/g, '');
const normalizeName = (n: string) => (n || '').toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const DateUtils = {
  normalize: (date: Date | string = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },
  getDayName: (date: Date) => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[date.getDay()];
  }
};

class Database {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private operationQueue: Promise<any> = Promise.resolve();
  private updateListeners: Set<() => void> = new Set();

  constructor() {
    this.initPromise = this.initDB();
    syncChannel.onmessage = (e) => {
      if (e.data.type === 'DATA_UPDATED') {
        this.updateListeners.forEach(l => l());
      }
    };

    if (isSupabaseConfigured) {
      supabase
        .channel('public:students')
        .on('postgres_changes', { event: '*', table: 'students' }, () => {
          this.updateListeners.forEach(l => l());
        })
        .subscribe();
    }
  }

  onUpdate(callback: () => void): () => void {
    this.updateListeners.add(callback);
    return () => this.updateListeners.delete(callback);
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = async (e: any) => {
        this.db = e.target.result;
        try {
          await this.ensureInitialDataInternal();
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async ensureInitialDataInternal() {
    const data = await this.fetchRaw();
    if (data && data.classes) return;

    const initial: any = {
        students: MOCK_STUDENTS, // Agora inicia com dados de exemplo se estiver vazio
        classes: [],
        bookings: [],
        evolutions: [],
        assessments: {},
        trainingPlans: {},
        settings: INITIAL_SETTINGS,
        logs: [{ id: 'init', timestamp: new Date().toISOString(), details: 'Sistema inicializado.' }],
        billingEvents: [],
        backups: [],
        updatedAt: Date.now()
    };
    await this.putRaw(initial);
  }

  private async fetchRaw(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve(null);
      const transaction = this.db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('main');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async putRaw(data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB não inicializado");
      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, 'main');
      transaction.oncomplete = () => {
        localStorage.setItem(STORAGE_MIRROR_KEY, JSON.stringify(data));
        syncChannel.postMessage({ type: 'DATA_UPDATED' });
        this.updateListeners.forEach(l => l());
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private async getRawDataInternal(): Promise<any> {
    if (this.initPromise) await this.initPromise;
    return this.fetchRaw();
  }

  private async saveRawDataInternal(data: any, force: boolean = false): Promise<void> {
    if (this.initPromise) await this.initPromise;
    return this.putRaw(data);
  }

  private async enqueueOperation<T>(op: () => Promise<T>): Promise<T> {
    const result = this.operationQueue.then(op);
    this.operationQueue = result.catch(() => {});
    return result;
  }

  generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  getLocalDateString() {
    return new Date().toISOString().split('T')[0];
  }

  getCurrentMonthString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  // --- STUDENT METHODS ---
  async getStudents(): Promise<Student[]> {
    return await studentsService.list();
  }

  async saveStudent(student: Student): Promise<void> {
    await studentsService.update(student.id, student);
    this.updateListeners.forEach(l => l());
  }

  /**
   * Restauração Inteligente com Deduplicação
   */
  async restoreStudentsFromBackup(payload: any[], adminUserId: string): Promise<RestoreResult> {
    let createdCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    try {
      const currentStudents = await studentsService.list();
      const phoneMap = new Map();
      const nameMap = new Map();

      currentStudents.forEach(s => {
        const p = normalizePhone(s.phone);
        if (p) phoneMap.set(p, s);
        nameMap.set(normalizeName(s.name), s);
      });

      for (const item of payload) {
        try {
          const itemPhone = normalizePhone(item.phone);
          const itemName = normalizeName(item.name);
          
          let existing = itemPhone ? phoneMap.get(itemPhone) : null;
          if (!existing) existing = nameMap.get(itemName);

          if (existing) {
            await studentsService.update(existing.id, {
              name: item.name,
              phone: item.phone,
              studentType: item.studentType,
              weeklySchedule: item.weeklySchedule,
              active: true
            });
            updatedCount++;
          } else {
            await studentsService.create({
              name: item.name,
              phone: item.phone,
              studentType: item.studentType,
              weeklySchedule: item.weeklySchedule,
              active: true
            });
            createdCount++;
          }
        } catch (e: any) {
          console.error(`[Restore] Erro no item ${item.name}:`, e);
          errors.push(`${item.name}: ${e.message || 'Erro inesperado'}`);
        }
      }
    } catch (globalErr: any) {
      errors.push(`Erro Global: ${globalErr.message}`);
    }
    
    this.updateListeners.forEach(l => l());
    const finalStudents = await studentsService.list();

    return { 
      createdCount, 
      updatedCount, 
      skippedCount: 0, 
      totalAfter: finalStudents.length, 
      errors 
    };
  }

  // --- AGENDA / OUTROS (INDEXEDDB) ---
  async getClasses(): Promise<ClassSession[]> {
    const data = await this.getRawDataInternal();
    return data?.classes || [];
  }

  async saveClass(session: ClassSession): Promise<void> {
    return this.enqueueOperation(async () => {
      const data = await this.getRawDataInternal();
      const index = data.classes.findIndex((c: any) => c.id === session.id);
      if (index >= 0) data.classes[index] = session;
      else data.classes.push(session);
      await this.saveRawDataInternal(data);
    });
  }

  async getBookings(): Promise<Booking[]> {
    const data = await this.getRawDataInternal();
    return data?.bookings || [];
  }

  async saveBooking(booking: Booking): Promise<void> {
    return this.enqueueOperation(async () => {
      const data = await this.getRawDataInternal();
      const index = data.bookings.findIndex((b: any) => b.id === booking.id);
      if (index >= 0) data.bookings[index] = booking;
      else data.bookings.push(booking);
      await this.saveRawDataInternal(data);
    });
  }

  async deleteBooking(id: string): Promise<void> {
    return this.enqueueOperation(async () => {
      const data = await this.getRawDataInternal();
      data.bookings = data.bookings.filter((b: any) => b.id !== id);
      await this.saveRawDataInternal(data);
    });
  }

  async getLogs(): Promise<AuditLog[]> {
    const data = await this.getRawDataInternal();
    return data?.logs || [];
  }

  async logAction(userId: string, action: string, entityType: string, entityId: string, details: string, studentId?: string) {
    return this.enqueueOperation(async () => {
      const data = await this.getRawDataInternal();
      const log: AuditLog = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        userId, action, entityType, entityId, studentId, details
      };
      if (!data.logs) data.logs = [];
      data.logs.unshift(log);
      if (data.logs.length > 5000) data.logs.pop();
      await this.saveRawDataInternal(data, true);
    });
  }

  async getBillingEvents(): Promise<BillingEvent[]> {
    const data = await this.getRawDataInternal();
    return data?.billingEvents || [];
  }

  async getBackups(): Promise<BackupRecord[]> {
    const data = await this.getRawDataInternal();
    return data?.backups || [];
  }

  async getSettings(): Promise<AppSettings> {
    const data = await this.getRawDataInternal();
    return data?.settings || INITIAL_SETTINGS;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    return this.enqueueOperation(async () => {
      const data = await this.getRawDataInternal();
      data.settings = settings;
      await this.saveRawDataInternal(data);
    });
  }

  async getAssessment(studentId: string): Promise<Assessment | null> {
    const data = await this.getRawDataInternal();
    return data?.assessments?.[studentId] || null;
  }

  async saveAssessment(assessment: Assessment): Promise<void> {
    return this.enqueueOperation(async () => {
      const data = await this.getRawDataInternal();
      if (!data.assessments) data.assessments = {};
      data.assessments[assessment.studentId] = assessment;
      await this.saveRawDataInternal(data);
    });
  }

  async getTrainingPlan(studentId: string): Promise<TrainingPlan | null> {
    const data = await this.getRawDataInternal();
    return data?.trainingPlans?.[studentId] || null;
  }

  async saveTrainingPlan(plan: TrainingPlan): Promise<void> {
    return this.enqueueOperation(async () => {
      const data = await this.getRawDataInternal();
      if (!data.trainingPlans) data.trainingPlans = {};
      data.trainingPlans[plan.studentId] = plan;
      await this.saveRawDataInternal(data);
    });
  }

  async markPresent(bookingId: string, method: 'QR' | 'MANUAL') {
    return this.enqueueOperation(async () => {
      const data = await this.getRawDataInternal();
      const booking = data.bookings.find((b: any) => b.id === bookingId);
      if (booking) {
        booking.status = AttendanceStatus.PRESENT;
        booking.checkInTime = new Date().toISOString();
        booking.checkInMethod = method;
        await this.saveRawDataInternal(data);
      }
    });
  }

  async markAbsent(bookingId: string, reason: string, userId: string) {
    return this.enqueueOperation(async () => {
      const data = await this.getRawDataInternal();
      const booking = data.bookings.find((b: any) => b.id === bookingId);
      if (booking) {
        booking.status = AttendanceStatus.ABSENT;
        booking.manualJustification = reason;
        await this.saveRawDataInternal(data);
        await this.logAction(userId, 'MARK_ABSENT', 'BOOKING', bookingId, `Falta: ${reason}`, booking.studentId);
      }
    });
  }

  async promoteStudentManual(bookingId: string) {
    return this.enqueueOperation(async () => {
      const data = await this.getRawDataInternal();
      const booking = data.bookings.find((b: any) => b.id === bookingId);
      if (booking) {
        booking.status = AttendanceStatus.AWAITING;
        await this.saveRawDataInternal(data);
      }
    });
  }

  async getExportData() {
    return await this.getRawDataInternal();
  }
}

export const db = new Database();
