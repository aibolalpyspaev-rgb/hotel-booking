import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, MessageCircle, RotateCcw, Send, Sparkles, Star, X } from 'lucide-react'
import { chatApi, errorMessage } from '../services/api'
import { Img } from './ui'
import { money } from '../utils/format'

const SESSION_KEY = 'hb_chat_session'

const WELCOME = {
  role: 'bot',
  content:
    'Здравствуйте! Я Hotel Assistant 🤖\nПомогу подобрать отель по городу, бюджету и количеству гостей, проверю свободные даты и расскажу о бронировании.',
  suggestions: ['Недорогой отель в Астане на двоих', 'Отель в Алматы с бассейном', 'Как забронировать?', 'Правила отмены'],
  hotels: [],
}

function HotelMini({ hotel, onClick }) {
  const q = new URLSearchParams(Object.entries(hotel.query || {})).toString()
  return (
    <Link to={`/hotels/${hotel.id}${q ? `?${q}` : ''}`} onClick={onClick} className="flex gap-3 rounded-xl bg-white p-2 ring-1 ring-slate-200 transition hover:ring-brand-400">
      <Img src={hotel.image_url} alt={hotel.name} className="h-14 w-16 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{hotel.name}</p>
        <p className="flex items-center gap-1 text-xs text-slate-500">
          {hotel.city} · <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {hotel.rating} · {hotel.stars}★
        </p>
        <p className="text-xs font-bold text-brand-700">от {money(hotel.min_price)} / ночь</p>
      </div>
    </Link>
  )
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SESSION_KEY))
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const historyLoaded = useRef(false)

  // Восстанавливаем историю переписки из БД
  useEffect(() => {
    if (!open || historyLoaded.current || !sessionId) return
    historyLoaded.current = true
    chatApi
      .history(sessionId)
      .then((h) => h.length && setMessages([WELCOME, ...h]))
      .catch(() => {})
  }, [open, sessionId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  const send = async (text) => {
    const message = (text ?? input).trim()
    if (!message || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: message }])
    setLoading(true)
    try {
      const res = await chatApi.send(message, sessionId)
      if (res.session_id !== sessionId) {
        setSessionId(res.session_id)
        localStorage.setItem(SESSION_KEY, res.session_id)
      }
      setMessages((m) => [...m, { role: 'bot', content: res.reply, hotels: res.hotels, suggestions: res.suggestions, mode: res.mode }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'bot', content: errorMessage(e, 'Не удалось получить ответ. Попробуйте ещё раз.'), error: true }])
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    localStorage.removeItem(SESSION_KEY)
    setSessionId(null)
    historyLoaded.current = true
    setMessages([WELCOME])
  }

  const last = messages[messages.length - 1]

  return (
    <>
      {open && (
        <div className="fixed inset-x-2 bottom-20 z-50 flex h-[min(620px,calc(100vh-7rem))] animate-pop flex-col overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-slate-900/10 sm:inset-x-auto sm:right-6 sm:w-[400px]">
          <div className="flex items-center gap-3 bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-3 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
              <Bot className="h-6 w-6" />
            </span>
            <div className="flex-1">
              <p className="font-semibold leading-tight">Hotel Assistant</p>
              <p className="flex items-center gap-1 text-xs text-brand-100">
                <span className="h-2 w-2 rounded-full bg-emerald-300" /> онлайн · подбирает отели из базы
              </p>
            </div>
            <button onClick={reset} title="Новый диалог" className="rounded-lg p-1.5 text-brand-100 hover:bg-white/10 hover:text-white">
              <RotateCcw className="h-4 w-4" />
            </button>
            <button onClick={() => setOpen(false)} title="Закрыть" className="rounded-lg p-1.5 text-brand-100 hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] ${m.role === 'user' ? '' : 'w-full'}`}>
                  <div
                    className={`whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'rounded-br-md bg-brand-600 text-white'
                        : m.error
                          ? 'rounded-bl-md bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                          : 'rounded-bl-md bg-white text-slate-700 ring-1 ring-slate-200'
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.hotels?.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {m.hotels.map((h) => (
                        <HotelMini key={h.id} hotel={h} />
                      ))}
                    </div>
                  )}
                  {m.mode === 'llm' && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                      <Sparkles className="h-3 w-3" /> ответ сформулирован Claude AI на основе данных сервиса
                    </p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 ring-1 ring-slate-200">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: `${d * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {!loading && last?.role === 'bot' && last.suggestions?.length > 0 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2">
              {last.suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-100">
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
            className="flex items-center gap-2 border-t border-slate-100 bg-white p-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              placeholder="Например: отель в Алматы до 30 000 ₸"
              className="input flex-1"
            />
            <button type="submit" disabled={!input.trim() || loading} className="btn-primary h-10 w-10 shrink-0 p-0" aria-label="Отправить">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-50 flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-700 px-4 text-white shadow-lift transition hover:scale-105 sm:bottom-6 sm:right-6"
        aria-label="Открыть Hotel Assistant"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && <span className="hidden pr-1 text-sm font-semibold sm:inline">Hotel Assistant</span>}
      </button>
    </>
  )
}
