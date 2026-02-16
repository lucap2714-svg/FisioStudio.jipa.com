
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../services/db';
import { Student, UserRole, StudentSchedule, AttendanceStatus, StudentType, BillingStatus } from '../types';
import { WEEK_DAYS } from '../constants';

const Icons = {
  FileText: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 7 20 7"/></svg>,
  Clipboard: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>,
  Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a4b6c1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>,
  Alert: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Dots: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>,
  Wallet: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/><path d="M18 12h4"/></svg>,
  Edit: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121(0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  Mic: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="19" x2="12" y2="22"/></svg>,
  Refresh: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
};

const ModalCloseButton = ({ onClick }: { onClick: () => void }) => (
  <button 
    onClick={onClick} 
    className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white hover:bg-slate-100 active:scale-90 transition-all rounded-full shadow-premium text-slate-400 hover:text-slate-600 z-[600]"
    aria-label="Fechar"
  >
    <Icons.X />
  </button>
);

const ValidationErrorBanner = ({ message, type = 'error' }: { message: string, type?: 'error' | 'success' }) => (
    <div className={`${type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'} border-2 p-4 rounded-2xl mb-6 animate-in flex items-center gap-3`}>
        <span className="shrink-0">{type === 'error' ? <Icons.Alert /> : <Icons.Wallet />}</span>
        <p className="text-[10px] font-black uppercase tracking-widest leading-tight">{message}</p>
    </div>
);

const normalizeForSort = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, ' ');
};

