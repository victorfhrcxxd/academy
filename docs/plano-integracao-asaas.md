# Plano — Integração LP → Asaas → Academy

> Documento de planejamento. Nada aqui foi implementado ainda.
> Contexto: lead se inscreve na LP (page.valecursoseconsultoria.com.br), paga via Asaas,
> e recebe acesso automático à transmissão na academy (academy.valecursoseconsultoria.com.br).

## 0. Resumo do que existe hoje (levantamento)

| Área | Situação | Evidência |
|---|---|---|
| Stack | Next.js 16.2.9 (App Router, Turbopack), React 19, TypeScript, Tailwind v4 | `package.json`, `next.config.ts` |
| Gerenciador | npm (package-lock.json) | `package-lock.json` |
| Dev/Deploy | `npm run dev`; deploy automático na Vercel via push no GitHub (`main`); funções na região `cdg1` | `package.json` scripts; projeto Vercel `academy` |
| Banco | PostgreSQL 16 auto-hospedado (VPS OVH, `vps-56208c83.vps.ovh.net:5432/academy`, sslmode=require) | `.env` (`DATABASE_URL`) |
| ORM | Prisma 6. **Sem migrations** — schema aplicado com `prisma db push` (não há `prisma/migrations/`) | `prisma/schema.prisma` |
| Usuário | `model User`: id/name/email(unique)/password(bcrypt 12)/role("ADMIN"\|"MEMBER" string)/status("ACTIVE"\|"INACTIVE")/activeSessionId (sessão única p/ alunos) | `prisma/schema.prisma`, `lib/auth.ts` |
| Login | NextAuth v4 credentials + JWT (30d). **Sem verificação de e-mail. Sem magic link.** Existe fluxo de redefinição por token de uso único (1h) | `lib/auth.ts`, `server/actions/password-reset-actions.ts`, `app/(public)/esqueci-senha`, `app/(public)/redefinir-senha/[token]` |
| Acesso a conteúdo | Tabela pivô `Enrollment` (`@@unique([userId, courseId])`). Verificação server-side em cada página/API: sem enrollment → redirect/403 (admin isento) | `prisma/schema.prisma`; `app/(auth)/aulas/curso/[id]/page.tsx`, `app/(auth)/aulas/live/[id]/page.tsx`, `app/api/chat/[liveId]/route.ts` (fn `authorize`) |
| Evento ao vivo | `Course` (= evento) → `Live` (= dia de transmissão, com `embedUrl`, status SCHEDULED/LIVE/ENDED, chat, presença) → `Talk` (programação). URL do player fica em `Live.embedUrl`; player protegido opcional (`restrictPlayer`) | `prisma/schema.prisma`, `components/ProtectedPlayer.tsx` |
| E-mail | nodemailer via SMTP Brevo (`smtp-relay.brevo.com:587`), remetente `contato@valecursoseconsultoria.com.br`. Templates editáveis no banco (`EmailTemplate`) com fallback em código e variáveis `{{assim}}` | `lib/email.ts`, `lib/templates.ts`, `/admin/emails` |
| Segredos | `.env` (DATABASE_URL) + `.env.local` (NextAuth, SMTP, Blob, CRON_SECRET, WhatsApp); na Vercel como env vars de produção. Existe `.env.example` | `.env.example` |
| Rotas públicas / CSRF | Route handlers do App Router **não têm CSRF por padrão** (proteção de origem só em Server Actions). Já existem rotas públicas: `/api/auth/[...nextauth]`, `/api/cron/reminders` (autenticada por `?secret=CRON_SECRET`). Não há middleware/proxy.ts | `app/api/**/route.ts` |
| Background | **Não existe fila/worker.** Padrão atual: cron externo no crontab da VPS OVH chama endpoints (`/api/cron/reminders` a cada 15 min). Vercel serverless puro | crontab `ubuntu@vps-56208c83`, `app/api/cron/reminders/route.ts` |
| Logs | `console.error` nas actions/rotas → visível nos logs de runtime da Vercel. Sem Sentry/observabilidade estruturada | ex.: `server/actions/*.ts` |

O que **não existe** hoje: inscrição/checkout, qualquer integração de pagamento, magic link,
verificação de e-mail, fila de jobs, webhooks de terceiros, campo de preço em `Course`.

