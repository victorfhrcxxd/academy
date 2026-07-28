'use client'

import { useState } from 'react'
import { submitSurvey } from '@/server/actions/survey-actions'

// Card de avaliação do evento (aparece quando algum dia já encerrou)
export default function SurveyCard({
  courseId,
  existingRating,
}: {
  courseId: string
  existingRating: number | null
}) {
  const [rating, setRating] = useState(existingRating || 0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [sent, setSent] = useState(!!existingRating)
  const [isLoading, setIsLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating) {
      setFeedback({ ok: false, text: 'Escolha de 1 a 5 estrelas' })
      return
    }
    setIsLoading(true)
    const res = await submitSurvey({ courseId, rating, comment })
    setIsLoading(false)
    setFeedback({
      ok: res.success,
      text: res.success ? res.message || 'Obrigado!' : res.error || 'Erro',
    })
    if (res.success) setSent(true)
  }

  if (sent && feedback?.ok) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-2xl mb-2">💛</p>
        <p className="font-semibold text-green-800">{feedback.text}</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-gold-500/40 bg-gold-500/5 p-6">
      <h2 className="font-bold text-navy-950 mb-1">
        {sent ? 'Atualizar sua avaliação' : 'Como está sendo o evento pra você?'}
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Sua opinião ajuda a Valeriote a melhorar as próximas edições.
      </p>

      {feedback && !feedback.ok && (
        <p className="text-sm text-red-600 mb-3">{feedback.text}</p>
      )}

      <div className="flex gap-1 mb-4" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            className={`text-3xl transition ${
              n <= (hover || rating) ? 'grayscale-0 scale-110' : 'grayscale opacity-40'
            }`}
            aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
          >
            ⭐
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Deixe um comentário (opcional)"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 bg-white"
      />

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-lg bg-gold-500 hover:bg-gold-600 px-6 py-2.5 text-sm font-bold text-navy-950 transition disabled:opacity-60"
      >
        {isLoading ? 'Enviando...' : 'Enviar avaliação'}
      </button>
    </form>
  )
}
