import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from './config/api'
import './App.css'
import { MonsterGallery } from './components/MonsterGallery'
import { Navbar } from './components/Navbar'
import DefenseAnalyzer from './components/DefenseAnalyzer'
import { SiegeDefenses } from './components/SiegeDefenses'
import { Settings } from './components/Settings'
import { LoginPage } from './components/LoginPage'
import { AdminUsers } from './components/AdminUsers'
import { useAuth } from './contexts/AuthContext'

type Tab = 'home' | 'monsters' | 'analyzer' | 'siege' | 'settings' | 'login' | 'admin';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [geminiKey, setGeminiKey] = useState<string>(localStorage.getItem('gemini_api_key') || '');
  const { isLoggedIn, isAdmin, isLoading } = useAuth();

  const { data: status } = useQuery({
    queryKey: ['status'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/status')
        return response.data
      } catch (e) {
        return null;
      }
    },
  })

  // If auth is still loading, show a minimal loading state
  if (isLoading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="main-content">
        {activeTab === 'home' && (
          <div className="home-view" style={{ padding: '50px 20px', maxWidth: '900px', margin: '0 auto' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Welcome to SW Planner</h1>

            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '30px', marginBottom: '30px' }}>
              <h2 style={{ fontSize: '24px', marginBottom: '20px', color: '#60a5fa' }}>📚 Como Usar</h2>

              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#93c5fd' }}>🔍 Explorar Monstros</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                  Clique em <strong>"Monsters"</strong> para ver a galeria completa de monstros do Summoners War.
                  Você pode pesquisar por nome, filtrar por elemento e visualizar detalhes de cada monstro.
                </p>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#93c5fd' }}>⚔️ Ver Defesas de Siege</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                  Na aba <strong>"Siege"</strong>, você encontra defesas registradas pela comunidade.
                  Use os filtros para buscar defesas específicas por monstro. Clique em qualquer defesa para ver detalhes completos.
                </p>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#93c5fd' }}>➕ Contribuir com Defesas</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                  <strong>Faça login</strong> (clique em "Login" no canto superior direito) para registrar suas próprias defesas.
                  Você pode editar ou excluir apenas as defesas que você criou.
                </p>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#93c5fd' }}>🤖 Análise com IA (Requer Login)</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                  Após fazer login, acesse <strong>"Analyzer"</strong> para enviar screenshots de defesas.
                  Nossa IA extrai automaticamente os monstros e salva a defesa no banco de dados.
                </p>
              </div>

              <div>
                <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#93c5fd' }}>👥 Login & Registro</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                  Você pode criar uma conta com email/senha ou usar <strong>Sign in with Google</strong> para acesso rápido.
                  Usuários autenticados podem contribuir com defesas e usar o Analyzer.
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(96,165,250,0.1)', borderRadius: '8px', border: '1px solid rgba(96,165,250,0.3)' }}>
              <p style={{ margin: '0', color: '#93c5fd', fontSize: '14px' }}>
                💡 <strong>Dica:</strong> Comece explorando a galeria de monstros ou veja as defesas da comunidade em "Siege"!
              </p>
            </div>

            {status?.message && (
              <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <span className="status-badge" style={{ display: 'inline-block', padding: '8px 16px', background: '#333', borderRadius: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                  Server Status: {status.message}
                </span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'monsters' && (
          <MonsterGallery />
        )}

        {activeTab === 'siege' && (
          <SiegeDefenses geminiKey={geminiKey} />
        )}

        {activeTab === 'analyzer' && isLoggedIn && (
          <DefenseAnalyzer geminiKey={geminiKey} />
        )}


        {activeTab === 'settings' && isAdmin && (
          <Settings onKeyChange={(key) => {
            setGeminiKey(key);
            localStorage.setItem('gemini_api_key', key);
          }} currentKey={geminiKey} />
        )}

        {activeTab === 'login' && !isLoggedIn && (
          <LoginPage />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminUsers />
        )}
      </main>
    </div>
  )
}


export default App