---

## 1. Migrations necessárias

> Convenção do repo: modelos em inglês, camelCase, IDs `cuid()`, "enums" como `String` com
> comentário (herança do período SQLite), `createdAt/updatedAt`. Mantida abaixo.
> Como o projeto usa `db push`, a "migration" é editar o schema e aplicar; se quisermos
> histórico versionado, este é o momento de rodar `prisma migrate dev` pela primeira vez
> (decisão a tomar — ver Suposições).

### Nova tabela `Registration` (inscrições — presencial e online)

```prisma
model Registration {
  id              String    @id @default(cuid())
  courseId        String                    // "evento_id" — o evento é o Course
  modality        String                    // PRESENCIAL | ONLINE
  name            String
  email           String                    // identificador que amarra LP ↔ Asaas ↔ academy
  cpf             String
  phone           String?
  asaasCustomerId String?
  asaasPaymentId  String?   @unique         // 1 cobrança = 1 inscrição
  status          String    @default("PENDING") // PENDING | CONFIRMED | REFUNDED | CHARGEBACK | CANCELLED
  paymentUrl      String?                   // invoiceUrl devolvido pro lead
  userId          String?                   // nulo até o provisionamento (e sempre nulo no presencial)
  origin          Json?                     // UTM/rastreamento vindo da LP (aguardando levantamento da LP)
  confirmedAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  course Course @relation(fields: [courseId], references: [id])
  user   User?  @relation(fields: [userId], references: [id])

  @@index([email])
  @@index([courseId, status])
}
```

### Nova tabela `WebhookEvent` (idempotência + auditoria do Asaas)

```prisma
model WebhookEvent {
  id          String    @id                 // ID do evento do Asaas (chave da idempotência)
  type        String                        // PAYMENT_CONFIRMED, PAYMENT_RECEIVED, ...
  paymentId   String?
  payload     Json                          // corpo bruto, para reprocessamento/auditoria
  processedAt DateTime?                     // nulo = pendente (retry pega daqui)
  error       String?
  createdAt   DateTime  @default(now())

  @@index([processedAt])
}
```

### Campos novos em tabelas existentes

| Tabela | Campo | Motivo |
|---|---|---|
| `Course` | `priceCents Int?` | O preço mora no servidor (a LP nunca dita valor — segurança). Nulo = inscrição indisponível |
| `Course` | `registrationOpen Boolean @default(false)` | Liga/desliga inscrições por evento |
| `Course` | `registrations Registration[]` | relação |
| `User` | `registrations Registration[]` | relação |
| `Enrollment` | `source String @default("MANUAL")` | MANUAL (admin) \| ASAAS (webhook) — permite revogar só o que veio de pagamento |

---

## 2. Contrato dos endpoints

### 2.1 `POST /api/inscricoes` (server-to-server, chamado pelo backend da LP)

Autenticação: header `X-LP-Secret: <LP_SHARED_SECRET>` (comparação constante-time).
Sem CORS — navegador nunca chama direto.

Request:
```json
{
  "courseId": "congresso-contratos-2026",
  "modality": "ONLINE",            // ou "PRESENCIAL"
  "name": "Maria da Silva",
  "email": "maria@exemplo.com",
  "cpf": "12345678900",
  "phone": "22999999999",
  "billingType": "PIX",            // PIX | BOLETO | CREDIT_CARD | UNDEFINED (Asaas escolhe)
  "origin": { "utm_source": "...", "utm_campaign": "..." }   // opcional, passthrough
}
```

Fluxo interno: valida secret e payload (zod, campos mínimos) → valida `Course.registrationOpen`
e `priceCents` → busca/cria customer no Asaas por CPF/e-mail (`GET /customers?cpfCnpj=`,
senão `POST /customers`) → cria a inscrição local (status PENDING) → cria a cobrança
(`POST /payments`) com `externalReference = registration.id` e `value = priceCents/100` →
grava `asaasCustomerId`, `asaasPaymentId`, `paymentUrl`.

Response `201`:
```json
{
  "registrationId": "cmxx...",
  "status": "PENDING",
  "paymentUrl": "https://www.asaas.com/i/xxxxxx"
}
```

