
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Student, Assessment, User, EvolutionStatus } from '../types';
import { exportSheetToPdf } from '../services/pdfExport';

interface AssessmentFormViewProps {
  studentId: string;
  onBack: () => void;
  currentUser: User;
}

const Icons = {
  Back: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
  Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Lock: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
};

const InputLine = ({ label, value, onChange, placeholder = '', className = '', disabled = false, uppercase = false }: any) => (
  <div className={`flex items-baseline gap-2 border-b border-slate-200 pb-0.5 ${className} ${disabled ? 'opacity-80' : ''}`}>
    <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap uppercase tracking-tight">{label}:</span>
    <input 
      disabled={disabled}
      className={`flex-1 bg-transparent border-none outline-none text-[12px] text-slate-800 placeholder:text-slate-300 min-w-0 py-0.5 font-bold ${uppercase ? 'uppercase' : ''}`} 
      value={value || ''} 
      onChange={e => onChange(e.target.value)} 
      placeholder={placeholder}
    />
  </div>
);

const RadioCircle = ({ label, checked, onChange, disabled }: any) => (
  <div 
    className={`flex items-center gap-2 cursor-pointer select-none ${disabled ? 'opacity-80 pointer-events-none' : ''}`} 
    onClick={() => !disabled && onChange()}
  >
    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${checked ? 'bg-brand-primary border-brand-primary' : 'bg-white border-slate-300'}`}>
      {checked && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
    </div>
    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{label}</span>
  </div>
);

const CheckboxSquare = ({ label, checked, onChange, disabled }: any) => (
  <div 
    className={`flex items-center gap-2 cursor-pointer select-none ${disabled ? 'opacity-80 pointer-events-none' : ''}`} 
    onClick={() => !disabled && onChange(!checked)}
  >
    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${checked ? 'bg-brand-primary border-brand-primary' : 'bg-white border-slate-300'}`}>
      {checked && <Icons.Check />}
    </div>
    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{label}</span>
  </div>
);

const SectionHeader = ({ children }: any) => (
  <div className="bg-[#f3f4f6] px-4 py-1.5 rounded-lg mb-6 mt-10 first:mt-0 border-l-4 border-brand-primary">
    <h3 className="text-[12px] font-black text-slate-700 tracking-wider uppercase">{children}</h3>
  </div>
);

