// ============================================================
// VozZap - Users Store (Zustand)
// Centralized user registry for finding any user by ID
// ============================================================

import { create } from 'zustand';
import { User } from '@/types';
import { supabase, reportSupabaseError } from '@/lib/supabase';

interface UsersState {
  users: Map<string, User>;
  addUser: (user: User) => void;
  getUser: (userId: string) => User | undefined;
  loadUserFromSupabase: (userId: string) => Promise<User | undefined>;
  searchUsers: (query: string) => User[];
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: new Map(),

  addUser: (user: User) => {
    set(state => {
      const newMap = new Map(state.users);
      newMap.set(user.id, user);
      return { users: newMap };
    });
  },

  getUser: (userId: string) => {
    const { users } = get();
    return users.get(userId);
  },

  loadUserFromSupabase: async (userId: string) => {
    // Try local store first
    const cached = get().getUser(userId);
    if (cached) {
      console.log('[UsersStore] Found user in cache:', userId);
      return cached;
    }

    if (!supabase) {
      console.log('[UsersStore] No Supabase, cannot load user:', userId);
      return undefined;
    }

    try {
      console.log('[UsersStore] Loading user from Supabase:', userId);
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      
      if (error) {
        reportSupabaseError('users.loadFromSupabase', error);
        return undefined;
      }

      if (data) {
        const user: User = {
          id: data.id,
          name: data.name || 'Usuário',
          email: data.email || '',
          avatar: data.avatar_url,
          bio: data.bio || '',
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          createdAt: data.created_at,
          theme: 'dark',
        };
        get().addUser(user);
        console.log('[UsersStore] Loaded user from Supabase:', user.name);
        return user;
      }
    } catch (error) {
      reportSupabaseError('users.loadFromSupabase', error);
    }

    return undefined;
  },

  searchUsers: (query: string) => {
    const { users } = get();
    const lower = query.toLowerCase();
    return Array.from(users.values()).filter(u =>
      u.name.toLowerCase().includes(lower) ||
      u.email.toLowerCase().includes(lower)
    );
  },
}));