const StudentFormFields = ({ name, setName, phone, setPhone, studentType, setStudentType, schedule, setSchedule, errors }: any) => {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState('08:00');

  const toggleDaySelection = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const addScheduleItems = () => {
    if (selectedDays.length === 0) return;
    const newItems = selectedDays
      .filter(day => !schedule.some((s: any) => s.day === day && s.time === selectedTime))
      .map(day => ({ day, time: selectedTime }));
    
    if (newItems.length > 0) {
      setSchedule((prev: any) => [...prev, ...newItems]);
      setSelectedDays([]);
    }
  };

  const removeScheduleItem = (day: string, time: string) => {
    setSchedule((prev: any) => prev.filter((s: any) => !(s.day === day && s.time === time)));
  };

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="md:col-span-2 space-y-2">
          <label className="text-[9px] font-black text-brand-dark uppercase tracking-widest ml-1">Nome Completo *</label>
          <input 
            required 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className={`w-full px-6 py-4 border-2 rounded-2xl outline-none bg-white text-slate-800 font-bold transition-all ${errors.name ? 'border-red-500' : 'border-brand-light/40 focus:border-brand-primary'}`} 
            placeholder="Ex: João da Silva" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-black text-brand-dark uppercase tracking-widest ml-1">Telefone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-6 py-4 border-2 border-brand-light/40 rounded-2xl outline-none focus:border-brand-primary bg-white text-slate-800 font-bold" placeholder="(00) 00000-0000" />
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-black text-brand-dark uppercase tracking-widest ml-1">Tipo de aluno</label>
          <select value={studentType} onChange={e => setStudentType(e.target.value as StudentType)} className="w-full px-6 py-4 border-2 border-brand-light/40 rounded-2xl outline-none focus:border-brand-primary bg-white text-slate-800 font-bold">
            <option value="Fixo">Fixo</option>
            <option value="Avulso">Avulso</option>
            <option value="Wellhub">Wellhub</option>
          </select>
        </div>
      </div>

      <div className="bg-brand-bg/30 p-8 rounded-[2.5rem] border-2 border-white space-y-6">
        <header className="flex items-center justify-between">
          <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Grade de Horários (Agenda)</h4>
          <button type="button" onClick={addScheduleItems} className="bg-brand-primary hover:bg-brand-dark transition-all text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">Adicionar</button>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {WEEK_DAYS.slice(0, 6).map(day => (
            <button key={day} type="button" onClick={() => toggleDaySelection(day)} className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${selectedDays.includes(day) ? 'bg-brand-primary border-brand-primary text-white shadow-glow' : 'bg-white border-brand-light/20 text-slate-400'}`}>
              {day.slice(0, 3)}
            </button>
          ))}
          <input type="time" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className="col-span-2 px-4 py-2 rounded-xl border-2 border-brand-light/20 font-black text-slate-600" />
        </div>

        <div className="flex flex-wrap gap-2 pt-4">
          {schedule.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-brand-light/30 shadow-sm animate-in">
              <span className="text-[9px] font-black text-slate-700 uppercase">{item.day} {item.time}</span>
              <button type="button" onClick={() => removeScheduleItem(item.day, item.time)} className="text-red-300 hover:text-red-500 transition-colors p-1"><Icons.Trash /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AddStudentModal = ({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [studentType, setStudentType] = useState<StudentType>('Fixo');
  const [schedule, setSchedule] = useState<StudentSchedule[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
        setErrors({});
        setGlobalError(null);
        setSuccessMsg(null);
        setName(''); setPhone(''); setSchedule([]); setStudentType('Fixo');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setGlobalError(null);
    setSuccessMsg(null);

    const newErrors: Record<string, boolean> = {};
    if (!name.trim()) newErrors.name = true;

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setGlobalError("Preencha o nome do aluno.");
        return;
    }

    setIsSubmitting(true);
    try {
      const studentId = db.generateId();
      const newStudent: Student = {
        id: studentId,
        name: name.trim(), 
        phone: phone.trim(), 
        studentType,
        active: true, 
        role: UserRole.STUDENT,
        weeklyDays: Array.from(new Set(schedule.map(s => s.day))),
        weeklySchedule: schedule,
        billingStatus: BillingStatus.SEM_INFO,
        fixedDueDay: 10,
        fixedMonthlyFee: 250,
        wellhubEligibilityStatus: 'ATIVO'
      };
      
      await db.saveStudent(newStudent);
      setSuccessMsg("Dados salvos com sucesso!");
      
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);

    } catch (err) {
      console.error("Erro ao salvar aluno:", err);
      setGlobalError("ERRO AO SALVAR: Tente novamente ou verifique sua conexão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 md:p-12 overflow-y-auto max-h-[95vh] custom-scrollbar border-4 border-white relative" onClick={e => e.stopPropagation()}>
        <ModalCloseButton onClick={onClose} />
        <div className="flex justify-between items-center mb-10 pr-12">
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Novo Cadastro</h3>
            <p className="text-[10px] font-black text-brand-dark uppercase tracking-widest mt-1">Dados pessoais e grade horária</p>
          </div>
        </div>
        
        {globalError && <ValidationErrorBanner message={globalError} />}
        {successMsg && <ValidationErrorBanner message={successMsg} type="success" />}

        <form onSubmit={handleSubmit} className={`space-y-10 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
          <StudentFormFields 
            name={name} setName={setName} 
            phone={phone} setPhone={setPhone} 
            studentType={studentType} setStudentType={setStudentType} 
            schedule={schedule} setSchedule={setSchedule}
            errors={errors}
          />

          <button type="submit" disabled={isSubmitting} className="w-full bg-brand-primary text-white py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-glow hover:bg-brand-dark transition-all">
            {isSubmitting ? 'Salvando no banco...' : 'Confirmar e Salvar Cadastro'}
          </button>
        </form>
      </div>
    </div>
  );
};

const EditStudentModal = ({ isOpen, onClose, student, onSuccess }: { isOpen: boolean, onClose: () => void, student: Student | null, onSuccess: () => void }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [studentType, setStudentType] = useState<StudentType>('Fixo');
  const [schedule, setSchedule] = useState<StudentSchedule[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && student) {
      setName(student.name);
      setPhone(student.phone || '');
      setStudentType(student.studentType);
      setSchedule(student.weeklySchedule || []);
    } else if (!isOpen) {
      setErrors({});
      setGlobalError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !student) return;

    setGlobalError(null);
    setSuccessMsg(null);

    const newErrors: Record<string, boolean> = {};
    if (!name.trim()) newErrors.name = true;

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setGlobalError("Preencha o nome do aluno.");
        return;
    }

    setIsSubmitting(true);
    try {
      const updatedStudent: Student = {
        ...student,
        name: name.trim(), 
        phone: phone.trim(), 
        studentType,
        weeklyDays: Array.from(new Set(schedule.map(s => s.day))),
        weeklySchedule: schedule
      };
      
      await db.saveStudent(updatedStudent);
      setSuccessMsg("Dados atualizados com sucesso!");
      
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);

    } catch (err) {
      console.error("Erro ao atualizar aluno:", err);
      setGlobalError("ERRO AO ATUALIZAR: Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 md:p-12 overflow-y-auto max-h-[95vh] custom-scrollbar border-4 border-white relative" onClick={e => e.stopPropagation()}>
        <ModalCloseButton onClick={onClose} />
        <div className="flex justify-between items-center mb-10 pr-12">
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Editar Aluno</h3>
            <p className="text-[10px] font-black text-brand-dark uppercase tracking-widest mt-1">Atualizar cadastro e horários</p>
          </div>
        </div>
        
        {globalError && <ValidationErrorBanner message={globalError} />}
        {successMsg && <ValidationErrorBanner message={successMsg} type="success" />}

        <form onSubmit={handleSubmit} className={`space-y-10 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
          <StudentFormFields 
            name={name} setName={setName} 
            phone={phone} setPhone={setPhone} 
            studentType={studentType} setStudentType={setStudentType} 
            schedule={schedule} setSchedule={setSchedule}
            errors={errors}
          />

          <button type="submit" disabled={isSubmitting} className="w-full bg-slate-800 text-white py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-glow hover:bg-slate-900 transition-all">
            {isSubmitting ? 'Salvando alterações...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>
    </div>
  );
};

interface StudentsListProps {
  onOpenAssessment: (id: string) => void;
  onOpenTrainingPlan: (id: string) => void;
}

export default function StudentsList({ onOpenAssessment, onOpenTrainingPlan }: StudentsListProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [statusChangeStudentId, setStatusChangeStudentId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // REDIRECIONAMENTO SUPABASE (via db.ts)
      const data = await db.getStudents();
      console.debug(`[Supabase_UI] Lista sincronizada: ${data.length} alunos.`);
      setStudents(data);
    } catch (e: any) {
      console.error("[Supabase_UI] Erro ao sincronizar lista:", e);
      setError("Não foi possível conectar ao banco de dados na nuvem.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
    return db.onUpdate?.(loadStudents);
  }, [loadStudents]);

  const filteredAndSortedStudents = useMemo(() => {
    return students
      .filter(s => normalizeForSort(s.name).includes(normalizeForSort(searchTerm)))
      .sort((a, b) => normalizeForSort(a.name).localeCompare(normalizeForSort(b.name), "pt-BR", { sensitivity: "base" }));
  }, [students, searchTerm]);

  const updateFinancialStatus = async (studentId: string, status: BillingStatus) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      const updatedStudent = { ...student, billingStatus: status };
      await db.saveStudent(updatedStudent);
      await loadStudents();
      setStatusChangeStudentId(null);
      setOpenMenuId(null);
    }
  };

  const handleEditStudent = (student: Student) => {
    setStudentToEdit(student);
    setIsEditModalOpen(true);
    setOpenMenuId(null);
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta busca por voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
    };

    recognition.start();
  };

  return (
    <div className="space-y-8 animate-in pb-12">
      {openMenuId && <div className="fixed inset-0 z-[100]" onClick={() => setOpenMenuId(null)}></div>}
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4 md:px-0 bg-white/50 p-6 rounded-[2rem] border border-brand-light/20">
        <div className="flex flex-col gap-4 w-full md:w-auto">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Listagem de Alunos</h2>
            <p className="text-[10px] font-black uppercase text-brand-dark tracking-widest">Sincronizado via Cloud ({students.length})</p>
          </div>
        </div>

        <div className="flex w-full md:w-auto gap-4 items-center">
          <div className="relative flex-1 md:w-80 group">
             <input 
                type="text" 
                placeholder="Buscar por nome..." 
                className="w-full pl-6 pr-14 py-4 bg-white border border-brand-light/30 rounded-2xl outline-none focus:border-brand-primary font-bold shadow-premium transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <button 
                onClick={startVoiceSearch}
                aria-label="Buscar por voz"
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-glow' : 'bg-brand-bg text-brand-dark hover:bg-brand-primary hover:text-white'}`}
              >
                <Icons.Mic />
              </button>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-brand-primary text-white p-4 rounded-2xl shadow-glow transition-all hover:scale-105 active:scale-95">
            <Icons.Plus />
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-4 md:mx-0 p-8 bg-red-50 border-2 border-red-100 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 animate-in">
           <div className="flex items-center gap-4">
              <div className="text-red-500"><Icons.Alert /></div>
              <div>
                <p className="text-[11px] font-black text-red-600 uppercase tracking-widest">Erro de Sincronização</p>
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">{error}</p>
              </div>
           </div>
           <button onClick={loadStudents} className="bg-red-600 text-white px-8 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-glow flex items-center gap-2">
             <Icons.Refresh /> Tentar Novamente
           </button>
        </div>
      )}

      {loading && !error ? (
        <div className="py-20 text-center animate-pulse text-brand-dark font-black uppercase text-[10px] tracking-widest">Acessando Supabase...</div>
      ) : filteredAndSortedStudents.length === 0 && !error ? (
        <div className="bg-white rounded-[3rem] p-20 text-center border-4 border-dashed border-brand-bg flex flex-col items-center gap-6 mx-4 md:mx-0">
          <Icons.Users />
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nenhum aluno encontrado na nuvem.</p>
        </div>
      ) : !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-0">
          {filteredAndSortedStudents.map(student => (
            <div key={student.id} className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-brand-light/10 hover:shadow-glow transition-all group relative overflow-visible">
               
               <div className="mb-4">
                 <div className={`inline-flex px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest items-center gap-1.5 shadow-sm border ${
                   student.billingStatus === BillingStatus.EM_DIA ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                   student.billingStatus === BillingStatus.ATRASADO ? 'bg-red-100 text-red-700 border-red-200' :
                   'bg-slate-100 text-slate-500 border-slate-200'
                 }`}>
                   <Icons.Wallet />
                   {student.billingStatus === BillingStatus.EM_DIA ? 'Em Dia' :
                    student.billingStatus === BillingStatus.ATRASADO ? 'Atrasado' : 'Sem Info'}
                 </div>
               </div>

               <div className="flex items-center gap-6 mb-6">
                 <div className="w-16 h-16 bg-brand-bg rounded-2xl flex items-center justify-center font-black text-2xl text-brand-dark group-hover:bg-brand-primary group-hover:text-white transition-all shadow-inner uppercase">
                   {student.name.charAt(0)}
                 </div>
                 <div className="min-w-0 flex-1">
                   <h4 className="font-black text-slate-800 text-lg leading-tight truncate">{student.name}</h4>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{student.phone || '—'}</p>
                 </div>
                 <div className="relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === student.id ? null : student.id); }}
                      className={`p-2 text-slate-300 hover:text-brand-primary transition-colors rounded-lg ${openMenuId === student.id ? 'bg-brand-bg text-brand-primary' : ''}`}
                    >
                      <Icons.Dots />
                    </button>
                    {openMenuId === student.id && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border z-[200] py-2 animate-in zoom-in-95 origin-top-right">
                         <button onClick={() => { onOpenAssessment(student.id); setOpenMenuId(null); }} className="w-full text-left px-5 py-3 text-[10px] font-black uppercase text-slate-700 hover:bg-brand-bg flex items-center gap-3 transition-colors">
                            <Icons.FileText /> Ficha de Avaliação
                         </button>
                         <button onClick={() => { onOpenTrainingPlan(student.id); setOpenMenuId(null); }} className="w-full text-left px-5 py-3 text-[10px] font-black uppercase text-slate-700 hover:bg-brand-bg flex items-center gap-3 transition-colors">
                            <Icons.Clipboard /> Ficha de Evolução
                         </button>
                         <button onClick={() => { setStatusChangeStudentId(student.id); setOpenMenuId(null); }} className="w-full text-left px-5 py-3 text-[10px] font-black uppercase text-slate-700 hover:bg-brand-bg flex items-center gap-3 transition-colors">
                            <Icons.Wallet /> Status Financeiro
                         </button>
                         <div className="h-px bg-slate-100 my-1"></div>
                         <button onClick={() => handleEditStudent(student)} className="w-full text-left px-5 py-3 text-[10px] font-black uppercase text-brand-primary hover:bg-brand-bg flex items-center gap-3 transition-colors">
                            <Icons.Edit /> Editar Aluno
                         </button>
                      </div>
                    )}
                 </div>
               </div>
               
               <div className="flex items-center justify-between pt-6 border-t border-brand-bg">
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Telefone</span>
                    <span className="text-[10px] font-black text-slate-700 uppercase">{student.phone || '—'}</span>
                 </div>
                 <div className="text-right">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1 block">Modalidade</span>
                    <span className="px-3 py-1 rounded-lg bg-brand-bg/50 text-brand-dark text-[9px] font-black uppercase tracking-widest">{student.studentType}</span>
                 </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {statusChangeStudentId && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in" onClick={() => setStatusChangeStudentId(null)}>
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-10 relative" onClick={e => e.stopPropagation()}>
              <ModalCloseButton onClick={() => setStatusChangeStudentId(null)} />
              <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase mb-6 pr-12">Status Financeiro</h3>
              <div className="space-y-4">
                 <button onClick={() => updateFinancialStatus(statusChangeStudentId, BillingStatus.EM_DIA)} className="w-full p-6 rounded-2xl border-2 border-emerald-50 bg-emerald-50/20 text-emerald-700 font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-between">
                   Em Dia <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                 </button>
                 <button onClick={() => updateFinancialStatus(statusChangeStudentId, BillingStatus.ATRASADO)} className="w-full p-6 rounded-2xl border-2 border-red-50 bg-red-50/20 text-red-700 font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-between">
                   Atrasado <div className="w-4 h-4 rounded-full bg-red-500"></div>
                 </button>
                 <button onClick={() => updateFinancialStatus(statusChangeStudentId, BillingStatus.SEM_INFO)} className="w-full p-6 rounded-2xl border-2 border-slate-50 bg-slate-50/20 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-between">
                   Sem Informação <div className="w-4 h-4 rounded-full bg-slate-300"></div>
                 </button>
              </div>
           </div>
        </div>
      )}

      <AddStudentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={loadStudents} 
      />

      <EditStudentModal 
        isOpen={isEditModalOpen}
        student={studentToEdit}
        onClose={() => { setIsEditModalOpen(false); setStudentToEdit(null); }}
        onSuccess={loadStudents}
      />
    </div>
  );
}
