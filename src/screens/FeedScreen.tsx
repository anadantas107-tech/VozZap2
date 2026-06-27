// ============================================================
// VozZap - Feed Screen
// Infinite scroll feed of audio posts
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { usePostsStore } from '@/store/postsStore';
import { useAuthStore } from '@/store/authStore';
import { PostCard } from '@/components/PostCard';
import { CommentsPanel } from '@/components/CommentsPanel';
import { CreatePostModal } from '@/components/CreatePostModal';
import { Post } from '@/types';

interface FeedScreenProps {
  onOpenProfile: (userId: string) => void;
}

const PAGE_SIZE = 5;

export const FeedScreen: React.FC<FeedScreenProps> = ({ onOpenProfile }) => {
  const { getFeedPosts } = usePostsStore();
  const { currentUser, followingIds } = useAuthStore();
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef<HTMLDivElement>(null);

  const allPosts = currentUser
    ? getFeedPosts(followingIds, currentUser.id)
    : [];

  const posts = allPosts.slice(0, visibleCount);
  const hasMore = visibleCount < allPosts.length;

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount(prev => prev + PAGE_SIZE);
        }
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore]);

  const handleAudioPlay = (postId: string) => {
    setActiveAudioId(postId);
  };

  if (allPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
        <div className="text-6xl mb-4">🎙️</div>
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Feed vazio!</h3>
        <p className="text-[var(--text-secondary)] text-sm max-w-xs mb-6">
          Siga outros usuários ou publique seu primeiro áudio para começar.
        </p>
        <div className="bg-gradient-to-r from-vz-secondary to-vz-primary p-4 rounded-2xl text-white text-left max-w-xs w-full">
          <p className="font-bold text-sm mb-1">💡 Dica</p>
          <p className="text-xs text-white/80">Vá para a aba "Explorar" e siga alguns criadores para ver seus conteúdos aqui.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Feed header */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="font-bold text-[var(--text-primary)]">Para você</h2>
        <p className="text-xs text-[var(--text-secondary)]">{allPosts.length} publicações</p>
      </div>

      {/* Posts */}
      <div className="space-y-4 px-4">
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            onOpenComments={setOpenComments}
            onOpenProfile={onOpenProfile}
            onEdit={setEditPost}
            activeAudioId={activeAudioId}
            onAudioPlay={handleAudioPlay}
          />
        ))}
      </div>

      {/* Infinite scroll loader */}
      {hasMore && (
        <div ref={loaderRef} className="flex justify-center py-6">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-vz-primary/40 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
          🎉 Você viu tudo por aqui!
        </div>
      )}

      {/* Modals */}
      <CommentsPanel postId={openComments} onClose={() => setOpenComments(null)} />
      <CreatePostModal
        isOpen={!!editPost}
        onClose={() => setEditPost(null)}
        editPost={editPost}
      />
    </div>
  );
};
