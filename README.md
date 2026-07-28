# Valeriote Cursos — Plataforma de Aulas ao Vivo

Área de membros para transmissão **ao vivo** dos cursos presenciais da Valeriote.
Não há venda de cursos na plataforma: o admin cadastra os alunos que já se
inscreveram no curso presencial, e esses alunos acessam as lives pela área de membros.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS v4
- NextAuth (credentials) — papéis `ADMIN` e `MEMBER`
- Prisma 6 + SQLite local (`prisma/dev.db`)

## Rodando localmente

```bash
npm install
npx prisma db push          # cria o banco
node prisma/seed.js         # cria o admin (email/senha padrão no script)
npm run dev                 # http://localhost:3000
```

Variáveis em `.env` (DATABASE_URL) e `.env.local` (NEXTAUTH_URL, NEXTAUTH_SECRET).

## Estrutura

- `/login` — página de login (único acesso público)
- `/aulas` — área do aluno: cursos matriculados e agenda de lives
- `/aulas/live/[id]` — player da transmissão (iframe embed configurável por aula)
- `/admin` — dashboard do administrador
- `/admin/membros` — cadastrar/ativar/desativar alunos, matrículas, senha
- `/admin/cursos` — cursos presenciais (turmas)
- `/admin/lives` — agendar aulas, colar link da transmissão, iniciar/encerrar

## Fluxo de uso

1. Admin cria o **curso** (turma presencial).
2. Admin cadastra os **alunos** e marca em quais cursos estão matriculados.
3. Admin agenda as **aulas ao vivo**; quando for transmitir, cola o link de
   embed da plataforma escolhida (YouTube, Vimeo, etc.) e clica em **Iniciar**.
4. Aluno faz login e assiste em `/aulas`.

> A plataforma de transmissão ainda não foi definida — o campo `embedUrl` aceita
> qualquer URL de incorporação, então a escolha pode ser feita depois sem mudar código.
