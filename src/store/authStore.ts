// ============================================================
// VozZap - Auth Store (Zustand)
// Manages authentication state with Supabase-backed persistence
// ============================================================

import { create } from 'zustand';
import { User } from '@/types';
import { supabase, mapSupabaseProfileToUser, reportSupabaseError, isSupabaseUuid, getSupabaseEnvStatus } from '@/lib/supabase';
import { useFollowsStore } from './followsStore';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string, avatar?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  followUser: (userId: string) => void;
  unfollowUser: (userId: string) => void;
  followingIds: Set<string>;
}

const MOCK_USERS: User[] = [
  {
    id: 'user-1',
    name: 'Ana Paula',
    email: 'ana@vozzap.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AnaP&backgroundColor=b6e3f4',
    bio: '🎙️ Contadora de histórias em áudio | Educadora e apaixonada por podcasts',
    followersCount: 0,
    followingCount: 0,
    postsCount: 89,
    createdAt: '2024-01-15T10:00:00Z',
    theme: 'dark',
  },
  {
    id: 'user-2',
    name: 'Carlos Mendes',
    email: 'carlos@vozzap.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos&backgroundColor=ffdfbf',
    bio: '🎵 Músico e produtor de conteúdo | Compartilhando minha arte em voz',
    followersCount: 0,
    followingCount: 0,
    postsCount: 156,
    createdAt: '2023-11-20T10:00:00Z',
    theme: 'light',
  },
  {
    id: 'user-3',
    name: 'Beatriz Santos',
    email: 'beatriz@vozzap.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Beatriz&backgroundColor=d1d4f9',
    bio: '🎭 Humorista e stand-up comedian | Fazendo o mundo rir um áudio por vez',
    followersCount: 0,
    followingCount: 0,
    postsCount: 234,
    createdAt: '2023-08-05T10:00:00Z',
    theme: 'dark',
  },
  {
    id: 'user-4',
    name: 'Rafael Oliveira',
    email: 'rafael@vozzap.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rafael&backgroundColor=c0aede',
    bio: '📰 Jornalista | Notícias rápidas e objetivas em formato de áudio',
    followersCount: 0,
    followingCount: 0,
    postsCount: 412,
    createdAt: '2024-02-28T10:00:00Z',
    theme: 'light',
  },
];

const isValidEmail = (email: string) => {
  const normalized = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeName = (name: string) => name.trim();

const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('vozzap_user');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

const getStoredFollowing = (): Set<string> => {
  if (typeof window === 'undefined') return new Set(['user-2', 'user-3']);
  const stored = localStorage.getItem('vozzap_following');
  if (stored) {
    try {
      return new Set(JSON.parse(stored));
    } catch {
      return new Set(['user-2', 'user-3']);
    }
  }
  return new Set(['user-2', 'user-3']);
};

const persistUser = (user: User | null) => {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem('vozzap_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('vozzap_user');
  }
};

const persistFollowing = (followingIds: Set<string>) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('vozzap_following', JSON.stringify([...followingIds]));
};