Erros: `401` secret ausente/errado (corpo vazio) · `422 {error}` validação ·
`409 {error, registrationId, paymentUrl}` inscrição PENDING já existente para mesmo
e-mail+curso+modalidade (reaproveita a cobrança em aberto em vez de duplicar) ·
`502 {error}` falha na API do Asaas (a inscrição local NÃO fica criada — criação da
cobrança e da inscrição são feitas de forma que falha no Asaas desfaz o registro local).

### 2.2 `POST /api/webhooks/asaas`

Autenticação: header `asaas-access-token` comparado com `ASAAS_WEBHOOK_TOKEN`
(o mesmo valor configurado no painel do Asaas). Sem token válido → `401` e nada é gravado.

Corpo: **lido de forma tolerante** — apenas `id` (do evento), `event` e
`payment.{id, externalReference, status, value}`. Campos desconhecidos são ignorados;
ausência dos campos essenciais → grava em `WebhookEvent` com `error` e **ainda responde 200**
(nunca derrubar a fila do Asaas por payload inesperado).

Response: **`200` com corpo `{"received": true}` — sempre**, exceto o `401` de token inválido.
(Exigência Asaas: qualquer coisa ≠ 200, inclusive 201/204, conta como falha de entrega.)

### 2.3 `GET /api/inscricoes/:id`

Consulta de status pra página de obrigado da LP. O `id` é um cuid opaco (não enumerável) e a
resposta é mínima, então pode ser público (é o mesmo modelo do link de boleto do próprio Asaas):

```json
{ "status": "PENDING" | "CONFIRMED" | "REFUNDED" | "CANCELLED", "modality": "ONLINE" }
```

Sem nome/e-mail/CPF na resposta. Cache-Control: no-store. Se preferirmos zero exposição,
a LP pode proxear essa chamada pelo backend dela com o mesmo `X-LP-Secret` — decidir com o
levantamento da LP (ver bloco final).

---

## 3. Fluxo do webhook, passo a passo

1. Request chega → valida `asaas-access-token`. Inválido → `401`, fim.
2. Parse tolerante do corpo. `WebhookEvent.upsert` pelo `id` do evento:
   - **Já existe com `processedAt` preenchido → responde `200` imediatamente** (idempotência; entrega é at-least-once).
   - Novo → grava com `processedAt = null`.
3. **Responde `200` já** e faz o processamento fora do ciclo da resposta com o `after()` do
   Next (`next/server`) — executa depois do response sem segurar a entrega. (É a opção que
   existe no runtime atual; não há fila no projeto.)
4. Processamento (função idempotente `processWebhookEvent(id)`):
   - `PAYMENT_CONFIRMED` **ou** `PAYMENT_RECEIVED` → liberar (os dois, de forma idempotente;
     no boleto o RECEIVED pode vir dias depois do CONFIRMED — o primeiro que chegar libera):
     1. localiza `Registration` por `externalReference` (fallback: `asaasPaymentId`);
     2. status → CONFIRMED, `confirmedAt = now()` (se já CONFIRMED, não repete nada);
     3. se `modality = ONLINE` → provisiona usuário + matrícula (seção 4);
     4. se `modality = PRESENCIAL` → **para aqui** (seção 7).
   - `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_CHARGEBACK_DISPUTE` →
     status REFUNDED/CHARGEBACK; se ONLINE: apaga o `Enrollment` com `source = "ASAAS"`
     daquele user+curso (o usuário continua existindo, só perde o acesso) e envia e-mail
     de aviso via template.
   - Demais eventos (PAYMENT_CREATED, PAYMENT_UPDATED, ...) → marca processado, sem ação.
   - Sucesso → `processedAt = now()`. Exceção → grava `error` e deixa `processedAt = null`.
5. **Evento sem inscrição correspondente** (externalReference vazio ou não encontrado):
   marca o `WebhookEvent` com `error = "inscricao não encontrada"`, `processedAt = now()`
   (não é reprocessável por retry — é caso de auditoria humana), e responde `200`.
   Fica visível na tela de auditoria/consulta (etapa 8 da implementação).
