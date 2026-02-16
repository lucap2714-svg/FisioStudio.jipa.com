
import React, { useState } from 'react';
import { User } from '../types';
import { MOCK_PROFESSIONALS } from '../constants';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedInput = loginIdentifier.toLowerCase().trim();
    
    const foundUser = MOCK_PROFESSIONALS.find(prof => {
      const nameMatch = prof.name.toLowerCase().trim() === normalizedInput;
      const emailMatch = prof.email.toLowerCase() === normalizedInput;
      const emailShortMatch = prof.email.split('@')[0].toLowerCase() === normalizedInput;
      
      return (nameMatch || emailMatch || emailShortMatch);
    });

    if (foundUser && password === (foundUser as any).password) {
      onLogin(foundUser);
    } else {
      setError('Credenciais administrativas inválidas.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-brand-bg">
      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-premium p-12 border border-brand-light/20 animate-in">
        <div className="flex justify-center mb-8">
          <div className="bg-brand-primary p-0 rounded-3xl shadow-glow w-24 h-24 overflow-hidden flex items-center justify-center border-4 border-white">
            <img src="https://i.postimg.cc/WpmNkxhk/1000225330.jpg" alt="FisioStudio Logo" className="w-full h-full object-cover" />
          </div>
        </div>
        
        <header className="text-center mb-10">
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter">FisioStudio</h1>
          <p className="text-brand-dark font-black uppercase tracking-[0.2em] text-[10px] mt-1">Gestão de Pilates & Fisioterapia</p>
        </header>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Usuário / E-mail</label>
            <input 
              type="text" 
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              className="w-full px-6 py-4 border-2 border-brand-light/50 rounded-2xl focus:border-brand-primary outline-none transition-all bg-white font-bold text-slate-700"
              placeholder="Digite seu usuário"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Senha de Acesso</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 border-2 border-brand-light/50 rounded-2xl focus:border-brand-primary outline-none transition-all bg-white font-bold text-slate-700"
              placeholder="••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black text-center border border-red-100 animate-slide-up uppercase tracking-widest">
              {error}
            </div>
          )}

          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-brand-primary hover:bg-brand-dark text-white font-black py-5 rounded-2xl transition-all shadow-glow active:scale-95 text-xs uppercase tracking-widest"
            >
              Entrar no Sistema
            </button>
          </div>
        </form>

        <footer className="mt-10 pt-8 border-t border-brand-bg text-center">
          <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.3em]">Acesso Administrativo</p>
        </footer>
      </div>
    </div>
  );
}
