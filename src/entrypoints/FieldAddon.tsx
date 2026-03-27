import React, { useState, useMemo } from 'react';
import { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { Canvas } from 'datocms-react-ui';
import {
  SlateBlock,
  SlateNode,
  Snippet,
  countInSlate,
  countInString,
  replaceInSlate,
  replaceInString,
  extractSnippets,
} from '../utils/structuredText';

type Props = { ctx: RenderFieldExtensionCtx };

type FieldCount = { label: string; count: number };

type HistoryEntry = { intro: string; blocks: SlateBlock[] };

const MAX_HISTORY = 3;

const persistentHistory: HistoryEntry[] = [];

// Inline styles voor de spartaanse toolbar-UI
const s = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 8px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontFamily: 'system-ui, sans-serif',
  } as React.CSSProperties,
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#475569',
    padding: '3px 6px',
    borderRadius: '3px',
    fontWeight: 500,
  } as React.CSSProperties,
  panel: {
    marginTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px 12px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '4px',
  } as React.CSSProperties,
  row: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
  } as React.CSSProperties,
  inputWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
  } as React.CSSProperties,
  label: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 500,
  } as React.CSSProperties,
  input: {
    fontSize: '13px',
    padding: '5px 8px',
    border: '1px solid #cbd5e1',
    borderRadius: '3px',
    background: '#fff',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  } as React.CSSProperties,
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#475569',
  } as React.CSSProperties,
  btnPrimary: {
    fontSize: '12px',
    padding: '5px 12px',
    borderRadius: '3px',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#3b82f6',
    color: '#fff',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  btnPrimaryDisabled: {
    opacity: 0.45,
    cursor: 'default',
  } as React.CSSProperties,
  btnMuted: {
    fontSize: '12px',
    padding: '5px 12px',
    borderRadius: '3px',
    border: '1px solid #cbd5e1',
    cursor: 'pointer',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  btnMutedDisabled: {
    opacity: 0.45,
    cursor: 'default',
  } as React.CSSProperties,
  info: {
    fontSize: '12px',
    padding: '5px 8px',
    borderRadius: '3px',
    backgroundColor: '#dbeafe',
    color: '#1e3a8a',
    border: '1px solid #93c5fd',
  } as React.CSSProperties,
  noResult: {
    fontSize: '12px',
    padding: '5px 8px',
    borderRadius: '3px',
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
  } as React.CSSProperties,
  snippetList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxHeight: '180px',
    overflowY: 'auto',
  } as React.CSSProperties,
  snippet: {
    fontSize: '11px',
    padding: '4px 6px',
    borderRadius: '3px',
    backgroundColor: '#fff',
    border: '1px solid #e0f2fe',
    lineHeight: 1.5,
  } as React.CSSProperties,
  snippetLabel: {
    fontSize: '10px',
    color: '#94a3b8',
    display: 'block',
    marginBottom: '1px',
  } as React.CSSProperties,
  divider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    margin: '2px 0',
  } as React.CSSProperties,
};

