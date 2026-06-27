// ============================================================
// VozZap - Posts Store (Zustand)
// Manages audio posts with Supabase-backed persistence
// ============================================================

import { create } from 'zustand';
import { Post, Comment, Category, Visibility } from '@/types';
import { supabase, reportSupabaseError, isSupabaseUuid } from '@/lib/supabase';

// Áudio WAV de teste com 3 segundos de tom de 440Hz (Lá4)
// Gerado para teste do player de áudio
const MOCK_AUDIO_URL = 'data:audio/wav;base64,UklGRi4CAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIBAAAAAA==UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA==';
const FALLBACK_COVER_URL = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="#0f172a"/><circle cx="400" cy="180" r="95" fill="#22d3ee" opacity="0.9"/><path d="M350 150h100v140H350z" fill="#fff"/><path d="M330 290l140 60-20 40-140-60z" fill="#38bdf8"/></svg>');

const generateMockPosts = (): Post[] => [
  {
    id: 'post-1',
    userId: 'user-2',
    user: { id: 'user-2', name: 'Carlos Mendes', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos&backgroundColor=ffdfbf' },
    title: 'Nova música: Verão Tropical 🎵',
    description: 'Acabei de compor essa faixa inspirada nas praias do Nordeste. Espero que vocês curtam essa vibe de verão!',
    category: 'Música',
    audioUrl: MOCK_AUDIO_URL,
    duration: 87,
    coverUrl: FALLBACK_COVER_URL,
    visibility: 'public',
    likesCount: 342,
    commentsCount: 28,
    isLiked: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post-2',
    userId: 'user-3',
    user: { id: 'user-3', name: 'Beatriz Santos', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Beatriz&backgroundColor=d1d4f9' },
    title: 'Stand-up: Aplicativos de delivery 😂',
    description: 'Meu novo bit sobre a saga de pedir comida online. Quem nunca pediu pizza e recebeu uma estátua de barro?',
    category: 'Comédia',
    audioUrl: MOCK_AUDIO_URL,
    duration: 124,
    visibility: 'public',
    likesCount: 891,
    commentsCount: 74,
    isLiked: true,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post-3',
    userId: 'user-1',
    user: { id: 'user-1', name: 'Ana Paula', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AnaP&backgroundColor=b6e3f4' },
    title: 'Dicas de storytelling',
    description: 'Como estruturar uma narrativa envolvente em poucos minutos de áudio.',
    category: 'Educação',
    audioUrl: MOCK_AUDIO_URL,
    duration: 95,
    coverUrl: FALLBACK_COVER_URL,
    visibility: 'public',
    likesCount: 128,
    commentsCount: 12,
    isLiked: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post-4',
    userId: 'user-4',
    user: { id: 'user-4', name: 'Rafael Oliveira', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rafael&backgroundColor=c0aede' },
    title: 'Resumo rápido: Manchetes do dia',
    description: 'Atualização com os principais fatos do dia em 2 minutos.',
    category: 'Notícias',
    audioUrl: MOCK_AUDIO_URL,
    duration: 120,
    coverUrl: FALLBACK_COVER_URL,
    visibility: 'public',
    likesCount: 54,
    commentsCount: 6,
    isLiked: false,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const generateMockComments = (): Comment[] => [
  {
    id: 'comment-1',
    postId: 'post-1',
    userId: 'user-1',
    user: { id: 'user-1', name: 'Ana Paula', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AnaP&backgroundColor=b6e3f4' },
    text: 'Que música incrível! Fiquei com a vibe de praia o dia todo 🌊🎶',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment-2',
    postId: 'post-1',
    userId: 'user-3',
    user: { id: 'user-3', name: 'Beatriz Santos', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Beatriz&backgroundColor=d1d4f9' },
    text: 'Carlos você se superou! Esse ritmo é contagiante demais 🔥',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];

interface PostsState {
  posts: Post[];
  comments: Record<string, Comment[]>;
  initializePosts: () => Promise<void>;
  addPost: (post: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'likesCount' | 'commentsCount' | 'isLiked'>) => Promise<Post>;
  updatePost: (id: string, updates: Partial<Pick<Post, 'title' | 'description' | 'category' | 'visibility'>>) => void;
  deletePost: (id: string) => void;
  toggleLike: (postId: string, userId: string) => void;
  addComment: (postId: string, userId: string, user: Comment['user'], text: string, parentId?: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => void;
  getPostsByUser: (userId: string) => Post[];
  getFeedPosts: (followingIds: Set<string>, currentUserId: string) => Post[];
  searchPosts: (query: string, category?: Category) => Post[];
}

export const usePostsStore = create<PostsState>((set, get) => ({
  posts: generateMockPosts(),
  comments: {
    'post-1': generateMockComments().filter(c => c.postId === 'post-1'),
  },

  initializePosts: async () => {
    if (!supabase) {
      set({ posts: generateMockPosts(), comments: { 'post-1': generateMockComments().filter(c => c.postId === 'post-1') } });
      return;
    }
    // Ensure we have an authenticated session before calling Supabase endpoints
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      set({ posts: generateMockPosts(), comments: { 'post-1': generateMockComments().filter(c => c.postId === 'post-1') } });
      return;
    }

    const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (error || !data) {
      reportSupabaseError('posts.initialize', error);
      set({ posts: [], comments: {} });
      return;
    }

    // Load profiles to get user names and avatars
    let profileMap: Record<string, { name: string; avatar?: string }> = {};
    const userIds = [...new Set(data.map(p => p.user_id))];
    
    if (userIds.length > 0) {
      try {
        const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, name, avatar_url').in('id', userIds);
        if (!profileError && profiles) {
          profileMap = Object.fromEntries(profiles.map(p => [p.id, { name: p.name || 'Usuário', avatar: p.avatar_url }]));
        }
      } catch (err) {
        reportSupabaseError('posts.loadProfiles', err);
        // Continue without profiles - will use cached user_name/user_avatar if available
      }
    }

    const mappedPosts: Post[] = data.map(item => {
      const profile = profileMap[item.user_id] || { name: item.user_name || 'Usuário', avatar: item.user_avatar };
      return {
        id: item.id,
        userId: item.user_id,
        user: { id: item.user_id, name: profile.name, avatar: profile.avatar },
        title: item.title,
        description: item.description || '',
        category: (item.category || 'Outros') as Category,
        audioUrl: item.audio_url || MOCK_AUDIO_URL,
        duration: item.duration || 0,
        coverUrl: item.cover_url || FALLBACK_COVER_URL,
        visibility: (item.visibility || 'public') as Visibility,
        likesCount: item.likes_count || 0,
        commentsCount: item.comments_count || 0,
        isLiked: false,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    });

    set({ posts: mappedPosts, comments: {} });
  },

  addPost: async (postData) => {
    const newPost: Post = {
      ...postData,
      id: `post-${Date.now()}`,
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (supabase && isSupabaseUuid(postData.userId)) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        // Not authenticated with Supabase, fallback to local mock behavior
        set(state => ({ posts: [newPost, ...state.posts] }));
        return newPost;
      }

      // Save post to Supabase
      const { data, error } = await supabase.from('posts').insert({
        user_id: postData.userId,
        title: postData.title,
        description: postData.description,
        category: postData.category,
        audio_url: postData.audioUrl,
        cover_url: postData.coverUrl,
        duration: postData.duration,
        visibility: postData.visibility,
      }).select('*').single();

      if (!error && data) {
        const savedPost: Post = {
          ...newPost,
          id: data.id,
          user: { id: postData.userId, name: postData.user.name, avatar: postData.user.avatar },
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          likesCount: data.likes_count || 0,
          commentsCount: data.comments_count || 0,
        };
        set(state => ({ posts: [savedPost, ...state.posts.filter(p => p.id !== savedPost.id)] }));
        return savedPost;
      }

      if (error) {
        reportSupabaseError('posts.addPost', error);
      }
    }

    set(state => ({ posts: [newPost, ...state.posts] }));
    return newPost;
  },

  updatePost: (id, updates) => {
    set(state => ({
      posts: state.posts.map(p =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      ),
    }));
  },

  deletePost: (id) => {
    set(state => ({
      posts: state.posts.filter(p => p.id !== id),
    }));
  },

  toggleLike: (postId, _userId) => {
    set(state => ({
      posts: state.posts.map(p => {
        if (p.id !== postId) return p;
        const isLiked = !p.isLiked;
        return {
          ...p,
          isLiked,
          likesCount: isLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
        };
      }),
    }));
  },

  addComment: async (postId, userId, user, text, parentId) => {
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      postId,
      userId,
      user,
      text,
      parentId,
      createdAt: new Date().toISOString(),
    };

    if (supabase) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!session?.access_token || sessionError) {
        // Skip server-side insert when not authenticated
      } else {
        const { data, error } = await supabase.from('comments').insert({
          post_id: postId,
          user_id: userId,
          text,
          parent_id: parentId || null,
        }).select('*').single();

        if (!error && data) {
          newComment.id = data.id;
          newComment.createdAt = data.created_at;
        } else if (error) {
          reportSupabaseError('posts.addComment', error);
        }
      }
    }

    set(state => {
      const existing = state.comments[postId] || [];
      return {
        comments: { ...state.comments, [postId]: [...existing, newComment] },
        posts: state.posts.map(p =>
          p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
        ),
      };
    });
  },

  deleteComment: (postId, commentId) => {
    set(state => {
      const existing = state.comments[postId] || [];
      return {
        comments: { ...state.comments, [postId]: existing.filter(c => c.id !== commentId) },
        posts: state.posts.map(p =>
          p.id === postId ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) } : p
        ),
      };
    });
  },

  getPostsByUser: (userId) => {
    return get().posts.filter(p => p.userId === userId).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  getFeedPosts: (followingIds, currentUserId) => {
    return get().posts
      .filter(p => {
        const isFromFollowing = followingIds.has(p.userId);
        const isFromSelf = p.userId === currentUserId;
        const isPublic = p.visibility === 'public';
        // Show posts from following users, self posts, or public posts from anyone
        return isFromFollowing || isFromSelf || isPublic;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  searchPosts: (query, category) => {
    const lower = query.toLowerCase();
    return get().posts
      .filter(p => p.visibility === 'public')
      .filter(p => {
        const matchesQuery = !query ||
          p.title.toLowerCase().includes(lower) ||
          p.description.toLowerCase().includes(lower) ||
          p.user.name.toLowerCase().includes(lower);
        const matchesCategory = !category || p.category === category;
        return matchesQuery && matchesCategory;
      })
      .sort((a, b) => b.likesCount - a.likesCount);
  },
}));
