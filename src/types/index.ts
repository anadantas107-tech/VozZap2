// ============================================================
// VozZap - Type Definitions
// ============================================================

export type Theme = 'light' | 'dark';

export type Category = 'Música' | 'Comédia' | 'Educação' | 'Notícias' | 'História' | 'Outros';

export type Visibility = 'public' | 'followers';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
  theme: Theme;
}

export interface Post {
  id: string;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'avatar'>;
  title: string;
  description: string;
  category: Category;
  audioUrl: string;
  duration: number; // seconds
  coverUrl?: string;
  visibility: Visibility;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'avatar'>;
  text: string;
  parentId?: string;
  replies?: Comment[];
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text?: string;
  audioUrl?: string;
  audioDuration?: number;
  read: boolean;
  sentAt: string;
}

export interface Conversation {
  id: string;
  participant: Pick<User, 'id' | 'name' | 'avatar'>;
  lastMessage?: DirectMessage;
  unreadCount: number;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message';
  fromUser: Pick<User, 'id' | 'name' | 'avatar'>;
  postId?: string;
  message: string;
  read: boolean;
  createdAt: string;
}
