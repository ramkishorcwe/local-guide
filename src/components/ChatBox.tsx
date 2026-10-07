import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Sparkles, Square, Compass, RotateCcw } from 'lucide-react';
import { useGuideStore } from '../store/guide';
import { streamChat } from '../lib/chatClient';
import ChatText from './ChatText';
import { prepareChatTurn, finishChatTurn, isActiveReply } from '../lib/chatTurns';
const suggestions = ['Aaj shaam kya karein? 2 bachche hain', 'Plan 3 hours of heritage and local food', 'Pure veg dinner, budget ₹1,000'];
export default function ChatBox() {
  const { messages, busy, activeResponseId, status, error, patch, draft: input, focusInput } = useGuideStore();
  const controller = useRef<AbortController>();
  const messageList = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const nearBottom = useRef(true);
  const previousCount = useRef(0);
  useEffect(() => { if (focusInput) { textarea.current?.focus(); textarea.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); patch({ focusInput: false }); } }, [focusInput, patch]);
  useEffect(() => { const list = messageList.current; if (messages.length && list && (nearBottom.current || messages.length > previousCount.current)) list.scrollTo({ top: list.scrollHeight, behavior: 'auto' }); previousCount.current = messages.length; }, [messages, status]);
  useEffect(() => () => {
    controller.current?.abort();
    const state = useGuideStore.getState();
    if (state.activeResponseId) state.patch({ messages: finishChatTurn(state.messages, state.activeResponseId, 'Reply interrupted when leaving this page. You can retry.', true), busy: false, activeResponseId: null, status: '' });
  }, []);

  async function send(value: string, retry = false) {
    const text = value.trim();
    if (!text || useGuideStore.getState().busy) return;
    const state = useGuideStore.getState();
    const turn = prepareChatTurn(state.messages, text, retry);
    const { history, assistantId } = turn;
    // Keep the last usable itinerary (and its saved link) while revising it.
    patch({ messages: turn.messages, busy: true, activeResponseId: assistantId, status: 'Let me put that together…', error: '' });
    patch({ draft: '' });
    controller.current = new AbortController();
    try {
      await streamChat(history, (event) => {
        if (useGuideStore.getState().activeResponseId !== assistantId) return;
        if (event.type === 'text') patch({ messages: useGuideStore.getState().messages.map((message) => message.id === assistantId ? { ...message, text: message.text + event.delta } : message) });
        if (event.type === 'status') patch({ status: event.message });
        if (event.type === 'itinerary') useGuideStore.getState().setItinerary(event.plan,
          history.filter(message => message.role === 'user').map(message => message.text).join('\n'));
      }, controller.current.signal, state.plan ? {
        poiIds: state.plan.stops.map(stop => stop.poiId),
        startISO: new Date(state.plan.startAt ?? state.plan.stops[0].startAt - state.plan.stops[0].travelMinutes * 60_000).toISOString(),
        availableMinutes: state.plan.availableMinutes ?? state.plan.totalMinutes,
      } : undefined);
      if (useGuideStore.getState().activeResponseId === assistantId) {
        const completed = finishChatTurn(useGuideStore.getState().messages, assistantId);
        patch({ messages: completed, error: completed.find(message => message.id === assistantId)?.error || '' });
      }
    } catch (err) {
      const cancelled = controller.current.signal.aborted;
      const failure = cancelled ? 'Response stopped. You can retry your request.' : err instanceof Error ? err.message : 'Guide could not connect.';
      if (useGuideStore.getState().activeResponseId === assistantId) patch({ messages: finishChatTurn(useGuideStore.getState().messages, assistantId, failure, cancelled), error: failure });
    } finally { if (useGuideStore.getState().activeResponseId === assistantId) patch({ busy: false, activeResponseId: null, status: '' }); }
  }
  const lastQuery = [...messages].reverse().find((message) => message.role === 'user')?.text;
  return <section className="panel flex min-h-[560px] flex-col overflow-hidden lg:h-[760px]" aria-label="Chat with Guide">
    <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10 text-teal"><Sparkles size={19} /></div><div><h2 className="text-sm font-semibold">Your personal Guide</h2><p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-teal" /> A little local knowledge goes a long way</p></div></div>
      <span className="rounded-md border border-white/10 px-2 py-1 text-[9px] tracking-wider text-slate-400">AI CONCIERGE</span>
    </div>
    <div ref={messageList} onScroll={() => { const list = messageList.current; if (list) nearBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 100; }} className="max-h-[500px] flex-1 space-y-5 overflow-y-auto p-5 sm:p-6 lg:max-h-none" role="log" aria-live="polite" aria-relevant="additions text">
      {!messages.length && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-5 sm:py-9">
        <Compass size={42} strokeWidth={1} className="mb-5 text-gold" />
        <h2 className="mb-3 text-2xl font-medium tracking-tight">Namaste. Jaipur awaits.</h2>
        <p className="max-w-md text-sm leading-7 text-slate-400">Hidden courtyards, a perfect plate of dal baati, a sunset you’ll remember. Tell me what you’re in the mood for — I’ll take care of the plan.</p>
        <p className="mt-7 mb-3 text-[10px] uppercase tracking-[.2em] text-slate-500">A few ideas to get started</p>
        <div className="space-y-2">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => void send(suggestion)} className="group flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[.025] px-4 py-3.5 text-left text-xs text-slate-300 transition hover:border-gold/40 hover:bg-gold/5">{suggestion}<ArrowUp size={14} className="rotate-45 text-gold" /></button>)}</div>
      </motion.div>}
      {messages.map((message) => <motion.div key={message.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
        {message.role === 'assistant' && <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold"><Sparkles size={14} /></span>}
        <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7 ${message.role === 'user' ? 'rounded-br-sm bg-gold/15 text-amber-100' : 'rounded-bl-sm bg-white/5 text-slate-200'}`}>
          {message.text ? message.role === 'assistant' ? <ChatText text={message.text} /> : message.text : (isActiveReply(message, activeResponseId, busy) ? <span className="text-slate-400" role="status">{status || 'Thinking…'}</span> : <span className="text-slate-500">No reply was received for this request.</span>)}
          {message.error && message.id !== messages.at(-1)?.id && <p className="mt-2 text-xs text-red-300">{message.error}</p>}
        </div>
      </motion.div>)}
      {busy && messages.find(message => message.id === activeResponseId)?.text && <p className="pl-10 text-xs text-teal" role="status">{status}</p>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-xs leading-6 text-red-300" role="alert">{error}
        {lastQuery && <button className="mt-2 flex items-center gap-2 font-medium text-white" onClick={() => void send(lastQuery, true)}><RotateCcw size={13} />Retry request</button>}
      </div>}
    </div>
    <div className="border-t border-white/10 p-4 sm:p-5">
      {!!messages.length && <div className="mb-3 flex flex-wrap gap-2">{['Add a food stop', 'Make it indoor', 'Make it cheaper'].map((label) => <button key={label} disabled={busy} onClick={() => void send(label)} className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-slate-400 hover:text-gold disabled:opacity-40">{label}</button>)}</div>}
      <form onSubmit={(event) => { event.preventDefault(); void send(String(new FormData(event.currentTarget).get('query') || '')); }} className="flex items-end gap-2 rounded-xl border border-white/15 bg-navy p-2 focus-within:border-gold/50">
        <textarea ref={textarea} name="query" aria-label="Tell Guide your plans" placeholder="What would make today special?" value={input} maxLength={1000} rows={2} onChange={(event) => patch({ draft: event.target.value })}
          onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(event.currentTarget.value); } }}
          className="min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-600" />
        {busy ? <button type="button" onClick={() => controller.current?.abort()} aria-label="Stop response" className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold text-navy"><Square size={14} /></button>
          : <button type="submit" disabled={!input.trim()} aria-label="Send message" className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold text-navy disabled:opacity-30"><ArrowUp size={20} /></button>}
      </form>
      <p className="mt-3 text-center text-[10px] text-slate-500">English or Hinglish. Always your pace. Always local.</p>
    </div>
  </section>;
}
