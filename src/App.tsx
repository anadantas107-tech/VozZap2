// ============================================================
// VozZap - Main Application Component
// Audio social network - mobile-first experience
// ============================================================

import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore, MOCK_USERS } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useChatStore } from '@/store/chatStore';
import { usePostsStore } from '@/store/postsStore';
import { useUsersStore } from '@/store/usersStore';
import { AuthScreen } from '@/screens/AuthScreen';
import { FeedScreen } from '@/screens/FeedScreen';
import { SearchScreen } from '@/screens/SearchScreen';
import { ChatScreen } from '@/screens/ChatScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { BottomNav } from '@/components/BottomNav';
import { TopBar } from '@/components/TopBar';
import { CreatePostModal } from '@/components/CreatePostModal';

type Tab = 'feed' | 'search' | 'create' | 'chat' | 'profile';

export default function App() {
  const { isAuthenticated, currentUser, initializeAuth } = useAuthStore();
  const { theme } = useThemeStore();
  const { initializeChat } = useChatStore();
  const { initializePosts } = usePostsStore();
  const { addUser } = useUsersStore();
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | undefined>(undefined);

  // Initialize mock users on mount
  useEffect(() => {
    MOCK_USERS.forEach(user => addUser(user));
  }, [addUser]);

  // Debug: Log authentication status changes
  useEffect(() => {
    console.log('[App] Auth state changed:', { isAuthenticated, currentUser: currentUser?.name, currentUserId: currentUser?.id });
    // Add current user to registry
    if (currentUser) {
      addUser(currentUser);
    }
  }, [isAuthenticated, currentUser, addUser]);

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (currentUser) {
      void initializePosts();
      void initializeChat(currentUser.id);
    }
  }, [currentUser, initializeChat, initializePosts]);

  const handleTabChange = (tab: Tab) => {
    if (tab === 'create') {
      setCreateModalOpen(true);
      return;
    }
    setActiveTab(tab);
    // Clear viewing profile when switching tabs
    if (tab !== 'profile') {
      setViewingUserId(undefined);
    }
  };

  const handleOpenProfile = (userId: string) => {
    setViewingUserId(userId);
    setActiveTab('profile');
  };

  const handleNavigateToChat = (_userId: string) => {
    setActiveTab('chat');
  };

  if (!isAuthenticated) {
    return (
      <>
        <div className={theme}>
          <AuthScreen />
        </div>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: theme === 'dark' ? '#1F2937' : '#fff',
              color: theme === 'dark' ? '#F9FAFB' : '#111827',
              borderRadius: '12px',
              border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`,
              fontSize: '14px',
              fontWeight: 500,
            },
          }}
        />
      </>
    );
  }

  return (
    <div className={theme}>
      <div className="min-h-screen bg-[var(--bg-main)]">
        {/* Toast notifications */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: theme === 'dark' ? '#1F2937' : '#fff',
              color: theme === 'dark' ? '#F9FAFB' : '#111827',
              borderRadius: '12px',
              border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`,
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            },
            success: {
              iconTheme: { primary: '#25D366', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#fff' },
            },
          }}
        />

        {/* Main layout container */}
        <div className="max-w-lg mx-auto relative min-h-screen flex flex-col">
          {/* Top Bar */}
          <TopBar
            activeTab={activeTab}
            onOpenProfile={() => {
              setViewingUserId(undefined);
              setActiveTab('profile');
            }}
          />

          {/* Main content area - scrollable */}
          <main className="flex-1 overflow-y-auto pb-20" style={{ scrollbarWidth: 'thin' }}>
            {activeTab === 'feed' && (
              <FeedScreen onOpenProfile={handleOpenProfile} />
            )}
            {activeTab === 'search' && (
              <SearchScreen onOpenProfile={handleOpenProfile} />
            )}
            {activeTab === 'chat' && (
              <ChatScreen onOpenProfile={handleOpenProfile} />
            )}
            {activeTab === 'profile' && (
              <ProfileScreen
                userId={viewingUserId}
                onNavigateToChat={handleNavigateToChat}
                onOpenProfile={handleOpenProfile}
                onBack={viewingUserId ? () => {
                  setViewingUserId(undefined);
                  // Go back to previous context
                } : undefined}
              />
            )}
          </main>

          {/* Bottom Navigation */}
          <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* Create Post Modal (accessible from + button) */}
        <CreatePostModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
        />
      </div>
    </div>
  );
}
