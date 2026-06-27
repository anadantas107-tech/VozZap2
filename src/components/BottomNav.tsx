// ============================================================
// VozZap - Bottom Navigation Bar
// ============================================================

import React from 'react';
import { Home, Search, Plus, MessageCircle, User } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useChatStore } from '@/store/chatStore';

type Tab = 'feed' | 'search' | 'create' | 'chat' | 'profile';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const { conversations } = useChatStore();
  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const items = [
    { id: 'feed' as Tab, icon: Home, label: 'Feed' },
    { id: 'search' as Tab, icon: Search, label: 'Buscar' },
    { id: 'create' as Tab, icon: Plus, label: 'Publicar', special: true },
    { id: 'chat' as Tab, icon: MessageCircle, label: 'Mensagens', badge: unreadCount },
    { id: 'profile' as Tab, icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-vz-secondary safe-area-bottom" role="navigation" aria-label="Navegação principal">
      <div className="max-w-lg mx-auto flex items-center">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.special) {
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="flex-1 flex justify-center py-2"
                aria-label={item.label}
              >
                <div className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center transition-all',
                  'bg-vz-primary shadow-lg shadow-vz-primary/40',
                  'hover:bg-vz-primary/90 active:scale-90'
                )}>
                  <Icon size={24} className="text-white" strokeWidth={2.5} />
                </div>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="flex-1 flex flex-col items-center gap-1 py-3 relative"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  size={22}
                  className={cn(
                    'transition-all',
                    isActive ? 'text-vz-primary' : 'text-white/60'
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {item.badge != null && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold leading-none">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium transition-all',
                isActive ? 'text-vz-primary' : 'text-white/60'
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-vz-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
