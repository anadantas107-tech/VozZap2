// ============================================================
// VozZap - Profile Screen
// Shows user profile, posts, followers/following
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Settings, LogOut, Trash2, UserPlus, UserCheck, Camera, Sun, Moon, MessageSquare, ArrowLeft } from 'lucide-react';
import { useAuthStore, MOCK_USERS } from '@/store/authStore';
import { usePostsStore } from '@/store/postsStore';
import { useThemeStore } from '@/store/themeStore';
import { useChatStore } from '@/store/chatStore';
import { useUsersStore } from '@/store/usersStore';
import { useFollowsStore } from '@/store/followsStore';
import { User } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { PostCard } from '@/components/PostCard';
import { CommentsPanel } from '@/components/CommentsPanel';
import { CreatePostModal } from '@/components/CreatePostModal';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { formatCount } from '@/utils/format';
import { cn } from '@/utils/cn';
import { Post } from '@/types';
import { uploadSupabaseFile } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface ProfileScreenProps {
  userId?: string; // If undefined, show current user's profile
  onNavigateToChat?: (userId: string) => void;
  onBack?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ userId, onNavigateToChat, onBack }) => {
  const { currentUser, updateProfile, logout, deleteAccount, followUser, unfollowUser, followingIds } = useAuthStore();
  const { getPostsByUser } = usePostsStore();
  const { getUser, loadUserFromSupabase } = useUsersStore();
  const { getFollowers, getFollowingUsers } = useFollowsStore();
  const { theme, toggleTheme } = useThemeStore();
  const { startConversationWithUser, setActiveConversation } = useChatStore();
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [allUsersMap, setAllUsersMap] = useState<Map<string, User>>(new Map());

  const isOwnProfile = !userId || userId === currentUser?.id;
  let profileUser: User | undefined = isOwnProfile
    ? currentUser || undefined
    : MOCK_USERS.find(u => u.id === userId) || getUser(userId);

  // Try to load from Supabase if not found
  useEffect(() => {
    if (!isOwnProfile && userId && !profileUser) {
      setLoadingProfile(true);
      loadUserFromSupabase(userId).then(user => {
        if (user) {
          profileUser = user;
        }
        setLoadingProfile(false);
      });
    }
  }, [userId, isOwnProfile, profileUser, loadUserFromSupabase]);

  // Build users map and load followers/following
  useEffect(() => {
    if (profileUser) {
      // Build map of all users (MOCK_USERS + currentUser)
      const map = new Map<string, User>();
      MOCK_USERS.forEach(u => map.set(u.id, u));
      if (currentUser) map.set(currentUser.id, currentUser);
      setAllUsersMap(map);

      // Get followers of this profile user
      const followerIds = getFollowers(profileUser.id);
      const followerUsers = followerIds
        .map(id => map.get(id))
        .filter((u): u is User => u !== undefined);
      setFollowers(followerUsers);

      // Get users this profile user is following
      if (isOwnProfile && currentUser) {
        // For current user, use the followingIds from auth store
        const followingUsers = Array.from(followingIds)
          .map(id => map.get(id))
          .filter((u): u is User => u !== undefined);
        setFollowing(followingUsers);
      } else {
        // For other users' profiles, show empty for now (would need Supabase table)
        setFollowing([]);
      }
    }
  }, [profileUser, isOwnProfile, currentUser, followingIds, getFollowers]);

  const [openComments, setOpenComments] = useState<string | null>(null);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following'>('posts');

  // Edit form state
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editBio, setEditBio] = useState(currentUser?.bio || '');
  const [editAvatar, setEditAvatar] = useState(currentUser?.avatar || '');
  const avatarRef = useRef<HTMLInputElement>(null);

  if (!profileUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <p className="text-[var(--text-secondary)]">Usuário não encontrado.</p>
      </div>
    );
  }

  const userPosts = getPostsByUser(profileUser.id);
  const isFollowing = followingIds.has(profileUser.id);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;

    try {
      const previewUrl = URL.createObjectURL(file);
      setEditAvatar(previewUrl);
      // Apply preview immediately to the user's profile so avatar changes instantly
      await updateProfile({ avatar: previewUrl });

      toast.loading('Enviando foto...', { id: 'avatar-upload' });

      const uploadedUrl = await uploadSupabaseFile(file, 'avatars', currentUser.id);
      if (uploadedUrl) {
        setEditAvatar(uploadedUrl);
        // Persist final uploaded URL to profile (will also update local currentUser)
        await updateProfile({ avatar: uploadedUrl });
      }

      const isLocalPreview = previewUrl?.startsWith('blob:');
      toast.success(
        isLocalPreview
          ? '🖼️ Foto aplicada localmente. Faça login no Supabase para sincronizar no servidor.'
          : '✅ Foto atualizada!',
        { id: 'avatar-upload' }
      );
    } catch (error) {
      console.error('Avatar upload failed', error);
      toast.error('Falha ao enviar a foto, mas a pré-visualização foi mantida.', { id: 'avatar-upload' });
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) { toast.error('Nome obrigatório'); return; }
    await updateProfile({ name: editName.trim(), bio: editBio.trim(), avatar: editAvatar });
    toast.success('✅ Perfil atualizado!');
    setShowEditModal(false);
  };

  const handleDeleteAccount = () => {
    if (confirm('Tem certeza? Esta ação é irreversível e todos os seus dados serão excluídos.')) {
      deleteAccount();
      toast.success('Conta excluída. Até logo!');
    }
  };

  const handleMessageUser = () => {
    if (!currentUser || !onNavigateToChat) return;
    const convId = getOrCreateConversation(currentUser.id, profileUser.id);
    setActiveConversation(convId);
    onNavigateToChat(profileUser.id);
  };

  const handleThemeToggle = () => {
    toggleTheme();
    toast.success(
      theme === 'light' ? '🌙 Modo escuro ativado!' : '☀️ Modo claro ativado!',
      { duration: 2000 }
    );
  };

  return (
    <div className="pb-6">
      {/* Back button for other profiles */}
      {!isOwnProfile && onBack && (
        <div className="px-4 pt-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
        </div>
      )}

      {/* Profile Header */}
      <div className="relative">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-vz-secondary via-vz-primary to-vz-secondary/80" />

        {/* Avatar & info */}
        <div className="px-4 pb-4">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              <Avatar src={profileUser.avatar} name={profileUser.name} size="xl" className="ring-4 ring-[var(--bg-main)]" />
              {isOwnProfile && (
                <>
                  <button
                    onClick={() => avatarRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-vz-primary rounded-full flex items-center justify-center text-white shadow-lg border-2 border-[var(--bg-main)]"
                    aria-label="Alterar foto de perfil"
                  >
                    <Camera size={14} />
                  </button>
                  <input
                    ref={avatarRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </>
              )}
            </div>

            <div className="flex items-center gap-2 mb-2">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={handleThemeToggle}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-vz-primary transition-colors"
                    aria-label="Alternar tema"
                  >
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                  </button>
                  <button
                    onClick={() => { setEditName(currentUser?.name || ''); setEditBio(currentUser?.bio || ''); setShowEditModal(true); }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] hover:border-vz-primary hover:text-vz-primary transition-all"
                  >
                    <Edit2 size={14} />
                    Editar perfil
                  </button>
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-vz-primary transition-colors"
                    aria-label="Configurações"
                  >
                    <Settings size={18} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleMessageUser}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] hover:border-vz-primary transition-all"
                  >
                    <MessageSquare size={14} />
                    Mensagem
                  </button>
                  <button
                    onClick={() => {
                      if (isFollowing) {
                        unfollowUser(profileUser.id);
                        toast.success(`Deixou de seguir ${profileUser.name}`);
                      } else {
                        followUser(profileUser.id);
                        toast.success(`Agora seguindo ${profileUser.name}! 🎉`);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                      isFollowing
                        ? 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]'
                        : 'bg-vz-primary text-white shadow-md'
                    )}
                  >
                    {isFollowing ? <><UserCheck size={14} /> Seguindo</> : <><UserPlus size={14} /> Seguir</>}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Name & bio */}
          <h2 className="text-xl font-black text-[var(--text-primary)]">{profileUser.name}</h2>
          {profileUser.bio && (
            <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">{profileUser.bio}</p>
          )}

          {/* Stats */}
          <div className="flex gap-6 mt-4">
            <button
              onClick={() => setActiveTab('posts')}
              className="text-center hover:text-vz-primary transition-colors"
            >
              <div className="font-black text-lg text-[var(--text-primary)]">{userPosts.length}</div>
              <div className="text-xs text-[var(--text-secondary)]">posts</div>
            </button>
            <button
              onClick={() => setActiveTab('followers')}
              className="text-center hover:text-vz-primary transition-colors"
            >
              <div className="font-black text-lg text-[var(--text-primary)]">{formatCount(profileUser.followersCount)}</div>
              <div className="text-xs text-[var(--text-secondary)]">seguidores</div>
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className="text-center hover:text-vz-primary transition-colors"
            >
              <div className="font-black text-lg text-[var(--text-primary)]">{formatCount(profileUser.followingCount)}</div>
              <div className="text-xs text-[var(--text-secondary)]">seguindo</div>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] px-4 mb-4">
        {(['posts', 'followers', 'following'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-3 text-sm font-semibold capitalize transition-all border-b-2',
              activeTab === tab
                ? 'border-vz-primary text-vz-primary'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            {tab === 'posts' ? 'Publicações' : tab === 'followers' ? 'Seguidores' : 'Seguindo'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4">
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {userPosts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🎙️</div>
                <p className="text-[var(--text-secondary)]">Nenhuma publicação ainda.</p>
              </div>
            ) : (
              userPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onOpenComments={setOpenComments}
                  onOpenProfile={() => {}}
                  onEdit={isOwnProfile ? setEditPost : undefined}
                  activeAudioId={activeAudioId}
                  onAudioPlay={setActiveAudioId}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'followers' && (
          <div className="space-y-3">
            {followers.map(user => (
              <UserListItem key={user.id} user={user} currentUserId={currentUser?.id} followingIds={followingIds} onFollow={followUser} onUnfollow={unfollowUser} onOpenProfile={() => {}} />
            ))}
          </div>
        )}

        {activeTab === 'following' && (
          <div className="space-y-3">
            {following.map(user => (
              <UserListItem key={user.id} user={user} currentUserId={currentUser?.id} followingIds={followingIds} onFollow={followUser} onUnfollow={unfollowUser} onOpenProfile={() => {}} />
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="✏️ Editar Perfil">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar src={editAvatar} name={editName || 'U'} size="xl" />
              <button
                onClick={() => avatarRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-vz-primary rounded-full flex items-center justify-center text-white shadow-lg"
              >
                <Camera size={14} />
              </button>
            </div>
          </div>
          <Input
            label="Nome"
            value={editName}
            onChange={e => setEditName(e.target.value.slice(0, 50))}
            placeholder="Seu nome"
          />
          <Textarea
            label="Biografia"
            value={editBio}
            onChange={e => setEditBio(e.target.value.slice(0, 150))}
            placeholder="Fale um pouco sobre você..."
            rows={3}
          />
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setShowEditModal(false)} className="flex-1">Cancelar</Button>
            <Button variant="primary" onClick={handleSaveProfile} className="flex-1">Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="⚙️ Configurações">
        <div className="space-y-4">
          {/* Theme toggle */}
          <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-xl">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon size={20} className="text-vz-primary" /> : <Sun size={20} className="text-vz-primary" />}
              <div>
                <p className="font-semibold text-[var(--text-primary)] text-sm">
                  {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">Alterar aparência</p>
              </div>
            </div>
            <button
              onClick={handleThemeToggle}
              className={cn(
                'w-12 h-6 rounded-full transition-colors relative',
                theme === 'dark' ? 'bg-vz-primary' : 'bg-[var(--border)]'
              )}
              aria-label="Alternar tema"
            >
              <span className={cn(
                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                theme === 'dark' ? 'left-6' : 'left-0.5'
              )} />
            </button>
          </div>

          <div className="border-t border-[var(--border)] pt-4 space-y-3">
            <button
              onClick={() => { logout(); setShowSettingsModal(false); toast.success('Até logo! 👋'); }}
              className="flex items-center gap-3 w-full p-4 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition-all"
            >
              <LogOut size={18} />
              Sair da conta
            </button>
            <button
              onClick={handleDeleteAccount}
              className="flex items-center gap-3 w-full p-4 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              <Trash2 size={18} />
              Excluir conta
            </button>
          </div>
        </div>
      </Modal>

      <CommentsPanel postId={openComments} onClose={() => setOpenComments(null)} />
      <CreatePostModal isOpen={!!editPost} onClose={() => setEditPost(null)} editPost={editPost} />
    </div>
  );
};

const UserListItem: React.FC<{
  user: User;
  currentUserId?: string;
  followingIds: Set<string>;
  onFollow: (id: string) => void;
  onUnfollow: (id: string) => void;
  onOpenProfile: (id: string) => void;
}> = ({ user, currentUserId, followingIds, onFollow, onUnfollow, onOpenProfile }) => {
  const isFollowing = followingIds.has(user.id);
  const isMe = user.id === currentUserId;

  return (
    <div className="flex items-center gap-3 bg-[var(--bg-card)] rounded-2xl p-3 border border-[var(--border)]">
      <Avatar src={user.avatar} name={user.name} size="md" onClick={() => onOpenProfile(user.id)} />
      <div className="flex-1 min-w-0">
        <button onClick={() => onOpenProfile(user.id)} className="font-semibold text-sm text-[var(--text-primary)] hover:text-vz-primary transition-colors block truncate">
          {user.name}
        </button>
        <p className="text-xs text-[var(--text-secondary)] truncate">{user.bio}</p>
      </div>
      {!isMe && (
        <button
          onClick={() => isFollowing ? onUnfollow(user.id) : onFollow(user.id)}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0',
            isFollowing
              ? 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]'
              : 'bg-vz-primary text-white'
          )}
        >
          {isFollowing ? 'Seguindo' : 'Seguir'}
        </button>
      )}
    </div>
  );
};
