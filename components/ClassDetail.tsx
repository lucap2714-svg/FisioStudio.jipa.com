
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import { ClassSession, Booking, Student, AttendanceStatus, User } from '../types';

// Standalone Icon components to prevent JSX parsing issues and improve clarity
const Icons = {
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  Undo: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>,
  Star: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
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

interface StudentCardProps {
  b: Booking;
  students: Student[];
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onOpenStudent: (id: string) => void;
  handlePromote: (id: string) => void;
  markPresenceManual: (id: string) => void;
  setJustifyingBookingId: (id: string | null) => void;
  removeBooking: (id: string) => void;
}

const StudentCard: React.FC<StudentCardProps> = ({ 
  b, 
  students, 
  openMenuId, 
  setOpenMenuId, 
  onOpenStudent, 
  handlePromote, 
  markPresenceManual, 
  setJustifyingBookingId, 
  removeBooking 
}) => {
  const s = students.find(x => x.id === b.studentId);
  if (!s) return null;
  
  return (
    <div className="p-6 md:p-8 flex items-center justify-between group relative">
      <div className="flex items-center gap-4 md:gap-6">
        <div className="relative">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-brand-bg rounded-2xl flex items-center justify-center font-black text-lg md:text-xl text-brand-dark group-hover:bg-brand-primary group-hover:text-white transition-all shadow-inner">
            {s.name.charAt(0)}
          </div>
          <div className={`absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full border-4 border-white shadow-sm ${
            b.status === 'PRESENT' ? 'bg-emerald-500' : b.status === 'ABSENT' ? 'bg-red-500' : 
            b.status === 'WAITLISTED' ? 'bg-amber-400 border-dashed animate-pulse' : 'bg-amber-400'
          }`}></div>
        </div>
        <div className="min-w-0">
          <h4 className="font-black text-slate-800 text-sm md:text-lg leading-tight truncate">{s.name}</h4>
          <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{s.phone || 'Sem contato'}</p>
          {b.status === 'WAITLISTED' && <p className="text-[8px] font-black text-amber-600 uppercase mt-1">EM LISTA DE ESPERA</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 relative">
         <div className={`hidden sm:block px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border tracking-widest ${
           b.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
           b.status === 'ABSENT' ? 'bg-red-50 text-red-700 border-red-100' : 
           b.status === 'WAITLISTED' ? 'bg-amber-50 text-amber-700 border-amber-200 border-dashed' :
           'bg-amber-50 text-amber-600 border-amber-100'
         }`}>
           {b.status === 'AWAITING' ? 'Confirmado' : b.status === 'PRESENT' ? 'Presente' : b.status === 'ABSENT' ? 'Ausente' : 'Espera'}
         </div>
         <button onClick={() => setOpenMenuId(openMenuId === b.id ? null : b.id)} className={`p-2.5 rounded-xl transition-all ${openMenuId === b.id ? 'bg-brand-primary text-white' : 'text-slate-300 hover:text-brand-primary'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01" /></svg>
         </button>
         {openMenuId === b.id && (
           <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border z-[200] py-2 animate-in zoom-in-95 origin-top-right">
             <button onClick={() => { onOpenStudent(s.id); setOpenMenuId(null); }} className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-brand-bg flex items-center gap-3 transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 7 20 7"/></svg>
               Ficha de Avaliação
             </button>
             <div className="h-px bg-brand-bg my-1"></div>
             {b.status === 'WAITLISTED' ? (
               <button onClick={() => handlePromote(b.id)} className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50 flex items-center gap-3 transition-colors">
                 <Icons.Star /> Promover Confirmado
               </button>
             ) : (
               <button onClick={() => markPresenceManual(b.id)} className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 flex items-center gap-3 transition-colors">
                 <Icons.Check /> Confirmar Presença
               </button>
             )}
             <button onClick={() => { setJustifyingBookingId(b.id); setOpenMenuId(null); }} className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
               <Icons.X /> Justificar Falta
             </button>
             <div className="h-px bg-brand-bg my-1"></div>
             <button onClick={() => removeBooking(b.id)} className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center gap-3 transition-colors">
               <Icons.Trash /> Desmarcar Aula
             </button>
           </div>
         )}
      </div>
    </div>
  )
}

interface ClassDetailProps {
  classId: string;
  onBack: () => void;
  onOpenStudent: (id: string) => void;
  onShowQR: (data: { id: string, date: string, time: string }) => void;
  currentUser: User;
}

export default function ClassDetail({ classId, onBack, onOpenStudent, onShowQR, currentUser }: ClassDetailProps) {
  const [classSession, setClassSession] = useState<ClassSession | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [justifyingBookingId, setJustifyingBookingId] = useState<string | null>(null);
  const [justificationText, setJustificationText] = useState('');
  const [loading, setLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [classes, allBookings, allStudents] = await Promise.all([
        db.getClasses(), db.getBookings(), db.getStudents()
      ]);
      const c = classes.find(x => x.id === classId);
      if (c) setClassSession(c);
      setBookings(allBookings.filter(b => b.classId === classId));
      setStudents(allStudents);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsAddingStudent(false);
            setJustifyingBookingId(null);
        }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const markPresenceManual = async (bookingId: string) => {
    try {
      // Fix: markPresent only accepts 2 arguments (id, method)
      await db.markPresent(bookingId, 'MANUAL');
      setOpenMenuId(null);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePromote = async (bookingId: string) => {
    try {
      await db.promoteStudentManual(bookingId);
      setOpenMenuId(null);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const submitJustification = async () => {
    if (!justificationText.trim()) return alert("Justificativa obrigatória.");
    if (justifyingBookingId) {
      await db.markAbsent(justifyingBookingId, justificationText, currentUser.id);
      setJustifyingBookingId(null);
      setJustificationText('');
      await loadData();
    }
  };

  const removeBooking = async (id: string) => {
    if (!confirm("Remover aluno da aula?")) return;
    await db.deleteBooking(id);
    await loadData();
  };

  const addStudentToClass = async (student: Student) => {
    if (!classSession) return;
    
    const confirmedCount = bookings.filter(b => b.status !== AttendanceStatus.WAITLISTED && b.status !== AttendanceStatus.CANCELLED).length;
    let status = AttendanceStatus.AWAITING;

    if (confirmedCount >= classSession.capacity) {
      if (!confirm("Esta turma já está lotada! Deseja adicionar o aluno à Lista de Espera?")) {
        return;
      }
      status = AttendanceStatus.WAITLISTED;
    }
    
    setLoading(true);
    try {
      const newBooking: Booking = {
        id: db.generateId(),
        classId: classId,
        studentId: student.id,
        status,
        createdAt: new Date().toISOString()
      };
      
      await db.saveBooking(newBooking);
      await db.logAction(currentUser.id, 'BOOKING_CREATED', 'SESSAO', newBooking.id, `Agendamento (${status}): ${student.name}`, student.id);
      
      await loadData();
      setIsAddingStudent(false);
      setStudentSearch('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !classSession) return <div className="p-20 text-center opacity-40 animate-pulse font-black uppercase tracking-widest text-slate-400">Sincronizando Dados...</div>;
  if (!classSession) return <div className="p-20 text-center">Turma não encontrada.</div>;

  const confirmedBookings = bookings.filter(b => b.status !== AttendanceStatus.WAITLISTED && b.status !== AttendanceStatus.CANCELLED);
  const waitlistBookings = bookings.filter(b => b.status === AttendanceStatus.WAITLISTED).sort((a,b) => a.createdAt.localeCompare(b.createdAt));

  const availableStudents = students.filter(s => 
    s.active && 
    !bookings.some(b => b.studentId === s.id && b.status !== AttendanceStatus.CANCELLED) &&
    (studentSearch === '' || s.name.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in relative pb-20">
      {openMenuId && <div className="fixed inset-0 z-[150]" onClick={() => setOpenMenuId(null)}></div>}
      
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 px-4 md:px-0">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-3 bg-white shadow-premium rounded-2xl text-brand-dark transition-all hover:scale-105 hover:bg-slate-50"><Icons.Undo /></button>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter">Turma {classSession.startTime}</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-dark opacity-60">
              {new Date(classSession.date + 'T12:00:00').toLocaleDateString('pt-BR', { dateStyle: 'full' })}
            </p>
          </div>
        </div>
        <button onClick={() => setIsAddingStudent(true)} className="w-full sm:w-auto bg-brand-primary text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-glow flex items-center justify-center gap-2 hover:bg-brand-dark transition-all active:scale-95">
          <Icons.Plus /> Agendar Aluno
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-4 md:px-0 mb-8">
        <div className="bg-white p-8 rounded-3xl shadow-premium border border-brand-light/20">
          <p className="text-[9px] font-black uppercase text-brand-dark tracking-widest mb-2">Ocupação</p>
          <p className="text-3xl font-black text-slate-800">{confirmedBookings.length} / {classSession.capacity}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-premium border border-brand-light/20">
          <p className="text-[9px] font-black uppercase text-emerald-500 tracking-widest mb-2">Presentes</p>
          <p className="text-3xl font-black text-emerald-600">{bookings.filter(b => b.status === 'PRESENT').length}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-premium border border-brand-light/20">
          <p className="text-[9px] font-black uppercase text-amber-500 tracking-widest mb-2">Em Espera</p>
          <p className="text-3xl font-black text-amber-600">{waitlistBookings.length}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-premium border border-brand-light/20">
          <p className="text-[9px] font-black uppercase text-red-500 tracking-widest mb-2">Faltas</p>
          <p className="text-3xl font-black text-red-600">{bookings.filter(b => b.status === 'ABSENT').length}</p>
        </div>
      </div>

      <div className="space-y-8 mx-4 md:mx-0">
        <div className="bg-white rounded-[2.5rem] shadow-premium border border-brand-light/20 overflow-visible">
          <div className="p-6 border-b border-brand-bg flex items-center gap-3">
             <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
             <h3 className="font-black text-xs uppercase tracking-widest text-slate-800">Alunos Confirmados</h3>
          </div>
          <div className="divide-y divide-brand-bg">
            {confirmedBookings.length === 0 ? (
              <div className="p-16 text-center text-slate-300 font-black uppercase tracking-widest text-[10px]">Nenhum aluno confirmado.</div>
            ) : confirmedBookings.map(b => (
              <StudentCard 
                key={b.id} 
                b={b} 
                students={students} 
                openMenuId={openMenuId} 
                setOpenMenuId={setOpenMenuId}
                onOpenStudent={onOpenStudent}
                handlePromote={handlePromote}
                markPresenceManual={markPresenceManual}
                setJustifyingBookingId={setJustifyingBookingId}
                removeBooking={removeBooking}
              />
            ))}
          </div>
        </div>

        <div className="bg-slate-50/50 rounded-[2.5rem] shadow-sm border border-brand-light/20 overflow-visible">
          <div className="p-6 border-b border-brand-bg flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-800">Lista de Espera (Fila)</h3>
             </div>
             <span className="text-[9px] font-black text-slate-400 uppercase">Ordem de Chegada</span>
          </div>
          <div className="divide-y divide-brand-bg">
            {waitlistBookings.length === 0 ? (
              <div className="p-16 text-center text-slate-300 font-black uppercase tracking-widest text-[10px]">Lista de espera vazia.</div>
            ) : waitlistBookings.map(b => (
              <StudentCard 
                key={b.id} 
                b={b} 
                students={students} 
                openMenuId={openMenuId} 
                setOpenMenuId={setOpenMenuId}
                onOpenStudent={onOpenStudent}
                handlePromote={handlePromote}
                markPresenceManual={markPresenceManual}
                setJustifyingBookingId={setJustifyingBookingId}
                removeBooking={removeBooking}
              />
            ))}
          </div>
        </div>
      </div>

      {isAddingStudent && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in" onClick={() => setIsAddingStudent(false)}>
           <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-10 flex flex-col max-h-[85vh] relative" onClick={e => e.stopPropagation()}>
              <ModalCloseButton onClick={() => setIsAddingStudent(false)} />
              <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase mb-6 pr-12">Agendar Aluno na Turma</h3>
              <div className="relative mb-6">
                <input 
                  type="text" 
                  placeholder="Pesquisar por nome..." 
                  className="w-full px-6 py-4 bg-brand-bg/50 border-2 border-brand-light/30 rounded-2xl outline-none focus:border-brand-primary font-bold"
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                {availableStudents.length === 0 ? (
                  <p className="text-center py-10 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum aluno disponível para agendamento.</p>
                ) : availableStudents.map(s => (
                  <button key={s.id} onClick={() => addStudentToClass(s)} className="w-full p-4 rounded-2xl border-2 border-brand-bg hover:border-brand-primary transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-brand-bg rounded-xl flex items-center justify-center font-black text-brand-dark group-hover:bg-brand-primary group-hover:text-white transition-all">
                        {s.name.charAt(0)}
                       </div>
                       <div className="text-left">
                         <p className="font-black text-slate-700 text-sm leading-none mb-1">{s.name}</p>
                         <p className="text-[9px] font-black text-brand-dark uppercase tracking-widest">{s.studentType}</p>
                       </div>
                    </div>
                    <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">+ Selecionar</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setIsAddingStudent(false)} className="mt-8 w-full py-4 bg-slate-100 hover:bg-slate-200 transition-colors rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
           </div>
        </div>
      )}

      {justifyingBookingId && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in" onClick={() => setJustifyingBookingId(null)}>
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 flex flex-col relative" onClick={e => e.stopPropagation()}>
              <ModalCloseButton onClick={() => setJustifyingBookingId(null)} />
              <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase mb-2 pr-12">Justificar Falta</h3>
              <p className="text-[10px] font-black text-brand-dark uppercase tracking-widest mb-6">Por que o aluno não pôde comparecer?</p>
              
              <textarea 
                className="w-full p-6 bg-brand-bg/30 border-2 border-brand-light/30 rounded-2xl outline-none focus:border-red-400 font-bold text-sm min-h-[120px]"
                placeholder="Ex: Aluno doente, viagem de trabalho, etc."
                value={justificationText}
                onChange={e => setJustificationText(e.target.value)}
                autoFocus
              />
              
              <div className="flex gap-4 mt-8">
                <button onClick={() => setJustifyingBookingId(null)} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors">Cancelar</button>
                <button onClick={submitJustification} className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-glow transition-all active:scale-95">Confirmar Falta</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
