import React, { useState, useMemo } from 'react';
import { RenderItemFormOutletCtx } from 'datocms-plugin-sdk';
import { Canvas, Button, TextField } from 'datocms-react-ui';
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

type Props = { ctx: RenderItemFormOutletCtx };

type FieldCount = { label: string; count: number };

type HistoryEntry = { intro: string; blocks: SlateBlock[] };

const MAX_HISTORY = 3;

// Module-level: overleeft component remounts zolang de iframe open is
const persistentHistory: HistoryEntry[] = [];

export default function InlinePanel({ ctx }: Props) {
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

    if (articleIntro) {
      result.push(...extractSnippets(articleIntro, searchTerm, 'Intro', caseSensitive));
    }
    for (const block of blocks) {
      if (Array.isArray(block.content)) {
        result.push(...extractSnippets(block.content as SlateNode[], searchTerm, 'Artikel body', caseSensitive));
      }
      if (typeof block.richtext_box === 'string') {
        result.push(...extractSnippets(block.richtext_box, searchTerm, 'Kader', caseSensitive));
      }
      if (Array.isArray(block.caption)) {
        result.push(...extractSnippets(block.caption as SlateNode[], searchTerm, 'Bijschrift', caseSensitive));
      }
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

  return (
    <Canvas ctx={ctx}>
      <div style={{ backgroundColor: '#dbeafe', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        <TextField
          id="search"
          name="search"
          label="Zoeken"
          value={searchTerm}
          onChange={(val) => { setSearchTerm(val); setAfterSnippets([]); }}
          placeholder="Zoekterm..."
        />

        <TextField
          id="replace"
          name="replace"
          label="Vervangen door"
          value={replaceTerm}
          onChange={setReplaceTerm}
          placeholder="Vervangterm..."
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          Hoofdlettergevoelig
        </label>

        <Button
          onClick={handleReplace}
          disabled={!searchTerm || totalMatches === 0}
          fullWidth
          buttonType="primary"
        >
          {totalMatches > 0 ? `Vervang alle (${totalMatches})` : 'Vervang alle'}
        </Button>

        {searchTerm.length > 0 && totalMatches === 0 && (
          <div style={{ fontSize: '13px', padding: '8px 10px', borderRadius: '4px', backgroundColor: '#e0e7ff', color: '#6b7280', border: '1px solid #c7d2fe' }}>
            Geen resultaten gevonden
          </div>
        )}

        {totalMatches > 0 && (
          <div style={{ fontSize: '13px', padding: '8px 10px', borderRadius: '4px', backgroundColor: '#bfdbfe', color: '#1e3a8a', border: '1px solid #93c5fd' }}>
            <strong>{totalMatches}</strong> {totalMatches === 1 ? 'resultaat' : 'resultaten'} gevonden
            <ul style={{ margin: '4px 0 0', paddingLeft: '16px' }}>
              {fieldCounts.map((f, i) => (
                <li key={i}>{f.label}: <strong>{f.count}x</strong></li>
              ))}
            </ul>
          </div>
        )}

        {previewSnippets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#1e40af' }}>
              Gevonden tekst:
            </p>
            {previewSnippets.map((s, i) => (
              <div key={i} style={{ fontSize: '12px', padding: '6px 8px', borderRadius: '4px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', lineHeight: '1.5' }}>
                <span style={{ fontSize: '10px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>{s.field}</span>
                {s.before}
                <mark style={{ backgroundColor: '#fed7aa', padding: '0 2px', borderRadius: '2px', fontWeight: 600 }}>{s.match}</mark>
                {s.after}
              </div>
            ))}
          </div>
        )}

        {afterSnippets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#1e40af' }}>
              Gewijzigde tekst ({afterSnippets.length}):
            </p>
            {afterSnippets.map((s, i) => (
              <div key={i} style={{ fontSize: '12px', padding: '6px 8px', borderRadius: '4px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', lineHeight: '1.5' }}>
                <span style={{ fontSize: '10px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>{s.field}</span>
                {s.before}
                <mark style={{ backgroundColor: '#fde68a', padding: '0 2px', borderRadius: '2px', fontWeight: 600 }}>{s.match}</mark>
                {s.after}
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={handleReplace}
          disabled={!searchTerm || totalMatches === 0}
          fullWidth
          buttonType="primary"
        >
          {totalMatches > 0 ? `Vervang alle (${totalMatches})` : 'Vervang alle'}
        </Button>

        <Button
          onClick={handleUndo}
          disabled={historyLen === 0}
          fullWidth
          buttonType="muted"
        >
          {historyLen > 0 ? `Ongedaan maken (${historyLen}/${MAX_HISTORY})` : 'Ongedaan maken'}
        </Button>
      </div>
    </Canvas>
  );
}