6. **Varredura de segurança**: o cron da OVH (padrão já existente no projeto) chama
   `GET /api/cron/process-webhooks?secret=CRON_SECRET` a cada 5 min e reprocessa qualquer
   `WebhookEvent` com `processedAt = null` mais velho que 2 min — cobre falha do `after()`,
   deploy no meio do processamento, timeout etc.

---

## 4. Criação do usuário e entrega do acesso

**Recomendação: definição de senha no primeiro acesso, por link enviado por e-mail** —
reutilizando a infraestrutura que JÁ existe no repo:

- `PasswordResetToken` + página `/redefinir-senha/[token]` já implementam "criar senha via
  link de uso único" (`server/actions/password-reset-actions.ts`);
- e-mail transacional já funciona (Brevo) com sistema de templates editáveis pelo admin
  (`lib/templates.ts`, `/admin/emails`) — basta um template novo `boas-vindas`;
- magic link exigiria mexer no NextAuth (provider novo, sessão sem senha) — mais código e
  mais risco pra nenhum ganho aqui; senha temporária por e-mail é prática ruim (fica no
  histórico da caixa de entrada).

Fluxo no provisionamento (idempotente):
1. `User.upsert` por e-mail: se não existe, cria com `role: MEMBER`, `status: ACTIVE` e
   senha aleatória (bcrypt de 32 bytes random — inutilizável até o lead definir a dele);
   se já existe (ex.: aluno de evento anterior), reaproveita.
