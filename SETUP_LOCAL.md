# 🚀 Guia de Setup Local - Plataforma Valeriote

Este guia vai ajudar você a configurar e rodar o projeto localmente.

## ✅ Pré-requisitos

Certifique-se que você tem instalado:

- **Node.js 18+** - [Baixar](https://nodejs.org)
- **Git** - [Baixar](https://git-scm.com)
- **PostgreSQL** OU **Supabase** (recomendado para desenvolvimento)

## 📋 Passo 1: Clonar o Repositório

```bash
git clone https://github.com/victorfhrcxxd/academy.git
cd academy
```

## 📦 Passo 2: Instalar Dependências

```bash
npm install
```

## 🔧 Passo 3: Configurar Banco de Dados

### Opção A: Supabase (Recomendado)

1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Copie a Connection String em Settings > Database
4. Cole em `.env.local`:

```env
DATABASE_URL="sua-string-do-supabase"
```

### Opção B: PostgreSQL Local

Crie um banco e configure em `.env.local`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/valeriote_cursos"
```

## 🗄️ Passo 4: Variáveis de Ambiente

Abra `.env.local` e preencha:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="secret-temporário-desenvolvimento"
NODE_ENV="development"
```

## 🗄️ Passo 5: Rodar Migrations

```bash
npx prisma migrate dev --name init
```

## ▶️ Passo 6: Iniciar Servidor

```bash
npm run dev
```

## 🌐 Acesso

Abra: **http://localhost:3000**

(Se a porta 3000 estiver em uso, Next.js usa 3001 ou 3002 automaticamente)

---

## 🎯 Validação

Você deve ver:
- ✅ Página inicial com logo Valeriote
- ✅ Cores azul-marinho, dourado e verde-petróleo
- ✅ Botões de navegação funcionando
- ✅ Responsividade no mobile

---

## 📞 Precisa de Ajuda?

Se tiver problemas na porta 3000:
```bash
# Windows (PowerShell as admin):
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# MacOS/Linux:
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

Quando estiver pronto, me avisa: **"Setup validado!"**
