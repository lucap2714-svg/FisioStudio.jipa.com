
import { ClassSession, SyncLog } from '../types';
import { db } from './db';

class GoogleCalendarService {
  private isEnabled: boolean = false;

  constructor() {
    // A integração seria ativada se as chaves estivessem no env
    this.isEnabled = !!process.env.GOOGLE_API_KEY;
  }

  /**
   * Sincroniza uma aula com o Google Calendar.
   * Se já tiver calendarEventId, atualiza. Se não, cria um novo.
   */
  async syncClass(session: ClassSession, userId: string): Promise<string | null> {
    const action = session.calendarEventId ? 'UPDATE' : 'CREATE';
    
    try {
      console.log(`[GoogleSync] ${action} para aula ${session.id} em ${session.date} ${session.startTime}`);
      
      // Simulação de chamada de API (Substituir por fetch real para a API do Google)
      // No mundo real, usaríamos gapi.client.calendar.events.insert/patch
      await new Promise(resolve => setTimeout(resolve, 800)); 
      
      const eventId = session.calendarEventId || `gevent_${db.generateId()}`;

      await this.logSync({
        id: db.generateId(),
        timestamp: new Date().toISOString(),
        userId,
        entityId: session.id,
        action,
        calendarEventId: eventId,
        status: 'SUCCESS',
        message: `Aula sincronizada com sucesso: ${session.date} ${session.startTime}`
      });

      return eventId;
    } catch (error: any) {
      await this.logSync({
        id: db.generateId(),
        timestamp: new Date().toISOString(),
        userId,
        entityId: session.id,
        action,
        status: 'ERROR',
        message: `Falha na sincronização: ${error.message || 'Erro desconhecido'}`
      });
      return null;
    }
  }

  async deleteEvent(calendarEventId: string, userId: string) {
    try {
      console.log(`[GoogleSync] DELETE evento ${calendarEventId}`);
      // Chamada API: gapi.client.calendar.events.delete({ calendarId: 'primary', eventId })
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await this.logSync({
        id: db.generateId(),
        timestamp: new Date().toISOString(),
        userId,
        entityId: 'N/A',
        action: 'DELETE',
        calendarEventId,
        status: 'SUCCESS',
        message: `Evento removido do Google Calendar.`
      });
    } catch (e) {
      console.error("Erro ao deletar no Google", e);
    }
  }

  private async logSync(log: SyncLog) {
    const data = await (db as any).getRawDataInternal();
    if (!data.syncLogs) data.syncLogs = [];
    data.syncLogs.unshift(log);
    if (data.syncLogs.length > 1000) data.syncLogs.pop();
    await (db as any).saveRawDataInternal(data);
  }
}

export const googleSync = new GoogleCalendarService();
