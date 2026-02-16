
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { AuditLog, Booking, Student, BillingEvent } from '../types';

const Icons = {
  Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Table: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  PDF: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Finance: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
};

const ReportsView: React.FC = () => {
  const [stats, setStats] = useState({ totalPresences: 0, totalAwaiting: 0, totalAbsences: 0 });
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [billingEvents, setBillingEvents] = useState<BillingEvent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [activeReportTab, setActiveReportTab] = useState<'audit' | 'finance' | 'export'>('audit');
  const [exportSuccess, setExportSuccess] = useState(false);

  useEffect(() => {
    const loadReportData = async () => {
      setLoading(true);
      try {
        const [allBookings, allLogs, allBilling, allStudents] = await Promise.all([
          db.getBookings(),
          db.getLogs(),
          db.getBillingEvents(),
          db.getStudents()
        ]);
        setStats({
          totalPresences: allBookings.filter(b => b.status === 'PRESENT').length,
          totalAwaiting: allBookings.filter(b => b.status === 'AWAITING').length,
          totalAbsences: allBookings.filter(b => b.status === 'ABSENT').length
        });
        setLogs(allLogs);
        setBillingEvents(allBilling);
        setStudents(allStudents);
      } catch (e) {
        console.error("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };
    loadReportData();
  }, []);

  const financialSummary = useMemo(() => {
    const currentMonth = db.getCurrentMonthString();
    const fixo = billingEvents.filter(e => e.type === 'MENSALIDADE' && e.referenceMonth === currentMonth && e.status === 'CONFIRMADO').reduce((a,c) => a + c.amount, 0);
    const avulso = billingEvents.filter(e => e.type === 'PACOTE_AVULSO' && e.status === 'CONFIRMADO').reduce((a,c) => a + c.amount, 0);
    return { fixo, avulso, total: fixo + avulso };
  }, [billingEvents]);

  const downloadFile = (data: any, name: string, type: 'csv' | 'json') => {
    let fileBlob: globalThis.Blob;
    if (type === 'json') {
      fileBlob = new globalThis.Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    } else {
      const items = Array.isArray(data) ? data : [data];
      if (items.length === 0) return;
      const header = Object.keys(items[0]);
      const csv = [
        header.join(','),
        ...items.map(row => header.map(fieldName => JSON.stringify(row[fieldName as keyof typeof row] ?? '')).join(','))
      ].join('\r\n');
      fileBlob = new globalThis.Blob([csv], { type: 'text/csv' });
    }
    const url = URL.createObjectURL(fileBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}_${new Date().toISOString().split('T')[0]}.${type}`;
    a.click();
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handleExportAll = async (type: 'csv' | 'json') => {
    const data = await db.getExportData();
    if (type === 'json') downloadFile(data, 'FisioStudio_Backup', 'json');
    else {
      downloadFile(data.students, 'FisioStudio_Alunos', 'csv');
      downloadFile(data.billingEvents, 'FisioStudio_Financeiro', 'csv');
      downloadFile(data.logs, 'FisioStudio_Logs', 'csv');
    }
  };

  return (
    <div className={`space-y-6 md:space-y-10 animate-in pb-20 ${loading ? 'opacity-50' : ''}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 px-4 md:px-0">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tighter uppercase">Relatórios</h2>
          <p className="text-[10px] font-black uppercase text-brand-dark tracking-widest mt-1">Gestão Financeira e Logs</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-brand-light/30 shadow-premium">
          <button onClick={() => setActiveReportTab('audit')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReportTab === 'audit' ? 'bg-brand-primary text-white shadow-glow' : 'text-slate-400'}`}>Logs</button>
          <button onClick={() => setActiveReportTab('finance')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReportTab === 'finance' ? 'bg-brand-primary text-white shadow-glow' : 'text-slate-400'}`}>Financeiro</button>
          <button onClick={() => setActiveReportTab('export')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReportTab === 'export' ? 'bg-brand-primary text-white shadow-glow' : 'text-slate-400'}`}>Exportar</button>
        </div>
      </div>

      {activeReportTab === 'export' ? (
        <div className="max-w-4xl space-y-10 animate-in px-4 md:px-0 mx-auto">
          <div className="bg-white rounded-[3rem] shadow-premium border border-brand-light/30 p-8 md:p-12 space-y-10">
            <header className="space-y-2">
               <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Backup de Dados</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Extraia os dados do sistema para segurança externa.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="p-8 bg-brand-bg/20 rounded-[2.5rem] border border-white space-y-6">
                  <div className="flex items-center gap-4 text-brand-primary"><Icons.PDF /><h4 className="font-black text-xs uppercase text-slate-700">Formato JSON</h4></div>
                  <button onClick={() => handleExportAll('json')} className="w-full bg-slate-800 text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"><Icons.Download /> Baixar JSON</button>
               </div>
               <div className="p-8 bg-brand-bg/20 rounded-[2.5rem] border border-white space-y-6">
                  <div className="flex items-center gap-4 text-brand-primary"><Icons.Table /><h4 className="font-black text-xs uppercase text-slate-700">Formato CSV (Excel)</h4></div>
                  <button onClick={() => handleExportAll('csv')} className="w-full bg-brand-primary text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"><Icons.Download /> Baixar CSVs</button>
               </div>
            </div>
          </div>
        </div>
      ) : activeReportTab === 'finance' ? (
        <div className="space-y-8 animate-in px-4 md:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-1 bg-white rounded-[2.5rem] shadow-premium border border-brand-light/30 p-8 flex flex-col justify-center text-center">
                <p className="text-[10px] font-black uppercase text-brand-dark tracking-widest mb-4">Total Faturado</p>
                <p className="text-4xl md:text-5xl font-black text-brand-primary tracking-tighter">R$ {financialSummary.total.toLocaleString('pt-BR')}</p>
             </div>
             <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-premium border border-brand-light/30 p-8 flex flex-col md:flex-row gap-8 justify-around">
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Mensalidades</p>
                  <p className="text-3xl font-black text-slate-800 tracking-tight">R$ {financialSummary.fixo.toLocaleString('pt-BR')}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Avulsos</p>
                  <p className="text-3xl font-black text-slate-800 tracking-tight">R$ {financialSummary.avulso.toLocaleString('pt-BR')}</p>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-[3rem] shadow-premium border border-brand-light/30 overflow-hidden">
            <div className="px-10 py-8 bg-brand-bg/10 border-b border-brand-bg">
              <h3 className="font-black text-xs uppercase text-slate-800 flex items-center gap-3">
                 <Icons.Finance /> Transações
              </h3>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-bg/50 border-b border-brand-bg">
                    <th className="px-10 py-5 text-[9px] font-black uppercase text-brand-dark">Data</th>
                    <th className="px-10 py-5 text-[9px] font-black uppercase text-brand-dark">Aluno</th>
                    <th className="px-10 py-5 text-[9px] font-black uppercase text-brand-dark">Tipo</th>
                    <th className="px-10 py-5 text-[9px] font-black uppercase text-brand-dark">Valor</th>
                    <th className="px-10 py-5 text-[9px] font-black uppercase text-brand-dark">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-bg">
                  {billingEvents.map(event => (
                    <tr key={event.id} className="hover:bg-brand-bg/10 transition-colors">
                      <td className="px-10 py-5 text-[10px] font-bold text-slate-500">{new Date(event.timestamp).toLocaleDateString('pt-BR')}</td>
                      <td className="px-10 py-5 text-[10px] font-black text-slate-800">{students.find(s => s.id === event.studentId)?.name}</td>
                      <td className="px-10 py-5 text-[10px] font-bold text-brand-dark uppercase">{event.type}</td>
                      <td className="px-10 py-5 text-[10px] font-black text-slate-800">R$ {event.amount}</td>
                      <td className="px-10 py-5">
                         <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded text-[8px] font-black uppercase">Confirmado</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] shadow-premium border border-brand-light/30 overflow-hidden mx-4 md:mx-0">
          <div className="px-10 py-8 bg-brand-bg/10 border-b border-brand-bg flex justify-between items-center">
            <h3 className="font-black text-xs uppercase text-slate-800 flex items-center gap-3">
               <Icons.Table /> Logs de Sistema
            </h3>
            <input 
              type="text" 
              placeholder="Filtrar logs..." 
              className="bg-white border border-brand-light/50 rounded-xl px-5 py-2 text-xs outline-none" 
              value={filter} 
              onChange={e => setFilter(e.target.value)} 
            />
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
               <tbody className="divide-y divide-brand-bg">
                 {logs.filter(l => l.details.toLowerCase().includes(filter.toLowerCase())).map(log => (
                   <tr key={log.id} className="hover:bg-brand-bg/10 transition-colors">
                     <td className="px-10 py-5 text-[10px] font-bold text-slate-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                     <td className="px-10 py-5 text-[10px] font-black text-slate-700 leading-relaxed">{log.details}</td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsView;