const createDemoUser = (email: string): User => ({
  id: crypto.randomUUID(),
  name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
  email,
  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}&backgroundColor=b6e3f4`,
  bio: '✨ Novo no VozZap! Explorando o mundo dos áudios.',
  followersCount: 0,
  followingCount: 0,
  postsCount: 0,
  createdAt: new Date().toISOString(),
  theme: 'dark',
});

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: getStoredUser(),
  isAuthenticated: !!getStoredUser(),
  followingIds: getStoredFollowing(),

  initializeAuth: async () => {
    if (!supabase) {
      const stored = getStoredUser();
      if (stored) {
        set({ currentUser: stored, isAuthenticated: true });
      }
      return;
    }

    const stored = getStoredUser();
    if (stored && !isSupabaseUuid(stored.id)) {
      set({ currentUser: stored, isAuthenticated: true });
      return;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        reportSupabaseError('auth.getSession', error);
        return;
      }

      if (!session?.user) {
        const stored = getStoredUser();
        if (stored) {
          set({ currentUser: stored, isAuthenticated: true });
        }
        return;
      }

      const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (profileError) {
        reportSupabaseError('auth.loadProfile', profileError);
        return;
      }

      const user = mapSupabaseProfileToUser(profile, session.user);
      persistUser(user);
      set({ currentUser: user, isAuthenticated: true });
    } catch (error) {
      reportSupabaseError('auth.initialize', error);
    }
  },

  login: async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);

    if (supabase) {
      const env = getSupabaseEnvStatus();
      if (!env.isConfigured) {
        console.warn('[Supabase] not configured - skipping remote login');
        return { success: false, message: 'Supabase não configurado.' };
      }
      try {
        const { data: { session }, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) {
          const message = error instanceof Error ? error.message : String(error);
          reportSupabaseError('auth.signInWithPassword', error);
          if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('credentials')) {
            return { success: false, message: 'E-mail ou senha inválidos.' };
          }

          if (message.toLowerCase().includes('email not confirmed') || message.toLowerCase().includes('confirm')) {
            const demoUser = createDemoUser(email);
            persistUser(demoUser);
            set({ currentUser: demoUser, isAuthenticated: true });
            return { success: true };
          }

          return { success: false, message };
        }

        if (session?.user) {
          const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
          if (profileError) {
            reportSupabaseError('auth.loadProfile', profileError);
            return { success: false, message: 'Erro ao carregar perfil.' };
          }

          const user = mapSupabaseProfileToUser(profile, session.user);
          persistUser(user);
          set({ currentUser: user, isAuthenticated: true });
          return { success: true };
        }
      } catch (error) {
        reportSupabaseError('auth.login', error);
        const demoUser = createDemoUser(email);
        persistUser(demoUser);
        set({ currentUser: demoUser, isAuthenticated: true });
        return { success: true };
      }

      return { success: false, message: 'Login falhou.' };
    }

    const user = MOCK_USERS.find(u => u.email === email);
    if (user) {
      persistUser(user);
      set({ currentUser: user, isAuthenticated: true });
      return { success: true };
    }

    if (email === 'demo@vozzap.com' || email.includes('@')) {
      const demoUser = createDemoUser(email);
      persistUser(demoUser);
      set({ currentUser: demoUser, isAuthenticated: true });
      return { success: true };
    }

    return { success: false, message: 'Usuário não encontrado.' };
  },

  register: async (name: string, email: string, password: string, avatar?: string) => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedName = normalizeName(name);

    console.log('[Auth] Register attempt:', { email: normalizedEmail, name: normalizedName });

    if (!isValidEmail(normalizedEmail)) {
      console.warn('[Auth] invalid email format:', email);
      return { success: false, message: 'E-mail inválido.' };
    }

    // Create local user first as fallback
    const localUser: User = {
      id: crypto.randomUUID(),
      name: normalizedName,
      email: normalizedEmail,
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${normalizedName}&backgroundColor=b6e3f4`,
      bio: '✨ Bem-vindo ao VozZap!',
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      createdAt: new Date().toISOString(),
      theme: 'dark',
    };

    if (supabase) {
      try {
        // Create user on Supabase
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              name: normalizedName,
              avatar_url: avatar || null,
            },
          },
        });

        if (error) {
          const authError = error as { name?: string; message?: string; status?: number; statusText?: string; status_code?: number; details?: string };
          const message = authError?.message || (error instanceof Error ? error.message : String(error));
          reportSupabaseError('auth.signUp', error);
          console.error('[Auth] signUp failed', { error, data });

          if (authError?.status === 422 || authError?.status_code === 422) {
            return {
              success: false,
              message: message.includes('already registered')
                ? 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.'
                : message,
            };
          }

          if (authError?.name === 'AuthRetryableFetchError' || authError?.status === 500) {
            console.log('[Auth] Signup failed but creating local user as fallback...');
            // Fallback to local user when Supabase is down
            persistUser(localUser);
            set({ currentUser: localUser, isAuthenticated: true, followingIds: new Set() });
            return { success: true };
          }

          if (authError?.status === 401) {
            return {
              success: false,
              message: 'Chave de API Supabase inválida ou não configurada corretamente.',
            };
          }

          return { success: false, message };
        }

        if (data.user) {
          // User created on Supabase! Create a local session immediately
          const demoUser: User = {
            id: data.user.id,
            name: normalizedName,
            email: normalizedEmail,
            avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${normalizedName}&backgroundColor=b6e3f4`,
            bio: '✨ Bem-vindo ao VozZap!',
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            createdAt: new Date().toISOString(),
            theme: 'dark',
          };
          
          // Try to sign in automatically
          try {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
            if (signInError) {
              const msg = signInError instanceof Error ? signInError.message : String(signInError);
              reportSupabaseError('auth.signInAfterSignUp', signInError);
              console.warn('[Auth] Sign-in after signup failed:', msg);
              // Still log the user in with demo user
              persistUser(demoUser);
              set({ currentUser: demoUser, isAuthenticated: true, followingIds: new Set() });
              return { success: true };
            }

            if (signInData?.session?.user) {
              // Got session, load profile
              const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', signInData.session.user.id).maybeSingle();
              if (profileError) {
                reportSupabaseError('auth.loadProfile', profileError);
              }

              const user = mapSupabaseProfileToUser(profile, signInData.session.user);
              persistUser(user);
              set({ currentUser: user, isAuthenticated: true, followingIds: new Set() });
              return { success: true };
            } else {
              // No session but no error - use demo user
              persistUser(demoUser);
              set({ currentUser: demoUser, isAuthenticated: true, followingIds: new Set() });
              return { success: true };
            }
          } catch (signInError) {
            reportSupabaseError('auth.signInAfterSignUp', signInError);
            console.warn('[Auth] Sign-in after signup exception:', signInError);
            // Use demo user as fallback
            persistUser(demoUser);
            set({ currentUser: demoUser, isAuthenticated: true, followingIds: new Set() });
            return { success: true };
          }
        }

        return { success: false, message: 'Falha ao criar usuário.' };
      } catch (error) {
        reportSupabaseError('auth.register', error);
        console.error('[Auth] Register exception:', error);
        // Even with error, create local user as fallback
        console.log('[Auth] Creating local user as fallback due to exception');
        persistUser(localUser);
        set({ currentUser: localUser, isAuthenticated: true, followingIds: new Set() });
        return { success: true };
      }
    }

    // Fallback: no Supabase, create locally
    const newUser: User = {
      id: crypto.randomUUID(),
      name: normalizedName,
      email: normalizedEmail,
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${normalizedName}&backgroundColor=b6e3f4`,
      bio: '✨ Bem-vindo ao VozZap!',
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      createdAt: new Date().toISOString(),
      theme: 'dark',
    };
    persistUser(newUser);
    set({ currentUser: newUser, isAuthenticated: true, followingIds: new Set() });
    return { success: true };
  },

  logout: async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    persistUser(null);
    set({ currentUser: null, isAuthenticated: false });
  },

  updateProfile: async (updates: Partial<User>) => {
    const { currentUser } = get();
    if (!currentUser) return;
    if (supabase) {
      await supabase.from('profiles').update({
        name: updates.name,
        bio: updates.bio,
        avatar_url: updates.avatar,
      }).eq('id', currentUser.id);
    }
    const updated = { ...currentUser, ...updates };
    persistUser(updated);
    set({ currentUser: updated });
  },

  deleteAccount: async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('vozzap_user');
    localStorage.removeItem('vozzap_following');
    set({ currentUser: null, isAuthenticated: false, followingIds: new Set() });
  },

  followUser: (userId: string) => {
    const { followingIds, currentUser } = get();
    const newFollowing = new Set(followingIds);
    newFollowing.add(userId);
    persistFollowing(newFollowing);
    
    if (currentUser) {
      const followsStore = useFollowsStore.getState();
      followsStore.addFollowing(currentUser.id, userId);
      followsStore.addFollower(userId, currentUser.id);
      const updated = { ...currentUser, followingCount: currentUser.followingCount + 1 };
      persistUser(updated);
      set({ followingIds: newFollowing, currentUser: updated });
    } else {
      set({ followingIds: newFollowing });
    }
  },

  unfollowUser: (userId: string) => {
    const { followingIds, currentUser } = get();
    const newFollowing = new Set(followingIds);
    newFollowing.delete(userId);
    persistFollowing(newFollowing);
    
    if (currentUser) {
      const followsStore = useFollowsStore.getState();
      followsStore.removeFollowing(currentUser.id, userId);
      followsStore.removeFollower(userId, currentUser.id);
      const updated = { ...currentUser, followingCount: Math.max(0, currentUser.followingCount - 1) };
      persistUser(updated);
      set({ followingIds: newFollowing, currentUser: updated });
    } else {
      set({ followingIds: newFollowing });
    }
  },
}));

export { MOCK_USERS };
