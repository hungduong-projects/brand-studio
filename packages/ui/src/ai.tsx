"use client";

import type { CSSProperties, ElementType, ReactNode } from 'react';

type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking';
const agentLabels: Record<AgentState, string> = { idle: 'Idle', listening: 'Listening', thinking: 'Thinking', speaking: 'Speaking' };

/** Dot positions on a square grid, with each dot's column, ring and angle normalised to 0..1 so CSS can stagger it per state. Rings are square too. */
function discDots(columns: number) {
  const centre = (columns - 1) / 2;
  const dots: CSSProperties[] = [];
  for (let row = 0; row < columns; row++) for (let column = 0; column < columns; column++) {
    const x = column - centre, y = row - centre;
    const distance = Math.max(Math.abs(x), Math.abs(y)) / centre;
    dots.push({ left: `${((column + .5) / columns * 100).toFixed(2)}%`, top: `${((row + .5) / columns * 100).toFixed(2)}%`, '--x': (column / (columns - 1)).toFixed(3), '--r': distance.toFixed(3), '--a': ((Math.atan2(y, x) / (2 * Math.PI) + 1) % 1).toFixed(3) } as CSSProperties);
  }
  return dots;
}
const smallDisc = discDots(5);
const largeDisc = discDots(9);

/**
 * A square dot matrix that shows what an agent is doing: a sweep while thinking, a wave while listening,
 * rings while speaking and a slow breath when idle. CSS only; reduced motion shows still dots and the label.
 */
export function AgentThinking({ state = 'thinking', size = 64, label, className = '' }: { state?: AgentState; size?: number; label?: string; className?: string }) {
  const dots = size < 40 ? smallDisc : largeDisc;
  return <div role="status" className={`bs-agent ${className}`} data-state={state}>
    <span className="bs-agent__disc" aria-hidden="true" style={{ '--bs-agent-size': `${size}px`, '--bs-agent-columns': dots === smallDisc ? 5 : 9 } as CSSProperties}>
      {dots.map((style, index) => <i key={index} style={style} />)}
    </span>
    {label ? <span className="bs-agent__label">{label}</span> : <span className="bs-sr-only">{agentLabels[state]}</span>}
  </div>;
}

export type TraceStatus = 'done' | 'active' | 'pending';
export interface TraceStep { id: string; title: string; detail?: string; status: TraceStatus }

/** Collapsible reasoning steps. Built on `<details>`, so it opens with Enter or Space and works before hydration. */
export function ThinkingTrace({ steps, title, defaultOpen = false, className = '' }: { steps: TraceStep[]; title?: string; defaultOpen?: boolean; className?: string }) {
  const active = steps.some(step => step.status === 'active');
  const heading = title ?? (active ? 'Thinking' : `Thought through ${steps.length} ${steps.length === 1 ? 'step' : 'steps'}`);
  return <details className={`bs-trace ${className}`} open={defaultOpen || undefined}>
    <summary><span className="bs-trace__title" data-active={active}>{heading}</span><span className="bs-trace__chevron" aria-hidden="true" /></summary>
    <ol className="bs-trace__steps">
      {steps.map(step => <li key={step.id} data-status={step.status}>
        <span className="bs-trace__dot" aria-hidden="true" />
        <div><p className="bs-trace__step">{step.title}<span className="bs-sr-only"> ({step.status})</span></p>{step.detail && <p className="bs-trace__detail">{step.detail}</p>}</div>
      </li>)}
    </ol>
  </details>;
}

/**
 * Reveals text word by word with CSS only, so the full text is in the HTML from the first byte.
 * Screen readers get the text once; reduced motion shows it at once. Change `key` to replay.
 */
