// ============================================================
// VozZap - Chat Store (Zustand)
// Manages direct messages and conversations with Supabase
// ============================================================

import { create } from 'zustand';
import { DirectMessage, Conversation, User } from '@/types';
import { MOCK_USERS } from './authStore';
import { supabase, reportSupabaseError, isSupabaseUuid } from '@/lib/supabase';

// Cache for user info in conversations
const userCache = new Map<string, Pick<User, 'id' | 'name' | 'avatar'>>();

const generateMockMessages = (userId: string): DirectMessage[] => [
  {
    id: 'msg-1',
    senderId: 'user-2',
    receiverId: userId,
    text: 'Oi! Adorei seu último post sobre a Iara 😊',
    read: true,
    sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-2',
    senderId: userId,
    receiverId: 'user-2',
    text: 'Que bom que gostou! Essa lenda é muito especial pra mim',
    read: true,
    sentAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
  },
];

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, DirectMessage[]>;
  activeConversationId: string | null;
  initializeChat: (currentUserId: string) => Promise<void>;
  sendMessage: (senderId: string, receiverId: string, text?: string, audioUrl?: string, audioDuration?: number) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  getOrCreateConversation: (currentUserId: string, otherUserId: string) => string;
  startConversationWithUser: (currentUserId: string, otherUser: User) => string;
}

const buildConversationId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join('_');
};

// Helper to get user from cache or MOCK_USERS
const getUserInfo = (userId: string): Pick<User, 'id' | 'name' | 'avatar'> | undefined => {
  // Check cache first
  if (userCache.has(userId)) {
    return userCache.get(userId);
  }
  // Check MOCK_USERS
  const mockUser = MOCK_USERS.find(u => u.id === userId);
  if (mockUser) {
    userCache.set(userId, { id: mockUser.id, name: mockUser.name, avatar: mockUser.avatar });
    return userCache.get(userId);
  }
  return undefined;
};

