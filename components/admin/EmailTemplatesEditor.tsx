'use client'

import { useState, useTransition } from 'react'
import {
  updateTemplate,
  restoreTemplateDefault,
  sendTemplateTest,
} from '@/server/actions/template-actions'

interface Template {
  key: string
  name: string
  variables: string[]
  subject: string
  body: string
  customized: boolean
}

export default function EmailTemplatesEditor({ templates }: { templates: Template[] }) {
  const [selected, setSelected] = useState(templates[0]?.key || '')
  const [drafts, setDrafts] = useState<Record<string, { subject: string; body: string }>>(
    Object.fromEntries(templates.map((t) => [t.key, { subject: t.subject, body: t.body }]))
  )
  const [showPreview, setShowPreview] = useState(true)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const current = templates.find((t) => t.key === selected)
  const draft = drafts[selected]
  if (!current || !draft) return null

  const notify = (ok: boolean, text: string) => {
    setFeedback({ ok, text })
    setTimeout(() => setFeedback(null), 5000)
  }

  const setDraft = (patch: Partial<{ subject: string; body: string }>) =>
    setDrafts((d) => ({ ...d, [selected]: { ...d[selected], ...patch } }))

  const save = () =>
    startTransition(async () => {
      const res = await updateTemplate(selected, draft.subject, draft.body)
      notify(res.success, res.success ? 'Template salvo!' : res.error || 'Erro')
    })

  const restore = () =>
    startTransition(async () => {
      const res = await restoreTemplateDefault(selected)
      notify(res.success, res.success ? 'Restaurado ao padrão — recarregue a página' : res.error || 'Erro')
    })

  const test = () =>
    startTransition(async () => {
      const res = await sendTemplateTest(selected, draft.subject, draft.body)
      notify(res.success, res.success ? res.message || 'Teste enviado' : res.error || 'Erro')
    })

  // preview com dados de exemplo
  const sample: Record<string, string> = {
    nome: 'Maria',
    dia: 'Dia 1',
    curso: 'Congresso Brasileiro de Contratos Administrativos',
    data: 'terça-feira, 17 de novembro às 09:00',
    link: '#',
  }
  let previewHtml = draft.body
  let previewSubject = draft.subject
  for (const [k, v] of Object.entries(sample)) {
    previewHtml = previewHtml.split(`{{${k}}}`).join(v)
    previewSubject = previewSubject.split(`{{${k}}}`).join(v)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-950 mb-1">Emails</h1>
      <p className="text-sm text-gray-500 mb-6">
        Edite os textos dos emails que a plataforma envia. Use as variáveis pra
        personalizar — elas são trocadas pelos dados reais na hora do envio.
      </p>

      <div className="flex gap-2 mb-6">
        {templates.map((t) => (
          <button
            key={t.key}
            onClick={() => setSelected(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              selected === t.key
                ? 'bg-navy-950 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:border-navy-600'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {feedback && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            feedback.ok
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <div className="rounded-2xl bg-white border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-950 mb-1.5">Assunto</label>
            <input
              value={draft.subject}
              onChange={(e) => setDraft({ subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-950 mb-1.5">
              Corpo do email (HTML)
            </label>
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ body: e.target.value })}
              rows={16}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono"
            />
          </div>

          <div className="text-xs text-gray-500">
            Variáveis disponíveis:{' '}
            {current.variables.map((v) => (
              <code key={v} className="mx-1 rounded bg-gray-100 px-1.5 py-0.5 text-navy-900">
                {v}
              </code>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={save}
              disabled={isPending}
              className="rounded-lg bg-navy-950 hover:bg-navy-900 px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-60"
            >
              {isPending ? 'Salvando...' : 'Salvar template'}
            </button>
            <button
              onClick={test}
              disabled={isPending}
              className="rounded-lg bg-gold-500 hover:bg-gold-600 px-5 py-2.5 text-sm font-bold text-navy-950 transition disabled:opacity-60"
            >
              Enviar teste pra mim
            </button>
            {current.customized && (
              <button
                onClick={restore}
                disabled={isPending}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Restaurar padrão
              </button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50">
            <p className="text-xs font-bold uppercase text-gray-400">
              Pré-visualização (dados de exemplo)
            </p>
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="text-xs text-navy-700 hover:underline"
            >
              {showPreview ? 'esconder' : 'mostrar'}
            </button>
          </div>
          {showPreview && (
            <div className="p-5">
              <p className="text-sm mb-4">
                <span className="text-gray-400">Assunto:</span>{' '}
                <b className="text-navy-950">{previewSubject}</b>
              </p>
              <div
                className="rounded-xl border border-gray-200 p-2 overflow-auto"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
