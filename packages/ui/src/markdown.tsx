"use client";

import { Fragment, memo, useId, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Lexer, Tokenizer } from 'marked';
import type { Token, Tokens } from 'marked';
import { CodeBlock } from './chat.js';

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®', trade: '™', hellip: '…', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', times: '×', deg: '°', middot: '·', bull: '•', larr: '←', rarr: '→', uarr: '↑', darr: '↓', euro: '€', pound: '£', yen: '¥', cent: '¢' };

/** The parser leaves character references as written. This turns numeric ones and the common named ones into their characters. */
const decode = (text: string) => text.replace(/&(#x[\da-f]{1,6}|#\d{1,7}|[a-z]+\d*);/gi, (whole, name: string) => {
  if (name[0] !== '#') return entities[name] ?? whole;
  const code = /^#x/i.test(name) ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
  return code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff) ? String.fromCodePoint(code) : whole;
});

// Addresses resolve against a host that does not exist, so a relative one keeps this origin and anything else shows its own.
const here = 'http://relative.invalid';
const resolve = (address: string) => { try { return new URL(decode(address), here); } catch { return null; } };

/** How many of `mark` the end of `text` still owes to close the bold, italic or strikethrough runs it opened. */
function owed(text: string, mark: '*' | '_' | '~') {
  let pairs = 0, singles = 0, closing = 0;
  for (const run of text.matchAll(mark === '*' ? /\*+/g : mark === '_' ? /_+/g : /~+/g)) {
    const end = run.index + run[0].length, before = text[run.index - 1] ?? ' ', after = text[end] ?? ' ';
    if (before === '\\' || (/\s/.test(before) && /\s/.test(after))) continue;
    if (mark === '_' && /\w/.test(before) && /\w/.test(after)) continue;
    if (end === text.length) { closing = run[0].length; break; }
    if (mark === '~') pairs += run[0].length === 2 ? 1 : 0;
    else { pairs += run[0].length >> 1; singles += run[0].length & 1; }
  }
  return Math.max(0, (pairs % 2 ? 2 : 0) + (singles % 2 ? 1 : 0) - closing);
}

/**
 * Where the code spans in `value` start and end, and the first run of backticks left without a partner. Each run pairs
 * with the next run of the same length in one pass: a pattern that tries every length is slow on a long row of them.
 */