export default function FieldAddon({ ctx }: Props) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [afterSnippets, setAfterSnippets] = useState<Snippet[]>([]);
  const [historyLen, setHistoryLen] = useState(persistentHistory.length);

  const blocks = useMemo((): SlateBlock[] => {
    const val = ctx.formValues['article_content_body'];
    return Array.isArray(val) ? (val as SlateBlock[]) : [];
  }, [ctx.formValues]);

  const articleIntro = useMemo((): string => {
    const val = ctx.formValues['article_intro'];
    return typeof val === 'string' ? val : '';
  }, [ctx.formValues]);

  const fieldCounts = useMemo((): FieldCount[] => {
    if (!searchTerm) return [];
    const counts: FieldCount[] = [];
    const introCount = countInString(articleIntro, searchTerm, caseSensitive);
    if (introCount > 0) counts.push({ label: 'Intro', count: introCount });
    for (const block of blocks) {
      if (Array.isArray(block.content)) {
        const n = countInSlate(block.content as SlateNode[], searchTerm, caseSensitive);
        if (n > 0) counts.push({ label: 'Artikel body', count: n });
      }
      if (typeof block.richtext_box === 'string') {
        const n = countInString(block.richtext_box, searchTerm, caseSensitive);
        if (n > 0) counts.push({ label: 'Kader', count: n });
      }
      if (Array.isArray(block.caption)) {
        const n = countInSlate(block.caption as SlateNode[], searchTerm, caseSensitive);
        if (n > 0) counts.push({ label: 'Bijschrift', count: n });
      }
    }
    return counts;
  }, [searchTerm, caseSensitive, blocks, articleIntro]);

  const totalMatches = fieldCounts.reduce((s, f) => s + f.count, 0);

  const previewSnippets = useMemo((): Snippet[] => {
    if (!searchTerm || totalMatches === 0) return [];
    const result: Snippet[] = [];
    if (articleIntro) result.push(...extractSnippets(articleIntro, searchTerm, 'Intro', caseSensitive));
    for (const block of blocks) {
      if (Array.isArray(block.content)) result.push(...extractSnippets(block.content as SlateNode[], searchTerm, 'Artikel body', caseSensitive));
      if (typeof block.richtext_box === 'string') result.push(...extractSnippets(block.richtext_box, searchTerm, 'Kader', caseSensitive));
      if (Array.isArray(block.caption)) result.push(...extractSnippets(block.caption as SlateNode[], searchTerm, 'Bijschrift', caseSensitive));
    }
    return result.slice(0, 20);
  }, [searchTerm, caseSensitive, blocks, articleIntro, totalMatches]);

  const handleReplace = async () => {
    if (!searchTerm || totalMatches === 0) return;
    if (persistentHistory.length >= MAX_HISTORY) persistentHistory.shift();
    persistentHistory.push({ intro: articleIntro, blocks });
    setHistoryLen(persistentHistory.length);

    const newSnippets: Snippet[] = [];

    if (articleIntro) {
      const newIntro = replaceInString(articleIntro, searchTerm, replaceTerm, caseSensitive);
      if (newIntro !== articleIntro) {
        await ctx.setFieldValue('article_intro', newIntro);
        newSnippets.push(...extractSnippets(newIntro, replaceTerm, 'Intro', caseSensitive));
      }
    }

    const updatedBlocks = blocks.map((block) => {
      let updated = { ...block };
      if (Array.isArray(block.content)) {
        const newContent = replaceInSlate(block.content as SlateNode[], searchTerm, replaceTerm, caseSensitive);
        updated = { ...updated, content: newContent };
        newSnippets.push(...extractSnippets(newContent, replaceTerm, 'Artikel body', caseSensitive));
      }
      if (typeof block.richtext_box === 'string') {
        const newText = replaceInString(block.richtext_box, searchTerm, replaceTerm, caseSensitive);
        updated = { ...updated, richtext_box: newText };
        newSnippets.push(...extractSnippets(newText, replaceTerm, 'Kader', caseSensitive));
      }
      if (Array.isArray(block.caption)) {
        const newCaption = replaceInSlate(block.caption as SlateNode[], searchTerm, replaceTerm, caseSensitive);
        updated = { ...updated, caption: newCaption };
        newSnippets.push(...extractSnippets(newCaption, replaceTerm, 'Bijschrift', caseSensitive));
      }
      return updated;
    });

    await ctx.setFieldValue('article_content_body', updatedBlocks);
    setAfterSnippets(newSnippets);
    setSearchTerm('');
  };

  const handleUndo = async () => {
    if (persistentHistory.length === 0) return;
    const prev = persistentHistory.pop()!;
    setHistoryLen(persistentHistory.length);
    await ctx.setFieldValue('article_intro', prev.intro);
    await ctx.setFieldValue('article_content_body', prev.blocks);
    setAfterSnippets([]);
  };

  const canReplace = !!searchTerm && totalMatches > 0;

  return (
    <Canvas ctx={ctx}>
      {/* Toolbar-balk */}
      <div style={s.toolbar}>
        <button
          style={s.toggleBtn}
          onClick={() => setOpen((v) => !v)}
          title="Zoeken & vervangen"
        >
          {/* Zoek-icoon (SVG) */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Zoeken &amp; vervangen
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {historyLen > 0 && (
          <>
            <div style={s.divider} />
            <button
              style={{ ...s.toggleBtn, color: '#64748b' }}
              onClick={handleUndo}
              title={`Ongedaan maken (${historyLen} stap${historyLen > 1 ? 'pen' : ''} beschikbaar)`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-4" />
              </svg>
              Ongedaan ({historyLen}/{MAX_HISTORY})
            </button>
          </>
        )}
      </div>

      {/* Uitklapbaar paneel */}
      {open && (
        <div style={s.panel}>
          {/* Invoervelden + Vervang-knop op één rij */}
          <div style={s.row}>
            <div style={s.inputWrap}>
              <span style={s.label}>Zoeken</span>
              <input
                style={s.input}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setAfterSnippets([]); }}
                placeholder="Zoekterm..."
              />
            </div>
            <div style={s.inputWrap}>
              <span style={s.label}>Vervangen door</span>
              <input
                style={s.input}
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                placeholder="Vervangterm..."
              />
            </div>
            <button
              style={{ ...s.btnPrimary, ...(canReplace ? {} : s.btnPrimaryDisabled) }}
              onClick={handleReplace}
              disabled={!canReplace}
            >
              {canReplace ? `Vervang (${totalMatches})` : 'Vervang'}
            </button>
          </div>

          {/* Hoofdlettergevoelig */}
          <label style={s.checkRow}>
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              style={{ width: '13px', height: '13px', cursor: 'pointer' }}
            />
            Hoofdlettergevoelig
          </label>

          {/* Feedback */}
          {searchTerm && totalMatches === 0 && (
            <div style={s.noResult}>Geen resultaten gevonden</div>
          )}

          {totalMatches > 0 && (
            <div style={s.info}>
              <strong>{totalMatches}</strong> {totalMatches === 1 ? 'resultaat' : 'resultaten'}:{' '}
              {fieldCounts.map((f, i) => (
                <span key={i}>{i > 0 ? ' · ' : ''}{f.label} <strong>{f.count}x</strong></span>
              ))}
            </div>
          )}

          {/* Preview snippets */}
          {previewSnippets.length > 0 && (
            <div style={s.snippetList}>
              {previewSnippets.map((sn, i) => (
                <div key={i} style={s.snippet}>
                  <span style={s.snippetLabel}>{sn.field}</span>
                  {sn.before}
                  <mark style={{ backgroundColor: '#fed7aa', padding: '0 1px', borderRadius: '2px', fontWeight: 600 }}>{sn.match}</mark>
                  {sn.after}
                </div>
              ))}
            </div>
          )}

          {/* Na vervangen */}
          {afterSnippets.length > 0 && (
            <div style={s.snippetList}>
              <span style={{ ...s.snippetLabel, color: '#3b82f6', fontWeight: 600 }}>Gewijzigd:</span>
              {afterSnippets.map((sn, i) => (
                <div key={i} style={s.snippet}>
                  <span style={s.snippetLabel}>{sn.field}</span>
                  {sn.before}
                  <mark style={{ backgroundColor: '#fde68a', padding: '0 1px', borderRadius: '2px', fontWeight: 600 }}>{sn.match}</mark>
                  {sn.after}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Canvas>
  );
}
