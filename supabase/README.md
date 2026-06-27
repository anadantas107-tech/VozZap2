# Supabase para VozZap

## Ordem de execução no SQL Editor

1. Execute [setup.sql](setup.sql)
2. Execute [chat.sql](chat.sql)
3. Execute [storage-buckets.sql](storage-buckets.sql)

## Variáveis de ambiente

Adicione no arquivo [.env](../.env):

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SEU_ANON_KEY
```

## O que é criado

- Tabelas: profiles, posts, comments, direct_messages
- Buckets: audio-files, covers, avatars
- Políticas de acesso básicas para autenticação
