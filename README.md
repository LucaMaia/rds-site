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

Na Vercel, [vercel.json](./vercel.json) reescreve rotas SPA para o app, permitindo abrir diretamente e compartilhar links de imóveis.

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

Em projetos Supabase já existentes, aplique [supabase/migrations/20261104150000_property_extended_details.sql](./supabase/migrations/20261104150000_property_extended_details.sql) para habilitar os novos campos do cadastro. A view pública inclui nome e telefone do proprietário conforme a decisão do produto, portanto esses dados ficam visíveis na ficha pública de imóveis publicados.

## Funcionalidades

- Vitrine pública sem login, páginas de busca e detalhes.
- Busca por localização, finalidade, tipo, faixa de preço, área, dormitórios e diferenciais.
- Apenas imóveis publicados são retornados nas consultas públicas. A view pública omite endereço, número, complemento e CEP.
- Painel protegido para métricas, relatórios com filtros, imóveis, equipe e canais de contato.
- Cadastro e edição de imóveis com dados do proprietário, infraestrutura, áreas de serviço e lazer, dormitórios/salas, armários e pisos; as características podem ser usadas no filtro público de diferenciais.
- Os campos de nome e telefone do proprietário também aparecem na ficha pública do imóvel, junto às características cadastradas.
- Gestão de status com histórico, fotos no Supabase Storage, vídeos YouTube e links externos com controle de visibilidade.
- Captadores e corretores são cadastros independentes; o painel permite criar, editar, ativar/desativar e excluir integrantes. Ao excluir, os imóveis relacionados permanecem e ficam sem o responsável atribuído.
- A migração `20261104130000_move_team_member_role.sql` habilita a troca de função com transferência dos imóveis associados; se algum imóvel já tiver outra pessoa na função de destino, a troca é bloqueada para evitar sobrescrever a atribuição.
- Migração cria as tabelas, índices, views públicas, políticas RLS, bucket de imagens e os dois imóveis fictícios com fotografias ilustrativas.
- Formulário de interesse no detalhe do imóvel: envia os dados do cliente e os detalhes do anúncio por e-mail; após a confirmação, permite abrir o WhatsApp da equipe RDS (+55 61 99944 9411) com a mensagem preenchida.
- Relatório de interações: registra novas solicitações de contato, notificações de e-mail aceitas pelo Resend e cliques no botão de WhatsApp da ficha pública. Permite filtrar por período, região, imóvel e finalidade, visualizar os imóveis com mais cliques e exportar os eventos filtrados em CSV. O clique não fornece nome ou telefone e não comprova o envio de uma mensagem. Visitas podem ser registradas manualmente pelo administrador após confirmação; nenhum evento de visita é inferido de um e-mail ou clique.

## Contato por e-mail e WhatsApp

O formulário público usa a Supabase Edge Function `property-inquiry`. O destinatário do e-mail é o contato configurado no painel; se estiver vazio, usa `lucamaia2007@hotmail.com`. Para o primeiro teste com `onboarding@resend.dev`, o destino deve ser o endereço da própria conta Resend; para outros destinatários, verifique um domínio no Resend e use um remetente desse domínio. Depois que o e-mail é enviado, o botão abre uma conversa com a equipe RDS no número +55 61 99944 9411 e preenche uma mensagem resumida com o imóvel, o número de quartos e suítes, os dados do cliente, a localização e o link. O cliente precisa confirmar o envio no próprio WhatsApp; nenhuma mensagem é enviada automaticamente.

Para ativar:

1. Aplique [supabase/migrations/20261103214000_property_inquiry_rate_limits.sql](./supabase/migrations/20261103214000_property_inquiry_rate_limits.sql), [supabase/migrations/20261104140000_property_interaction_history.sql](./supabase/migrations/20261104140000_property_interaction_history.sql) e [supabase/migrations/20261104160000_whatsapp_click_tracking.sql](./supabase/migrations/20261104160000_whatsapp_click_tracking.sql) no Supabase, nessa ordem.
2. No Supabase, configure os secrets `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (remetente de um domínio verificado no Resend) e `ALLOWED_ORIGINS` (origens separadas por vírgula; inclua `https://rds-site.vercel.app` e a origem local usada no desenvolvimento).
3. Faça deploy com `supabase functions deploy property-inquiry`. As variáveis internas `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são lidas somente pela Edge Function.

A função limita envios e cliques por IP em limites separados, valida as solicitações e aceita chamadas somente das origens configuradas. Cada solicitação válida passa a gerar um evento `contact_received`; o evento `email_sent` é registrado apenas após o Resend aceitar o envio. O clique no botão público gera `whatsapp_click` antes de abrir o WhatsApp, sem dados pessoais do visitante. Nenhum desses eventos comprova entrega na caixa postal ou envio de mensagem. Eventos anteriores à migration não podem ser recuperados. Visitas solicitadas ou realizadas são registradas somente por ação explícita e confirmada do administrador; não se presume uma visita a partir de um e-mail ou clique no WhatsApp. Nunca configure a chave do Resend ou a `service_role` em variáveis `VITE_*` ou no navegador. A entrega real depende de uma chave válida do Resend e de um remetente verificado.

## Integrações XML com portais

O feed do DF Imóveis é gerado dinamicamente pela Edge Function `dfimoveis-feed`; o XML não é salvo no banco. A URL pública do site é `/integracoes/dfimoveis.xml`. Para habilitar:

1. Aplique `supabase/migrations/20261106170000_dfimoveis_xml_feed.sql` no Supabase.
2. Publique a função com `supabase functions deploy dfimoveis-feed`.
3. No painel administrativo, abra **Configurações**, informe o código de cliente fornecido pelo DF Imóveis e salve.
4. No cadastro/edição do imóvel, marque **DF Imóveis**, selecione o tipo e subtipo conforme a documentação e preencha as áreas exigidas. Depois, salve e altere o status para **Publicado**.
5. Copie a URL exibida nas configurações e solicite ao DF Imóveis que configure a importação desse feed.

Nível do anúncio: em **Portais imobiliários**, cada portal marcado tem a opção **Básico**, **Destaque** ou **Super Destaque**. Para habilitar em projetos existentes, aplique `supabase/migrations/20261113120000_portal_highlight_level.sql` e publique novamente a função `dfimoveis-feed`. No XML do DF Imóveis, Destaque gera `<Destaque>1</Destaque>` e Super Destaque gera `<UltraDestaque>1</UltraDestaque>`; Básico mantém os dois como `0`. Imóveis já integrados começam como Básico.

O feed contém somente imóveis salvos, ativos para DF Imóveis e com status `PUBLICADO`. Campos obrigatórios ausentes impedem o imóvel específico de aparecer no XML e são mostrados nas configurações do painel. Novas alterações de cadastro, status, integração e fotos são refletidas na próxima solicitação do feed. As seleções anteriores de OLX e Wimóveis continuam preservadas.

Essa integração disponibiliza um feed para o DF Imóveis importar; ela não envia anúncios por uma API de publicação direta. A documentação fornecida descreve o layout XML, não o mecanismo de recebimento do portal. A URL é pública para que o portal possa consultá-la; a chave `service_role` é usada apenas pela Edge Function e nunca deve ser colocada no frontend ou em variáveis `VITE_*`.

## Verificação

```sh
npm run build
```