function spans(value: string) {
  const runs = [...value.matchAll(/`+/g)], next: number[] = [], seen = new Map<number, number>();
  for (let index = runs.length - 1; index >= 0; index--) { next[index] = seen.get(runs[index][0].length) ?? -1; seen.set(runs[index][0].length, index); }
  const pairs: [number, number][] = [];
  let open: { index: number; mark: string } | undefined;
  for (let at = 0; at < runs.length; at++) {
    const close = next[at];
    if (close < 0) open ??= { index: runs[at].index, mark: runs[at][0] };
    else { pairs.push([runs[at].index, runs[close].index + runs[close][0].length]); at = close; }
  }
  return { pairs, open };
}

/** The text with its code spans blanked out, so marks inside them are left alone; the blanks keep every index in place. */
function blank(value: string) {
  let out = '', at = 0;
  for (const [start, end] of spans(value).pairs) { out += value.slice(at, start) + ' '.repeat(end - start); at = end; }
  return out + value.slice(at);
}

/**
 * A link left unfinished at the end of `text`: "[words", "[words]" or "[words](address". It gives where the link starts
 * and the words in its brackets; `whole` says the brackets are closed with nothing after them. Found by position, in
 * one pass.
 */
function unfinished(text: string) {
  const address = text.lastIndexOf('](');
  // An open address is tried first; "](" with no bracket before it is plain text, and the end of the text is tried instead.
  for (const end of [address >= 0 && !text.includes(')', address + 2) ? address : -1, text.endsWith(']') ? text.length - 1 : text.length]) {
    const start = end < 0 ? -1 : text.indexOf('[', text.lastIndexOf(']', end - 1) + 1);
    if (start >= 0 && start < end) return { start, words: text.slice(start + 1, end), whole: end === text.length - 1 };
  }
  return null;
}

/**
 * Text that is still arriving ends mid-mark. This closes the bold, italic, code and strikethrough left open in the last
 * block, shows an unfinished link as its words and holds back an unfinished image, table or list marker, so raw symbols
 * never flash on screen.
 */
function settle(text: string) {
  const fences = text.match(/^ {0,3}(?:`{3,}|~{3,})/gm) ?? [];
  if (fences.length % 2) {
    // The fence that ends a code block arrives one mark at a time; until it is whole it waits instead of showing as code.
    const open = fences[fences.length - 1].trim(), line = text.lastIndexOf('\n'), last = text.slice(line + 1).trim();
    // The line that opens a block names what the block is, so the block waits until that line is whole.
    if (last.startsWith(open)) return text.slice(0, Math.max(0, line));
    return line > 0 && last && last.length < open.length && last === open[0].repeat(last.length) ? text.slice(0, line) : text;
  }
  const cut = text.lastIndexOf('\n\n') + 2, head = cut < 2 ? '' : text.slice(0, cut);
  let tail = cut < 2 ? text : text.slice(cut);

  // A table needs its header and a full rule under it before the parser sees one.
  const [first, second, ...more] = tail.split('\n');
  if (/^\s*\|/.test(first) && more.length === 0 && /^[|\s:-]*$/.test(second ?? '') && (second?.match(/-+/g) ?? []).length < Math.max(1, first.split('|').filter(cell => cell.trim()).length)) return head;

  // A code span left open is closed with its own mark, in place of any part of that mark already there; an opening mark with nothing after it waits.
  const { open } = spans(tail);
  if (open) {
    const start = open.index + open.mark.length;
    let end = tail.length;
    while (end > start && tail[end - 1] === '`') end--;
    tail = end > start ? tail.slice(0, end) + open.mark : tail.slice(0, open.index);
  }
  // A task box with nothing after it yet waits with its list marker.
  tail = tail.replace(/((?:^|\n)[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]+)\[[ xX]?\]?[ \t]*$/, '$1');
  // An unfinished image has nothing to show until its address is whole, so it waits.
  let plain = blank(tail), link = unfinished(plain);
  const picture = link ? plain.indexOf('![', Math.max(0, link.start - 1)) : -1;
  if (picture >= 0) { tail = tail.slice(0, picture); plain = plain.slice(0, picture); link = unfinished(plain); }
  // An unfinished link shows its words; a footnote mark is held back until it is whole.
  if (link && !link.words.startsWith('^')) tail = tail.slice(0, link.start) + tail.slice(link.start + 1, link.start + 1 + link.words.length);
  else if (link && !link.whole) tail = tail.slice(0, link.start);
  // A lone list marker, rule or heading mark on the last line waits for what follows it; under a paragraph, "-" would turn it into a heading.
  tail = tail.replace(/(^|\n)[ \t]*(?:[-=*+_]+|\d{1,9}[.)]|#{1,6})[ \t]*$/, '$1').replace(/(^|[\s(])[*_~]+$/, '$1');
  const marks = blank(tail), closing = '_'.repeat(owed(marks, '_')) + '*'.repeat(owed(marks, '*')) + '~'.repeat(owed(marks, '~'));
  // A closing mark after a space closes nothing, so the space goes first.
  return head + (closing ? tail.trimEnd() + closing : tail);
}

// The parser checks each emphasis mark against the rest of its block, so a text made of thousands of them would hold up
// the page. Past this many, they are shown as written.
const markLimit = 1000;
class Literal extends Tokenizer {
  emStrong() { return undefined; }
  del() { return undefined; }
}
const reader = (source: string) => ({ gfm: true, ...((source.match(/[*_~]+/g)?.length ?? 0) > markLimit ? { tokenizer: new Literal() } : {}) });

/** The blocks of `source`. Text nested deeper than the parser can follow comes back as one plain paragraph. */
function read(source: string) {
  try { return new Lexer(reader(source)).lex(source); } catch {
    return Object.assign([{ type: 'paragraph', raw: source, text: source, tokens: [{ type: 'text', raw: source, text: source }] } as Token], { links: {} });
  }
}

// Quotes and lists nest this deep and no deeper; what lies below is shown as written.
const depthLimit = 16;

interface Note { id: string; body: string }
const noteStart = /^\[\^[^\]\s]+\]:/;

/** Footnote texts, in the order the source defines them. */
function footnotes(tokens: Token[]) {
  const notes: Note[] = [];
  for (const token of tokens) {
    if ((token.type !== 'def' && token.type !== 'paragraph') || !noteStart.test(token.raw)) continue;
    for (const [, id, body] of token.raw.matchAll(/^\[\^([^\]\s]+)\]:[ \t]*((?:(?!\n\[\^[^\]\s]+\]:)[\s\S])*)/gm)) notes.push({ id, body: body.replace(/\n[ \t]+/g, ' ').trim() });
  }
  return notes;
}

