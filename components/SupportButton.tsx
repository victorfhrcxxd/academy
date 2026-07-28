// Botão flutuante de suporte via WhatsApp (aparece se WHATSAPP_SUPPORT estiver configurado)
export default function SupportButton({ phone }: { phone: string }) {
  const clean = phone.replace(/\D/g, '')
  if (!clean) return null

  const msg = encodeURIComponent('Olá! Preciso de ajuda com a plataforma de aulas ao vivo da Valeriote.')

  return (
    <a
      href={`https://wa.me/${clean}?text=${msg}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1fb457] text-white font-bold text-sm pl-3 pr-4 py-3 shadow-lg transition"
      title="Suporte via WhatsApp"
    >
      <svg viewBox="0 0 32 32" className="h-5 w-5 fill-current" aria-hidden>
        <path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.7 6L4 29l8.2-1.6c1.2.6 2.5.9 3.8.9 6.6 0 12-5.4 12-12S22.6 3 16 3zm6.1 16.9c-.3.8-1.5 1.5-2.1 1.6-.6.1-1.3.2-3.6-.8-3-1.2-5-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3.1s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .5-.1.7.5l1 2.4c.1.2.1.4 0 .6l-.4.7-.6.6c-.2.2-.4.4-.2.7.2.4 1 1.6 2.1 2.6 1.5 1.3 2.7 1.7 3 1.9.4.2.6.1.8-.1l1.2-1.4c.3-.3.5-.3.8-.2l2.6 1.2c.4.2.6.3.7.5.1.1.1.9-.1 1.7z" />
      </svg>
      Suporte
    </a>
  )
}
