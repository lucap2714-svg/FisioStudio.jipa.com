
export enum UserRole {
  PROFESSIONAL = 'PROFESSIONAL',
  STUDENT = 'STUDENT'
}

export enum AttendanceStatus {
  AWAITING = 'AWAITING',
  WAITLISTED = 'WAITLISTED',
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  CANCELLED = 'CANCELLED'
}

export enum EvolutionStatus {
  NOT_STARTED = 'NOT_STARTED',
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED'
}

export enum BillingStatus {
  EM_DIA = 'EM_DIA',
  ATRASADO = 'ATRASADO',
  SEM_INFO = 'SEM_INFO'
}

export type StudentType = 'Fixo' | 'Avulso' | 'Wellhub';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  phone?: string;
  crefito?: string;
}

export interface StudentSchedule {
  day: string;
  time: string;
  calendarEventId?: string;
}

export interface Student extends User {
  active: boolean;
  studentType: StudentType;
  birthDate?: string;
  weeklyDays: string[]; 
  weeklySchedule: StudentSchedule[]; 
  billingStatus: BillingStatus;
  billingNotes?: string;
  fixedMonthlyFee?: number;
  fixedDueDay?: number;
  fixedLastPaidMonth?: string; 
  avulsoPricePerSession?: number;
  avulsoSessionCredits?: number;
  wellhubEligibilityStatus?: 'ATIVO' | 'INATIVO';
  lastPaymentDate?: string;
  phoneDigits?: string;
  phoneE164?: string;
}

export interface ClassSession {
  id: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  capacity: number;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  instructorId: string;
  calendarEventId?: string;
  lastSyncedAt?: string;
}

export interface Booking {
  id: string;
  classId: string;
  studentId: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkInMethod?: 'QR' | 'MANUAL';
  manualJustification?: string;
  createdAt: string;
  calendarEventId?: string;
}

export interface AppSettings {
  checkInWindowMinutes: number;
  defaultCapacity: number;
  kioskWindowBeforeMinutes: number;
  kioskWindowAfterMinutes: number;
  kioskExitPin: string;
  kioskQrTimeoutSeconds: number;
  kioskRefreshIntervalSeconds: number;
  googleCalendarId?: string;
}

export interface RestoreResult {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  totalAfter: number;
  errors: string[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  action: string; 
  entityType: string; 
  entityId: string;
  studentId?: string;
  details: string;
}

export interface Evolution {
  id: string;
  studentId: string;
  date: string;
  content: {
    complaint: string;
    intercurrences: string;
    exercises: string;
  };
  status: EvolutionStatus;
  finalizedAt?: string;
}

/**
 * Interface representing a single training session record within a treatment plan.
 */
export interface TrainingSessionRecord {
  id: string;
  date: string;
  objectives: string[];
  regions: string[];
  equipment: string[];
  arrival: string;
  departure: string;
  observations: string;
}

export interface TrainingPlan {
  id: string;
  studentId: string;
  sessions: TrainingSessionRecord[];
  status: EvolutionStatus;
  updatedAt: string;
  updatedBy: string;
  prescribedBy?: string;
  prescribedByCrefito?: string;
}

export interface Assessment {
  id: string;
  studentId: string;
  assessmentDate: string;
  status?: EvolutionStatus;
  updatedAt: string;
  [key: string]: any;
}

export interface BillingEvent {
  id: string;
  studentId: string;
  type: string;
  amount: number;
  date: string;
  status: string;
  referenceMonth?: string;
  timestamp: string;
}

export interface BackupRecord {
  id: string;
  timestamp: string;
  size: number;
  status: string;
  type: string;
}

/**
 * Interface for file attachments.
 */
export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  createdAt: string;
}

/**
 * Interface for Google Calendar synchronization logs.
 */
export interface SyncLog {
  id: string;
  timestamp: string;
  userId: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  calendarEventId?: string;
  status: 'SUCCESS' | 'ERROR';
  message: string;
}
