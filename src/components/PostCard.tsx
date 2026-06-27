// ============================================================
// VozZap - Post Card Component
// Displays an audio post in the feed
// ============================================================

import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, MoreVertical, Edit2, Trash2, Lock, Globe } from 'lucide-react';
import { Post } from '@/types';
import { usePostsStore } from '@/store/postsStore';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from './ui/Avatar';
import { AudioPlayer } from './AudioPlayer';
import { formatCount, formatRelativeTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface PostCardProps {
  post: Post;
  onOpenComments: (postId: string) => void;
  onOpenProfile: (userId: string) => void;
  onEdit?: (post: Post) => void;
  activeAudioId: string | null;
  onAudioPlay: (postId: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Música': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'Comédia': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  'Educação': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Notícias': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'História': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'Outros': 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300',
};

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onOpenComments,
  onOpenProfile,
  onEdit,
  activeAudioId,
  onAudioPlay,
}) => {
  const { toggleLike, deletePost } = usePostsStore();
  const { currentUser } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const isOwner = currentUser?.id === post.userId;
  const isAudioActive = activeAudioId === post.id;

  const handleLike = () => {
    if (!currentUser) return;
    toggleLike(post.id, currentUser.id);
    if (!post.isLiked) {
      toast.success('❤️ Curtido!', { duration: 1500 });
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}?post=${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('🔗 Link copiado!');
    } catch {
      toast.success('🔗 Link copiado!');
    }
  };

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir esta publicação?')) {
      deletePost(post.id);
      toast.success('Publicação excluída.');
    }
    setShowMenu(false);
  };

  return (
    <article className="bg-[var(--bg-card)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Cover image if available */}
      {post.coverUrl && (
        <div className="h-32 overflow-hidden bg-[var(--bg-secondary)]">
          <img src={post.coverUrl} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar
              src={post.user.avatar}
              name={post.user.name}
              size="md"
              onClick={() => onOpenProfile(post.userId)}
            />
            <div>
              <button
                onClick={() => onOpenProfile(post.userId)}
                className="font-semibold text-[var(--text-primary)] hover:text-vz-primary transition-colors text-sm"
              >
                {post.user.name}
              </button>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-[var(--text-secondary)]">
                  {formatRelativeTime(post.createdAt)}
                </span>
                {post.visibility === 'followers' && (
                  <span className="flex items-center gap-0.5 text-xs text-[var(--text-secondary)]">
                    <Lock size={10} />
                    seguidores
                  </span>
                )}
                {post.visibility === 'public' && (
                  <span className="flex items-center gap-0.5 text-xs text-[var(--text-secondary)]">
                    <Globe size={10} />
                    público
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Category badge */}
            <span className={cn(
              'text-xs font-medium px-2.5 py-1 rounded-full',
              CATEGORY_COLORS[post.category] || CATEGORY_COLORS['Outros']
            )}>
              {post.category}
            </span>

            {/* Post menu */}
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
                  aria-label="Mais opções"
                >
                  <MoreVertical size={16} />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg z-20 min-w-[140px] overflow-hidden">
                      <button
                        onClick={() => { onEdit?.(post); setShowMenu(false); }}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                      >
                        <Edit2 size={14} />
                        Editar
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 size={14} />
                        Excluir
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="font-bold text-[var(--text-primary)] mb-1 leading-tight">{post.title}</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-3 leading-relaxed line-clamp-2">
          {post.description}
        </p>

        {/* Audio Player */}
        <AudioPlayer
          audioUrl={post.audioUrl}
          duration={post.duration}
          isGlobalActive={isAudioActive}
          onPlay={() => onAudioPlay(post.id)}
          className="mb-3"
        />

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-4">
            {/* Like */}
            <button
              onClick={handleLike}
              className={cn(
                'flex items-center gap-1.5 text-sm font-medium transition-all duration-200 active:scale-90',
                post.isLiked
                  ? 'text-red-500'
                  : 'text-[var(--text-secondary)] hover:text-red-500'
              )}
              aria-label={`${post.isLiked ? 'Descurtir' : 'Curtir'} publicação (${post.likesCount} curtidas)`}
            >
              <Heart
                size={18}
                className={cn('transition-all', post.isLiked && 'fill-current')}
              />
              <span>{formatCount(post.likesCount)}</span>
            </button>

            {/* Comments */}
            <button
              onClick={() => onOpenComments(post.id)}
              className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-vz-primary transition-colors"
              aria-label={`Ver ${post.commentsCount} comentários`}
            >
              <MessageCircle size={18} />
              <span>{formatCount(post.commentsCount)}</span>
            </button>
          </div>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-vz-primary transition-colors"
            aria-label="Compartilhar publicação"
          >
            <Share2 size={18} />
            <span className="hidden sm:inline">Compartilhar</span>
          </button>
        </div>
      </div>
    </article>
  );
};
