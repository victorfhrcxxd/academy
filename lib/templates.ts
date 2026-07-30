import { prisma } from './db'

// Templates padrão — o admin pode sobrescrever em /admin/emails (fica no banco)
export const TEMPLATE_DEFAULTS: Record<
  string,
  { name: string; subject: string; body: string; variables: string[] }
> = {
  lembrete: {
    name: 'Lembrete de transmissão',
    subject: '🗓 Lembrete: {{dia}} — {{curso}}',
    body: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="color:#0b2233">{{dia}} do evento está chegando!</h2>
  <p>Olá, {{nome}}!</p>
  <p><b>{{curso}}</b><br/>{{data}}</p>
  <p style="margin:28px 0">
    <a href="{{link}}" style="background:#f5b70a;color:#0b2233;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none">
      Entrar na transmissão
    </a>
  </p>
  <p style="color:#999;font-size:12px">Valeriote Cursos e Consultoria</p>
</div>`,
    variables: ['{{nome}}', '{{dia}}', '{{curso}}', '{{data}}', '{{link}}'],
  },
  'recuperar-senha': {
    name: 'Recuperação de senha',
    subject: 'Redefinição de senha — Valeriote Cursos',
    body: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="color:#0b2233">Redefinição de senha</h2>
  <p>Olá, {{nome}}!</p>
  <p>Recebemos um pedido para redefinir a senha da sua conta na plataforma de aulas ao vivo da Valeriote Cursos.</p>
  <p style="margin:28px 0">
    <a href="{{link}}" style="background:#f5b70a;color:#0b2233;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none">
      Criar nova senha
    </a>
  </p>
  <p style="color:#666;font-size:13px">O link vale por 1 hora. Se você não pediu a redefinição, ignore este email — sua senha continua a mesma.</p>
  <p style="color:#999;font-size:12px">Valeriote Cursos e Consultoria</p>
</div>`,
    variables: ['{{nome}}', '{{link}}'],
  },
}

// Busca o template (customização do banco, senão o padrão)
export async function getTemplate(key: string): Promise<{ subject: string; body: string }> {
  const fallback = TEMPLATE_DEFAULTS[key]
  try {
    const custom = await prisma.emailTemplate.findUnique({ where: { key } })
    if (custom) return { subject: custom.subject, body: custom.body }
  } catch {
    // banco indisponível → usa o padrão
  }
  return { subject: fallback.subject, body: fallback.body }
}

export function renderTemplate(text: string, vars: Record<string, string>): string {
  let out = text
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v)
  }
  return out
}
