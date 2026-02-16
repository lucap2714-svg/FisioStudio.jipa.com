
import React, { useState, useRef } from 'react';
import { Evolution, EvolutionStatus } from '../types';

interface EvolutionFormProps {
  evolution: Evolution;
  studentName: string;
  onSave: (e: Evolution) => void;
  onCancel: () => void;
}

export default function EvolutionForm({ evolution, studentName, onSave, onCancel }: EvolutionFormProps) {
  // Prioridade 4.2: Estado local isolado para evitar perda de foco por re-render do pai
  const [content, setContent] = useState(evolution.content);

  const handleSaveAction = (final: boolean) => {
    if (final && !confirm("Deseja FINALIZAR este registro? Ele se tornará imutável.")) return;
    
    onSave({
      ...evolution,
      content,
      status: final ? EvolutionStatus.FINALIZED : EvolutionStatus.DRAFT,
      finalizedAt: final ? new Date().toISOString() : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-8">
      <div className="bg-brand-bg w-full max-w-5xl h-full max-h-[95vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-white animate-in">
        <header className="px-10 py-8 border-b-2 border-brand-light/30 bg-white/50 flex justify-between items-center">
          <div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Ficha de Evolução</h3>
            <p className="text-[11px] text-brand-dark font-black uppercase tracking-widest mt-1">Paciente: {studentName}</p>
          </div>
          <button onClick={onCancel} className="p-3 bg-white hover:bg-brand-bg rounded-2xl transition-all border border-brand-light/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="space-y-3">
              <label className="block text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Queixa / Avaliação do Dia</label>
              <textarea 
                value={content.complaint}
                onChange={e => setContent({...content, complaint: e.target.value})}
                className="w-full px-6 py-5 border-2 border-brand-light/50 rounded-3xl outline-none focus:border-brand-primary min-h-[150px] bg-white font-bold text-slate-700"
                placeholder="Como o paciente chegou hoje?"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Intercorrências</label>
              <textarea 
                value={content.intercurrences}
                onChange={e => setContent({...content, intercurrences: e.target.value})}
                className="w-full px-6 py-5 border-2 border-brand-light/50 rounded-3xl outline-none focus:border-brand-primary min-h-[150px] bg-white font-bold text-slate-700"
                placeholder="Ex: Dor, limitação..."
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Protocolo de Exercícios (Conduta)</label>
            <textarea 
              value={content.exercises}
              onChange={e => setContent({...content, exercises: e.target.value})}
              className="w-full px-8 py-6 border-2 border-brand-light/50 rounded-[2.5rem] outline-none focus:border-brand-primary min-h-[250px] bg-white font-bold text-slate-700"
              placeholder="Descreva detalhadamente..."
            />
          </div>
        </main>

        <footer className="px-10 py-8 bg-white/50 border-t-2 border-brand-light/30 flex flex-col sm:flex-row justify-between items-center gap-6">
          <p className="text-[10px] text-brand-dark/60 font-black uppercase">Registros auditados e imutáveis.</p>
          <div className="flex gap-4 w-full sm:w-auto">
            <button onClick={() => handleSaveAction(false)} className="flex-1 sm:flex-none px-8 py-4 bg-white border-2 border-brand-light text-brand-dark font-black rounded-2xl text-[10px] uppercase">Rascunho</button>
            <button onClick={() => handleSaveAction(true)} className="flex-1 sm:flex-none px-12 py-4 bg-brand-primary text-white font-black rounded-2xl shadow-glow text-[10px] uppercase">Finalizar Registro</button>
          </div>
        </footer>
      </div>
    </div>
  );
}
