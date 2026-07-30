import { prisma } from '@/lib/db'
import { TEMPLATE_DEFAULTS } from '@/lib/templates'
import EmailTemplatesEditor from '@/components/admin/EmailTemplatesEditor'

export const metadata = { title: 'Emails — Admin Valeriote' }
export const dynamic = 'force-dynamic'

export default async function AdminEmailsPage() {
  const custom = await prisma.emailTemplate.findMany()
  const customByKey = new Map(custom.map((t) => [t.key, t]))

  const templates = Object.entries(TEMPLATE_DEFAULTS).map(([key, def]) => {
    const c = customByKey.get(key)
    return {
      key,
      name: def.name,
      variables: def.variables,
      subject: c?.subject ?? def.subject,
      body: c?.body ?? def.body,
      customized: !!c,
    }
  })

  return <EmailTemplatesEditor templates={templates} />
}
