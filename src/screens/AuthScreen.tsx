// ============================================================
// VozZap - Auth Screen (Login / Register)
// ============================================================

import React, { useState, useRef } from 'react';
import { Mail, Lock, User, Eye, EyeOff, Camera } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

type AuthMode = 'login' | 'register' | 'forgot';

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const avatarRef = useRef<HTMLInputElement>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (mode === 'register' && !name.trim()) errs.name = 'Nome obrigatório';
    if (!email.includes('@')) errs.email = 'E-mail inválido';
    if (mode !== 'forgot' && password.length < 6) errs.password = 'Mínimo 6 caracteres';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      if (mode === 'login') {
        console.log('[AuthScreen] Login attempt:', { email });
        const res = await login(email, password);
        console.log('[AuthScreen] Login response:', res);
        if (!res.success) {
          toast.error(res.message || 'E-mail ou senha incorretos.');
        }
      } else if (mode === 'register') {
        console.log('[AuthScreen] Register attempt:', { name, email });
        const res = await register(name, email, password, avatarPreview || undefined);
        console.log('[AuthScreen] Register response:', res);
        if (!res.success) {
          toast.error(res.message || 'Erro ao criar conta.');
        } else {
          console.log('[AuthScreen] Registration successful, should navigate to feed');
          toast.success('🎉 Bem-vindo ao VozZap!');
          // Reset form for next use
          resetForm();
        }
      } else {
        // Forgot password simulation
        toast.success('📧 E-mail de redefinição enviado!');
        setMode('login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-vz-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-vz-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-vz-primary to-vz-secondary shadow-2xl shadow-vz-primary/30 mb-4">
            <svg viewBox="0 0 40 40" className="w-10 h-10 fill-white">
              <path d="M20 5C11.716 5 5 11.716 5 20s6.716 15 15 15 15-6.716 15-15S28.284 5 20 5zm0 4a4 4 0 014 4v8a4 4 0 01-8 0v-8a4 4 0 014-4zm-7 12h2a5 5 0 0010 0h2a7 7 0 01-14 0zm7 9v3h-2v-3a9.038 9.038 0 01-1 0v-2a7 7 0 008 0v2a9.038 9.038 0 01-5 0v3h-2v-3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-[var(--text-primary)]">VozZap</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">A rede social de áudios curtos</p>
        </div>

        {/* Card */}
        <div className="bg-[var(--bg-card)] rounded-3xl shadow-2xl shadow-black/10 border border-[var(--border)] p-6">
          {/* Tabs */}
          {mode !== 'forgot' && (
            <div className="flex rounded-2xl overflow-hidden bg-[var(--bg-secondary)] p-1 mb-6">
              <button
                onClick={() => setMode('login')}
                className={cn(
                  'flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all',
                  mode === 'login'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)]'
                )}
              >
                Entrar
              </button>
              <button
                onClick={() => setMode('register')}
                className={cn(
                  'flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all',
                  mode === 'register'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)]'
                )}
              >
                Cadastrar
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar upload for register */}
            {mode === 'register' && (
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--bg-secondary)] border-2 border-[var(--border)] flex items-center justify-center">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} className="text-[var(--text-secondary)]" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-vz-primary rounded-full flex items-center justify-center text-white shadow-lg"
                    aria-label="Alterar foto de perfil"
                  >
                    <Camera size={14} />
                  </button>
                  <input
                    ref={avatarRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">Foto de perfil (opcional)</span>
              </div>
            )}

            {/* Name (register only) */}
            {mode === 'register' && (
              <Input
                label="Nome completo"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Seu nome"
                icon={<User size={18} />}
                error={errors.name}
                autoComplete="name"
              />
            )}

            {/* Forgot password mode */}
            {mode === 'forgot' && (
              <div className="text-center mb-2">
                <h2 className="font-bold text-[var(--text-primary)] text-lg">Esqueceu a senha?</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Enviaremos um link para redefinir sua senha.
                </p>
              </div>
            )}

            {/* Email */}
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              icon={<Mail size={18} />}
              error={errors.email}
              autoComplete="email"
            />

            {/* Password */}
            {mode !== 'forgot' && (
              <div className="relative">
                <Input
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••"
                  icon={<Lock size={18} />}
                  error={errors.password}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}

            {/* Forgot password link */}
            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm text-vz-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
              className="w-full"
            >
              {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Enviar e-mail'}
            </Button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-sm text-[var(--text-secondary)] hover:text-vz-primary transition-colors"
              >
                Voltar ao login
              </button>
            )}
          </form>

        </div>

        <p className="text-center text-xs text-[var(--text-secondary)] mt-6">
          © 2024 VozZap · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};
