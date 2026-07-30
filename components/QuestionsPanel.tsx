'use client'

import { useCallback, useEffect, useState } from 'react'
import Icon from '@/components/Icon'

interface Question {
  id: string
  text: string
  author: string
  answered: boolean
  votes: number
  myVote: boolean
  mine: boolean
}

export default function QuestionsPanel({
  liveId,
  canModerate,
}: {
  liveId: string
  canModerate: boolean
}) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/questions/${liveId}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setQuestions(data.questions || [])
    } catch {
      // tenta de novo no próximo tick
    }
  }, [liveId])

  useEffect(() => {
    load()
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [load])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    setError('')
    try {
      const res = await fetch(`/api/questions/${liveId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setError(d?.error || 'Erro ao enviar')
        return
      }
      setText('')
      await load()
    } finally {
      setSending(false)
    }
  }

  const vote = async (q: Question) => {
    // otimista
    setQuestions((prev) =>
      prev.map((x) =>
        x.id === q.id
          ? { ...x, myVote: !x.myVote, votes: x.votes + (x.myVote ? -1 : 1) }
          : x
      )
    )
    await fetch(`/api/questions/${liveId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: q.id }),
    }).catch(() => null)
  }

  const setAnswered = async (q: Question, answered: boolean) => {
    await fetch(`/api/questions/${liveId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: q.id, answered }),
    })
    await load()
  }

  const remove = async (q: Question) => {
    if (!confirm('Apagar esta pergunta?')) return
    await fetch(`/api/questions/${liveId}?id=${q.id}`, { method: 'DELETE' })
    setQuestions((prev) => prev.filter((x) => x.id !== q.id))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {questions.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-8">
            Nenhuma pergunta ainda — envie a primeira!
          </p>
        )}
        {questions.map((q) => (
          <div
            key={q.id}
            className={`rounded-xl border px-3 py-2.5 ${
              q.answered ? 'border-green-200 bg-green-50/60 opacity-80' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => vote(q)}
                className={`flex flex-col items-center rounded-lg border px-2 py-1 text-xs shrink-0 transition ${
                  q.myVote
                    ? 'border-navy-900 bg-navy-950 text-white'
                    : 'border-gray-300 text-gray-600 hover:border-navy-600'
                }`}
                title={q.myVote ? 'Remover voto' : 'Também quero saber'}
              >
                <Icon name="thumbs-up" className="h-3.5 w-3.5" />
                <span className="font-bold">{q.votes}</span>
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-navy-950 break-words whitespace-pre-line">
                  {q.text}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400 flex-wrap">
                  <span>{q.author}</span>
                  {q.answered && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 font-bold">
                      <Icon name="check" className="h-3 w-3" /> Respondida
                    </span>
                  )}
                  {canModerate && (
                    <button
                      onClick={() => setAnswered(q, !q.answered)}
                      className="text-navy-700 hover:underline"
                    >
                      {q.answered ? 'reabrir' : 'marcar respondida'}
                    </button>
                  )}
                  {(canModerate || q.mine) && (
                    <button onClick={() => remove(q)} className="text-red-500 hover:underline">
                      apagar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="border-t border-gray-200 p-3">
        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={400}
            placeholder="Envie sua pergunta ao palestrante..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-navy-900 focus:ring-2 focus:ring-navy-900/15"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="rounded-lg bg-gold-500 hover:bg-gold-600 px-4 py-2 text-sm font-bold text-navy-950 transition disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  )
}
