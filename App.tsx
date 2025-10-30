import React, { useState, useCallback, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import { SettingsScreen } from './components/SettingsScreen';
import HistoryScreen from './components/HistoryScreen';
import LoginScreen from './components/LoginScreen';
import { Sidebar, SidebarIcon } from './components/Sidebar';
import { Newspaper, Settings, History, LogOut } from 'lucide-react';
import { ArtigoNoticia } from './types';
import { getArticles, setupDatabase } from './services/db';

type View = 'dashboard' | 'settings' | 'history';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [history, setHistory] = useState<ArtigoNoticia[]>([]);
  const [language, setLanguage] = useState<string>('Português do Brasil');
  const [focusKeywords, setFocusKeywords] = useState<string>('tecnologia, IA, inovação, futuro');
  const [dbInitialized, setDbInitialized] = useState(false);

  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const storedAuth = localStorage.getItem('pnaiai_auth');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
      setCurrentView('dashboard');
    }
    setAuthChecked(true); // 🔹 evita repetir a checagem
  }, []);


  /** 🔹 Inicializa o banco de dados local */
  useEffect(() => {
    if (isAuthenticated && !dbInitialized) {
      setupDatabase()
        .then(() => setDbInitialized(true))
        .catch((error) => console.error("Falha ao inicializar o banco de dados:", error));
    }
  }, [isAuthenticated, dbInitialized]);

  /** 🔹 Busca artigos quando logado */
  useEffect(() => {
    if (isAuthenticated && dbInitialized) {
      const fetchHistory = async () => {
        try {
          const articles = await getArticles();
          setHistory(articles);
        } catch (error) {
          console.error("Falha ao buscar artigos:", error);
          setHistory([]);
        }
      };
      fetchHistory();
    }
  }, [isAuthenticated, dbInitialized]);

  /** 🔹 Quando o login é bem-sucedido */
  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
    localStorage.setItem('pnaiai_auth', 'true'); // ✅ salva no navegador
  }, []);

  /** 🔹 Logout e limpeza */
  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentView('dashboard');
    setHistory([]);
    setDbInitialized(false);
    localStorage.removeItem('pnaiai_auth'); // ❌ remove login persistido
  }, []);

  const handleArticleGenerated = useCallback((article: ArtigoNoticia) => {
    setHistory((prevHistory) => [article, ...prevHistory]);
  }, []);

  const handleSettingsSave = useCallback((newSettings: { language: string; focusKeywords: string }) => {
    setLanguage(newSettings.language);
    setFocusKeywords(newSettings.focusKeywords);
  }, []);

  /** 🔹 Exibe tela de login apenas se não estiver logado */
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (!authChecked) {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      Carregando...
    </div>
  );
}


  return (
    <div className="flex h-screen bg-gray-900 text-gray-200">
      <Sidebar>
        <SidebarIcon
          icon={<Newspaper size={24} />}
          text="Painel"
          active={currentView === 'dashboard'}
          onClick={() => setCurrentView('dashboard')}
        />
        <SidebarIcon
          icon={<History size={24} />}
          text="Histórico"
          active={currentView === 'history'}
          onClick={() => setCurrentView('history')}
        />
        <SidebarIcon
          icon={<Settings size={24} />}
          text="Configurações"
          active={currentView === 'settings'}
          onClick={() => setCurrentView('settings')}
        />
        <div className="flex-grow"></div>
        <SidebarIcon
          icon={<LogOut size={24} />}
          text="Sair"
          onClick={handleLogout}
        />
      </Sidebar>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {currentView === 'dashboard' && (
          <Dashboard
            language={language}
            focusKeywords={focusKeywords}
            onArticleGenerated={handleArticleGenerated}
          />
        )}
        {currentView === 'history' && <HistoryScreen initialArticles={history} />}
        {currentView === 'settings' && (
          <SettingsScreen
            currentLanguage={language}
            currentFocusKeywords={focusKeywords}
            onSave={handleSettingsSave}
          />
        )}
      </main>
    </div>
  );
};

export default App;
