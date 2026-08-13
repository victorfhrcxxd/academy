import { prisma } from './db'

// Templates padrão — o admin pode sobrescrever em /admin/emails (fica no banco)
export const TEMPLATE_DEFAULTS: Record<
  string,
  { name: string; subject: string; body: string; variables: string[] }
> = {
  lembrete: {
    name: 'Lembrete de transmissão',
    subject: '🗓 Lembrete: {{dia}} | {{curso}}',
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
    subject: 'Redefinição de senha | Valeriote Cursos',
    body: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="color:#0b2233">Redefinição de senha</h2>
  <p>Olá, {{nome}}!</p>
  <p>Recebemos um pedido para redefinir a senha da sua conta na plataforma de aulas ao vivo da Valeriote Cursos.</p>
  <p style="margin:28px 0">
    <a href="{{link}}" style="background:#f5b70a;color:#0b2233;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none">
      Criar nova senha
    </a>
  </p>
  <p style="color:#666;font-size:13px">O link vale por 1 hora. Se você não pediu a redefinição, ignore este email: sua senha continua a mesma.</p>
  <p style="color:#999;font-size:12px">Valeriote Cursos e Consultoria</p>
</div>`,
    variables: ['{{nome}}', '{{link}}'],
  },
  'boas-vindas': {
    name: 'Boas-vindas (inscrição online confirmada)',
    subject: 'Inscrição confirmada: crie sua senha de acesso',
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
    subject: 'Acesso liberado | {{curso}}',
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
    subject: 'Vaga garantida | {{curso}}',
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
    subject: 'Acesso suspenso | {{curso}}',
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

// ── Aparência global (cabeçalho com cor e logo, como no painel do pagevale) ──

export type EmailHeaderCfg = { headerBg: string | null; headerLogo: string | null }

const HEADER_BG_PADRAO = '#0b2233'
const LOGO_PADRAO = '/brand/valeriote-logo.png'

function baseUrl(): string {
  return process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
}

export async function getEmailSettings(): Promise<EmailHeaderCfg> {
  try {
    const cfg = await prisma.emailSettings.findUnique({ where: { id: 1 } })
    if (cfg) return { headerBg: cfg.headerBg, headerLogo: cfg.headerLogo }
  } catch {
    // banco indisponível → visual padrão
  }
  return { headerBg: null, headerLogo: null }
}

// Resolve a logo: URL completa ou caminho do site (/brand/...)
function logoAbs(logo: string | null): string {
  const l = (logo ?? '').trim() || LOGO_PADRAO
  return /^https?:\/\//.test(l) ? l : `${baseUrl()}${l.startsWith('/') ? '' : '/'}${l}`
}

// Moldura dos emails: cartão branco com cabeçalho (cor + logo) e rodapé
// institucional. O corpo do template entra dentro do cartão.
export function emailShell(inner: string, cfg?: EmailHeaderCfg): string {
  const bg =
    cfg?.headerBg && /^#[0-9a-fA-F]{3,8}$/.test(cfg.headerBg.trim())
      ? cfg.headerBg.trim()
      : HEADER_BG_PADRAO
  const logo = logoAbs(cfg?.headerLogo ?? null)
  return `<!doctype html>
<html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head>
<body style="background-color:#f4f5f6;font-family:Helvetica,Arial,sans-serif;margin:0;padding:0">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f5f6">
    <tr><td>&nbsp;</td>
      <td style="display:block;margin:0 auto;max-width:600px;padding:0;width:100%">
        <div style="box-sizing:border-box;display:block;margin:0 auto;max-width:600px;padding:0 12px 3rem">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="background-color:#fff;width:100%;border-radius:20px;overflow:hidden;margin-top:50px">
            <tr><td style="background-color:${bg};padding:26px 10%;text-align:center;border-top-left-radius:20px;border-top-right-radius:20px">
              <img src="${logo}" alt="Valeriote Cursos e Consultoria" height="40" style="height:40px;width:auto;display:inline-block">
            </td></tr>
            <tr><td style="padding:6% 8%">${inner}</td></tr>
          </table>
          <div style="clear:both;padding-top:24px;text-align:center">
            <span style="font-size:14px;color:#9a9ea6;line-height:1.4;font-family:Helvetica,Arial,sans-serif">Valeriote Cursos, Consultoria, Gestão e Empreendimentos LTDA</span><br>
            <span style="font-size:14px;color:#9a9ea6;line-height:1.4;font-family:Helvetica,Arial,sans-serif">CNPJ: 19.038.976/0001-81</span><br>
            <a href="https://valecursoseconsultoria.com.br/" target="_blank" style="font-size:14px;color:#9a9ea6;text-decoration:none;font-weight:600;line-height:1.4;font-family:Helvetica,Arial,sans-serif">valecursoseconsultoria.com.br</a>
          </div>
        </div>
      </td>
    <td>&nbsp;</td></tr>
  </table>
</body></html>`
}

// Template pronto para envio: texto do admin (ou padrão) + variáveis + moldura.
export async function montarEmail(
  key: string,
  vars: Record<string, string>
): Promise<{ subject: string; html: string }> {
  const [template, cfg] = await Promise.all([getTemplate(key), getEmailSettings()])
  return {
    subject: renderTemplate(template.subject, vars),
    html: emailShell(renderTemplate(template.body, vars), cfg),
  }
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
