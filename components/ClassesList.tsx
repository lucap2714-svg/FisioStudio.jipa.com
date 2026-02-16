
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db, DateUtils } from '../services/db';
import { googleSync } from '../services/googleCalendar';
import { ClassSession, Student, AttendanceStatus, Booking } from '../types';
import { WEEK_DAYS } from '../constants';

interface ClassesListProps {
  onSelectClass: (id: string) => void;
  onOpenStudentProfile: (id: string) => void;
  onOpenTrainingPlan: (id: string) => void;
}

const Icons = {
  FileText: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 7 20 7"/></svg>,
  Clipboard: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>,
  Repeat: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>,
  Dots: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>,
  Alert: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>,
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>,
  Sync: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>,
  Magic: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.21 1.21 0 0 0 1.72 0L21.64 5.36a1.21 1.21 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v1"/><path d="M11 2v2"/><path d="M15 2v2"/><path d="M20 8h2"/><path d="M20 12h2"/><path d="M11 22v-2"/><path d="M15 22v-2"/></svg>
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

const ValidationErrorBanner = ({ message }: { message: string }) => (
    <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl mb-6 animate-in flex items-center gap-3">
        <span className="text-red-500 shrink-0"><Icons.Alert /></span>
        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-tight">{message}</p>
    </div>
);

const AddClassModal = ({ isOpen, onClose, students, onClassCreated }: { isOpen: boolean, onClose: () => void, students: Student[], onClassCreated: () => void }) => {
  const [date, setDate] = useState(DateUtils.normalize());
  const [time, setTime] = useState('08:00');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Lógica de sugestão automática baseada na grade semanal
  const suggestedStudents = useMemo(() => {
    try {
      const dayName = DateUtils.getDayName(new Date(date + 'T12:00:00'));
      return students.filter(s => 
        s.active && 
        s.weeklySchedule.some(sc => sc.day === dayName && sc.time === time)
      );
    } catch (e) {
      return [];
    }
  }, [date, time, students]);

  // Auto-selecionar quando mudar o horário se for nova sessão
  useEffect(() => {
    if (isOpen && suggestedStudents.length > 0 && selectedStudentIds.length === 0) {
      setSelectedStudentIds(suggestedStudents.map(s => s.id));
    }
  }, [suggestedStudents, isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => {
        window.removeEventListener('keydown', handleEsc);
        setErrors(null);
    };
  }, [isOpen, onClose]);

  const toggleStudent = (id: string) => {
    setErrors(null);
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllSuggested = () => {
    const suggestedIds = suggestedStudents.map(s => s.id);
    setSelectedStudentIds(prev => Array.from(new Set([...prev, ...suggestedIds])));
  };

  const filteredResults = useMemo(() => {
    const normalized = searchTerm.toLowerCase().trim();
    if (!normalized) return students;
    return students.filter(s => 
      s.name.toLowerCase().includes(normalized) || 
      (s.phone && s.phone.includes(normalized))
    );
  }, [students, searchTerm]);

  const handleCreate = async () => {
    if (isSubmitting) return;
    if (selectedStudentIds.length === 0) {
      setErrors("Selecione ao menos um aluno para criar a sessão.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const classId = db.generateId();
      const newClass: ClassSession = {
        id: classId,
        date,
        startTime: time,
        durationMinutes: 60,
        capacity: 8,
        status: 'SCHEDULED',
        instructorId: 'system'
      };
      
      const calendarId = await googleSync.syncClass(newClass, 'system');
      if (calendarId) newClass.calendarEventId = calendarId;

      await db.saveClass(newClass);

      for (const sid of selectedStudentIds) {
        await db.saveBooking({
          id: db.generateId(),
          classId,
          studentId: sid,
          status: AttendanceStatus.AWAITING,
          createdAt: new Date().toISOString()
        });
      }

      onClassCreated();
      onClose();
    } catch (e) {
      console.error(e);
      setErrors("Ocorreu um erro ao salvar os dados.");
    } finally {
      setIsSubmitting(false);
      setSelectedStudentIds([]);
      setSearchTerm('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in" onClick={onClose}>
      <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-8 md:p-10 flex flex-col max-h-[90vh] relative overflow-hidden" onClick={e => e.stopPropagation()}>
        <ModalCloseButton onClick={onClose} />
        <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase mb-6 pr-12">Nova Aula / Sessão</h3>
        
        {errors && <ValidationErrorBanner message={errors} />}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-brand-dark uppercase tracking-widest ml-1">Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-5 py-3 bg-brand-bg/30 border-2 border-brand-light/20 rounded-xl font-bold outline-none focus:border-brand-primary" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-brand-dark uppercase tracking-widest ml-1">Horário</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full px-5 py-3 bg-brand-bg/30 border-2 border-brand-light/20 rounded-xl font-bold outline-none focus:border-brand-primary" />
          </div>
        </div>

        {/* Seção de Sugestões Inteligentes */}
        <div className="mb-6 bg-brand-bg/20 p-5 rounded-2xl border border-brand-light/30">
          <header className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2">
                <span className="text-brand-primary"><Icons.Magic /></span>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Alunos sugeridos ({suggestedStudents.length})</span>
             </div>
             {suggestedStudents.length > 0 && (
               <button onClick={selectAllSuggested} className="text-[9px] font-black text-brand-primary uppercase underline tracking-widest hover:text-brand-dark">Selecionar Todos</button>
             )}
          </header>
          {suggestedStudents.length === 0 ? (
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Nenhum aluno cadastrado para este horário na grade semanal.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
               {suggestedStudents.map(s => (
                 <div key={s.id} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border ${selectedStudentIds.includes(s.id) ? 'bg-brand-primary text-white border-brand-primary shadow-sm' : 'bg-white text-slate-400 border-slate-100'}`}>
                    {s.name.split(' ')[0]}
                    {selectedStudentIds.includes(s.id) && <Icons.Check />}
                 </div>
               ))}
            </div>
          )}
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-3 mb-4">
            <label className="text-[9px] font-black text-brand-dark uppercase tracking-widest ml-1">Lista Geral de Alunos</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Icons.Search /></span>
              <input type="text" placeholder="Pesquisar por nome ou telefone..." className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-brand-primary font-bold text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar p-1 rounded-2xl">
            {filteredResults.map(s => (
              <button key={s.id} onClick={() => toggleStudent(s.id)} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${selectedStudentIds.includes(s.id) ? 'bg-brand-primary/10 border-brand-primary' : 'bg-white border-brand-bg hover:border-brand-light'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${selectedStudentIds.includes(s.id) ? 'bg-brand-primary border-brand-primary' : 'bg-white border-brand-light'}`}>{selectedStudentIds.includes(s.id) && <Icons.Check />}</div>
                  <div className="text-left">
                    <span className="font-bold text-slate-700 text-sm block">{s.name}</span>
                    {s.weeklySchedule.some(sc => sc.time === time) && (
                      <span className="text-[8px] font-black text-brand-primary uppercase tracking-widest mt-0.5 block">Possui horário fixo neste slot</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 mt-8">
           <button onClick={onClose} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
           <button onClick={handleCreate} disabled={isSubmitting} className="flex-1 py-4 bg-brand-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-glow">
             {isSubmitting ? 'Sincronizando...' : 'Confirmar e Criar Sessão'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default function ClassesList({ onSelectClass, onOpenStudentProfile, onOpenTrainingPlan }: ClassesListProps) {
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  
  const [rescheduleData, setRescheduleData] = useState<{ studentId: string, booking?: Booking, studentName: string, date: string, currentStartTime: string } | null>(null);
  const [rescheduleNewTime, setRescheduleNewTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleErrors, setRescheduleErrors] = useState<string | null>(null);

  const [absenceData, setAbsenceData] = useState<{ student: any } | null>(null);
  const [absenceReason, setAbsenceReason] = useState('');
  const [absenceErrors, setAbsenceErrors] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allClasses, allStudents, allBookings] = await Promise.all([
        db.getClasses(), db.getStudents(), db.getBookings()
      ]);
      setClasses(allClasses);
      setStudents(allStudents.filter(s => s.active));
      setBookings(allBookings);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const plannerData = useMemo(() => {
    const todayStr = DateUtils.normalize();
    const today = new Date(todayStr + 'T12:00:00');
    const currentDayIdx = today.getDay();
    const mondayOffset = currentDayIdx === 0 ? -6 : 1 - currentDayIdx;
    
    return WEEK_DAYS.slice(0, 6).map((day, idx) => {
      const target = new Date(today);
      target.setDate(today.getDate() + mondayOffset + idx);
      const targetStr = DateUtils.normalize(target);
      const daySessions = classes.filter(c => c.date === targetStr);
      const studentsInDay: any[] = [];
      
      const times = Array.from(new Set([
        ...students.flatMap(s => s.weeklySchedule.filter(sc => sc.day === day).map(sc => sc.time)),
        ...daySessions.map(c => c.startTime)
      ])).sort();

      times.forEach(time => {
        const session = daySessions.find(c => c.startTime === time);
        const scheduledHere = students.filter(s => s.weeklySchedule.some(sc => sc.day === day && sc.time === time));
        
        scheduledHere.forEach(s => {
          const booking = bookings.find(b => b.studentId === s.id && b.classId === session?.id);
          if (booking && booking.status === AttendanceStatus.CANCELLED) return;
          studentsInDay.push({ ...s, fixedTime: time, booking, session, status: booking?.status || AttendanceStatus.AWAITING, dayDate: targetStr });
        });

        if (session) {
          bookings.filter(b => b.classId === session.id && !scheduledHere.some(s => s.id === b.studentId)).forEach(eb => {
            const s = students.find(st => st.id === eb.studentId);
            if (s && eb.status !== AttendanceStatus.CANCELLED) {
                studentsInDay.push({ ...s, fixedTime: time, booking: eb, session, status: eb.status, isRescheduled: s.studentType === 'Fixo', dayDate: targetStr });
            }
          });
        }
      });

      return { day, targetDate: targetStr, students: studentsInDay.filter(s => !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase())) };
    });
  }, [students, searchTerm, bookings, classes]);

  const handleMarkPresent = async (student: any) => {
    let bookingId = student.booking?.id;
    if (!bookingId) bookingId = await ensureBooking(student);
    await db.markPresent(bookingId, 'MANUAL'); 
    await loadData(); 
    setOpenMenuId(null); 
  };
  
  const handleAbsenceConfirm = async () => {
    if (!absenceData || !absenceReason.trim()) return setAbsenceErrors("Justificativa obrigatória.");
    let bookingId = absenceData.student.booking?.id;
    if (!bookingId) bookingId = await ensureBooking(absenceData.student);
    await db.markAbsent(bookingId, absenceReason, 'system');
    await loadData();
    setAbsenceData(null);
  };

  const ensureBooking = async (student: any): Promise<string> => {
    let targetSession = classes.find(c => c.date === student.dayDate && c.startTime === student.fixedTime);
    if (!targetSession) {
      const newSession: ClassSession = { id: db.generateId(), date: student.dayDate, startTime: student.fixedTime, durationMinutes: 60, capacity: 8, status: 'SCHEDULED', instructorId: 'system' };
      const calendarId = await googleSync.syncClass(newSession, 'system');
      if (calendarId) newSession.calendarEventId = calendarId;
      await db.saveClass(newSession);
      targetSession = newSession;
    }
    const newBooking: Booking = { id: db.generateId(), classId: targetSession.id, studentId: student.id, status: AttendanceStatus.AWAITING, createdAt: new Date().toISOString() };
    await db.saveBooking(newBooking);
    return newBooking.id;
  };

  const handleReschedule = async () => {
    if (!rescheduleData || !rescheduleReason.trim()) return setRescheduleErrors("Motivo obrigatório.");
    try {
      let targetSession = classes.find(c => c.date === rescheduleData.date && c.startTime === rescheduleNewTime);
      if (!targetSession) {
        const ns: ClassSession = { id: db.generateId(), date: rescheduleData.date, startTime: rescheduleNewTime, durationMinutes: 60, capacity: 8, status: 'SCHEDULED', instructorId: 'system' };
        const calendarId = await googleSync.syncClass(ns, 'system');
        if (calendarId) ns.calendarEventId = calendarId;
        await db.saveClass(ns);
        targetSession = ns;
      }
      if (rescheduleData.booking) await db.deleteBooking(rescheduleData.booking.id);
      await db.saveBooking({ id: db.generateId(), classId: targetSession.id, studentId: rescheduleData.studentId, status: AttendanceStatus.AWAITING, createdAt: new Date().toISOString() });
      await loadData();
      setRescheduleData(null);
    } catch (e) { setRescheduleErrors("Erro no reagendamento."); }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in pb-12">
      {openMenuId && <div className="fixed inset-0 z-[100]" onClick={() => setOpenMenuId(null)}></div>}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4 md:px-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter uppercase">Agenda Permanente</h2>
          <p className="text-brand-dark font-black uppercase tracking-widest text-[10px] mt-1">Horários Sincronizados</p>
        </div>
        <div className="flex w-full md:w-auto gap-4">
          <input type="text" placeholder="Filtrar aluno..." className="flex-1 md:w-64 px-6 py-3 bg-white border border-brand-light/30 rounded-2xl outline-none focus:border-brand-primary font-bold shadow-premium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <button onClick={() => setIsAddClassModalOpen(true)} className="bg-brand-primary text-white p-3.5 rounded-2xl shadow-glow transition-all hover:scale-105 active:scale-95"><Icons.Plus /></button>
        </div>
      </header>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-brand-dark font-black uppercase text-[10px] tracking-widest">Sincronizando Banco de Dados...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 px-4 md:px-0">
          {plannerData.map((group, groupIdx) => (
            <div key={group.day} className="flex flex-col gap-3">
              <header className="bg-brand-primary px-4 py-3 rounded-xl text-white flex justify-between items-center shadow-premium">
                <h4 className="text-[9px] font-black uppercase tracking-widest">{group.day}</h4>
                <span className="text-[8px] opacity-60">{group.targetDate.split('-').reverse().slice(0,2).join('/')}</span>
              </header>
              <div className="space-y-3 bg-white/40 p-1.5 rounded-xl min-h-[500px]">
                {group.students.map(student => (
                  <div key={`${student.id}-${student.fixedTime}-${group.day}`} className={`bg-white p-4 rounded-xl shadow-premium border border-brand-light/10 relative group ${student.status === 'PRESENT' ? 'border-l-4 border-l-emerald-500' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                       <span className="bg-brand-dark text-white px-2 py-0.5 rounded text-[8px] font-black">{student.fixedTime}</span>
                       <div className={`w-2.5 h-2.5 rounded-full ${student.status === 'PRESENT' ? 'bg-emerald-500' : student.status === 'ABSENT' ? 'bg-red-500' : 'bg-amber-400'}`}></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="font-black text-slate-800 text-[11px] truncate flex-1">{student.name}</p>
                      <button onClick={() => setOpenMenuId(openMenuId === `${student.id}-${group.day}-${student.fixedTime}` ? null : `${student.id}-${group.day}-${student.fixedTime}`)} className="p-1.5 text-slate-300 hover:text-brand-primary transition-colors"><Icons.Dots /></button>
                      {openMenuId === `${student.id}-${group.day}-${student.fixedTime}` && (
                        <div className={`absolute bottom-full mb-2 w-48 bg-white rounded-xl shadow-2xl border z-[200] py-1 ${groupIdx >= 3 ? 'right-0' : 'left-0'}`}>
                           <button onClick={() => { onOpenStudentProfile(student.id); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-[9px] font-black uppercase text-slate-700 hover:bg-brand-bg flex items-center gap-2"><Icons.FileText /> Perfil</button>
                           <button onClick={() => handleMarkPresent(student)} className="w-full text-left px-4 py-2 text-[9px] font-black uppercase text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"><Icons.Check /> Presença</button>
                           <button onClick={() => { setAbsenceData({ student }); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-[9px] font-black uppercase text-red-600 hover:bg-red-50 flex items-center gap-2"><Icons.X /> Falta</button>
                           <button onClick={() => { setRescheduleData({ studentId: student.id, studentName: student.name, date: student.dayDate, currentStartTime: student.fixedTime, booking: student.booking }); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-[9px] font-black uppercase text-brand-primary hover:bg-brand-bg flex items-center gap-2"><Icons.Repeat /> Reagendar</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddClassModal isOpen={isAddClassModalOpen} onClose={() => setIsAddClassModalOpen(false)} students={students} onClassCreated={loadData} />
    </div>
  );
}