const cacheUserInfo = (user: User) => {
  userCache.set(user.id, { id: user.id, name: user.name, avatar: user.avatar });
};

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  activeConversationId: null,

  initializeChat: async (currentUserId: string) => {
    if (supabase && isSupabaseUuid(currentUserId)) {
      const { data, error } = await supabase.from('direct_messages').select('*').or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`).order('created_at', { ascending: true });
      if (!error && data) {
        const conversationMap = new Map<string, Conversation>();
        const messagesMap: Record<string, DirectMessage[]> = {};

        data.forEach(msg => {
          const otherUserId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
          const convId = buildConversationId(currentUserId, otherUserId);
          const otherUser = getUserInfo(otherUserId);
          if (!otherUser) return;

          if (!messagesMap[convId]) messagesMap[convId] = [];
          messagesMap[convId].push({
            id: msg.id,
            senderId: msg.sender_id,
            receiverId: msg.receiver_id,
            text: msg.text || undefined,
            audioUrl: msg.audio_url || undefined,
            audioDuration: msg.audio_duration || undefined,
            read: msg.read,
            sentAt: msg.created_at,
          });

          const lastMessage = messagesMap[convId].slice().sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()).at(-1);
          conversationMap.set(convId, {
            id: convId,
            participant: { id: otherUser.id, name: otherUser.name, avatar: otherUser.avatar },
            lastMessage,
            unreadCount: 0,
          });
        });

        set({ conversations: Array.from(conversationMap.values()), messages: messagesMap });
        return;
      }

      if (error) {
        reportSupabaseError('chat.initialize', error);
        set({ conversations: [], messages: {} });
        return;
      }
    }

    const mockMessages = generateMockMessages(currentUserId);
    const conversationMap = new Map<string, Conversation>();
    mockMessages.forEach(msg => {
      const otherUserId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
      const convId = buildConversationId(currentUserId, otherUserId);
      const otherUser = getUserInfo(otherUserId);
      if (!otherUser) return;

      if (!conversationMap.has(convId)) {
        conversationMap.set(convId, {
          id: convId,
          participant: { id: otherUser.id, name: otherUser.name, avatar: otherUser.avatar },
          lastMessage: msg,
          unreadCount: 0,
        });
      } else {
        const conv = conversationMap.get(convId)!;
        const lastMsg = conv.lastMessage;
        if (!lastMsg || new Date(msg.sentAt) > new Date(lastMsg.sentAt)) {
          conv.lastMessage = msg;
        }
      }
    });

    const messagesMap: Record<string, DirectMessage[]> = {};
    conversationMap.forEach((_, convId) => {
      const [u1, u2] = convId.split('_');
      messagesMap[convId] = mockMessages.filter(
        m => (m.senderId === u1 && m.receiverId === u2) ||
             (m.senderId === u2 && m.receiverId === u1)
      ).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    });

    set({ conversations: Array.from(conversationMap.values()), messages: messagesMap });
  },

  sendMessage: async (senderId, receiverId, text, audioUrl, audioDuration) => {
    const convId = buildConversationId(senderId, receiverId);
    if (!isSupabaseUuid(senderId) || !isSupabaseUuid(receiverId)) {
      const newMsg: DirectMessage = {
        id: `msg-${Date.now()}`,
        senderId,
        receiverId,
        text,
        audioUrl,
        audioDuration,
        read: false,
        sentAt: new Date().toISOString(),
      };

      set(state => {
        const existing = state.messages[convId] || [];
        const newMessages = { ...state.messages, [convId]: [...existing, newMsg] };
        const existingConv = state.conversations.find(c => c.id === convId);
        let newConversations: Conversation[];
        if (existingConv) {
          newConversations = state.conversations.map(c => c.id === convId ? { ...c, lastMessage: newMsg } : c);
        } else {
          const otherUser = getUserInfo(receiverId);
          if (otherUser) {
            newConversations = [...state.conversations, {
              id: convId,
              participant: { id: otherUser.id, name: otherUser.name, avatar: otherUser.avatar },
              lastMessage: newMsg,
              unreadCount: 0,
            }];
          } else {
            newConversations = state.conversations;
          }
        }

        return { messages: newMessages, conversations: newConversations };
      });
      return;
    }
    const newMsg: DirectMessage = {
      id: `msg-${Date.now()}`,
      senderId,
      receiverId,
      text,
      audioUrl,
      audioDuration,
      read: false,
      sentAt: new Date().toISOString(),
    };

    if (supabase && isSupabaseUuid(senderId) && isSupabaseUuid(receiverId)) {
      try {
        const { data, error } = await supabase.from('direct_messages').insert({
          sender_id: senderId,
          receiver_id: receiverId,
          text,
          audio_url: audioUrl,
          audio_duration: audioDuration,
          read: false,
        }).select('*').single();

        if (!error && data) {
          newMsg.id = data.id;
          newMsg.sentAt = data.created_at;
        } else if (error) {
          reportSupabaseError('chat.sendMessage', error);
        }
      } catch (error) {
        reportSupabaseError('chat.sendMessage', error);
      }
    }

    set(state => {
      const existing = state.messages[convId] || [];
      const newMessages = { ...state.messages, [convId]: [...existing, newMsg] };
      const existingConv = state.conversations.find(c => c.id === convId);
      let newConversations: Conversation[];
      if (existingConv) {
        newConversations = state.conversations.map(c => c.id === convId ? { ...c, lastMessage: newMsg } : c);
      } else {
        const otherUser = getUserInfo(receiverId);
        if (otherUser) {
          newConversations = [...state.conversations, {
            id: convId,
            participant: { id: otherUser.id, name: otherUser.name, avatar: otherUser.avatar },
            lastMessage: newMsg,
            unreadCount: 0,
          }];
        } else {
          newConversations = state.conversations;
        }
      }

      return { messages: newMessages, conversations: newConversations };
    });
  },

  markAsRead: async (conversationId) => {
    const [firstId, secondId] = conversationId.split('_');
    if (supabase && isSupabaseUuid(firstId) && isSupabaseUuid(secondId)) {
      const { data } = await supabase.from('direct_messages').select('*').eq('receiver_id', firstId).limit(1);
      if (data) {
        await supabase.from('direct_messages').update({ read: true }).in('id', data.map(item => item.id));
      }
    }

    set(state => {
      const msgs = state.messages[conversationId] || [];
      const updated = msgs.map(m => ({ ...m, read: true }));
      return {
        messages: { ...state.messages, [conversationId]: updated },
        conversations: state.conversations.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c),
      };
    });
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),

  getOrCreateConversation: (currentUserId, otherUserId) => {
    const convId = buildConversationId(currentUserId, otherUserId);
    const { conversations } = get();
    if (!conversations.find(c => c.id === convId)) {
      const otherUser = getUserInfo(otherUserId);
      if (otherUser) {
        set(state => ({
          conversations: [...state.conversations, {
            id: convId,
            participant: { id: otherUser.id, name: otherUser.name, avatar: otherUser.avatar },
            unreadCount: 0,
          }],
          messages: { ...state.messages, [convId]: [] },
        }));
      }
    }
    return convId;
  },

  startConversationWithUser: (currentUserId, otherUser) => {
    // Cache the user info
    cacheUserInfo(otherUser);
    
    const convId = buildConversationId(currentUserId, otherUser.id);
    const { conversations } = get();
    
    // Create conversation if doesn't exist
    if (!conversations.find(c => c.id === convId)) {
      set(state => ({
        conversations: [...state.conversations, {
          id: convId,
          participant: { id: otherUser.id, name: otherUser.name, avatar: otherUser.avatar },
          unreadCount: 0,
        }],
        messages: { ...state.messages, [convId]: [] },
      }));
    }
    
    return convId;
  },
}));
