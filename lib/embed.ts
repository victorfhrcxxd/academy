// Converte URLs coladas do navegador para o formato aceito em iframe.
// YouTube/Vimeo bloqueiam embed das páginas normais (X-Frame-Options),
// então normalizamos para /embed/ ou player.vimeo.com.
export function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname.startsWith('/embed/')) return url
      const watchId = u.searchParams.get('v')
      if (watchId) return `https://www.youtube.com/embed/${watchId}`
      const liveMatch = u.pathname.match(/^\/(live|shorts)\/([\w-]+)/)
      if (liveMatch) return `https://www.youtube.com/embed/${liveMatch[2]}`
      return url
    }

    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0]
      if (id) return `https://www.youtube.com/embed/${id}`
      return url
    }

    if (host === 'vimeo.com') {
      const m = u.pathname.match(/^\/(\d+)/)
      if (m) return `https://player.vimeo.com/video/${m[1]}`
      return url
    }

    return url
  } catch {
    return url
  }
}
