import React, { useEffect, useState, useMemo } from 'react';
import { feedbackService, FeedbackMessage } from '../services/feedbackService';
import { User } from '../types';

interface FeedbackBoardProps {
  currentUser?: User | null;
}

const StatusPill = ({ status }: { status: FeedbackMessage['status'] }) => {
  const style =
    status === 'sent'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-amber-50 text-amber-700 border-amber-100';
  const label = status === 'sent' ? 'enviado' : 'pendente';
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${style}`}>
      {label}
    </span>
  );
};

const formatDateTime = (value: string) => {
  try {
    return new Date(value).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  } catch (e) {
    return value;
  }
};

const encodeWhatsAppText = (msg: FeedbackMessage) => {
  const now = new Date();
  const parts = [
    'Feedback FisioStudio',
    `Data/hora: ${now.toLocaleString('pt-BR')}`,
    `Mensagem: ${msg.message}`,
    `ID: ${msg.id}`
  ];
  return encodeURIComponent(parts.join('\n'));
};

const FeedbackBoard: React.FC<FeedbackBoardProps> = ({ currentUser }) => {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<boolean>(false);
  const [messageText, setMessageText] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [sendingId, setSendingId] = useState<number | null>(null);

  const isValid = useMemo(() => messageText.trim().length > 0, [messageText]);

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    setUnavailable(false);
    try {
      const data = await feedbackService.listFeedback(20);
      setMessages(data);
    } catch (e: any) {
      console.error('[Feedback] Falha ao carregar mensagens', e);
      const msg = e?.message || '';
      if (msg === 'feedback_unavailable' || msg.toLowerCase().includes('relation') || msg.toLowerCase().includes('table')) {
        setUnavailable(true);
        setError(null);
      } else {
        setError('Não foi possível carregar feedback agora');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleSendNew = async () => {
    if (saving) return;
    const trimmed = messageText.trim();
    if (!trimmed) {
      try {
        alert('Digite uma sugestão antes de enviar.');
      } catch (e) {
        console.debug('[Feedback] Alert indisponível', e);
      }
      return;
    }
    setSaving(true);
    setError(null);
    const payload = `[Sugestão FisioStudio]\nData/Hora: ${new Date().toLocaleString('pt-BR')}\nTexto: ${trimmed}`;
    try {
      const created = await feedbackService.createFeedback(trimmed, currentUser?.name);
      setMessages((prev) => [created, ...prev].slice(0, 20));
    } catch (e: any) {
      console.error('[Feedback] Falha ao salvar', e);
      const msg = e?.message || '';
      if (msg === 'feedback_unavailable') {
        setUnavailable(true);
        setError(null);
      } else {
        setError(msg || 'Erro ao salvar feedback');
      }
    }
    const url = `https://wa.me/92993215720?text=${encodeURIComponent(payload)}`;
    try {
      window.open(url, '_blank');
    } catch (e) {
      console.debug('[Feedback] window.open falhou, redirecionando', e);
      window.location.href = url;
    }
    setMessageText('');
    try {
      alert('Sugestão pronta para envio no WhatsApp');
    } catch (e) {
      console.debug('[Feedback] Alert indisponível', e);
    }
    setSaving(false);
  };

  const handleSend = async (msg: FeedbackMessage) => {
    if (sendingId || msg.status === 'sent') return;
    const url = `https://wa.me/92993215720?text=${encodeWhatsAppText(msg)}`;

    try {
      window.open(url, '_blank');
    } catch (e) {
      console.debug('[Feedback] window.open falhou, redirecionando', e);
      window.location.href = url;
    }

    setSendingId(msg.id);
    try {
      const updated = await feedbackService.markSent(msg.id);
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? updated : m)));
    } catch (e) {
      console.error('[Feedback] Falha ao marcar como enviado', e);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <section className="bg-white border border-brand-light/30 rounded-[2rem] shadow-premium p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-brand-dark/70">
            Quadro de Mensagens
          </p>
          <h3 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
            Sugestões das Fisioterapeutas
          </h3>
        </div>
        <button
          onClick={fetchMessages}
          disabled={loading}
          className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border ${
            loading
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'bg-white text-brand-primary border-brand-light/60 hover:shadow-glow'
          }`}
        >
          Atualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="text-[11px] font-black uppercase tracking-widest leading-tight">
            {error}
          </div>
          <button
            onClick={fetchMessages}
            className="px-3 py-2 bg-white border border-red-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!unavailable && (
      <div className="space-y-4">
        <label className="block text-[11px] font-black uppercase tracking-[0.25em] text-brand-dark/70">
          Nova sugestão
        </label>
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Escreva aqui o que poderia melhorar…"
          maxLength={500}
          rows={3}
          className="w-full rounded-2xl border border-brand-light/60 bg-brand-bg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-sm text-slate-800 px-4 py-3 outline-none transition-all resize-none"
        />
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest">
            {messageText.trim().length}/500
          </p>
          <button
            onClick={handleSendNew}
            disabled={!isValid || saving}
            className={`inline-flex items-center gap-2 px-4 sm:px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
              !isValid || saving
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-brand-primary text-white shadow-glow hover:shadow-xl'
            }`}
          >
            {saving ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest">
            Últimas mensagens
          </h4>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            mostrando até 20
          </span>
        </div>

        {unavailable ? (
          <div className="text-sm text-slate-500">Recurso indisponível no momento.</div>
        ) : loading ? (
          <div className="text-sm text-slate-500">Carregando feedback...</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-slate-500">Nenhuma mensagem registrada ainda.</div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="p-4 md:p-5 bg-brand-bg rounded-2xl border border-brand-light/50 flex flex-col gap-3"
              >
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {msg.message}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <StatusPill status={msg.status} />
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    {formatDateTime(msg.created_at)}
                  </span>
                  {msg.author ? (
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                      {msg.author}
                    </span>
                  ) : null}
                  {msg.device ? (
                    <span className="text-[10px] text-slate-400 truncate max-w-[180px]" title={msg.device}>
                      {msg.device}
                    </span>
                  ) : null}
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => handleSend(msg)}
                      disabled={msg.status === 'sent' || sendingId === msg.id}
                      className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                        msg.status === 'sent'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100 cursor-not-allowed'
                          : sendingId === msg.id
                          ? 'bg-slate-200 text-slate-500 border-slate-200 cursor-wait'
                          : 'bg-white text-brand-primary border-brand-light/60 hover:shadow-glow'
                      }`}
                    >
                      {msg.status === 'sent' ? 'Enviado' : sendingId === msg.id ? 'Enviando…' : 'Enviar pro programador'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeedbackBoard;
