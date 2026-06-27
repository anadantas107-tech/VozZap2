// ============================================================
// VozZap - Top App Bar
// ============================================================

import { useState } from 'react';
import { Bell, Sun, Moon, X } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { Avatar } from './ui/Avatar';
import { useAuthStore } from '@/store/authStore';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

type Tab = 'feed' | 'search' | 'create' | 'chat' | 'profile';

const TAB_TITLES: Record<Tab, string> = {
  feed: 'VozZap',
  search: 'Explorar',
  create: 'Nova Publicação',
  chat: 'Mensagens',
  profile: 'Perfil',
};

interface TopBarProps {
  activeTab: Tab;
  onOpenProfile: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ activeTab, onOpenProfile }) => {
  const { theme, toggleTheme } = useThemeStore();
  const { currentUser } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleThemeToggle = () => {
    toggleTheme();
    toast.success(theme === 'light' ? '🌙 Modo escuro!' : '☀️ Modo claro!', { duration: 1500 });
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--border)] shadow-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
          {/* Logo / Title */}
          <div className="flex items-center gap-2">
            {activeTab === 'feed' ? (
              <>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-vz-primary to-vz-secondary flex items-center justify-center">
                  <svg viewBox="0 0 20 20" className="w-5 h-5 fill-white">
                    <path d="M10 2.5a4 4 0 014 4v4a4 4 0 01-8 0v-4a4 4 0 014-4zm-5 7.5h1.5a3.5 3.5 0 007 0H15a5 5 0 01-10 0zm5 5.5v1.5H8.5v-1.5a6 6 0 01-3-1l1-1.3a4.5 4.5 0 006 0l1 1.3a6 6 0 01-3 1z" />
                  </svg>
                </div>
                <span className="text-xl font-black text-[var(--text-primary)]">VozZap</span>
              </>
            ) : (
              <h1 className="text-lg font-bold text-[var(--text-primary)]">{TAB_TITLES[activeTab]}</h1>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={handleThemeToggle}
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                'text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)]'
              )}
              aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Notifications */}
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition-colors relative"
              aria-label="Notificações"
              onClick={() => setShowNotifications(v => !v)}
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-vz-primary rounded-full" />
            </button>

            {/* Avatar */}
            {currentUser && (
              <button onClick={onOpenProfile} aria-label="Abrir perfil">
                <Avatar src={currentUser.avatar} name={currentUser.name} size="sm" className="ring-2 ring-vz-primary/30" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Notifications dropdown */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex flex-col" onClick={() => setShowNotifications(false)}>
          <div className="max-w-lg mx-auto w-full mt-14" onClick={e => e.stopPropagation()}>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-b-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <h3 className="font-bold text-[var(--text-primary)]">Notificações</h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <NotificationsScreen onOpenProfile={(id) => {
                  setShowNotifications(false);
                  onOpenProfile();
                  // Note: would navigate to user profile with ID in full impl
                  console.log('Opening profile:', id);
                }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
