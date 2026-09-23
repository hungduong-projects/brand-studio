"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode, RefObject, TextareaHTMLAttributes } from 'react';
import { DropdownMenu } from './app.js';
import { useEntrance } from './entrance.js';

/** Line icons on a 16px grid, drawn with the current text colour. */
function Icon({ d, className }: { d: string; className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}
const icons = {
  send: 'M8 13V3M3.5 7.5 8 3l4.5 4.5',
  copy: 'M5.5 5.5h7v7h-7zM3.5 10.5v-7h7',
  check: 'M3 8.5l3 3 7-7',
  retry: 'M13 8a5 5 0 1 1-1.46-3.54M13.5 2.5v3h-3',
  edit: 'M10.5 2.5l3 3-8 8h-3v-3z',
  thumb: 'M5 7.5v6M5 7.5 7.6 2.5c.9 0 1.5.8 1.3 1.7L8.5 6.5h3.7c.9 0 1.5.8 1.3 1.6l-1 4.3c-.2.6-.7 1.1-1.4 1.1H5M2.5 7.5H5v6H2.5z',
  close: 'M4 4l8 8M12 4l-8 8',
  file: 'M4 1.5h5l3 3v10H4zM9 1.5v3h3',
  chevron: 'M4.5 6.5 8 10l3.5-3.5',
};

/** Copies text and reports the result for a moment: 'done', 'failed' or 'idle'. */
function useCopy(text: string) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 1600);
    return () => clearTimeout(timer);
  }, [state]);
  const copy = () => navigator.clipboard.writeText(text).then(() => setState('done'), () => setState('failed'));
  return [state, copy] as const;
}

/**
 * The scrolling conversation. It follows the newest message while you are at the bottom, stays put when you scroll up
 * to read, and offers a button back to the latest. It is a log, so screen readers hear new messages as they arrive.
 */
