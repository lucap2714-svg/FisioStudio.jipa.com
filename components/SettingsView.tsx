
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { AppSettings, BackupRecord, Student, RestoreResult } from '../types';
import { INITIAL_SETTINGS } from '../constants';

const Icons = {
  Backup: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8"/><path d="m16 6-4 4-4-4"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 18h.01"/><path d="M10 18h.01"/></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Alert: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>,
  Restore: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
};

export const RESTORE_PAYLOAD = [{"name":"Rafaela Camila R da Silva","phone":"92 993215720","studentType":"Wellhub","weeklySchedule":[{"day":"Terça","time":"16:00"},{"day":"Quinta","time":"16:00"}]},{"name":"Ana Carolina Mendes","phone":"69993894785","studentType":"Fixo","weeklySchedule":[{"day":"Quarta","time":"16:00"},{"day":"Terça","time":"16:00"},{"day":"Quinta","time":"16:00"}]},{"name":"Renato Antonio","phone":"35 988327096","studentType":"Fixo","weeklySchedule":[{"day":"Terça","time":"18:00"},{"day":"Quinta","time":"18:00"}]},{"name":"Katrielly dos Reis","phone":"69 999826539","studentType":"Fixo","weeklySchedule":[{"day":"Terça","time":"19:00"},{"day":"Segunda","time":"19:00"},{"day":"Quinta","time":"19:00"}]},{"name":"Mario Marcos da Silva","phone":"69 99304 9197","studentType":"Fixo","weeklySchedule":[]},{"name":"Pamela Rodrigues","phone":"69 99225 0273","studentType":"Fixo","weeklySchedule":[]},{"name":"Claudenice Adrisen","phone":"69 99218 7872","studentType":"Fixo","weeklySchedule":[]},{"name":"Elizabet Braga Nunes","phone":"69 99239 4013","studentType":"Wellhub","weeklySchedule":[{"day":"Terça","time":"18:00"},{"day":"Quinta","time":"18:00"}]},{"name":"Raiza Emanuelle Ramalho","phone":"69 99236-6293","studentType":"Wellhub","weeklySchedule":[{"day":"Terça","time":"17:00"},{"day":"Quinta","time":"17:00"}]},{"name":"Izabel Ferreira de Jesus","phone":"69 99945 2049","studentType":"Avulso","weeklySchedule":[]},{"name":"Elessandra Souza Nascimento","phone":"69 99919 1813","studentType":"Fixo","weeklySchedule":[]},{"name":"Vanuza Alvez","phone":"69 99351-5622","studentType":"Fixo","weeklySchedule":[]},{"name":"Elizabete Ladislau","phone":"69 99244-7672","studentType":"Fixo","weeklySchedule":[]},{"name":"Giovanna Rufini de Andrade","phone":"69 99224 2760","studentType":"Fixo","weeklySchedule":[]},{"name":"Catia Augusta","phone":"69 999711771","studentType":"Wellhub","weeklySchedule":[{"day":"Terça","time":"18:00"},{"day":"Quinta","time":"18:00"}]},{"name":"ester alvez de souza","phone":"69 99608-9391","studentType":"Wellhub","weeklySchedule":[]},{"name":"barbara rosa","phone":"31 99779-1112","studentType":"Wellhub","weeklySchedule":[{"day":"Segunda","time":"17:00"},{"day":"Quarta","time":"17:00"}]},{"name":"andre luiz","phone":"69 99229-8320","studentType":"Fixo","weeklySchedule":[{"day":"Segunda","time":"17:00"},{"day":"Quarta","time":"17:00"}]},{"name":"Manoel Marques","phone":"69 9995-24387","studentType":"Fixo","weeklySchedule":[{"day":"Segunda","time":"16:00"},{"day":"Quarta","time":"16:00"}]},{"name":"lizianne de matos","phone":"69 992378639","studentType":"Wellhub","weeklySchedule":[{"day":"Segunda","time":"16:00"},{"day":"Quarta","time":"18:00"},{"day":"Quinta","time":"18:00"}]},{"name":"sara gabriely","phone":"69 9982-2541","studentType":"Wellhub","weeklySchedule":[{"day":"Segunda","time":"18:00"},{"day":"Quarta","time":"18:00"}]},{"name":"joao gabriel","phone":"69993778367","studentType":"Wellhub","weeklySchedule":[]},{"name":"ana luicia mortari","phone":"43 99678-8889","studentType":"Fixo","weeklySchedule":[]},{"name":"vanuza alvez diogo oliveira","phone":"69 99244-7672","studentType":"Fixo","weeklySchedule":[{"day":"Segunda","time":"17:00"}]},{"name":"nayara dos santos","phone":"69 99351-5895","studentType":"Wellhub","weeklySchedule":[{"day":"Sábado","time":"10:00"}]},{"name":"ana carolina siqueira","phone":"69 98155-7857","studentType":"Fixo","weeklySchedule":[{"day":"Terça","time":"18:00"},{"day":"Quinta","time":"18:00"}]},{"name":"elson rodrigues lima","phone":"69 99289-5965","studentType":"Wellhub","weeklySchedule":[{"day":"Segunda","time":"18:00"},{"day":"Sábado","time":"09:00"}]},{"name":"maria leiliane de albuquerque","phone":"69 99358 9144","studentType":"Wellhub","weeklySchedule":[{"day":"Segunda","time":"16:00"},{"day":"Quarta","time":"16:00"}]},{"name":"giovanni correia vieira","phone":"69 99344-5427","studentType":"Wellhub","weeklySchedule":[]},{"name":"paolla kerry martinatti","phone":"69 99245 9385","studentType":"Fixo","weeklySchedule":[{"day":"Quinta","time":"19:00"},{"day":"Sexta","time":"07:00"}]},{"name":"eduardo alvez rodrigues","phone":"6984790363","studentType":"Wellhub","weeklySchedule":[]},{"name":"joserene zalenski","phone":"69993510100","studentType":"Wellhub","weeklySchedule":[{"day":"Segunda","time":"16:00"},{"day":"Quinta","time":"16:00"}]},{"name":"raissa fonseca","phone":"69981195612","studentType":"Wellhub","weeklySchedule":[]},{"name":"leticia pagotto zoni","phone":"69993540350","studentType":"Wellhub","weeklySchedule":[]},{"name":"andreza p Mendonça","phone":"69 993328-0404","studentType":"Wellhub","weeklySchedule":[]},{"name":"sabrina felix santana","phone":"69984422092","studentType":"Fixo","weeklySchedule":[]},{"name":"edeli diogo","phone":"69 999202138","studentType":"Wellhub","weeklySchedule":[]},{"name":"regiane de oliveira santos","phone":"69 98151-1323","studentType":"Wellhub","weeklySchedule":[{"day":"Terça","time":"18:00"},{"day":"Quinta","time":"18:00"}]},{"name":"kamilla marcelli peixe","phone":"6999277 6609","studentType":"Fixo","weeklySchedule":[]},{"name":"roberta barbosa","phone":"33 98881-6032","studentType":"Wellhub","weeklySchedule":[{"day":"Segunda","time":"18:00"},{"day":"Quarta","time":"18:00"}]},{"name":"grieco da costa","phone":"69 99303 7153","studentType":"Fixo","weeklySchedule":[{"day":"Quarta","time":"16:00"}]},{"name":"isabella santos nascimento","phone":"21 970390032","studentType":"Fixo","weeklySchedule":[{"day":"Segunda","time":"17:00"},{"day":"Quarta","time":"17:00"},{"day":"Sexta","time":"07:00"}]},{"name":"ellen lindaise","phone":"69 99221 1563","studentType":"Wellhub","weeklySchedule":[]},{"name":"elza paula silva","phone":"69 981192289","studentType":"Wellhub","weeklySchedule":[{"day":"Segunda","time":"18:00"},{"day":"Quarta","time":"18:00"}]},{"name":"jania maria de paula","phone":"69 984184418","studentType":"Wellhub","weeklySchedule":[{"day":"Segunda","time":"18:00"},{"day":"Quarta","time":"18:00"},{"day":"Sexta","time":"08:00"}]},{"name":"rosangela da silva","phone":"69 99207 9961","studentType":"Fixo","weeklySchedule":[{"day":"Segunda","time":"17:00"},{"day":"Quarta","time":"17:00"}]},{"name":"ana caroline mezzarobra","phone":"6998453 8626","studentType":"Fixo","weeklySchedule":[]},{"name":"renan sotero","phone":"69 993090603","studentType":"Fixo","weeklySchedule":[]},{"name":"aladia","phone":"69 99929 5645","studentType":"Fixo","weeklySchedule":[]},{"name":"lucimeire","phone":"69 99202 8647","studentType":"Fixo","weeklySchedule":[]},{"name":"maria aparecida","phone":"69996039388","studentType":"Fixo","weeklySchedule":[]},{"name":"rosely tavares","phone":"69984431603","studentType":"Fixo","weeklySchedule":[{"day":"Quarta","time":"18:00"}]},{"name":"paty mara","phone":"69 984431603","studentType":"Fixo","weeklySchedule":[{"day":"Quarta","time":"18:00"}]},{"name":"isabel ferreira de jesus","phone":"69999191813","studentType":"Fixo","weeklySchedule":[{"day":"Terça","time":"17:00"},{"day":"Quinta","time":"17:00"}]},{"name":"marcos Vinícius Palma","phone":"69 993049197","studentType":"Wellhub","weeklySchedule":[{"day":"Sábado","time":"10:00"}]},{"name":"Janieli Feliciano","phone":"69992011579","studentType":"Wellhub","weeklySchedule":[{"day":"Quarta","time":"17:00"}]},{"name":"Caroline Horsth","phone":"69993037444","studentType":"Fixo","weeklySchedule":[{"day":"Quarta","time":"08:00"}]},{"name":"Josinane Mattias","phone":"69993309640","studentType":"Fixo","weeklySchedule":[{"day":"Segunda","time":"19:00"},{"day":"Quarta","time":"19:00"}]},{"name":"Marcelos Alves","phone":"69663309640","studentType":"Fixo","weeklySchedule":[{"day":"Segunda","time":"19:00"},{"day":"Quarta","time":"19:00"}]},{"name":"Marlene Peixer","phone":"69992776609","studentType":"Fixo","weeklySchedule":[]},{"name":"Flávia Regina stur","phone":"69 99908 4479","studentType":"Fixo","weeklySchedule":[{"day":"Segunda","time":"18:00"},{"day":"Quarta","time":"18:00"}]},{"name":"Luiza","phone":"69992270342","studentType":"Fixo","weeklySchedule":[{"day":"Quarta","time":"17:00"}]},{"name":"Danilo Pereira Eduardo","phone":"69993567550","studentType":"Wellhub","weeklySchedule":[{"day":"Segunda","time":"16:00"},{"day":"Quarta","time":"16:00"}]},{"name":"elizabete ferraz","phone":"69984531526","studentType":"Wellhub","weeklySchedule":[{"day":"Segunda","time":"16:00"},{"day":"Quarta","time":"16:00"}]},{"name":"hugo vicentin","phone":"69992785665","studentType":"Wellhub","weeklySchedule":[{"day":"Terça","time":"16:00"},{"day":"Quinta","time":"16:00"}]}];