export function StreamingText({ text, wordsPerSecond = 14, as: Tag = 'p', className = '', onDone }: { text: string; wordsPerSecond?: number; as?: ElementType; className?: string; onDone?: () => void }) {
  const words = text.split(/(\s+)/);
  const last = words.length - 1 - [...words].reverse().findIndex(word => word.trim());
  let index = 0;
  return <Tag className={`bs-stream ${className}`}>
    <span className="bs-sr-only">{text}</span>
    <span aria-hidden="true">{words.map((word, position) => word.trim()
      ? <span key={position} className="bs-stream__word" style={{ animationDelay: `${(index++ / wordsPerSecond).toFixed(3)}s` }} onAnimationEnd={position === last ? onDone : undefined}>{word}</span>
      : word)}</span>
  </Tag>;
}

export type ToolStatus = 'running' | 'done' | 'error';
export interface ToolCall { id: string; name: string; status: ToolStatus; detail?: string }
const toolLabels: Record<ToolStatus, string> = { running: 'running', done: 'done', error: 'failed' };

/** A compact list of tool calls with a status icon each. */
export function ToolChips({ tools, className = '' }: { tools: ToolCall[]; className?: string }) {
  return <ul className={`bs-tools ${className}`} aria-live="polite">
    {tools.map(tool => <li key={tool.id} className="bs-tool" data-status={tool.status}>
      <span className="bs-tool__icon" aria-hidden="true" />
      <span className="bs-tool__name">{tool.name}</span>
      {tool.detail && <span className="bs-tool__detail">{tool.detail}</span>}
      <span className="bs-sr-only">, {toolLabels[tool.status]}</span>
    </li>)}
  </ul>;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/** Asks a person to allow or deny an agent action. Once decided, the buttons give way to the outcome. */
export function ApprovalCard({ title, description, detail, status = 'pending', onApprove, onReject, approveLabel = 'Allow', rejectLabel = 'Deny', className = '' }: {
  title: string; description?: string; detail?: ReactNode; status?: ApprovalStatus;
  onApprove?: () => void; onReject?: () => void; approveLabel?: string; rejectLabel?: string; className?: string;
}) {
  return <section className={`bs-approval ${className}`} data-status={status} aria-label={title}>
    <div className="bs-approval__head"><span className="bs-approval__mark" aria-hidden="true" /><div><h3>{title}</h3>{description && <p>{description}</p>}</div></div>
    {detail && <pre className="bs-approval__detail"><code>{detail}</code></pre>}
    <div className="bs-approval__foot" aria-live="polite">
      {status === 'pending'
        ? <><button type="button" className="bs-button bs-button--secondary" onClick={onReject}>{rejectLabel}</button><button type="button" className="bs-button bs-button--primary" onClick={onApprove}>{approveLabel}</button></>
        : <p className="bs-approval__outcome">{status === 'approved' ? 'Allowed' : 'Denied'}</p>}
    </div>
  </section>;
}

export type TaskStatus = 'pending' | 'active' | 'done' | 'failed';
export interface TaskRow { id: string; label: string; status: TaskStatus; meta?: string }
const taskLabels: Record<TaskStatus, string> = { pending: 'Not started', active: 'In progress', done: 'Done', failed: 'Failed' };

/** An agent's task list with progress. */
export function TaskRows({ tasks, title = 'Tasks', className = '' }: { tasks: TaskRow[]; title?: string; className?: string }) {
  const done = tasks.filter(task => task.status === 'done').length;
  return <section className={`bs-tasks ${className}`} aria-label={title}>
    <header><h3>{title}</h3><span className="bs-tasks__count">{done} of {tasks.length}</span></header>
    <div className="bs-tasks__bar" aria-hidden="true"><span style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%` }} /></div>
    <ol>
      {tasks.map(task => <li key={task.id} data-status={task.status}>
        <span className="bs-tasks__icon" aria-hidden="true" />
        <span className="bs-tasks__label">{task.label}<span className="bs-sr-only">, {taskLabels[task.status]}</span></span>
        {task.meta && <span className="bs-tasks__meta">{task.meta}</span>}
      </li>)}
    </ol>
  </section>;
}
