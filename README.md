# RDS Imóveis

Portal imobiliário responsivo com vitrine pública, busca e painel administrativo. A aplicação usa React, TypeScript, Vite e Supabase (Auth, PostgreSQL e Storage).

## Executar localmente

```sh
npm install
cp .env.example .env.local
```

Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do projeto Supabase. A chave `anon`/publishable é própria para uso no navegador; nunca coloque a `service_role` no front-end. Depois:

```sh
npm run dev
```

Sem variáveis do Supabase, a vitrine usa os dois imóveis fictícios definidos em [src/lib/demo.ts](./src/lib/demo.ts). Esse modo é apenas para visualização: não habilita login, gravação nem persistência local.

## Preparar o Supabase

1. Crie um projeto Supabase.
2. Execute [supabase/migrations/202611020001_initial_schema.sql](./supabase/migrations/202611020001_initial_schema.sql) no SQL Editor ou aplique a migration com a CLI do Supabase.
3. Crie um usuário em **Authentication → Users**. Para a demonstração, o login da interface aceita `admin` e o converte para `admin@rds.local`; a senha é definida no Supabase (o valor temporário solicitado é `admin123`, altere-o antes de qualquer uso real).
4. Copie o UUID desse usuário e, no SQL Editor, conceda o perfil administrativo:

   ```sql
   insert into public.profiles (id, role, full_name)
   values ('UUID_DO_USUARIO_AUTH', 'admin', 'Administrador')
   on conflict (id) do update set role = 'admin', full_name = excluded.full_name;
   ```

5. Configure as URLs de redirecionamento do Supabase Auth para os endereços local e publicado da aplicação.
6. Preencha as variáveis em `.env.local` e reinicie o servidor Vite.

O acesso administrativo usa Supabase Auth; nenhum cadastro público de usuários é oferecido. A autorização também é verificada pela tabela `profiles` e por políticas RLS. Não publique a senha temporária `admin123`.

## Funcionalidades

- Vitrine pública sem login, páginas de busca e detalhes.
- Busca por localização, finalidade, tipo, faixa de preço, área, dormitórios e diferenciais.
- Apenas imóveis publicados são retornados nas consultas públicas. A view pública omite endereço, número, complemento e CEP.
- Painel protegido para métricas, relatórios com filtros, imóveis, equipe e canais de contato.
- Cadastro e edição de imóveis, gestão de status com histórico, fotos no Supabase Storage, vídeos YouTube e links externos com controle de visibilidade.
- Captadores e corretores são cadastros independentes.
- Migração cria as tabelas, índices, views públicas, políticas RLS, bucket de imagens e os dois imóveis fictícios com fotografias ilustrativas.

## Verificação

```sh
npm run build
```