export default function SettingsView() {
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreUnderstood, setRestoreUnderstood] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const [s, b] = await Promise.all([db.getSettings(), db.getBackups()]);
      setSettings(s);
      setBackups(b);
      setLoading(false);
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    await db.saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRunRestore = async () => {
    if (!restoreUnderstood || isRestoring) return;
    setIsRestoring(true);
    try {
      const result = await db.restoreStudentsFromBackup(RESTORE_PAYLOAD, 'admin_manual');
      setRestoreResult(result);
      localStorage.setItem('fisiostudio_restore_v1_done', 'true');
    } catch (e) {
      alert("Erro crítico na restauração.");
    } finally {
      setIsRestoring(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Carregando...</div>;

  return (
    <div className="max-w-4xl space-y-10 animate-in pb-20 px-4 md:px-0">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Configurações</h2>
          <p className="text-brand-dark font-bold uppercase tracking-widest text-[10px]">Administração do Sistema</p>
        </div>
        {saved && (
          <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest animate-in flex items-center gap-2">
            <Icons.Check /> Alterações Salvas
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[3rem] shadow-premium border border-brand-light/30 p-10 space-y-8">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-[11px] flex items-center gap-3"><span className="w-1.5 h-6 bg-brand-primary rounded-full"></span> Segurança do Quiosque</h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-brand-dark uppercase tracking-widest">PIN de Saída Administrador</label>
              <input 
                type="password" 
                value={settings.kioskExitPin} 
                onChange={e => setSettings({...settings, kioskExitPin: e.target.value})} 
                className="w-full px-5 py-4 bg-brand-bg/30 border-2 border-transparent rounded-2xl font-black tracking-[1em] outline-none focus:border-brand-primary transition-all text-center" 
                maxLength={4} 
              />
            </div>
          </div>
          <button onClick={handleSave} className="w-full bg-brand-primary text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-glow hover:bg-brand-dark transition-all">Salvar Configurações</button>
        </div>

        <div className="bg-white rounded-[3rem] shadow-premium border border-brand-light/30 p-10 space-y-8 flex flex-col border-red-100">
           <h3 className="font-black text-slate-800 uppercase tracking-widest text-[11px] flex items-center gap-3"><span className="w-1.5 h-6 bg-red-400 rounded-full"></span> Recuperação Crítica</h3>
           
           <div className="bg-red-50/50 p-6 rounded-2xl border border-red-100 space-y-4">
              <p className="text-[10px] text-red-700 font-black uppercase leading-relaxed tracking-widest">
                Esta ação restaura a base de 62 alunos originais e reconstrói a agenda fixa.
              </p>
              <button 
                onClick={() => setIsRestoreModalOpen(true)}
                className="w-full bg-slate-800 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-glow transition-all active:scale-95 hover:bg-slate-900"
              >
                <Icons.Restore /> Executar Restauro Completo
              </button>
           </div>

           <div className="mt-auto pt-4 border-t border-slate-100">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center">
                Última sincronização: {localStorage.getItem('fisiostudio_restore_v1_done') ? 'CONCLUÍDA' : 'PENDENTE'}
              </p>
           </div>
        </div>
      </div>

      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-[600] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 md:p-14 shadow-2xl border-4 border-white overflow-hidden relative">
            <button 
              onClick={() => setIsRestoreModalOpen(false)} 
              className="absolute top-8 right-8 p-3 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Icons.X />
            </button>

            {!restoreResult ? (
              <div className="space-y-8">
                 <header className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                       <Icons.Alert />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Confirmação de Restauro</h3>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                      O sistema processará 62 registros. Alunos com o mesmo telefone ou nome serão ATUALIZADOS para evitar duplicidade.
                    </p>
                 </header>

                 <div className="p-6 bg-brand-bg/30 rounded-2xl border-2 border-brand-light/20">
                    <label className="flex items-start gap-4 cursor-pointer">
                       <input 
                         type="checkbox" 
                         className="w-6 h-6 mt-1 rounded-lg border-2 border-brand-light accent-brand-primary"
                         checked={restoreUnderstood}
                         onChange={e => setRestoreUnderstood(e.target.checked)}
                       />
                       <span className="text-[10px] font-black text-slate-700 uppercase leading-tight tracking-widest select-none">
                          Confirmo a execução da restauração da base de 62 alunos e entendo que a agenda será reativada para estes registros.
                       </span>
                    </label>
                 </div>

                 <div className="flex gap-4">
                   <button onClick={() => setIsRestoreModalOpen(false)} className="flex-1 py-5 bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest">Abortar</button>
                   <button 
                     onClick={handleRunRestore} 
                     disabled={!restoreUnderstood || isRestoring}
                     className="flex-1 py-5 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-glow disabled:opacity-30 transition-all active:scale-95"
                   >
                     {isRestoring ? 'Sincronizando...' : 'Iniciar Agora'}
                   </button>
                 </div>
              </div>
            ) : (
              <div className="space-y-8 text-center animate-in zoom-in-95">
                 <div className="mx-auto w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                    <Icons.Check />
                 </div>
                 <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Restauração Concluída</h3>
                 
                 <div className="grid grid-cols-3 gap-4">
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                       <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Criados</p>
                       <p className="text-2xl font-black text-slate-800">{restoreResult.createdCount}</p>
                    </div>
                    <div className="bg-brand-primary/10 p-4 rounded-2xl border border-brand-primary/20">
                       <p className="text-[8px] font-black text-brand-primary uppercase tracking-widest mb-1">Atualizados</p>
                       <p className="text-2xl font-black text-slate-800">{restoreResult.updatedCount}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Base Total</p>
                       <p className="text-2xl font-black text-slate-800">{restoreResult.totalAfter}</p>
                    </div>
                 </div>

                 {restoreResult.errors.length > 0 && (
                   <div className="max-h-32 overflow-y-auto bg-red-50 p-4 rounded-xl text-left border border-red-100">
                      <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-2">Logs de Erro:</p>
                      {restoreResult.errors.map((err, i) => (
                        <p key={i} className="text-[9px] font-bold text-red-500 mb-1">• {err}</p>
                      ))}
                   </div>
                 )}

                 <div className="pt-4">
                    <button 
                      onClick={() => { setIsRestoreModalOpen(false); setRestoreResult(null); setRestoreUnderstood(false); window.location.reload(); }} 
                      className="w-full py-5 bg-brand-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-glow active:scale-95"
                    >
                      Finalizar e Recarregar
                    </button>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-4">Sistema persistido no IndexedDB</p>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
