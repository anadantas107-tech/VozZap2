// ============================================================
// VozZap - Comments Panel Component
// ============================================================

import React, { useState } from 'react';
import { X, Send, Reply, Trash2 } from 'lucide-react';
import { usePostsStore } from '@/store/postsStore';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from './ui/Avatar';
import { formatRelativeTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface CommentsPanelProps {
  postId: string | null;
  onClose: () => void;
}

export const CommentsPanel: React.FC<CommentsPanelProps> = ({ postId, onClose }) => {
  const { comments, addComment, deleteComment, posts } = usePostsStore();
  const { currentUser } = useAuthStore();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!postId) return null;

  const post = posts.find(p => p.id === postId);
  const postComments = comments[postId] || [];
  const topLevel = postComments.filter(c => !c.parentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText || !currentUser) return;

    setIsSubmitting(true);
    try {
      setText('');
      setReplyTo(null);
      addComment(
        postId,
        currentUser.id,
        { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar },
        trimmedText,
        replyTo?.id
      );
      toast.success('💬 Comentário adicionado!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (commentId: string) => {
    if (confirm('Excluir comentário?')) {
      deleteComment(postId, commentId);
      toast.success('Comentário excluído.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative w-full max-w-lg bg-[var(--bg-card)] rounded-t-2xl shadow-2xl',
          'flex flex-col max-h-[75vh]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h3 className="font-bold text-[var(--text-primary)]">Comentários</h3>
            {post && (
              <p className="text-xs text-[var(--text-secondary)] truncate max-w-[200px]">{post.title}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
            aria-label="Fechar comentários"
          >
            <X size={20} />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {topLevel.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-2">💬</p>
              <p className="text-[var(--text-secondary)] text-sm">Seja o primeiro a comentar!</p>
            </div>
          ) : (
            topLevel.map(comment => {
              const replies = postComments.filter(c => c.parentId === comment.id);
              const isOwner = currentUser?.id === comment.userId;
              return (
                <div key={comment.id}>
                  <div className="flex gap-3">
                    <Avatar src={comment.user.avatar} name={comment.user.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="bg-[var(--bg-secondary)] rounded-xl rounded-tl-sm px-3 py-2.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-xs text-[var(--text-primary)]">
                            {comment.user.name}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--text-primary)] leading-relaxed">{comment.text}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 pl-2">
                        <button
                          onClick={() => setReplyTo({ id: comment.id, name: comment.user.name })}
                          className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-vz-primary transition-colors"
                        >
                          <Reply size={12} />
                          Responder
                        </button>
                        {isOwner && (
                          <button
                            onClick={() => handleDelete(comment.id)}
                            className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={12} />
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {replies.length > 0 && (
                    <div className="ml-10 mt-2 space-y-2">
                      {replies.map(reply => {
                        const isReplyOwner = currentUser?.id === reply.userId;
                        return (
                          <div key={reply.id} className="flex gap-2">
                            <Avatar src={reply.user.avatar} name={reply.user.name} size="xs" />
                            <div className="flex-1 min-w-0">
                              <div className="bg-[var(--bg-secondary)] rounded-xl rounded-tl-sm px-3 py-2">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-semibold text-xs text-[var(--text-primary)]">
                                    {reply.user.name}
                                  </span>
                                  <span className="text-xs text-[var(--text-secondary)]">
                                    {formatRelativeTime(reply.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-[var(--text-primary)] leading-relaxed">{reply.text}</p>
                              </div>
                              {isReplyOwner && (
                                <button
                                  onClick={() => handleDelete(reply.id)}
                                  className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-red-500 transition-colors ml-2 mt-1"
                                >
                                  <Trash2 size={11} />
                                  Excluir
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-[var(--border)] p-4">
          {replyTo && (
            <div className="flex items-center justify-between bg-vz-primary/10 rounded-lg px-3 py-2 mb-2">
              <span className="text-xs text-vz-primary">
                Respondendo a <strong>{replyTo.name}</strong>
              </span>
              <button onClick={() => setReplyTo(null)} className="text-vz-primary hover:text-red-500">
                <X size={14} />
              </button>
            </div>
          )}
          {currentUser ? (
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <Avatar src={currentUser.avatar} name={currentUser.name} size="sm" />
              <div className="flex-1 flex items-end gap-2 bg-[var(--bg-secondary)] rounded-2xl px-3 py-2 border border-[var(--border)]">
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value.slice(0, 500))}
                  placeholder="Escreva um comentário..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] resize-none outline-none max-h-24 overflow-y-auto"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e as unknown as React.FormEvent);
                    }
                  }}
                />
                <span className="text-xs text-[var(--text-secondary)] self-center">{text.length}/500</span>
              </div>
              <button
                type="submit"
                disabled={!text.trim() || isSubmitting}
                className="w-10 h-10 rounded-full bg-vz-primary flex items-center justify-center text-white disabled:opacity-50 hover:bg-vz-primary/90 transition-colors flex-shrink-0"
                aria-label="Enviar comentário"
              >
                <Send size={16} />
              </button>
            </form>
          ) : (
            <p className="text-center text-sm text-[var(--text-secondary)]">
              Faça login para comentar
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
