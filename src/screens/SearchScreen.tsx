// ============================================================
// VozZap - Search Screen
// Search users, posts, categories
// ============================================================

import React, { useState, useMemo } from 'react';
import { Search, UserPlus, UserCheck } from 'lucide-react';
import { usePostsStore } from '@/store/postsStore';
import { useAuthStore, MOCK_USERS } from '@/store/authStore';
import { Category } from '@/types';
import { PostCard } from '@/components/PostCard';
import { Avatar } from '@/components/ui/Avatar';
import { CommentsPanel } from '@/components/CommentsPanel';
import { CreatePostModal } from '@/components/CreatePostModal';
import { formatCount } from '@/utils/format';
import { cn } from '@/utils/cn';
import { Post } from '@/types';
import toast from 'react-hot-toast';

const CATEGORIES: Category[] = ['Música', 'Comédia', 'Educação', 'Notícias', 'História', 'Outros'];

interface SearchScreenProps {
  onOpenProfile: (userId: string) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ onOpenProfile }) => {
  const { searchPosts } = usePostsStore();
  const { currentUser, followingIds, followUser, unfollowUser } = useAuthStore();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | undefined>();
  const [activeTab, setActiveTab] = useState<'posts' | 'people'>('posts');
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);

  const filteredPosts = useMemo(
    () => searchPosts(query, activeCategory),
    [query, activeCategory, searchPosts]
  );

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return MOCK_USERS.filter(u => u.id !== currentUser?.id);
    const lower = query.toLowerCase();
    return MOCK_USERS.filter(u =>
      u.id !== currentUser?.id &&
      (u.name.toLowerCase().includes(lower) || u.bio?.toLowerCase().includes(lower))
    );
  }, [query, currentUser]);

  return (
    <div className="pb-4">
      {/* Search bar */}
      <div className="px-4 pt-4 pb-3 sticky top-0 bg-[var(--bg-main)] z-10">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pesquisar publicações e pessoas..."
            className={cn(
              'w-full pl-10 pr-4 py-3 rounded-2xl text-sm',
              'bg-[var(--bg-card)] border border-[var(--border)]',
              'text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]',
              'focus:outline-none focus:ring-2 focus:ring-vz-primary focus:border-transparent',
              'transition-all'
            )}
            aria-label="Campo de pesquisa"
          />
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setActiveTab('posts')}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
              activeTab === 'posts'
                ? 'bg-vz-primary text-white'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]'
            )}
          >
            Publicações
          </button>
          <button
            onClick={() => setActiveTab('people')}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
              activeTab === 'people'
                ? 'bg-vz-primary text-white'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]'
            )}
          >
            Pessoas
          </button>
        </div>

        {/* Category filters (posts tab) */}
        {activeTab === 'posts' && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveCategory(undefined)}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                !activeCategory
                  ? 'bg-vz-primary text-white'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]'
              )}
            >
              Todos
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? undefined : cat)}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  activeCategory === cat
                    ? 'bg-vz-primary text-white'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="px-4">
        {activeTab === 'posts' ? (
          <>
            {filteredPosts.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">🔍</div>
                <p className="text-[var(--text-secondary)]">Nenhuma publicação encontrada.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onOpenComments={setOpenComments}
                    onOpenProfile={onOpenProfile}
                    onEdit={setEditPost}
                    activeAudioId={activeAudioId}
                    onAudioPlay={setActiveAudioId}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">👤</div>
                <p className="text-[var(--text-secondary)]">Nenhum usuário encontrado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map(user => {
                  const isFollowing = followingIds.has(user.id);
                  return (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border)]"
                    >
                      <Avatar
                        src={user.avatar}
                        name={user.name}
                        size="md"
                        onClick={() => onOpenProfile(user.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => onOpenProfile(user.id)}
                          className="font-semibold text-[var(--text-primary)] hover:text-vz-primary transition-colors text-sm truncate block"
                        >
                          {user.name}
                        </button>
                        <p className="text-xs text-[var(--text-secondary)] truncate">{user.bio}</p>
                        <div className="flex gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                          <span><strong>{formatCount(user.followersCount)}</strong> seguidores</span>
                          <span><strong>{user.postsCount}</strong> posts</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (isFollowing) {
                            unfollowUser(user.id);
                            toast.success(`Deixou de seguir ${user.name}`);
                          } else {
                            followUser(user.id);
                            toast.success(`Agora seguindo ${user.name}! 🎉`);
                          }
                        }}
                        className={cn(
                          'flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0',
                          isFollowing
                            ? 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]'
                            : 'bg-vz-primary text-white shadow-sm'
                        )}
                      >
                        {isFollowing ? <><UserCheck size={14} /> Seguindo</> : <><UserPlus size={14} /> Seguir</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <CommentsPanel postId={openComments} onClose={() => setOpenComments(null)} />
      <CreatePostModal isOpen={!!editPost} onClose={() => setEditPost(null)} editPost={editPost} />
    </div>
  );
};
