import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/services/configService";

/* =========================================================
   🧩 Verifica conexão antes de processar
   ========================================================= */
function ensureDatabaseConnection() {
  if (!process.env.POSTGRES_URL) {
    console.error("❌ ERRO: Variável POSTGRES_URL não definida.");
    throw new Error(
      "Banco de dados não configurado. Defina POSTGRES_URL no arquivo .env.local"
    );
  }
}

/* =========================================================
   ✅ GET — Busca configurações
   ========================================================= */
export async function GET() {
  try {
    ensureDatabaseConnection();
    const data = await getSettings();

    if (!data) {
      console.warn("⚠️ Nenhuma configuração encontrada na tabela ai_settings.");
      return NextResponse.json(
        { error: "Nenhuma configuração encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("❌ [API:GET /settings] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao buscar configurações" },
      { status: 500 }
    );
  }
}

/* =========================================================
   ✅ PUT — Atualiza configurações
   ========================================================= */
export async function PUT(req: NextRequest) {
  try {
    ensureDatabaseConnection();
    const body = await req.json();

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: "Corpo da requisição vazio ou inválido." },
        { status: 400 }
      );
    }

    await updateSettings(body);

    return NextResponse.json({
      success: true,
      message: "Configurações atualizadas com sucesso.",
    });
  } catch (error: any) {
    console.error("❌ [API:PUT /settings] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao atualizar configurações" },
      { status: 500 }
    );
  }
}