export function ChatThread({ children, label = 'Conversation', jumpLabel = 'Jump to latest', className = '' }: { children: ReactNode; label?: string; jumpLabel?: string; className?: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const [away, setAway] = useState(false);
  useEffect(() => {
    const node = scroller.current;
    const list = node?.firstElementChild;
    if (!node || !list) return;
    const follow = () => { if (pinned.current) node.scrollTop = node.scrollHeight; };
    const onScroll = () => {
      pinned.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48;
      setAway(!pinned.current);
    };
    follow();
    node.addEventListener('scroll', onScroll, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(follow);
    observer?.observe(list);
    return () => { node.removeEventListener('scroll', onScroll); observer?.disconnect(); };
  }, []);
  const jump = () => {
    const node = scroller.current;
    if (!node) return;
    pinned.current = true;
    node.scrollTo({ top: node.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  return <div className={`bs-thread ${className}`}>
    <div ref={scroller} className="bs-thread__scroll" role="log" aria-label={label} tabIndex={0}>
      <div className="bs-thread__list">{children}</div>
    </div>
    {away && <button type="button" className="bs-thread__jump" onClick={jump}><Icon d="M8 3v10M3.5 8.5 8 13l4.5-4.5" />{jumpLabel}</button>}
  </div>;
}

/** One turn in a conversation. Your messages sit right in a bubble; the agent's read as open text. Turns in a row from one side group under a single name. */
export function ChatMessage({ from = 'agent', name, avatar, time, actions, children, className = '' }: {
  from?: 'user' | 'agent'; name?: string; avatar?: ReactNode; time?: string; actions?: ReactNode; children: ReactNode; className?: string;
}) {
  return <article className={`bs-msg ${className}`} data-from={from} aria-label={name ?? (from === 'user' ? 'You' : 'Agent')}>
    {(avatar || name || time) && <header className="bs-msg__head">
      {avatar && <span className="bs-msg__avatar" aria-hidden="true">{avatar}</span>}
      {name && <span className="bs-msg__name">{name}</span>}
      {time && <time className="bs-msg__time">{time}</time>}
    </header>}
    <div className="bs-msg__body">{children}</div>
    {actions && <div className="bs-msg__foot">{actions}</div>}
  </article>;
}

/**
 * The message box. It grows with the text, Enter sends and Shift+Enter starts a new line. While the agent answers,
 * send turns into stop. Slots hold attachments above the text and tools either side of the send button.
 */
export function ChatComposer({ value, defaultValue = '', onValueChange, onSubmit, onStop, busy = false, disabled = false, label = 'Message', placeholder = 'Ask anything', sendLabel = 'Send', stopLabel = 'Stop', attachments, start, end, above, inputRef, inputProps, className = '' }: {
  value?: string; defaultValue?: string; onValueChange?: (value: string) => void; onSubmit?: (text: string) => void; onStop?: () => void;
  busy?: boolean; disabled?: boolean; label?: string; placeholder?: string; sendLabel?: string; stopLabel?: string;
  attachments?: ReactNode; start?: ReactNode; end?: ReactNode; above?: ReactNode;
  inputRef?: RefObject<HTMLTextAreaElement | null>; inputProps?: TextareaHTMLAttributes<HTMLTextAreaElement>; className?: string;
}) {
  const [own, setOwn] = useState(defaultValue);
  const text = value ?? own;
  const ownRef = useRef<HTMLTextAreaElement>(null);
  const input = inputRef ?? ownRef;
  const id = useId();
  const set = (next: string) => { if (value === undefined) setOwn(next); onValueChange?.(next); };
  useEffect(() => {
    const node = input.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
  }, [text, input]);
  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || busy || disabled) return;
    onSubmit?.(trimmed);
    set('');
  };
  return <form className={`bs-composer ${className}`} data-busy={busy || undefined} onSubmit={event => { event.preventDefault(); submit(); }}>
    {above}
    {attachments && <div className="bs-composer__attachments">{attachments}</div>}
    <label htmlFor={id} className="bs-sr-only">{label}</label>
    <textarea {...inputProps} id={id} ref={input} rows={1} value={text} placeholder={placeholder} disabled={disabled} className="bs-composer__input"
      onChange={event => { set(event.target.value); inputProps?.onChange?.(event); }}
      onKeyDown={event => {
        inputProps?.onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); }
      }} />
    <div className="bs-composer__bar">
      <div className="bs-composer__tools">{start}</div>
      <div className="bs-composer__tools">
        {end}
        {busy
          ? <button type="button" className="bs-composer__send" data-kind="stop" aria-label={stopLabel} onClick={onStop}><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" /></svg></button>
          : <button type="submit" className="bs-composer__send" aria-label={sendLabel} disabled={disabled || !text.trim()}><Icon d={icons.send} /></button>}
      </div>
    </div>
  </form>;
}

export interface PromptOption { id: string; label: string; hint?: string }
export interface PromptModel { value: string; label: string }
export interface PromptSubmission { text: string; sources: string[]; command?: string; model?: string }

/**
 * A composer for power users. Type `@` to add a source and `/` at the start for a command: a list opens above the text,
 * arrow keys move, Enter or Tab picks and Escape closes. Picks become chips. A light sweeps the bar on send.
 */
export function PromptBar({ sources = [], commands = [], models = [], model, onModelChange, onSubmit, onStop, busy = false, label = 'Prompt', placeholder = 'Ask anything. @ adds a source, / runs a command', start, className = '' }: {
  sources?: PromptOption[]; commands?: PromptOption[]; models?: PromptModel[]; model?: string; onModelChange?: (value: string) => void;
  onSubmit?: (prompt: PromptSubmission) => void; onStop?: () => void; busy?: boolean; label?: string; placeholder?: string; start?: ReactNode; className?: string;
}) {
  const [text, setText] = useState('');
  const [added, setAdded] = useState<string[]>([]);
  const [command, setCommand] = useState<string>();
  const [menu, setMenu] = useState<{ kind: '@' | '/'; query: string; from: number; to: number }>();
  const [active, setActive] = useState(0);
  const [ownModel, setOwnModel] = useState(models[0]?.value);
  const [sends, setSends] = useState(0);
  const input = useRef<HTMLTextAreaElement>(null);
  const caret = useRef<number>(undefined);
  const id = useId();
  const current = model ?? ownModel;
  // A pick removes the typed trigger; put the caret back where it was before the next key lands.
  useLayoutEffect(() => {
    if (caret.current === undefined) return;
    input.current?.setSelectionRange(caret.current, caret.current);
    caret.current = undefined;
  }, [text]);
  const options = !menu ? [] : (menu.kind === '@' ? sources.filter(source => !added.includes(source.id)) : commands)
    .filter(option => option.label.toLowerCase().includes(menu.query.toLowerCase()));
  const open = options.length > 0;
  const find = (list: PromptOption[], key: string) => list.find(option => option.id === key);

  const detect = (value: string, caret: number) => {
    const before = value.slice(0, caret);
    const mention = before.match(/(?:^|\s)@([^\s@]*)$/);
    const slash = before.match(/^\/(\S*)$/);
    const hit = mention ? { kind: '@' as const, query: mention[1] } : slash && commands.length ? { kind: '/' as const, query: slash[1] } : undefined;
    setMenu(hit && { ...hit, from: caret - hit.query.length - 1, to: caret });
    setActive(0);
  };
  const pick = (option: PromptOption) => {
    if (!menu) return;
    if (menu.kind === '@') setAdded(list => [...list, option.id]); else setCommand(option.id);
    caret.current = menu.from;
    setText(text.slice(0, menu.from) + text.slice(menu.to));
    setMenu(undefined);
    input.current?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setActive(index => (index + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length);
    } else if (open && (event.key === 'Enter' || event.key === 'Tab') && !event.shiftKey) {
      event.preventDefault();
      pick(options[Math.min(active, options.length - 1)]);
    } else if (open && event.key === 'Escape') {
      event.preventDefault();
      setMenu(undefined);
    } else if (event.key === 'Backspace' && !text && (added.length || command)) {
      if (added.length) setAdded(list => list.slice(0, -1)); else setCommand(undefined);
    }
  };
  const submit = (value: string) => {
    onSubmit?.({ text: value, sources: added, command, model: current });
    setAdded([]);
    setCommand(undefined);
    setSends(count => count + 1);
  };
  const chips = [...(command ? [{ key: command, text: `/${find(commands, command)?.label ?? command}`, remove: () => setCommand(undefined) }] : []),
    ...added.map(key => ({ key, text: `@${find(sources, key)?.label ?? key}`, remove: () => setAdded(list => list.filter(item => item !== key)) }))];
  const modelLabel = models.find(item => item.value === current)?.label;

  return <div className={`bs-prompt ${className}`}>
    {sends > 0 && <span key={sends} className="bs-prompt__sweep" aria-hidden="true" />}
    <ChatComposer value={text} onValueChange={setText} onSubmit={submit} onStop={onStop} busy={busy} label={label} placeholder={placeholder} inputRef={input}
      inputProps={{
        onKeyDown, 'aria-controls': open ? `${id}-list` : undefined, 'aria-activedescendant': open ? `${id}-${active}` : undefined, 'aria-describedby': `${id}-hint`,
        onChange: event => detect(event.target.value, event.target.selectionStart),
      }}
      above={<>
        <span id={`${id}-hint`} className="bs-sr-only">{sources.length ? 'Type @ to add a source. ' : ''}{commands.length ? 'Type / to run a command.' : ''}</span>
        <span className="bs-sr-only" role="status">{open ? `${options.length} ${menu?.kind === '@' ? 'sources' : 'commands'}` : ''}</span>
        {open && <ul id={`${id}-list`} role="listbox" className="bs-prompt__menu" aria-label={menu?.kind === '@' ? 'Sources' : 'Commands'}>
          {options.map((option, index) => <li key={option.id} id={`${id}-${index}`} role="option" aria-selected={index === active} className="bs-prompt__option"
            onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => pick(option)}>
            <span>{menu?.kind}{option.label}</span>{option.hint && <span className="bs-prompt__hint">{option.hint}</span>}
          </li>)}
        </ul>}
      </>}
      attachments={chips.length > 0 && <ul className="bs-prompt__chips" aria-label="Added to this prompt">
        {chips.map(chip => <li key={chip.key} className="bs-prompt__chip">{chip.text}<button type="button" aria-label={`Remove ${chip.text}`} onClick={chip.remove}><Icon d={icons.close} /></button></li>)}
      </ul>}
      start={start}
      end={models.length > 0 && <DropdownMenu align="end"
        trigger={<button type="button" className="bs-prompt__model" aria-label={`Model: ${modelLabel ?? ''}`}>{modelLabel}<Icon d={icons.chevron} /></button>}
        items={models.map(item => ({ label: item.label, onSelect: () => { if (model === undefined) setOwnModel(item.value); onModelChange?.(item.value); } }))} />} />
  </div>;
}