2. `Enrollment.upsert` (`userId`+`courseId`) com `source: "ASAAS"`.
3. `Registration.userId = user.id`.
4. Usuário novo → cria `PasswordResetToken` com validade estendida (72h, campo já é
   `expiresAt`, sem mudança de schema) e envia template `boas-vindas`:
   "Inscrição confirmada — clique para criar sua senha e acessar as transmissões".
   Usuário que já existia → template `acesso-liberado` ("seu acesso ao {{curso}} foi
   liberado, entre com seu login de sempre").
5. Se o link expirar sem uso, o fluxo público `/esqueci-senha` já resolve sozinho.

---

## 5. Autenticação LP → academy

- Header: `X-LP-Secret`, valor em `LP_SHARED_SECRET` (64 hex, gerado uma vez; o mesmo valor
  vai pra env do backend da LP).
- Validação com comparação de tempo constante (`crypto.timingSafeEqual`).
- Falha → `401` sem corpo, e `console.error` com IP/rota (vai pros logs da Vercel).
  Nenhum dado é gravado.
- Só nas rotas `POST /api/inscricoes` (e no `GET /api/inscricoes/:id` se optarmos pelo proxy
  via LP). O webhook do Asaas usa o token próprio dele (`asaas-access-token`), nunca o da LP.
- CSRF: não se aplica — são rotas server-to-server autenticadas por secret, e route handlers
  do App Router não têm CSRF pra "excluir" (só Server Actions têm proteção de origem).

---

## 6. Variáveis de ambiente novas

| Nome | Serve para |
|---|---|
| `ASAAS_API_KEY` | Chave da API do Asaas (sandbox agora, produção depois). Só neste repo, só server-side |
| `ASAAS_BASE_URL` | `https://api-sandbox.asaas.com/v3` (sandbox) / `https://api.asaas.com/v3` (produção) |
| `ASAAS_WEBHOOK_TOKEN` | Valor esperado no header `asaas-access-token` das entregas de webhook (configurado no painel Asaas) |
| `LP_SHARED_SECRET` | Secret do header `X-LP-Secret` da comunicação LP → academy |

Já existentes (inalteradas): `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`, `SMTP_REPLY_TO`,
`CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, `WHATSAPP_SUPPORT`. Atualizar `.env.example`.

---

## 7. O caso presencial

Mesma tabela, mesmo `POST /api/inscricoes` (com `modality: "PRESENCIAL"`), mesma cobrança
com `externalReference`, mesmo webhook. A única diferença é o desvio no passo 4.3 do fluxo
do webhook: presencial marca `CONFIRMED` + `confirmedAt` e **não** cria User/Enrollment
(`userId` permanece nulo). E-mail de confirmação usa um template próprio
(`inscricao-presencial-confirmada`: "sua vaga presencial está garantida"), sem link de senha.
A lista de presentes confirmados sai de `Registration where modality=PRESENCIAL and
status=CONFIRMED` (tela admin na etapa 8).

---

## 8. Modos de falha e recuperação

| Falha | Tratamento |
|---|---|
| Fila de webhook interrompida no Asaas (15 falhas consecutivas) | (a) handler responde 200 até pra payload inesperado — a causa clássica fica eliminada; (b) cron diário `/api/cron/health` compara cobranças CONFIRMED no Asaas (`GET /payments?status=CONFIRMED&dateCreated>=ontem`) com inscrições locais e alerta por e-mail ao admin se houver divergência; (c) ativar também o alerta de e-mail do próprio painel Asaas para fila interrompida (ação manual no painel — documentar) |
| `after()` não executou (deploy/timeout no meio) | `WebhookEvent.processedAt = null` → varredura do cron OVH a cada 5 min reprocessa (função idempotente) |
| Estorno / chargeback | Eventos tratados no webhook: status REFUNDED/CHARGEBACK + revogação do `Enrollment source=ASAAS` + e-mail. Matrículas MANUAL (dadas pelo admin) nunca são tocadas |
| Cobrança duplicada (lead clica 2x no submit) | `409` no `POST /api/inscricoes` quando já há PENDING do mesmo e-mail+curso+modalidade → devolve a MESMA `paymentUrl` já criada |
| Lead paga duas vezes (duas cobranças distintas confirmadas) | Provisionamento é `upsert` → segunda confirmação não duplica acesso; a segunda `Registration` fica CONFIRMED com flag detectável (mesmo e-mail+curso já confirmado) e aparece na tela de auditoria pra estorno manual |
| Mesmo evento entregue 2x pelo Asaas | Idempotência pelo `WebhookEvent.id` (passo 2 do fluxo) |
| Asaas fora do ar no momento da inscrição | `502` pro backend da LP, que mostra "tente novamente" — nenhum estado parcial fica no banco |
| E-mail de boas-vindas falha | Acesso JÁ está provisionado (e-mail é o último passo); `Registration` ganha marca de e-mail pendente e o cron de varredura reenvia; no limite o lead usa `/esqueci-senha` |

---

## 9. Ordem de implementação (etapas pequenas e testáveis)

1. **Schema**: `Registration`, `WebhookEvent`, campos novos em `Course`/`Enrollment` + `db push`. Teste: CRUD manual via script.
2. **Cliente Asaas** (`lib/asaas.ts`: fetch puro, sem SDK — customers e payments, sandbox). Teste: script cria customer+cobrança no sandbox.
3. **`POST /api/inscricoes`** com `X-LP-Secret`. Teste: curl com/sem secret; cobrança aparece no sandbox; 409 na duplicada.
4. **`POST /api/webhooks/asaas`** + `WebhookEvent` + idempotência + `after()` + provisionamento ONLINE (user + enrollment + token de senha + e-mail com templates novos `boas-vindas`/`acesso-liberado`). Teste: simular entrega com payload real do sandbox (inclusive duplicada e sem externalReference).
5. **`GET /api/inscricoes/:id`**. Teste: curl.
6. **Estorno/chargeback + caso presencial**. Teste: eventos simulados.
7. **Cron de varredura** (`/api/cron/process-webhooks`) + entrada no crontab da OVH + `/api/cron/health` diário com alerta por e-mail.
8. **Admin**: aba "Inscrições" (lista, filtro por status/modalidade, auditoria de webhooks com erro, duplicados). 
9. **Ponta a ponta no sandbox** com a LP em staging → depois trocar envs pra produção.

---

## 10. Suposições não confirmadas no código (validar antes de implementar)

1. **"Evento" = `Course`** existente (o Congresso). Não criei entidade nova de evento.
2. **Preço mora em `Course.priceCents`** e é único por evento (sem lote/valor diferente
   presencial × online). Se houver preços por modalidade ou lotes (1º lote, 2º lote),
   a modelagem muda — preciso da regra comercial.
3. Formas de pagamento e parcelamento: assumi cobrança avulsa (PIX/boleto/cartão à vista)
   até vir a configuração real do Asaas prometida.
4. CPF é obrigatório no formulário da LP (o Asaas exige `cpfCnpj` no customer p/ boleto/PIX).
5. Migrations: o repo usa `db push` sem histórico. Assumi manter o padrão; se preferirem
   iniciar `prisma migrate` agora, é o momento (decisão de vocês).
6. `GET /api/inscricoes/:id` público com resposta mínima (padrão de link opaco). Alternativa
   mais fechada (proxy via backend da LP) depende do levantamento da LP.
7. O e-mail é o identificador de usuário (decisão 7) — se o mesmo e-mail comprar para outra
   pessoa ("comprei pra minha esposa"), o acesso cai no e-mail do comprador. Confirmar se ok.

## 11. Conflitos com as decisões de arquitetura

Nenhum conflito real encontrado. Dois pontos de atenção:

- (Decisão 6) "mesma tabela e mesmo webhook" — ok, mas o nome/convenção pedidos
  (`inscricoes`, snake_case) conflitam com a convenção do schema atual (inglês/camelCase).
  Segui a convenção do código (`Registration`), como o próprio prompt instruiu.
- (Requisito "processar em background") — o repo não tem fila. A combinação `after()` +
  tabela-ledger + varredura por cron externo (padrão já usado no projeto) entrega o
  requisito sem introduzir infra nova; se um dia houver volume, trocar por fila real
  (Inngest/QStash) sem mudar o contrato do webhook.

---

## 12. PROMPT PARA O REPOSITÓRIO DA LP (copiar daqui pra baixo)

```markdown
# Levantamento — integração de inscrições com a academy (NÃO IMPLEMENTAR NADA)

Você está no repositório de page.valecursoseconsultoria.com.br (landing pages de captação).
Esta execução é exclusivamente de levantamento: não crie arquivos, não instale nada,
não altere código. Responda em um único bloco markdown, com caminho de arquivo como
evidência em cada item, para eu colar a resposta em outro repositório.

Contexto mínimo: os formulários de inscrição desta LP passarão a enviar os dados,
via backend (server-to-server, com secret em header), para uma API no repositório da
academy, que criará a cobrança no Asaas e devolverá uma URL de pagamento para redirecionar
o lead. A página de obrigado consultará o status da inscrição. Nada disso existe ainda.

Responda:

1. **Stack e hospedagem**: framework e versão, como roda em dev, onde é o deploy.
   Existe backend próprio (rotas de API/server) ou as páginas são 100% estáticas?
   Se estáticas: existe QUALQUER runtime server-side disponível no deploy atual
   (functions, edge, etc.) que permita criar um endpoint de proxy?
2. **O formulário de inscrição do congresso**: em que arquivo(s) vive, como é construído
   (HTML puro, React, lib de forms), e para onde ele submete HOJE (action/fetch/serviço
   de terceiros). Cole o trecho relevante do submit.
3. **Campos atuais**: liste exatamente os campos coletados (nome do campo no código +
   label). Existe CPF? Existe telefone? Como o lead escolhe entre modalidade
   PRESENCIAL e ONLINE hoje (campo, página separada, não existe)?
4. **Página de obrigado / retorno**: o que acontece após o submit hoje (redirect, mensagem
   inline, e-mail)? Em que arquivo? Ela teria como receber um parâmetro na URL
   (ex.: ?inscricao=ID) e fazer polling de um endpoint externo?
5. **Variáveis de ambiente**: como a LP gerencia segredos hoje (arquivo, painel do host)?
   Onde ficaria um secret server-side (ele NUNCA pode ir para o bundle do navegador —
   se o deploy atual não suporta segredo server-side, diga explicitamente).
6. **Rastreamento**: existe UTM, pixel (Meta/Google), CRM ou planilha que recebe os leads
   hoje? Onde isso é feito no código? Esses dados precisam continuar fluindo — descreva
   o formato em que são capturados para que possam ser propagados junto com a inscrição.
7. **Domínios e CORS**: a LP e a academy estão em subdomínios do mesmo domínio raiz.
   Liste os domínios/urls exatos configurados no deploy da LP (produção e preview).
8. **Restrições**: qualquer coisa no setup atual que impeça (a) adicionar um endpoint
   server-side, (b) redirecionar o lead para uma URL externa de pagamento, ou
   (c) alterar a página de obrigado.

Liste ao final as suposições que você fez e o que não conseguiu confirmar lendo o código.
```
