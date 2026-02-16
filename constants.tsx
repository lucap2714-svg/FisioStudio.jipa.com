
import { UserRole, Student, AppSettings, BillingStatus } from './types';

export const INITIAL_SETTINGS: AppSettings = {
  checkInWindowMinutes: 20,
  defaultCapacity: 8,
  kioskWindowBeforeMinutes: 30,
  kioskWindowAfterMinutes: 60,
  kioskExitPin: '1234',
  kioskQrTimeoutSeconds: 15,
  kioskRefreshIntervalSeconds: 45,
};

export const MOCK_PROFESSIONALS = [
  { id: 'prof-1', name: 'Alina Holanda', email: 'alina@fisiostudio.com', role: UserRole.PROFESSIONAL, crefito: '18/352245-F', password: '3522' },
  { id: 'prof-2', name: 'Yara Cavalcante', email: 'yara@fisiostudio.com', role: UserRole.PROFESSIONAL, crefito: '18/339104-F', password: '3391' },
  { id: 'prof-3', name: 'Barbara Cavalcanti', email: 'barbara@fisiostudio.com', role: UserRole.PROFESSIONAL, crefito: '339371-.F', password: '3393' }
];

export const WEEK_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export const MOCK_STUDENTS: Student[] = [
  { id: 's-1', name: 'Rafaela Camila R Da Silva', phone: '92 993215720', studentType: 'Wellhub', active: true, role: UserRole.STUDENT, weeklyDays: ['Terça', 'Quinta'], weeklySchedule: [{day: 'Terça', time: '16:00'}, {day: 'Quinta', time: '16:00'}], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-2', name: 'Ana Carolina Mendes', phone: '69 99389-4785', studentType: 'Fixo', active: true, role: UserRole.STUDENT, weeklyDays: ['Terça', 'Quarta', 'Quinta'], weeklySchedule: [{day: 'Terça', time: '16:00'}, {day: 'Quarta', time: '16:00'}, {day: 'Quinta', time: '16:00'}], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-3', name: 'Renato Antonio', phone: '35 98832-7096', studentType: 'Fixo', active: true, role: UserRole.STUDENT, weeklyDays: ['Terça', 'Quinta'], weeklySchedule: [{day: 'Terça', time: '18:00'}, {day: 'Quinta', time: '18:00'}], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-4', name: 'Katrielly Dos Reis', phone: '69 99982-6539', studentType: 'Fixo', active: true, role: UserRole.STUDENT, weeklyDays: ['Segunda', 'Terça', 'Quinta'], weeklySchedule: [{day: 'Segunda', time: '19:00'}, {day: 'Terça', time: '19:00'}, {day: 'Quinta', time: '19:00'}], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-5', name: 'Mario Marcos Da Silva', phone: '69 99304-9197', studentType: 'Fixo', active: true, role: UserRole.STUDENT, weeklyDays: [], weeklySchedule: [], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-6', name: 'Pamela Rodrigues', phone: '69 99225-0273', studentType: 'Fixo', active: true, role: UserRole.STUDENT, weeklyDays: [], weeklySchedule: [], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-7', name: 'Claudenice Adrisen', phone: '69 99218-7872', studentType: 'Fixo', active: true, role: UserRole.STUDENT, weeklyDays: [], weeklySchedule: [], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-8', name: 'Elizabet Braga Nunes', phone: '69 99239-4013', studentType: 'Wellhub', active: true, role: UserRole.STUDENT, weeklyDays: ['Terça', 'Quinta'], weeklySchedule: [{day: 'Terça', time: '18:00'}, {day: 'Quinta', time: '18:00'}], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-9', name: 'Raiza Emanuelle Ramalho', phone: '69 99236-6293', studentType: 'Wellhub', active: true, role: UserRole.STUDENT, weeklyDays: ['Terça', 'Quinta'], weeklySchedule: [{day: 'Terça', time: '17:00'}, {day: 'Quinta', time: '17:00'}], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-10', name: 'Izabel Ferreira De Jesus', phone: '69 99945-2049', studentType: 'Avulso', active: true, role: UserRole.STUDENT, weeklyDays: [], weeklySchedule: [], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-11', name: 'Elessandra Souza Nascimento', phone: '69 99919-1813', studentType: 'Fixo', active: true, role: UserRole.STUDENT, weeklyDays: [], weeklySchedule: [], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-12', name: 'Vanuza Alvez', phone: '69 99351-5622', studentType: 'Fixo', active: true, role: UserRole.STUDENT, weeklyDays: [], weeklySchedule: [], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-13', name: 'Elizabete Ladislau', phone: '69 99244-7672', studentType: 'Fixo', active: true, role: UserRole.STUDENT, weeklyDays: [], weeklySchedule: [], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-14', name: 'Giovanna Rufini De Andrade', phone: '69 99224-2760', studentType: 'Fixo', active: true, role: UserRole.STUDENT, weeklyDays: [], weeklySchedule: [], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-15', name: 'Catia Augusta', phone: '69 99971-1771', studentType: 'Wellhub', active: true, role: UserRole.STUDENT, weeklyDays: ['Terça', 'Quinta'], weeklySchedule: [{day: 'Terça', time: '18:00'}, {day: 'Quinta', time: '18:00'}], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-16', name: 'Ester Alvez De Souza', phone: '69 99608-9391', studentType: 'Wellhub', active: true, role: UserRole.STUDENT, weeklyDays: [], weeklySchedule: [], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-17', name: 'Barbara Rosa', phone: '31 99779-1112', studentType: 'Wellhub', active: true, role: UserRole.STUDENT, weeklyDays: ['Segunda', 'Quarta'], weeklySchedule: [{day: 'Segunda', time: '17:00'}, {day: 'Quarta', time: '17:00'}], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-18', name: 'Andre Luiz', phone: '69 99229-8320', studentType: 'Fixo', active: true, role: UserRole.STUDENT, weeklyDays: ['Segunda', 'Quarta'], weeklySchedule: [{day: 'Segunda', time: '17:00'}, {day: 'Quarta', time: '17:00'}], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-19', name: 'Manoel Marques', phone: '69 99952-4387', studentType: 'Fixo', active: true, role: UserRole.STUDENT, weeklyDays: ['Segunda', 'Quarta'], weeklySchedule: [{day: 'Segunda', time: '16:00'}, {day: 'Quarta', time: '16:00'}], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-20', name: 'Lizianne De Matos', phone: '69 99237-8639', studentType: 'Wellhub', active: true, role: UserRole.STUDENT, weeklyDays: ['Segunda', 'Quarta', 'Quinta'], weeklySchedule: [{day: 'Segunda', time: '16:00'}, {day: 'Quarta', time: '18:00'}, {day: 'Quinta', time: '18:00'}], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-63', name: 'Danilo Pereira Eduardo', phone: '69 99356 7550', studentType: 'Wellhub', active: true, role: UserRole.STUDENT, weeklyDays: ['Segunda', 'Quarta'], weeklySchedule: [{day: 'Segunda', time: '16:00'}, {day: 'Quarta', time: '16:00'}], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-64', name: 'Elizabete Ferraz', phone: '69 98453 1526', studentType: 'Wellhub', active: true, role: UserRole.STUDENT, weeklyDays: ['Segunda', 'Quarta'], weeklySchedule: [{day: 'Segunda', time: '16:00'}, {day: 'Quarta', time: '16:00'}], billingStatus: BillingStatus.SEM_INFO },
  { id: 's-65', name: 'Hugo Vicentin', phone: '69 99278 5665', studentType: 'Wellhub', active: true, role: UserRole.STUDENT, weeklyDays: ['Terça', 'Quinta'], weeklySchedule: [{day: 'Terça', time: '16:00'}, {day: 'Quinta', time: '16:00'}], billingStatus: BillingStatus.SEM_INFO }
];
