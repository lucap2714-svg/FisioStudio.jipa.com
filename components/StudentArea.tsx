
import React, { useState, useEffect } from 'react';
import { User, Booking, AttendanceStatus, ClassSession } from '../types';
import { db } from '../services/db';

interface StudentAreaProps {
  user: User;
  onLogout: () => void;
}

const Icons = {
  Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#a4b6c1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
};

const StudentArea: React.FC<StudentAreaProps> = ({ user, onLogout }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [nextClassReminder, setNextClassReminder] = useState<any>(null);

  useEffect(() => {
    // FIX: Using async function to await DB promises
    const loadData = async () => {
      const allBookings = await db.getBookings();
      const studentBookings = allBookings.filter(b => b.studentId === user.id);
      
      const allWebClasses = await db.getClasses();
      setBookings(studentBookings);
      setClasses(allWebClasses);

      const now = new Date();
      const futureBookings = studentBookings
        .map(b => ({ booking: b, class: allWebClasses.find(c => c.id === b.classId) }))
        .filter(x => x.class && new Date(`${x.class.date}T${x.class.startTime}`) > now && x.booking.status === AttendanceStatus.AWAITING)
        .sort((a, b) => new Date(`${a.class!.date}T${a.class!.startTime}`).getTime() - new Date(`${b.class!.date}T${b.class!.startTime}`).getTime());

      if (futureBookings.length > 0) {
        setNextClassReminder(futureBookings[0]);
      }
    };
    loadData();
  }, [user.id]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-brand-bg flex flex-col animate-in">
      <header className="bg-brand-primary p-10 text-white rounded-b-[3rem] shadow-2xl border-b border-brand-dark/20 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10">
           <img src="https://i.postimg.cc/WpmNkxhk/1000225330.jpg" alt="Background Logo" className="w-40 h-40 object-cover grayscale rounded-full" />
        </div>

        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-0 rounded-xl backdrop-blur-md w-10 h-10 overflow-hidden flex items-center justify-center">
              <img src="https://i.postimg.cc/WpmNkxhk/1000225330.jpg" alt="FisioStudio Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl font-black tracking-tight uppercase">FisioStudio</h1>
          </div>
          <button onClick={onLogout} className="text-xs font-black uppercase tracking-widest px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all">Sair</button>
        </div>

        <div className="relative z-10">
          <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">Bem-vindo(a),</p>
          <h2 className="text-3xl font-black tracking-tight">{user.name.split(' ')[0]}</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mt-1">{user.email || 'Perfil Aluno'}</p>
        </div>
      </header>

      <main className="p-6 sm:p-10 space-y-10 flex-1 -mt-6">
        {nextClassReminder && (
          <div className="bg-slate-800 text-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col gap-4 animate-slide-up relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform"></div>
             
             <div className="flex items-center gap-4">
               <div className="bg-brand-primary/20 p-3 rounded-2xl text-brand-primary">
                 <Icons.Clock />
               </div>
               <div>
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Lembrete de Aula</p>
                 <p className="text-lg font-black">{new Date(nextClassReminder.class.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
               </div>
             </div>
             
             <div className="pt-2">
               <p className="text-2xl font-black text-brand-primary">{nextClassReminder.class.startTime}</p>
               <p className="text-[10px] opacity-60 font-bold uppercase tracking-widest mt-1 leading-relaxed">Confirme sua presença no tablet ao chegar!</p>
             </div>
          </div>
        )}

        <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-brand-light/30">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-8 flex items-center gap-3">
             <span className="w-1 h-6 bg-brand-primary rounded-full"></span>
             Meus Agendamentos
          </h3>
          <div className="space-y-4">
            {bookings.length === 0 && (
              <div className="text-center py-20 px-10">
                 <span className="mb-4 block"><Icons.Calendar /></span>
                 <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] leading-relaxed">Nenhuma aula programada no momento.</p>
              </div>
            )}
            {bookings.map(b => {
              // FIX: Use the classes state for lookup
              const c = classes.find(x => x.id === b.classId);
              if (!c) return null;
              
              return (
                <div key={b.id} className="p-6 rounded-[1.5rem] border-2 border-brand-bg bg-brand-bg/10 flex justify-between items-center group hover:border-brand-primary/30 transition-all">
                  <div>
                    <p className="font-black text-slate-800 text-sm uppercase tracking-tight">{new Date(c.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', day: 'numeric' })}</p>
                    <p className="text-xs text-brand-dark font-black tracking-widest">{c.startTime}</p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
                    b.status === AttendanceStatus.PRESENT ? 'bg-emerald-500 text-white' : 'bg-white text-brand-dark'
                  }`}>
                    {b.status === AttendanceStatus.PRESENT ? 'Validado' : 'Agendado'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      
      <footer className="p-10 text-center text-slate-300 text-[8px] font-black uppercase tracking-[0.4em]">
        FisioStudio • Excelência no Atendimento
      </footer>
    </div>
  );
};

export default StudentArea;
