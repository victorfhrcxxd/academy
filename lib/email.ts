// Envio de email via Resend (https://resend.com) usando a API HTTP direta.
// Configuração por env: RESEND_API_KEY (obrigatória) e EMAIL_FROM (opcional).
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY não configurada' }
  }

  const from = process.env.EMAIL_FROM || 'Valeriote Cursos <onboarding@resend.dev>'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('sendEmail falhou:', res.status, body)
      return { ok: false, error: `Falha no envio (${res.status})` }
    }

    return { ok: true }
  } catch (error) {
    console.error('sendEmail erro:', error)
    return { ok: false, error: 'Erro de conexão com o serviço de email' }
  }
}