export default function AssessmentFormView({ studentId, onBack, currentUser }: AssessmentFormViewProps) {
  const [student, setStudent] = useState<Student | null>(null);
  const [data, setData] = useState<Assessment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    const students = await db.getStudents();
    const s = students.find(x => x.id === studentId);
    if (s) setStudent(s);
    
    const existing = await db.getAssessment(studentId);
    if (existing) {
      setData(existing);
    } else {
      setData({
        id: db.generateId(),
        studentId,
        assessmentDate: db.getLocalDateString(),
        prescribedBy: currentUser.name,
        prescribedByCrefito: currentUser.crefito,
        conditions: {
          diabetes: false, hypertension: false, heartProblem: false, lesion: false,
          lesionDetail: '', surgery: false, labyrinthitis: false, reflux: false
        },
        goals: {
          posture: false, stress: false, stretching: false, pain: false,
          fitness: false, strengthening: false, others: false, othersDetail: ''
        },
        status: EvolutionStatus.DRAFT,
        updatedAt: new Date().toISOString()
      });
    }
  };

  useEffect(() => { loadData(); }, [studentId]);

  const handleSave = async (final: boolean = false) => {
    if (!data || !student) return;
    if (final && !confirm("Deseja FINALIZAR esta avaliação? Ela se tornará IMUTÁVEL e não poderá mais ser editada.")) return;

    setIsSaving(true);
    try {
      const payload: Assessment = { 
        ...data, 
        status: final ? EvolutionStatus.FINALIZED : data.status,
        prescribedBy: data.prescribedBy || currentUser.name,
        prescribedByCrefito: data.prescribedByCrefito || currentUser.crefito,
        updatedAt: new Date().toISOString()
      };
      await db.saveAssessment(payload);
      await db.logAction(currentUser.id, final ? 'ASSESSMENT_FINALIZED' : 'ASSESSMENT_SAVED', 'AVALIACAO', payload.id, 
        `${final ? 'Finalização' : 'Salvamento'} de Ficha de Avaliação para ${student.name}`, student.id);
      await loadData();
      if (final) alert("Ficha de Avaliação finalizada com sucesso!");
    } catch (e) {
      alert("Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!formRef.current || !student) return;
    setIsExporting(true);
    try {
        await exportSheetToPdf(formRef.current, `Avaliacao_${student.name.replace(/\s+/g, '_')}.pdf`);
    } finally {
        setIsExporting(false);
    }
  };

  if (!student || !data) return <div className="p-20 text-center animate-pulse">Carregando...</div>;

  const isFinalized = data.status === EvolutionStatus.FINALIZED;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in pb-20 px-4 md:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <button onClick={onBack} className="flex items-center gap-3 px-5 py-2.5 bg-white shadow-premium rounded-xl border border-brand-light/30 transition-all text-[10px] font-black uppercase tracking-widest text-brand-dark hover:bg-slate-50">
          <Icons.Back /> Voltar
        </button>
        <div className="flex gap-3 w-full sm:w-auto">
          {isFinalized && (
            <div className="flex items-center gap-2 px-6 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-black text-[9px] uppercase tracking-widest shadow-sm">
               <Icons.Lock /> Ficha Finalizada (Imutável)
            </div>
          )}
          <button onClick={handleDownloadPDF} disabled={isExporting} className="flex-1 sm:flex-none px-6 py-3.5 bg-white border-2 border-brand-light rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
            <Icons.Download /> {isExporting ? 'Processando...' : 'Exportar PDF'}
          </button>
          {!isFinalized && (
            <>
              <button onClick={() => handleSave(false)} disabled={isSaving} className="flex-1 sm:flex-none px-6 py-3.5 bg-white border-2 border-brand-primary text-brand-primary font-black rounded-xl uppercase text-[10px] tracking-widest hover:bg-brand-bg transition-all">
                Salvar Rascunho
              </button>
              <button onClick={() => handleSave(true)} disabled={isSaving} className="flex-1 sm:flex-none px-8 py-3.5 bg-brand-primary text-white font-black rounded-xl shadow-glow uppercase text-[10px] tracking-widest hover:bg-brand-dark transition-all">
                Finalizar Ficha
              </button>
            </>
          )}
        </div>
      </div>

      <div ref={formRef} className="bg-white p-8 md:p-12 shadow-premium border border-slate-100 flex flex-col relative overflow-hidden print:shadow-none print:border-none" style={{ width: '100%', maxWidth: '210mm', margin: '0 auto', backgroundColor: '#FFFFFF' }}>
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none z-0">
          <img src="https://i.postimg.cc/WpmNkxhk/1000225330.jpg" alt="" className="w-96 h-96 object-contain" />
        </div>

        <header className="flex justify-between items-start gap-8 mb-12 z-10 relative">
          <div className="flex items-center gap-4">
            <img src="https://i.postimg.cc/WpmNkxhk/1000225330.jpg" alt="Logo" className="w-16 h-16 object-contain grayscale" />
            <div>
              <h1 className="text-2xl font-light text-slate-400 tracking-[0.2em] leading-none mb-1">FISIOSTUDIO</h1>
              <p className="text-[8px] font-bold text-slate-400 tracking-[0.3em] uppercase">Pilates e Fisioterapia</p>
            </div>
          </div>
          <div className="bg-slate-800 px-8 py-3 rounded-lg">
            <h2 className="text-[14px] font-black text-white tracking-[0.1em] uppercase">FICHA DE AVALIAÇÃO</h2>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 z-10 relative border-t border-slate-100 pt-6">
           <InputLine disabled={isFinalized} label="Matrícula" value={data.registrationNumber} onChange={(v: string) => setData({...data, registrationNumber: v})} className="md:w-64" />
           <div className="space-y-3 md:ml-auto md:w-full max-w-[320px]">
              <InputLine disabled={isFinalized} label="Data de avaliação" value={data.assessmentDate} onChange={(v: string) => setData({...data, assessmentDate: v})} placeholder="00/00/0000" />
              <div className="flex items-baseline gap-2 pt-1 border-b border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Prescrito por:</span>
                <span className="text-[11px] font-black text-brand-dark uppercase">
                  {data.prescribedBy || currentUser.name} — CREFITO {data.prescribedByCrefito || currentUser.crefito}
                </span>
              </div>
           </div>
        </div>

        <div className="flex-1 space-y-6 z-10 relative">
          <SectionHeader>Identificação pessoal</SectionHeader>
          <InputLine disabled={isFinalized} label="Nome" value={student.name} onChange={(v: string) => setStudent({...student, name: v})} className="w-full" uppercase />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
             <InputLine disabled={isFinalized} label="Data de nascimento" value={data.birthDate} onChange={(v: string) => setData({...data, birthDate: v})} placeholder="00/00/0000" />
             <InputLine disabled={isFinalized} label="Telefone" value={data.phone} onChange={(v: string) => setData({...data, phone: v})} placeholder="(00) 00000-0000" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
             <InputLine disabled={isFinalized} label="Profissão" value={data.profession} onChange={(v: string) => setData({...data, profession: v})} />
             <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Tipo:</span>
                <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-700 uppercase tracking-widest border border-slate-200">{student.studentType}</span>
             </div>
          </div>
          <div className="flex flex-col sm:flex-row items-baseline gap-6 mt-2">
            <div className="flex items-center gap-4">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Já conhece ou já praticou pilates?</span>
              <div className="flex gap-4">
                <RadioCircle disabled={isFinalized} label="Sim" checked={data.practicedPilates === true} onChange={() => setData({...data, practicedPilates: true})} />
                <RadioCircle disabled={isFinalized} label="Não" checked={data.practicedPilates === false} onChange={() => setData({...data, practicedPilates: false})} />
              </div>
            </div>
            <InputLine disabled={isFinalized} label="Se sim, quanto tempo" value={data.pilatesTime} onChange={(v: string) => setData({...data, pilatesTime: v})} className="flex-1" />
          </div>

          <SectionHeader>História clínica</SectionHeader>
          <div className="space-y-6">
            <div className="flex flex-col gap-1.5">
               <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Queixa principal:</span>
               <textarea 
                  disabled={isFinalized}
                  className="w-full border-b border-slate-200 bg-transparent outline-none text-[12px] text-slate-800 min-h-[40px] resize-none overflow-hidden font-bold" 
                  value={data.mainComplaint} 
                  onChange={e => setData({...data, mainComplaint: e.target.value})}
               />
            </div>
            <div className="flex flex-col gap-1.5">
               <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">HDA:</span>
               <textarea 
                  disabled={isFinalized}
                  className="w-full border-b border-slate-200 bg-transparent outline-none text-[12px] text-slate-800 min-h-[40px] resize-none overflow-hidden font-bold" 
                  value={data.hda} 
                  onChange={e => setData({...data, hda: e.target.value})}
               />
            </div>
            <div className="flex flex-col gap-1.5">
               <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">HPP:</span>
               <textarea 
                  disabled={isFinalized}
                  className="w-full border-b border-slate-200 bg-transparent outline-none text-[12px] text-slate-800 min-h-[40px] resize-none overflow-hidden font-bold" 
                  value={data.hpp} 
                  onChange={e => setData({...data, hpp: e.target.value})}
               />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-4 mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <CheckboxSquare disabled={isFinalized} label="Diabetes" checked={data.conditions.diabetes} onChange={(v: boolean) => setData({...data, conditions: {...data.conditions, diabetes: v}})} />
              <CheckboxSquare disabled={isFinalized} label="Hipertensão" checked={data.conditions.hypertension} onChange={(v: boolean) => setData({...data, conditions: {...data.conditions, hypertension: v}})} />
              <CheckboxSquare disabled={isFinalized} label="Problema cardíaco" checked={data.conditions.heartProblem} onChange={(v: boolean) => setData({...data, conditions: {...data.conditions, heartProblem: v}})} />
              <div className="flex flex-col gap-1">
                <CheckboxSquare disabled={isFinalized} label="Lesão" checked={data.conditions.lesion} onChange={(v: boolean) => setData({...data, conditions: {...data.conditions, lesion: v}})} />
                {data.conditions.lesion && <InputLine disabled={isFinalized} label="Qual" value={data.conditions.lesionDetail} onChange={(v: string) => setData({...data, conditions: {...data.conditions, lesionDetail: v}})} />}
              </div>
              <CheckboxSquare disabled={isFinalized} label="Cirurgia" checked={data.conditions.surgery} onChange={(v: boolean) => setData({...data, conditions: {...data.conditions, surgery: v}})} />
              <CheckboxSquare disabled={isFinalized} label="Labirintite" checked={data.conditions.labyrinthitis} onChange={(v: boolean) => setData({...data, conditions: {...data.conditions, labyrinthitis: v}})} />
              <CheckboxSquare disabled={isFinalized} label="Refluxo" checked={data.conditions.reflux} onChange={(v: boolean) => setData({...data, conditions: {...data.conditions, reflux: v}})} />
            </div>

            <InputLine disabled={isFinalized} label="Medicamentos" value={data.medications} onChange={(v: string) => setData({...data, medications: v})} className="w-full" />
            <InputLine disabled={isFinalized} label="Exames complementares" value={data.exams} onChange={(v: string) => setData({...data, exams: v})} className="w-full" />
            
            <div className="flex items-center gap-6 mt-2">
               <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Pratica alguma atividade física?</span>
               <div className="flex gap-4">
                  <RadioCircle disabled={isFinalized} label="Sim" checked={data.physicalActivity === true} onChange={() => setData({...data, physicalActivity: true})} />
                  <RadioCircle disabled={isFinalized} label="Não" checked={data.physicalActivity === false} onChange={() => setData({...data, physicalActivity: false})} />
               </div>
               <InputLine disabled={isFinalized} label="Qual" value={data.activityDetail} onChange={(v: string) => setData({...data, activityDetail: v})} className="flex-1" />
            </div>
          </div>

          <SectionHeader>Principais dificuldades iniciais do aluno</SectionHeader>
          <div className="relative group">
             <textarea 
               disabled={isFinalized}
               className="w-full bg-transparent outline-none text-[12px] text-slate-800 min-h-[140px] leading-[2rem] border-none resize-none overflow-hidden font-bold" 
               style={{ backgroundImage: 'linear-gradient(transparent, transparent calc(2rem - 1px), #e2e8f0 calc(2rem - 1px))', backgroundSize: '100% 2rem' }}
               value={data.initialDifficulties}
               onChange={e => setData({...data, initialDifficulties: e.target.value})}
             />
          </div>

          <SectionHeader>Objetivo do(a) aluno(a)</SectionHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
            <CheckboxSquare disabled={isFinalized} label="Melhora postural" checked={data.goals.posture} onChange={(v: boolean) => setData({...data, goals: {...data.goals, posture: v}})} />
            <CheckboxSquare disabled={isFinalized} label="Alívio do stress" checked={data.goals.stress} onChange={(v: boolean) => setData({...data, goals: {...data.goals, stress: v}})} />
            <CheckboxSquare disabled={isFinalized} label="Alongamento" checked={data.goals.stretching} onChange={(v: boolean) => setData({...data, goals: {...data.goals, stretching: v}})} />
            <CheckboxSquare disabled={isFinalized} label="Alívio da dor" checked={data.goals.pain} onChange={(v: boolean) => setData({...data, goals: {...data.goals, pain: v}})} />
            <CheckboxSquare disabled={isFinalized} label="Melhora do condicionamento físico" checked={data.goals.fitness} onChange={(v: boolean) => setData({...data, goals: {...data.goals, fitness: v}})} />
            <CheckboxSquare disabled={isFinalized} label="Fortalecimento muscular" checked={data.goals.strengthening} onChange={(v: boolean) => setData({...data, goals: {...data.goals, strengthening: v}})} />
            <div className="flex flex-col md:col-span-3">
              <CheckboxSquare disabled={isFinalized} label="Outros" checked={data.goals.others} onChange={(v: boolean) => setData({...data, goals: {...data.goals, others: v}})} />
              {data.goals.others && <textarea disabled={isFinalized} value={data.goals.othersDetail} onChange={e => setData({...data, goals: {...data.goals, othersDetail: e.target.value}})} className="w-full border-b border-slate-200 mt-2 bg-transparent text-[11px] font-bold py-1 outline-none resize-none" placeholder="Especifique..." />}
            </div>
          </div>
        </div>

        <footer className="mt-20 flex justify-between items-center text-[7px] text-slate-300 font-bold tracking-[0.2em] z-10 relative border-t border-slate-50 pt-4">
           <span>FISIOSTUDIO • EXCELÊNCIA EM PILATES CLÍNICO</span>
           <span>Página 1 de 1</span>
        </footer>
      </div>
    </div>
  );
}
