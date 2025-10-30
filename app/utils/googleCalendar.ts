// src/utils/googleCalendar.ts
import { google } from "googleapis";

/**
 * Busca eventos do Google Calendar na data atual.
 * @param calendarId - ID do calendário (ex: "primary" ou o e-mail do calendário)
 * @param accessToken - Token OAuth2 de acesso (gerado na autenticação)
 */
export async function getTodayEvents(calendarId: string, accessToken: string) {
  try {
    // Autentica com o token
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: "v3", auth });

    // Define início e fim do dia (no fuso horário do Brasil)
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString();

    // Faz a requisição
    const res = await calendar.events.list({
      calendarId,
      timeMin: startOfDay,
      timeMax: endOfDay,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = res.data.items || [];

    if (events.length === 0) {
      console.log("Nenhum evento encontrado para hoje.");
      return [];
    }

    // Retorna lista formatada
    return events.map((event) => ({
      id: event.id,
      title: event.summary,
      start: event.start?.dateTime || event.start?.date,
    }));
  } catch (error: any) {
    console.error("Erro ao buscar eventos:", error.message);
    throw new Error("Falha ao acessar o Google Calendar");
  }
}