/** A file or image going with a message: a thumbnail, its name, and its size, upload progress or error. Remove and retry are labelled with the file name. */
export function Attachment({ name, size, preview, progress, error, onRemove, onRetry, className = '' }: {
  name: string; size?: string; preview?: string; progress?: number; error?: string; onRemove?: () => void; onRetry?: () => void; className?: string;
}) {
  const state = error ? 'error' : progress !== undefined && progress < 100 ? 'uploading' : 'done';
  const percent = Math.round(Math.max(0, Math.min(100, progress ?? 100)));
  const extension = name.includes('.') ? name.split('.').pop()!.slice(0, 4) : '';
  return <div className={`bs-attach ${className}`} data-state={state}>
    <span className="bs-attach__thumb" aria-hidden="true">{preview ? <img src={preview} alt="" /> : <><Icon d={icons.file} /><span>{extension}</span></>}</span>
    <span className="bs-attach__text">
      <span className="bs-attach__name">{name}</span>
      {state === 'error' ? <span className="bs-attach__meta" role="alert">{error}</span>
        : <span className="bs-attach__meta">{state === 'uploading' ? `Uploading ${percent}%` : size}</span>}
    </span>
    {state === 'uploading' && <span className="bs-attach__bar" role="progressbar" aria-label={`Uploading ${name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ width: `${percent}%` }} /></span>}
    {state === 'error' && onRetry && <button type="button" className="bs-attach__button" aria-label={`Retry ${name}`} onClick={onRetry}><Icon d={icons.retry} /></button>}
    {onRemove && <button type="button" className="bs-attach__button" aria-label={`Remove ${name}`} onClick={onRemove}><Icon d={icons.close} /></button>}
  </div>;
}

/** Prompts to start from on an empty chat, or follow-up questions after an answer. They arrive one after another. */
export function SuggestionChips({ suggestions, onSelect, label = 'Suggestions', className = '' }: { suggestions: string[]; onSelect?: (suggestion: string) => void; label?: string; className?: string }) {
  return <ul className={`bs-suggest ${className}`} aria-label={label}>
    {suggestions.map((suggestion, index) => <li key={suggestion} style={{ '--i': index } as CSSProperties}>
      <button type="button" onClick={() => onSelect?.(suggestion)}>{suggestion}</button>
    </li>)}
  </ul>;
}

export type Feedback = 'up' | 'down' | null;

/**
 * Copy, retry, edit and rating for one message. Inside a ChatMessage it shows on hover or focus, and always on touch screens.
 * Copy, retry and edit appear when you pass them; each button is labelled and the ratings report whether they are pressed.
 */
export function MessageActions({ copyText, onRetry, onEdit, feedback, onFeedback, label = 'Message actions', className = '' }: {
  copyText?: string; onRetry?: () => void; onEdit?: () => void; feedback?: Feedback; onFeedback?: (value: Feedback) => void; label?: string; className?: string;
}) {
  const [copied, copy] = useCopy(copyText ?? '');
  const [ownFeedback, setOwnFeedback] = useState<Feedback>(null);
  const rating = feedback === undefined ? ownFeedback : feedback;
  const rate = (value: 'up' | 'down') => {
    const next = rating === value ? null : value;
    if (feedback === undefined) setOwnFeedback(next);
    onFeedback?.(next);
  };
  return <div className={`bs-actions-bar ${className}`} role="group" aria-label={label}>
    {copyText !== undefined && <button type="button" aria-label="Copy" data-done={copied === 'done' || undefined} onClick={copy}><Icon d={copied === 'done' ? icons.check : icons.copy} /></button>}
    {onRetry && <button type="button" aria-label="Retry" onClick={onRetry}><Icon d={icons.retry} /></button>}
    {onEdit && <button type="button" aria-label="Edit" onClick={onEdit}><Icon d={icons.edit} /></button>}
    <button type="button" aria-label="Good answer" aria-pressed={rating === 'up'} onClick={() => rate('up')}><Icon d={icons.thumb} /></button>
    <button type="button" aria-label="Bad answer" aria-pressed={rating === 'down'} onClick={() => rate('down')}><Icon d={icons.thumb} className="bs-actions-bar__down" /></button>
    <span className="bs-sr-only" role="status">{copied === 'done' ? 'Copied' : copied === 'failed' ? 'Copy failed' : ''}</span>
  </div>;
}

/** Code the agent wrote, with a copy button that works while it streams. `reveal` brings the lines in one after another. */
export function CodeBlock({ code, language, filename, reveal = false, linesPerSecond = 24, lineNumbers = false, copyLabel = 'Copy code', className = '' }: {
  code: string; language?: string; filename?: string; reveal?: boolean; linesPerSecond?: number; lineNumbers?: boolean; copyLabel?: string; className?: string;
}) {
  const [copied, copy] = useCopy(code);
  const lines = code.replace(/\n$/, '').split('\n');
  return <figure className={`bs-code ${className}`} data-numbers={lineNumbers || undefined}>
    <figcaption className="bs-code__head">
      <span className="bs-code__name">{filename ?? language ?? 'Code'}</span>
      {filename && language && <span className="bs-code__lang">{language}</span>}
      <button type="button" className="bs-code__copy" onClick={copy}><Icon d={copied === 'done' ? icons.check : icons.copy} /><span>{copied === 'done' ? 'Copied' : copied === 'failed' ? 'Copy failed' : copyLabel}</span></button>
    </figcaption>
    <pre className="bs-code__pre" tabIndex={0}><code>{lines.map((line, index) => <span key={index} className="bs-code__line"
      style={reveal ? { animationDelay: `${(index / linesPerSecond).toFixed(3)}s` } : { animation: 'none' }}>{line || ' '}</span>)}</code></pre>
  </figure>;
}

export interface SourceItem { id: string; title: string; source: string; excerpt?: string; href?: string }

/** What the agent retrieved, numbered to match its citations: where each came from, its title and the passage used. */
export function SourceCards({ sources, label = 'Sources', className = '' }: { sources: SourceItem[]; label?: string; className?: string }) {
  const ref = useEntrance<HTMLOListElement>();
  return <ol ref={ref} className={`bs-sources ${className}`} aria-label={label}>
    {sources.map((item, index) => {
      const body = <>
        <span className="bs-sources__origin"><span className="bs-sources__index">{index + 1}</span>{item.source}</span>
        <span className="bs-sources__title">{item.title}</span>
        {item.excerpt && <span className="bs-sources__excerpt">{item.excerpt}</span>}
      </>;
      return <li key={item.id} className="bs-sources__item" style={{ '--i': index } as CSSProperties}>
        {item.href ? <a className="bs-sources__card" href={item.href}>{body}</a> : <div className="bs-sources__card">{body}</div>}
      </li>;
    })}
  </ol>;
}

export interface SelectionAction { id: string; label: string }

/**
 * Wraps text so selecting part of it brings up a bar of agent actions under the selection. The bar follows the text in
 * reading order, so Tab reaches it after a keyboard selection; arrow keys move along it and Escape dismisses it.
 */
export function SelectionActions({ actions, onAction, children, label = 'Selection actions', className = '' }: {
  actions: SelectionAction[]; onAction?: (id: string, text: string) => void; children: ReactNode; label?: string; className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number }>();
  useEffect(() => {
    const update = () => {
      const current = document.getSelection();
      const box = host.current, text = content.current;
      if (!box || !text) return;
      if (bar.current?.contains(document.activeElement)) return;
      const range = current && current.rangeCount && !current.isCollapsed ? current.getRangeAt(0) : undefined;
      const value = current?.toString().trim();
      if (!range || !value || !text.contains(range.commonAncestorContainer)) { setSelection(undefined); return; }
      const rect = range.getBoundingClientRect(), frame = box.getBoundingClientRect();
      const x = Math.min(Math.max(rect.left + rect.width / 2 - frame.left, 90), Math.max(frame.width - 90, 90));
      setSelection({ text: value, x, y: rect.bottom - frame.top + 8 });
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || !host.current?.contains(document.getSelection()?.anchorNode ?? null) && !bar.current?.contains(document.activeElement)) return;
      document.getSelection()?.removeAllRanges();
      setSelection(undefined);
    };
    document.addEventListener('selectionchange', update);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('selectionchange', update); document.removeEventListener('keydown', onKey); };
  }, []);
  const run = (id: string) => {
    if (!selection) return;
    onAction?.(id, selection.text);
    document.getSelection()?.removeAllRanges();
    setSelection(undefined);
  };
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const buttons = [...(bar.current?.querySelectorAll('button') ?? [])];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[(index + (event.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length]?.focus();
    event.preventDefault();
  };
  return <div ref={host} className={`bs-selection ${className}`}>
    <div ref={content}>{children}</div>
    {selection && <div ref={bar} role="toolbar" aria-label={label} className="bs-selection__bar" style={{ left: selection.x, top: selection.y }} onKeyDown={move}
      onBlur={event => { if (!bar.current?.contains(event.relatedTarget as Node)) setSelection(undefined); }}>
      {actions.map((action, index) => <button key={action.id} type="button" tabIndex={index === 0 ? 0 : -1} onMouseDown={event => event.preventDefault()} onClick={() => run(action.id)}>{action.label}</button>)}
    </div>}
  </div>;
}

export interface Recommendation { id: string; title: string; reason?: string; confidence: number }

/**
 * The agent's pick with its working: how sure it is, why, and the options it passed over. Any alternative can be promoted
 * to the top; confirming locks the choice in and announces it.
 */
export function RecommendationCard({ options, heading = 'Recommended', confirmLabel = 'Use this', onConfirm, className = '' }: {
  options: Recommendation[]; heading?: string; confirmLabel?: string; onConfirm?: (option: Recommendation) => void; className?: string;
}) {
  const [pick, setPick] = useState(options[0]?.id);
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const promoted = useRef(false);
  const id = useId();
  useEffect(() => { if (promoted.current) title.current?.focus(); }, [pick]);
  const chosen = options.find(option => option.id === pick) ?? options[0];
  if (!chosen) return null;
  const others = options.filter(option => option !== chosen);
  const percent = (value: number) => `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
  return <section className={`bs-rec ${className}`} aria-labelledby={`${id}-title`} data-confirmed={confirmed || undefined}>
    <p className="bs-rec__eyebrow">{chosen === options[0] ? heading : 'Your pick'}</p>
    <div key={chosen.id} className="bs-rec__main">
      <h3 id={`${id}-title`} ref={title} tabIndex={-1}>{chosen.title}</h3>
      <div className="bs-rec__confidence"><span className="bs-rec__meter" aria-hidden="true"><span style={{ width: percent(chosen.confidence) }} /></span>{percent(chosen.confidence)} confident</div>
      {chosen.reason && <p className="bs-rec__reason">{chosen.reason}</p>}
    </div>
    <div className="bs-rec__foot" aria-live="polite">
      {confirmed ? <p className="bs-rec__outcome"><Icon d={icons.check} />Going with {chosen.title}</p> : <>
        {others.length > 0 && <button type="button" className="bs-button bs-button--secondary" aria-expanded={open} aria-controls={`${id}-others`} onClick={() => setOpen(!open)}>
          {open ? 'Hide' : 'See'} {others.length} {others.length === 1 ? 'alternative' : 'alternatives'}
        </button>}
        <button type="button" className="bs-button bs-button--primary" onClick={() => { setConfirmed(true); setOpen(false); onConfirm?.(chosen); }}>{confirmLabel}</button>
      </>}
    </div>
    {others.length > 0 && <ul id={`${id}-others`} className="bs-rec__others" hidden={!open}>
      {others.map(option => <li key={option.id}>
        <div><p className="bs-rec__other-title">{option.title}<span>{percent(option.confidence)}</span></p>{option.reason && <p className="bs-rec__reason">{option.reason}</p>}</div>
        <button type="button" className="bs-button bs-button--secondary" aria-label={`Use ${option.title} instead`} onClick={() => { promoted.current = true; setPick(option.id); setOpen(false); }}>Use instead</button>
      </li>)}
    </ul>}
  </section>;
}
