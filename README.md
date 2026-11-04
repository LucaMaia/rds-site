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
- Formulário de interesse no detalhe do imóvel: envia os dados do cliente e os detalhes do anúncio por e-mail; após a confirmação, permite abrir o WhatsApp do atendimento com a mensagem preenchida.

## Contato por e-mail e WhatsApp

O formulário público usa a Supabase Edge Function `property-inquiry`. O destinatário do e-mail é o contato configurado no painel; se estiver vazio, usa `lucamaia2007@hotmail.com`. Para o primeiro teste com `onboarding@resend.dev`, o destino deve ser o endereço da própria conta Resend; para outros destinatários, verifique um domínio no Resend e use um remetente desse domínio. O WhatsApp é aberto com a mensagem pronta para o corretor atribuído (ou contato disponível), mas o cliente precisa confirmar o envio no próprio WhatsApp.

Para ativar:

1. Aplique [supabase/migrations/20261103214000_property_inquiry_rate_limits.sql](./supabase/migrations/20261103214000_property_inquiry_rate_limits.sql) no Supabase.
2. No Supabase, configure os secrets `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (remetente de um domínio verificado no Resend) e `ALLOWED_ORIGINS` (origens separadas por vírgula; inclua `https://rds-site.vercel.app` e a origem local usada no desenvolvimento).
3. Faça deploy com `supabase functions deploy property-inquiry`. As variáveis internas `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são lidas somente pela Edge Function.

A função limita envios por IP, valida os dados e aceita chamadas somente das origens configuradas. Nunca configure a chave do Resend ou a `service_role` em variáveis `VITE_*` ou no navegador. A entrega real depende de uma chave válida do Resend e de um remetente verificado.

## Integrações XML com portais

A Etapa 1 adiciona a tabela `public.imovel_integracoes`, que relaciona imóveis a `olx` ou `wimoveis`, impede duplicidade por imóvel/portal e restringe o acesso direto a administradores autenticados via RLS. A role `service_role` recebe leitura para uso exclusivo no backend das futuras Edge Functions; ela nunca deve ser usada no frontend. A migration deve ser aplicada no projeto Supabase antes de usar os controles de portais do painel.

O editor administrativo permite marcar se o imóvel deverá ser incluído futuramente na seleção de cada portal. Essa preferência é salva na tabela, mas não gera XML nem publica anúncios. Os formatos, campos obrigatórios, credenciais e tratamento de anúncios desativados serão implementados somente após confirmar as especificações oficiais e a aprovação de integração de cada portal.

## Verificação

```sh
npm run build
```
