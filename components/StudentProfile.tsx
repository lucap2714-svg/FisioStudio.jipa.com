
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Student, User, AuditLog, Attachment } from '../types';

interface StudentProfileProps {
  studentId: string;
  onBack: () => void;
  currentUser: User;
}

const Icons = {
  Back: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
  PDF: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
};

export default function StudentProfile({ studentId, onBack, currentUser }: StudentProfileProps) {
  const [student, setStudent] = useState<Student | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'finance' | 'history'>('finance');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [students, allLogs] = await Promise.all([db.getStudents(), db.getLogs()]);
      setStudent(students.find(x => x.id === studentId) || null);
      setLogs(allLogs.filter(l => l.studentId === studentId));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [studentId]);

  if (loading) return <div className="p-20 text-center animate-pulse">Carregando...</div>;
  if (!student) return null;

  return (
    <div className="space-y-6 md:space-y-10 animate-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4 md:px-0">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-3 bg-white shadow-premium rounded-2xl text-brand-dark"><Icons.Back /></button>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">{student.name}</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-dark opacity-60">Ficha do Aluno</p>
          </div>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-brand-light/30 shadow-premium">
            <button onClick={() => setActiveTab('finance')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'finance' ? 'bg-brand-primary text-white' : 'text-slate-400'}`}>Financeiro</button>
            <button onClick={() => setActiveTab('history')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'history' ? 'bg-brand-primary text-white' : 'text-slate-400'}`}>Logs</button>
        </div>
      </div>
      
      <div className="mx-4 md:mx-0 bg-white p-10 rounded-[3rem] shadow-premium">
         {activeTab === 'finance' ? (
           <div className="space-y-6">
              <p className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Resumo de Pagamento</p>
              <div className="text-2xl font-black text-brand-primary uppercase">{student.billingStatus}</div>
           </div>
         ) : (
           <div className="space-y-4">
              {logs.map(l => <div key={l.id} className="p-4 bg-brand-bg/20 rounded-xl text-[10px] font-bold">{new Date(l.timestamp).toLocaleString('pt-BR')}: {l.details}</div>)}
           </div>
         )}
      </div>
    </div>
  );
}
