"use client";
import { SettingsScreen } from "@/components/SettingsScreen";

export default function SettingsPage() {
  // Valores padrão que podem ser carregados do contexto ou banco no futuro
  const defaultLanguage = "Português do Brasil";
  const defaultFocusKeywords = "liturgia diária, santo do dia, catequese, fé, oração";

  const handleSave = (settings: { language: string; focusKeywords: string }) => {
    console.log("💾 Configurações salvas:", settings);
    // aqui futuramente você pode salvar no contexto ou API
  };

  return (
    <SettingsScreen />
  );
}
