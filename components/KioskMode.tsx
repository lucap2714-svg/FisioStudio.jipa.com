import React, { useEffect, useMemo, useState } from 'react';
import { DateUtils, db } from '../services/db';
import useKiosk from '../hooks/useKiosk';
import kioskService, { KioskSessionStudent } from '../services/kioskService';
import { Student } from '../types';

interface KioskModeProps {
  onExit: () => void;
}

const Icons = {
  Tablet: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/></svg>,
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>,
  Lock: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Refresh: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>,
  Fullscreen: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>,
  Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
};

const DEFAULT_ADMIN_PIN = '1234';

const formatTime = (iso?: string | null) => {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export default function KioskMode({ onExit }: KioskModeProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCheckinItem, setActiveCheckinItem] = useState<KioskSessionStudent | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [qrOpenedMap, setQrOpenedMap] = useState<Record<string, boolean>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const { session: activeSession, students, loading, error, isReconnecting, refresh, confirm, reset } = useKiosk();

  useEffect(() => {
    console.debug('[Kiosk][Render] start', {
      sessionId: activeSession?.id || null,
      start: activeSession?.start_at,
      end: activeSession?.end_at,
      students: Array.isArray(students) ? students.length : 'n/a',
      loading,
      error,
      reconnecting: isReconnecting,
    });
  }, [activeSession, students, loading, error, isReconnecting]);

  useEffect(() => {
    localStorage.setItem('fisiostudio_kiosk_locked', 'true');
  }, []);

  useEffect(() => {
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  const currentStudentsList = useMemo(() => {
    const base = Array.isArray(students) ? students : [];
    const term = searchTerm.trim().toLowerCase();
    return base.filter((s) => !term || s.full_name.toLowerCase().includes(term));
  }, [students, searchTerm]);

  const sessionStartLabel = formatTime(activeSession?.start_at);
  const sessionEndLabel = formatTime(activeSession?.end_at);
  const hasSession = !!activeSession;

  const normalizeDay = (value: string = '') =>
    value
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');

  const normalizeTimeSlot = (value: string = '') => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    const hours = digits.slice(0, 2) || '00';
    const minutes = (digits.slice(2, 4) || '00').padEnd(2, '0');
    const h = Math.min(23, parseInt(hours, 10));
    const m = Math.min(59, parseInt(minutes, 10));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const getSuggestedStudents = (list: Student[], targetDay: string, targetTime: string) => {
    const normalizedDay = normalizeDay(targetDay);
    const normalizedTime = normalizeTimeSlot(targetTime);
    if (!normalizedDay || !normalizedTime) return [];
    return list.filter((s) => {
      const schedule = Array.isArray(s.weeklySchedule) ? s.weeklySchedule : [];
      return schedule.some(
        (sc) => normalizeDay(sc.day) === normalizedDay && normalizeTimeSlot(sc.time) === normalizedTime
      );
    });
  };

  const currentSlot = useMemo(() => {
    if (activeSession?.start_at) return new Date(activeSession.start_at);
    const now = new Date();
    const rounded = new Date(now);
    rounded.setMinutes(0, 0, 0);
    return rounded;
  }, [activeSession?.start_at]);

  const slotDayName = useMemo(() => DateUtils.getDayName(currentSlot), [currentSlot]);
  const slotTime = useMemo(
    () => `${String(currentSlot.getHours()).padStart(2, '0')}:${String(currentSlot.getMinutes()).padStart(2, '0')}`,
    [currentSlot]
  );

  useEffect(() => {
    if (!isAddModalOpen) return;
    if (allStudents.length > 0) return;
    (async () => {
      try {
        setLoadError(null);
        const list = await db.getStudents(true);
        setAllStudents(list);
      } catch (e: any) {
        console.error('[Kiosk][Diag] Falha ao carregar alunos', e);
        setLoadError(e?.message || 'Não foi possível carregar alunos.');
      }
    })();
  }, [isAddModalOpen, allStudents.length]);

  useEffect(() => {
    if (!isAddModalOpen) return;
    const suggested = getSuggestedStudents(allStudents, slotDayName, slotTime);
    if (selectedStudentIds.length === 0 && suggested.length > 0) {
      setSelectedStudentIds(suggested.map((s) => s.id));
    }
  }, [isAddModalOpen, allStudents, slotDayName, slotTime, selectedStudentIds.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
  };

  const startCheckinFlow = (student: KioskSessionStudent) => {
    if ((student.status || '').toLowerCase() === 'confirmed') return;
    setQrOpenedMap((prev) => ({ ...prev, [student.record_id]: true }));
    setActiveCheckinItem(student);
  };

  const handleRetryQr = async (student: KioskSessionStudent) => {
    if (!activeSession) return;
    setQrOpenedMap((prev) => ({ ...prev, [student.record_id]: true }));
    setActiveCheckinItem({ ...student });
  };

  const handleFinalConfirm = async () => {
    if (!activeCheckinItem || isConfirming) return;
    setIsConfirming(true);
    try {
      await confirm(activeCheckinItem.record_id);
      setActiveCheckinItem(null);
      setSearchTerm('');
    } catch (err) {
      console.error('[Kiosk] Falha ao confirmar presença', err);
      alert('Não foi possível registrar a presença. Tente novamente.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleRetryReset = async (student: KioskSessionStudent) => {
    try {
      await reset(student.record_id);
      setQrOpenedMap((prev) => ({ ...prev, [student.record_id]: true }));
      setActiveCheckinItem({ ...student, status: 'scheduled', confirmed_at: null });
    } catch (e) {
      console.error('[Kiosk] Falha ao resetar presença', e);
    }
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleSaveSessionStudents = async () => {
    if (isSavingSession || selectedStudentIds.length === 0) return;
    setIsSavingSession(true);
    try {
      const session = await kioskService.upsertSession({
        id: activeSession?.id ?? null,
        startAt: currentSlot,
        isActive: true,
        title: `Sessão ${slotTime}`,
      });
      await kioskService.addStudentsToSession(session.id, selectedStudentIds);
      await refresh();
      setIsAddModalOpen(false);
      setSelectedStudentIds([]);
    } catch (e: any) {
      console.error('[Kiosk] Falha ao salvar sessão/alunos', e);
      alert(e?.message || 'Não foi possível adicionar alunos.');
    } finally {
      setIsSavingSession(false);
    }
  };

  const renderCheckinModal = () => {
    if (!activeCheckinItem) return null;
    const today = new Date();
    const dateBR = today.toLocaleDateString('pt-BR');
    const dayName = DateUtils.getDayName(today);
    const timeLabel = sessionStartLabel || '--:--';
    const customMessage = `Eu, ${activeCheckinItem.full_name}, confirmo minha presença no dia ${dayName} (${dateBR}) às ${timeLabel}, no FisioStudio.`;
    const waLink = `https://wa.me/5569993856218?text=${encodeURIComponent(customMessage)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(waLink)}`;

    return (
      <div className="fixed inset-0 z-[500] bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in">
        <div className="bg-white rounded-[4rem] p-10 md:p-14 max-w-xl w-full space-y-10 shadow-2xl border-8 border-brand-primary/20 relative">
          <button
            onClick={() => setActiveCheckinItem(null)}
            className="absolute top-8 right-8 p-4 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Icons.X />
          </button>

          <header className="space-y-4 pt-4">
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Validar Presença</h2>
            <p className="text-xl text-brand-dark font-black uppercase tracking-widest leading-tight">{activeCheckinItem.full_name}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Horário agendado: {timeLabel}</p>
          </header>

          <div className="bg-slate-50 p-8 rounded-[3rem] border-4 border-dashed border-brand-light/30 flex flex-col items-center gap-6">
            <img src={qrUrl} className="aspect-square w-full max-w-[240px]" alt="QR Code" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escaneie para validar sua sessão</p>
          </div>

          <div className="space-y-4 pt-4">
            <button
              onClick={handleFinalConfirm}
              disabled={isConfirming}
              className="w-full bg-brand-primary text-white py-8 rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-glow hover:bg-brand-dark transition-all active:scale-95 disabled:opacity-50"
            >
              {isConfirming ? 'Registrando...' : 'CONFIRMAR PRESENÇA'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderEmptyState = (title: string, subtitle: string) => (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-in">
      <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-premium border-4 border-brand-light/20 text-brand-primary opacity-40">
        <Icons.Calendar />
      </div>
      <div className="space-y-2">
        <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xl">{title}</p>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">{subtitle}</p>
        {hasSession && (
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest opacity-70">
            Janela: {sessionStartLabel} - {sessionEndLabel}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[400] bg-brand-bg flex flex-col overflow-hidden animate-in">
      <header className="bg-brand-primary p-6 md:p-10 flex justify-between items-center shadow-xl shrink-0 sticky top-0 z-[500]">
        <div className="flex items-center gap-6 text-white">
          <Icons.Tablet />
          <div><h1 className="text-2xl font-black tracking-tighter uppercase">FisioStudio Quiosque</h1></div>
        </div>
        <div className="flex items-center gap-6">
          <div className="bg-white/20 px-6 py-4 rounded-2xl text-white font-black text-2xl shadow-inner tabular-nums">
            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="flex gap-4">
            <button onClick={toggleFullscreen} className="p-4 bg-white/20 text-white rounded-2xl hidden sm:block transition-transform active:scale-90"><Icons.Fullscreen /></button>
            <button onClick={refresh} className="p-4 bg-white/20 text-white rounded-2xl transition-transform active:scale-90 disabled:opacity-60" disabled={loading}>
              <Icons.Refresh />
            </button>
            <button onClick={() => setIsPinModalOpen(true)} className="bg-white/10 text-white p-4 rounded-2xl border border-white/20 transition-transform active:scale-90"><Icons.Lock /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 lg:p-12 max-w-6xl mx-auto w-full flex flex-col overflow-hidden">
        <div className="space-y-4 mb-6">
          <div className="relative">
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-dark"><Icons.Search /></span>
            <input
              type="text"
              placeholder="Pesquisar aluno..."
              className="w-full pl-16 pr-6 py-5 rounded-[2rem] shadow-premium text-lg md:text-xl outline-none border-3 border-brand-light/60 focus:border-brand-primary bg-white font-black placeholder:text-slate-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          {hasSession && (
            <div className="flex flex-wrap items-center gap-3 text-brand-dark font-black uppercase text-xs md:text-sm tracking-[0.3em] sticky top-[96px] md:top-[110px] z-[400] bg-brand-bg/80 backdrop-blur-md py-2">
              <span className="px-4 py-2 bg-white rounded-2xl shadow-inner text-base md:text-lg tracking-tight text-slate-800">
                Sessão ativa: {sessionStartLabel} — {sessionEndLabel}
              </span>
              {activeSession?.title && (
                <span className="px-4 py-2 bg-white/80 rounded-2xl shadow-inner text-brand-primary text-xs md:text-sm">
                  {activeSession.title}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-3 px-6 py-4 rounded-[2rem] bg-white shadow-premium border border-brand-light/50 text-brand-primary font-black uppercase tracking-[0.2em] text-xs hover:shadow-glow active:scale-95 transition-all"
          >
            <Icons.Plus /> Adicionar pessoas
          </button>
        </div>

        {(error || isReconnecting) && (
          <div
            className={`mb-6 text-sm font-bold px-6 py-4 rounded-[2rem] shadow-inner ${
              isReconnecting
                ? 'bg-amber-50 border-2 border-amber-200 text-amber-700'
                : 'bg-red-50 border-2 border-red-200 text-red-700'
            }`}
          >
            {isReconnecting ? 'Reconectando ao Supabase...' : error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 md:space-y-5 custom-scrollbar pr-1 md:pr-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-brand-primary"></div>
              <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs">Carregando sessão ativa...</p>
            </div>
          ) : !hasSession ? (
            renderEmptyState('Sessão em Espera', 'Aguardando próxima sessão')
          ) : currentStudentsList.length === 0 ? (
            renderEmptyState('Nenhum aluno vinculado', 'Sessão ativa sem alunos confirmáveis no momento')
          ) : (
            currentStudentsList.map((item) => {
              const isPresent = (item.status || '').toLowerCase() === 'confirmed';
              const hasQrHistory = qrOpenedMap[item.record_id] || isPresent;
              return (
                <div key={item.record_id} className="relative">
                  <button
                    disabled={isPresent}
                    onClick={() => startCheckinFlow(item)}
                    className={`w-full bg-white p-8 md:p-10 rounded-[2.5rem] shadow-premium hover:shadow-glow flex items-center justify-between transition-all border-4 ${
                      isPresent ? 'border-emerald-400 bg-emerald-50' : 'border-transparent active:scale-95 hover:border-brand-light/20'
                    }`}
                  >
                    <div className="flex items-center gap-6 md:gap-10 text-left">
                      <div className={`w-16 h-16 md:w-20 md:h-20 rounded-[2rem] flex items-center justify-center font-black text-2xl md:text-3xl ${isPresent ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-bg text-brand-dark'}`}>
                        {item.full_name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">{item.full_name}</h4>
                        <p className="text-[11px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Horário: {sessionStartLabel}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mt-1">
                          Status: {isPresent ? 'Confirmado' : 'Aguardando'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isPresent && (
                        <span className="px-4 py-2 bg-emerald-500 text-white rounded-full text-[11px] font-black uppercase tracking-[0.25em] shadow-glow">
                          Confirmado
                        </span>
                      )}
                      <div className={`${isPresent ? 'bg-emerald-500' : 'bg-brand-primary'} text-white px-6 md:px-8 py-4 rounded-[1.75rem] font-black text-xs uppercase tracking-[0.2em] shadow-glow`}>
                        {isPresent ? 'Presença Validada' : 'Confirmar Presença'}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => (isPresent ? handleRetryReset(item) : handleRetryQr(item))}
                    disabled={!hasQrHistory && !isPresent}
                    className="absolute right-6 top-6 bg-white text-brand-primary p-3 rounded-full shadow-premium border border-brand-light/50 active:scale-95 z-10 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Refazer QR"
                  >
                    <Icons.Refresh />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </main>

      {renderCheckinModal()}

      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-[550] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-6"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-5xl rounded-[3rem] p-8 md:p-10 space-y-6 shadow-2xl border-8 border-brand-light/20 max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-dark/60">Sessão do horário</p>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  {slotDayName} • {slotTime}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-4 bg-slate-100 rounded-2xl text-slate-500 hover:text-slate-800 transition-colors"
              >
                <Icons.X />
              </button>
            </div>

            {loadError && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-bold">
                {loadError}
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-6 h-full">
              <div className="md:w-1/3 bg-brand-bg rounded-2xl p-4 border border-brand-light/40 overflow-y-auto max-h-[60vh]">
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-3">Sugeridos</h4>
                {getSuggestedStudents(allStudents, slotDayName, slotTime).length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum aluno sugerido para este horário.</p>
                ) : (
                  <div className="space-y-3">
                    {getSuggestedStudents(allStudents, slotDayName, slotTime).map((s) => {
                      const isSelected = selectedStudentIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggleStudentSelection(s.id)}
                          className={`w-full text-left px-4 py-3 rounded-2xl border font-black text-sm transition-all ${
                            isSelected
                              ? 'border-brand-primary bg-white shadow-glow text-brand-primary'
                              : 'border-brand-light/50 bg-white hover:border-brand-primary/50'
                          }`}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto max-h-[60vh]">
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-3">Todos os alunos</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {allStudents.map((s) => {
                    const isSelected = selectedStudentIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleStudentSelection(s.id)}
                        className={`w-full text-left px-4 py-3 rounded-2xl border font-black text-sm transition-all ${
                          isSelected
                            ? 'border-brand-primary bg-white shadow-glow text-brand-primary'
                            : 'border-brand-light/50 bg-white hover:border-brand-primary/50'
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                Selecionados: {selectedStudentIds.length}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveSessionStudents}
                  disabled={isSavingSession || selectedStudentIds.length === 0}
                  className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-glow ${
                    isSavingSession || selectedStudentIds.length === 0
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-brand-primary text-white'
                  }`}
                >
                  {isSavingSession ? 'Salvando...' : 'Adicionar à sessão'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPinModalOpen && (
        <div className="fixed inset-0 z-[600] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setIsPinModalOpen(false)}>
          <div className="bg-white w-full max-w-md rounded-[4rem] p-14 text-center border-8 border-brand-light/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-slate-800 uppercase mb-12 tracking-tight">Sair do Quiosque</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Digite o PIN Administrativo</p>
            <input
              type="password"
              maxLength={4}
              className="w-full text-center text-6xl font-black py-10 bg-brand-bg rounded-[2rem] outline-none tracking-[0.5em] mb-10 border-4 border-transparent focus:border-brand-primary"
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value)}
              autoFocus
            />
            <div className="flex gap-4">
              <button onClick={() => setIsPinModalOpen(false)} className="flex-1 py-6 bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
              <button onClick={() => {
                if (pinValue === DEFAULT_ADMIN_PIN) {
                  localStorage.removeItem('fisiostudio_kiosk_locked');
                  onExit();
                } else {
                  setPinValue('');
                  alert('PIN Administrativo incorreto.');
                }
              }} className="flex-1 py-6 bg-brand-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-glow">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
