Write-Host "🚀 Configurando variáveis de produção no Vercel..." -ForegroundColor Cyan

# Adicionar DATABASE_URL
Write-Host "📦 Adicionando DATABASE_URL..." -ForegroundColor Yellow
vercel env add DATABASE_URL production --value "postgresql://postgres:JSL@1%!Ximz@db.zaboxrzdfxzisorfkbeh.supabase.co:5432/postgres" --yes

# Adicionar NEXTAUTH_URL
Write-Host "🔐 Adicionando NEXTAUTH_URL..." -ForegroundColor Yellow
vercel env add NEXTAUTH_URL production --value "https://academy.valecursoseconsultoria.com.br" --yes

# Gerar NEXTAUTH_SECRET
Write-Host "🔑 Gerando e adicionando NEXTAUTH_SECRET..." -ForegroundColor Yellow
$SECRET = openssl rand -base64 32
vercel env add NEXTAUTH_SECRET production --value $SECRET --yes

# Adicionar NODE_ENV
Write-Host "⚙️  Adicionando NODE_ENV..." -ForegroundColor Yellow
vercel env add NODE_ENV production --value "production" --yes

Write-Host "✅ Variáveis configuradas!" -ForegroundColor Green
Write-Host "🚀 Fazendo redeploy..." -ForegroundColor Cyan
vercel redeploy

Write-Host "✨ Pronto! Seu site está online em:" -ForegroundColor Green
Write-Host "📍 https://academy.valecursoseconsultoria.com.br" -ForegroundColor Cyan
