// ============================================================
// VozZap - Notifications Screen (embedded in profile)
// ============================================================

import React from 'react';
import { Heart, MessageCircle, UserPlus, Bell } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { formatRelativeTime } from '@/utils/format';
import { cn } from '@/utils/cn';

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    type: 'like' as const,
    from: { id: 'user-2', name: 'Carlos Mendes', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos&backgroundColor=ffdfbf' },
    message: 'curtiu sua publicação "Lenda da Iara"',
    read: false,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    type: 'comment' as const,
    from: { id: 'user-3', name: 'Beatriz Santos', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Beatriz&backgroundColor=d1d4f9' },
    message: 'comentou: "Que voz incrível! 🎙️"',
    read: false,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    type: 'follow' as const,
    from: { id: 'user-4', name: 'Rafael Oliveira', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rafael&backgroundColor=c0aede' },
    message: 'começou a te seguir',
    read: true,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    type: 'like' as const,
    from: { id: 'user-3', name: 'Beatriz Santos', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Beatriz&backgroundColor=d1d4f9' },
    message: 'curtiu sua publicação "Nova música: Verão Tropical"',
    read: true,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
];

const ICON_MAP = {
  like: { icon: Heart, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
  comment: { icon: MessageCircle, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
  follow: { icon: UserPlus, color: 'text-vz-primary bg-green-50 dark:bg-green-900/20' },
  message: { icon: Bell, color: 'text-vz-primary bg-green-50 dark:bg-green-900/20' },
};

interface NotificationsScreenProps {
  onOpenProfile: (userId: string) => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onOpenProfile }) => {
  return (
    <div>
      <div className="divide-y divide-[var(--border)]">
        {MOCK_NOTIFICATIONS.map(notif => {
          const { icon: Icon, color } = ICON_MAP[notif.type];
          return (
            <div
              key={notif.id}
              className={cn(
                'flex items-center gap-3 px-4 py-3 transition-colors',
                !notif.read ? 'bg-vz-primary/5' : 'hover:bg-[var(--bg-secondary)]'
              )}
            >
              {/* User avatar with type icon overlay */}
              <div className="relative flex-shrink-0">
                <Avatar
                  src={notif.from.avatar}
                  name={notif.from.name}
                  size="md"
                  onClick={() => onOpenProfile(notif.from.id)}
                />
                <span className={cn('absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center', color)}>
                  <Icon size={11} />
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)] leading-snug">
                  <strong
                    className="cursor-pointer hover:text-vz-primary transition-colors"
                    onClick={() => onOpenProfile(notif.from.id)}
                  >
                    {notif.from.name}
                  </strong>
                  {' '}
                  {notif.message}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {formatRelativeTime(notif.createdAt)}
                </p>
              </div>

              {/* Unread indicator */}
              {!notif.read && (
                <div className="w-2 h-2 rounded-full bg-vz-primary flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
