// ============================================================
// VozZap - Follows Store (Zustand)
// Manages bidirectional follower relationships across all users
// ============================================================

import { create } from 'zustand';
import { User } from '@/types';

interface FollowsState {
  // Map: userId -> Set of user IDs following them
  followersMap: Map<string, Set<string>>;
  
  // Functions
  getFollowers: (userId: string) => string[];
  addFollower: (userId: string, followerId: string) => void;
  removeFollower: (userId: string, followerId: string) => void;
  getFollowerUsers: (userId: string, allUsers: Map<string, User>) => User[];
  getFollowingUsers: (followingIds: Set<string>, allUsers: Map<string, User>) => User[];
}

export const useFollowsStore = create<FollowsState>((set, get) => {
  // Initialize from localStorage if available
  const getStoredFollowersMap = (): Map<string, Set<string>> => {
    if (typeof window === 'undefined') return new Map();
    const stored = localStorage.getItem('vozzap_followers_map');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert back to Map<string, Set<string>>
        const map = new Map<string, Set<string>>();
        Object.entries(parsed).forEach(([userId, followers]: [string, any]) => {
          map.set(userId, new Set(followers));
        });
        return map;
      } catch {
        return new Map();
      }
    }
    return new Map();
  };

  const persistFollowersMap = (map: Map<string, Set<string>>) => {
    if (typeof window === 'undefined') return;
    const obj: { [key: string]: string[] } = {};
    map.forEach((followers, userId) => {
      obj[userId] = Array.from(followers);
    });
    localStorage.setItem('vozzap_followers_map', JSON.stringify(obj));
  };

  return {
    followersMap: getStoredFollowersMap(),

    getFollowers: (userId: string) => {
      const { followersMap } = get();
      const followers = followersMap.get(userId) || new Set();
      return Array.from(followers);
    },

    addFollower: (userId: string, followerId: string) => {
      set((state) => {
        const newMap = new Map(state.followersMap);
        const followers = newMap.get(userId) || new Set<string>();
        followers.add(followerId);
        newMap.set(userId, followers);
        persistFollowersMap(newMap);
        return { followersMap: newMap };
      });
    },

    removeFollower: (userId: string, followerId: string) => {
      set((state) => {
        const newMap = new Map(state.followersMap);
        const followers = newMap.get(userId);
        if (followers) {
          followers.delete(followerId);
          if (followers.size === 0) {
            newMap.delete(userId);
          } else {
            newMap.set(userId, followers);
          }
        }
        persistFollowersMap(newMap);
        return { followersMap: newMap };
      });
    },

    getFollowerUsers: (userId: string, allUsers: Map<string, User>) => {
      const { getFollowers } = get();
      const followerIds = getFollowers(userId);
      return followerIds
        .map(id => allUsers.get(id))
        .filter((user): user is User => user !== undefined);
    },

    getFollowingUsers: (followingIds: Set<string>, allUsers: Map<string, User>) => {
      return Array.from(followingIds)
        .map(id => allUsers.get(id))
        .filter((user): user is User => user !== undefined);
    },
  };
});