interface Context {
  id: string; streaming: boolean; headings: number; notes: string[]; origins: string[]; done: string; todo: string; drawing: string;
  blocks?: Record<string, (source: string) => ReactNode>;
}

const noteLink = (id: string, context: Context, key: number) => {
  const index = context.notes.indexOf(id) + 1;
  if (index) return <sup key={key}><a href={`#${context.id}-note-${index}`}>{index}</a></sup>;
  // Notes are written last, so a mark with no note yet stays a mark while the text is arriving.
  return context.streaming ? <sup key={key}>{id}</sup> : `[^${id}]`;
};

function inline(tokens: Token[] | undefined, context: Context): ReactNode {
  return tokens?.map((token, key) => {
    switch (token.type) {
      case 'strong': return <strong key={key}>{inline(token.tokens, context)}</strong>;
      case 'em': return <em key={key}>{inline(token.tokens, context)}</em>;
      case 'del': return <del key={key}>{inline(token.tokens, context)}</del>;
      case 'codespan': return <code key={key}>{token.text}</code>;
      case 'br': return <br key={key} />;
      case 'escape': return token.text;
      case 'text': return token.tokens
        ? <Fragment key={key}>{inline(token.tokens, context)}</Fragment>
        : <Fragment key={key}>{decode(token.text).split(/\[\^([^\]\s]+)\]/).map((part: string, index: number) => index % 2 ? noteLink(part, context, index) : part)}</Fragment>;
      case 'link': {
        const note = /^\[\^([^\]\s]+)\]$/.exec(token.raw);
        if (note) return noteLink(note[1], context, key);
        const url = resolve(token.href), children = inline(token.tokens, context);
        if (!url || !['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) return <Fragment key={key}>{children}</Fragment>;
        const away = url.origin !== here && url.protocol !== 'mailto:' && url.protocol !== 'tel:';
        return <a key={key} href={decode(token.href)} title={token.title ?? undefined} {...(away ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>;
      }
      case 'image': {
        const url = resolve(token.href), alt = decode(token.text);
        // A remote image is a request to another server, so it loads only from this origin or one the app lists.
        if (url && (url.origin === here || (/^https?:$/.test(url.protocol) && (context.origins.includes('*') || context.origins.includes(url.origin))))) return <img key={key} src={decode(token.href)} alt={alt} title={token.title ?? undefined} loading="lazy" />;
        return url && /^https?:$/.test(url.protocol) ? <a key={key} href={decode(token.href)} target="_blank" rel="noopener noreferrer">{alt || token.href}</a> : alt;
      }
      // HTML in the source is shown as written, never run.
      default: return token.raw;
    }
  });
}

function block(token: Token, context: Context, key?: number, depth = 0): ReactNode {
  if (depth > depthLimit) return token.raw.trim() ? <p key={key}>{token.raw.trim()}</p> : null;
  switch (token.type) {
    case 'heading': {
      const Tag = `h${Math.min(6, token.depth + context.headings - 1)}` as 'h1';
      return <Tag key={key} data-depth={token.depth}>{inline(token.tokens, context)}</Tag>;
    }
    case 'paragraph': return <p key={key}>{inline(token.tokens, context)}</p>;
    case 'text': return <Fragment key={key}>{inline(token.tokens ?? [token], context)}</Fragment>;
    case 'blockquote': return <blockquote key={key}>{(token as Tokens.Blockquote).tokens.map((child, index) => block(child, context, index, depth + 1))}</blockquote>;
    case 'hr': return <hr key={key} />;
    case 'list': {
      const list = token as Tokens.List, Tag = list.ordered ? 'ol' : 'ul';
      return <Tag key={key} start={list.ordered && list.start !== 1 && list.start !== '' ? Number(list.start) : undefined}>
        {list.items.map((item, index) => <li key={index} data-task={item.task || undefined}>
          {item.tokens.map((child, at) => child.type === 'checkbox'
            ? <span key={at} className="bs-md__check" data-checked={child.checked || undefined} role="img" aria-label={child.checked ? context.done : context.todo} />
            : block(child, context, at, depth + 1))}
        </li>)}
      </Tag>;
    }
    case 'table': {
      const table = token as Tokens.Table;
      const align = (index: number) => table.align[index] === 'right' ? 'end' : table.align[index] === 'center' ? 'center' : undefined;
      return <div key={key} className="bs-table bs-md__table" role="region" aria-label={table.header.map(cell => cell.text).join(', ')} tabIndex={0}>
        <table>
          <thead><tr>{table.header.map((cell, index) => <th key={index} scope="col" data-align={align(index)}>{inline(cell.tokens, context)}</th>)}</tr></thead>
          <tbody>{table.rows.map((row, at) => <tr key={at}>{row.map((cell, index) => <td key={index} data-align={align(index)}>{inline(cell.tokens, context)}</td>)}</tr>)}</tbody>
        </table>
      </div>;
    }
    case 'code': {
      const language = token.lang?.split(/\s+/)[0] || undefined, draw = language ? context.blocks?.[language] : undefined;
      if (draw) {
        // Half a block of data draws nothing useful, so a fence the model has not closed shows a placeholder.
        if (context.streaming && !/\n {0,3}(?:`{3,}|~{3,})[ \t]*\n?$/.test(token.raw)) return <div key={key} className="bs-md__pending" role="status"><span className="bs-sr-only">{context.drawing}</span></div>;
        try { return <Fragment key={key}>{draw(token.text)}</Fragment>; } catch { /* Data the renderer cannot read is shown as the code it is. */ }
      }
      return <CodeBlock key={key} code={token.text} language={language} />;
    }
    case 'space': case 'def': return null;
    default: return token.raw.trim() ? <p key={key}>{token.raw.trim()}</p> : null;
  }
}

/** One top-level block. It draws again only when its own source changes, so text that streams in re-renders the last block alone. */
const Block = memo(function Block({ token, context }: { token: Token; context: Context }) {
  return block(token, context);
}, (previous, next) => previous.token.raw === next.token.raw && previous.context === next.context);

/**
 * Markdown drawn as brand-styled elements: headings, lists, task lists, tables, quotes, links, images, footnotes and code.
 * Set `streaming` while the text is still arriving and marks left open at the end are closed, so half a bold run or link
 * never shows as raw symbols. HTML in the source is shown as text, and links and images are checked before they are used.
 */
export function Markdown({ text, streaming = false, blocks, imageOrigins, headings = 2, notesLabel = 'Notes', doneLabel = 'Done', todoLabel = 'To do', drawingLabel = 'Drawing', className = '' }: {
  text: string;
  /** The text is still arriving. */
  streaming?: boolean;
  /** Renderers for fenced blocks, keyed by the word after the fence. Each gets the block's source; if it throws, the source shows as code. */
  blocks?: Record<string, (source: string) => ReactNode>;
  /** Origins that images may load from, such as `https://cdn.example.com`. Relative addresses always load; `'*'` allows any. */
  imageOrigins?: string[];
  /** The heading level a single `#` becomes. Deeper headings follow from it. */
  headings?: 1 | 2 | 3 | 4;
  notesLabel?: string; doneLabel?: string; todoLabel?: string; drawingLabel?: string; className?: string;
}) {
  const id = useId();
  const tokens = useMemo(() => read(streaming ? settle(text) : text), [text, streaming]);
  const notes = useMemo(() => footnotes(tokens), [tokens]);
  const noteIds = notes.map(note => note.id).join(' '), origins = imageOrigins?.join(' ') ?? '', references = Object.keys(tokens.links).join(' ');
  const context = useMemo<Context>(
    () => ({ id, streaming, headings, blocks, notes: noteIds ? noteIds.split(' ') : [], origins: origins ? origins.split(' ') : [], done: doneLabel, todo: todoLabel, drawing: drawingLabel }),
    // `references` is listed so a link definition that arrives late redraws the blocks that point at it.
    [id, streaming, headings, blocks, noteIds, origins, references, doneLabel, todoLabel, drawingLabel],
  );
  return <div className={`bs-md ${className}`} aria-busy={streaming || undefined}>
    {tokens.map((token, index) => noteStart.test(token.raw) && (token.type === 'def' || token.type === 'paragraph') ? null : <Block key={index} token={token} context={context} />)}
    {notes.length > 0 && <section className="bs-md__notes" aria-label={notesLabel}>
      <ol>{notes.map((note, index) => <li key={note.id} id={`${id}-note-${index + 1}`}>{inline(Lexer.lexInline(note.body, reader(note.body)), context)}</li>)}</ol>
    </section>}
  </div>;
}
