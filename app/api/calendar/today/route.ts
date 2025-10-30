// app/api/calendar/today/route.ts
import { google } from "googleapis";
import { NextResponse } from "next/server";

function getEnvOrThrow(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} não configurado`);
  return v;
}

export async function GET(req: Request) {
  try {
    // calendarId vem do query param ?calendarId=... ou do ENV
    const url = new URL(req.url);
    const qCalendarId = url.searchParams.get("calendarId") || undefined;
    const calendarId = qCalendarId || process.env.GOOGLE_CALENDAR_ID;
    if (!calendarId) {
      return NextResponse.json({ success: false, error: "GOOGLE_CALENDAR_ID ausente" }, { status: 400 });
    }

    // Credenciais: prefira variáveis de ambiente (Vercel)
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      return NextResponse.json({ success: false, error: "Credenciais da service account não configuradas" }, { status: 500 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    // intervalo do dia (no timezone do servidor — se quiser forçar PT-BR, veja nota abaixo)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    const res = await calendar.events.list({
      calendarId,
      timeMin: startOfDay,
      timeMax: endOfDay,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });

    const items = res.data.items || [];
    const events = items.map(e => ({
      id: e.id,
      title: e.summary || "Sem título",
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      location: e.location || "",
    }));

    return NextResponse.json({ success: true, count: events.length, events });
  } catch (err: any) {
    console.error("API /api/calendar/today error:", err);
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 500 });
  }
}
