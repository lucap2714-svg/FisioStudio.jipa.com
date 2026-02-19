
import React, { useState, useEffect } from 'react';
import { User, BillingStatus } from '../types';
import StudentsList from './StudentsList';
import ClassesList from './ClassesList';
import ClassDetail from './ClassDetail';
import StudentProfile from './StudentProfile';
import TrainingPlanView from './TrainingPlanView';
import AssessmentFormView from './AssessmentFormView';
import ReportsView from './ReportsView';
import SettingsView from './SettingsView';
import KioskMode from './KioskMode';
import { db } from '../services/db';

interface ProfessionalDashboardProps {
  user: User;
  onLogout: () => void;
}

enum View {
  HOME, STUDENTS, STUDENT_DETAIL, TRAINING_PLAN, CLASSES, CLASS_DETAIL, REPORTS, SETTINGS, KIOSK, ASSESSMENT
}

const Icons = {
  Home: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
  Tablet: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/></svg>,
  Chart: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>,
  Settings: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
  Logout: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>,
  ChevronLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
  Menu: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="18" y2="18"/></svg>,
  Fullscreen: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
};

const ProfessionalDashboard: React.FC<ProfessionalDashboardProps> = ({ user, onLogout }) => {
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const sidebarStorageKey = 'fs_sidebar_collapsed';
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(sidebarStorageKey);
    return stored === 'true' ? false : true;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => typeof document !== 'undefined' && Boolean(document.fullscreenElement));
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const students = await db.getStudents();
      setTotalStudents(students.length);
    };
    fetchStats();
    return db.onUpdate?.(fetchStats);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(sidebarStorageKey, (!isSidebarOpen).toString());
  }, [isSidebarOpen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const menuItems = [
    { v: View.HOME, l: 'Início', i: Icons.Home },
    { v: View.STUDENTS, l: 'Alunos', i: Icons.Users },
    { v: View.CLASSES, l: 'Agenda', i: Icons.Calendar },
    { v: View.KIOSK, l: 'Quiosque', i: Icons.Tablet },
    { v: View.REPORTS, l: 'Relatórios', i: Icons.Chart },
    { v: View.SETTINGS, l: 'Configurações', i: Icons.Settings }
  ];

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Erro ao alternar tela cheia', error);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case View.HOME:
        return (
          <div className="space-y-8 animate-in pb-12">
            <header className="px-4 md:px-0">
                <h2 className="text-4xl md:text-6xl font-black text-slate-800 tracking-tighter leading-tight">
                  Olá, <span className="text-brand-primary">{user.name.split(' ')[0]}!</span>
                </h2>
                <div className="flex items-center gap-3 mt-4">
                  <div className="px-4 py-1.5 bg-brand-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-glow flex items-center gap-2">
                    <Icons.Users /> Total no Banco: {totalStudents} Alunos
                  </div>
                  <div className="px-4 py-1.5 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                    Integridade: 100% OK
                  </div>
                </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 px-4 md:px-0">
               {menuItems.slice(1, 5).map((item, i) => (
                  <button key={i} onClick={() => setCurrentView(item.v)} className="bg-white p-10 rounded-[3rem] shadow-premium hover:shadow-glow transition-all border border-brand-light/20 flex flex-col items-center gap-6 group">
                    <span className="text-brand-primary group-hover:scale-125 transition-transform"><item.i /></span>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">{item.l}</span>
                  </button>
               ))}
            </div>
          </div>
        );
      case View.STUDENTS: return <StudentsList onOpenAssessment={id => { setSelectedStudentId(id); setCurrentView(View.ASSESSMENT); }} onOpenTrainingPlan={id => { setSelectedStudentId(id); setCurrentView(View.TRAINING_PLAN); }} />;
      case View.CLASSES: return <ClassesList onSelectClass={id => { setSelectedClassId(id); setCurrentView(View.CLASS_DETAIL); }} onOpenStudentProfile={id => { setSelectedStudentId(id); setCurrentView(View.ASSESSMENT); }} onOpenTrainingPlan={id => { setSelectedStudentId(id); setCurrentView(View.TRAINING_PLAN); }} />;
      case View.CLASS_DETAIL: return <ClassDetail classId={selectedClassId!} onBack={() => setCurrentView(View.CLASSES)} onOpenStudent={id => { setSelectedStudentId(id); setCurrentView(View.ASSESSMENT); }} onShowQR={() => {}} currentUser={user} />;
      case View.ASSESSMENT: return <AssessmentFormView studentId={selectedStudentId!} onBack={() => setCurrentView(View.STUDENTS)} currentUser={user} />;
      case View.TRAINING_PLAN: return <TrainingPlanView studentId={selectedStudentId!} onBack={() => setCurrentView(View.STUDENTS)} currentUser={user} />;
      case View.REPORTS: return <ReportsView />;
      case View.SETTINGS: return <SettingsView />;
      case View.KIOSK: return <KioskMode onExit={() => setCurrentView(View.HOME)} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-full w-full bg-brand-bg overflow-hidden">
      <aside className={`hidden lg:flex flex-col h-full bg-white border-r border-brand-light/30 transition-all duration-200 z-[100] ${isSidebarOpen ? 'w-72 shadow-2xl' : 'w-24 shadow-lg'}`}>
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <div className="flex items-center gap-4 mb-14 shrink-0 h-12">
            <div className="w-12 h-12 bg-brand-primary rounded-2xl overflow-hidden shadow-glow border-2 border-white flex items-center justify-center shrink-0">
              <img src="https://i.postimg.cc/WpmNkxhk/1000225330.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className={`text-xl font-black tracking-tighter text-slate-800 uppercase transition-[opacity,transform] duration-200 origin-left ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}`}>
              FisioStudio
            </span>
          </div>
          <nav className="flex-1 space-y-3">
            {menuItems.map(item => (
              <button
                key={item.v}
                onClick={() => setCurrentView(item.v)}
                title={!isSidebarOpen ? item.l : undefined}
                aria-label={item.l}
                className={`w-full flex items-center gap-5 px-4 py-4 rounded-2xl font-black transition-all group ${currentView === item.v ? 'bg-brand-primary text-white shadow-glow' : 'text-slate-400 hover:bg-brand-bg hover:text-slate-800'}`}>
                <span className={`w-6 flex justify-center shrink-0 transition-transform duration-200 ${isSidebarOpen ? '' : 'mx-auto'}`}><item.i /></span>
                <span className={`text-sm tracking-wide whitespace-nowrap transition-[opacity,transform] duration-200 origin-left ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}`}>
                  {item.l}
                </span>
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={toggleSidebar}
            title={isSidebarOpen ? 'Recolher menu' : 'Expandir menu'}
            aria-pressed={!isSidebarOpen}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-black text-slate-500 hover:text-slate-800 hover:bg-brand-bg transition-all mb-3">
              <span className={`w-6 flex justify-center shrink-0 transition-transform duration-200 ${isSidebarOpen ? '' : 'rotate-180'}`}><Icons.ChevronLeft /></span>
              <span className={`text-sm tracking-wide whitespace-nowrap transition-[opacity,transform] duration-200 origin-left ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}`}>
                {isSidebarOpen ? 'Recolher' : 'Expandir'}
              </span>
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-5 px-4 py-4 rounded-2xl font-black text-red-400 hover:bg-red-50 transition-all mt-auto">
              <Icons.Logout /> {isSidebarOpen && <span className="text-sm">Sair</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-24 bg-brand-bg/80 backdrop-blur-3xl border-b border-brand-light/30 flex items-center px-14 shrink-0 z-[90]">
          <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-3 bg-white shadow-premium rounded-xl text-brand-primary mr-4"><Icons.Menu /></button>
          <div className="flex items-center gap-4 ml-auto">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-3 bg-white border border-brand-light/40 rounded-2xl shadow-premium text-brand-primary hover:shadow-glow transition-all"
              title={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}>
              <Icons.Fullscreen />
              <span className="hidden sm:inline text-[11px] font-black uppercase tracking-widest">
                {isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
              </span>
            </button>
            <div className="flex items-center gap-6">
             <div className="text-right hidden sm:block">
              <p className="text-base font-black text-slate-800 tracking-tight leading-none mb-1">{user.name}</p>
              <p className="text-[10px] font-black uppercase text-brand-dark tracking-widest opacity-60">Admin — {totalStudents} ALUNOS</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-brand-primary shadow-glow border-2 border-white overflow-hidden">
               <img src="https://i.postimg.cc/WpmNkxhk/1000225330.jpg" alt="Profile" className="w-full h-full object-cover" />
            </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar relative">
          <div className="max-w-[1400px] mx-auto w-full min-h-full">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfessionalDashboard;
