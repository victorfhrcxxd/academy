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
  'boas-vindas': {
    name: 'Boas-vindas (inscrição online confirmada)',
    subject: 'Inscrição confirmada — crie sua senha de acesso',
    body: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="color:#0b2233">Inscrição confirmada!</h2>
  <p>Olá, {{nome}}!</p>
  <p>Seu pagamento foi confirmado e seu acesso às transmissões de <b>{{curso}}</b> já está liberado.</p>
  <p>Clique no botão abaixo para criar sua senha e entrar na plataforma:</p>
  <p style="margin:28px 0">
    <a href="{{link}}" style="background:#f5b70a;color:#0b2233;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none">
      Criar minha senha
    </a>
  </p>
  <p style="color:#666;font-size:13px">O link vale por 72 horas. Depois disso, use a opção "Esqueci minha senha" na tela de login.</p>
  <p style="color:#999;font-size:12px">Valeriote Cursos e Consultoria</p>
</div>`,
    variables: ['{{nome}}', '{{curso}}', '{{link}}'],
  },
  'acesso-liberado': {
    name: 'Acesso liberado (aluno que já tinha conta)',
    subject: 'Acesso liberado — {{curso}}',
    body: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="color:#0b2233">Acesso liberado!</h2>
  <p>Olá, {{nome}}!</p>
  <p>Seu pagamento foi confirmado e o acesso às transmissões de <b>{{curso}}</b> foi liberado na sua conta.</p>
  <p>Entre com seu login de sempre:</p>
  <p style="margin:28px 0">
    <a href="{{link}}" style="background:#f5b70a;color:#0b2233;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none">
      Acessar a plataforma
    </a>
  </p>
  <p style="color:#666;font-size:13px">Esqueceu a senha? Use a opção "Esqueci minha senha" na tela de login.</p>
  <p style="color:#999;font-size:12px">Valeriote Cursos e Consultoria</p>
</div>`,
    variables: ['{{nome}}', '{{curso}}', '{{link}}'],
  },
  'inscricao-presencial-confirmada': {
    name: 'Inscrição presencial confirmada',
    subject: 'Vaga garantida — {{curso}}',
    body: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="color:#0b2233">Sua vaga está garantida!</h2>
  <p>Olá, {{nome}}!</p>
  <p>Seu pagamento foi confirmado e sua inscrição presencial em <b>{{curso}}</b> está garantida.</p>
  <p>Em breve você receberá mais informações sobre o evento por e-mail.</p>
  <p style="color:#999;font-size:12px">Valeriote Cursos e Consultoria</p>
</div>`,
    variables: ['{{nome}}', '{{curso}}'],
  },
  'acesso-revogado': {
    name: 'Acesso revogado (estorno/chargeback)',
    subject: 'Acesso suspenso — {{curso}}',
    body: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="color:#0b2233">Acesso suspenso</h2>
  <p>Olá, {{nome}}!</p>
  <p>Identificamos o estorno do pagamento da sua inscrição em <b>{{curso}}</b> e, por isso, o acesso às transmissões foi suspenso.</p>
  <p>Se acredita que houve um engano, fale com a nossa equipe respondendo este e-mail.</p>
  <p style="color:#999;font-size:12px">Valeriote Cursos e Consultoria</p>
</div>`,
    variables: ['{{nome}}', '{{curso}}'],
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
