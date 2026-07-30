import nodemailer from 'nodemailer'

// Envio de email via SMTP (Brevo). Configuração por env:
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
// SMTP_FROM_EMAIL, SMTP_FROM_NAME, SMTP_REPLY_TO (opcional)
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<{ ok: boolean; error?: string }> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL, SMTP_FROM_NAME } =
    process.env

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM_EMAIL) {
    return { ok: false, error: 'SMTP não configurado' }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })

    await transporter.sendMail({
      from: `"${SMTP_FROM_NAME || 'Valeriote Cursos'}" <${SMTP_FROM_EMAIL}>`,
      replyTo: process.env.SMTP_REPLY_TO || undefined,
      to,
      subject,
      html,
    })

    return { ok: true }
  } catch (error) {
    console.error('sendEmail erro:', error)
    return { ok: false, error: 'Falha no envio do email' }
  }
}
