export type SlateNode = {
  text?: string;
  children?: SlateNode[];
  [key: string]: unknown;
};

export type SlateBlock = {
  content?: SlateNode[];
  richtext_box?: string;
  caption?: SlateNode[];
  itemId?: string;
  itemTypeId?: string;
  [key: string]: unknown;
};

export type Snippet = {
  field: string;
  before: string;
  match: string;
  after: string;
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createRegex(searchTerm: string, caseSensitive: boolean): RegExp {
  return new RegExp(escapeRegex(searchTerm), caseSensitive ? 'g' : 'gi');
}

// --- Slate node traversal ---

// Velden van geneste blokken (embedded in structured_text) die doorzocht moeten worden
const NESTED_SLATE_FIELDS = ['content', 'content_left_column', 'content_right_column', 'caption'];
const NESTED_STRING_FIELDS = ['conclusion'];

function countInNodes(nodes: SlateNode[], regex: RegExp): number {
  let count = 0;
  for (const node of nodes) {
    // Tekst-leaf node
    if (typeof node.text === 'string') {
      regex.lastIndex = 0;
      count += (node.text.match(regex) || []).length;
    }
    // Geneste Slate-velden in embedded blokken (richtext_box, richtext_two_column)
    for (const field of NESTED_SLATE_FIELDS) {
      if (Array.isArray(node[field])) {
        count += countInNodes(node[field] as SlateNode[], regex);
      }
    }
    // Geneste string-velden in embedded blokken (richtext_review.conclusion)
    for (const field of NESTED_STRING_FIELDS) {
      if (typeof node[field] === 'string') {
        regex.lastIndex = 0;
        count += ((node[field] as string).match(regex) || []).length;
      }
    }
    // Standaard Slate children
    if (Array.isArray(node.children)) {
      count += countInNodes(node.children, regex);
    }
  }
  return count;
}

function replaceInNodes(nodes: SlateNode[], regex: RegExp, replaceTerm: string): SlateNode[] {
  return nodes.map((node) => {
    let updated = { ...node };
    // Tekst-leaf node
    if (typeof node.text === 'string') {
      regex.lastIndex = 0;
      return { ...node, text: node.text.replace(regex, replaceTerm) };
    }
    // Geneste Slate-velden in embedded blokken
    for (const field of NESTED_SLATE_FIELDS) {
      if (Array.isArray(node[field])) {
        updated = { ...updated, [field]: replaceInNodes(node[field] as SlateNode[], regex, replaceTerm) };
      }
    }
    // Geneste string-velden in embedded blokken
    for (const field of NESTED_STRING_FIELDS) {
      if (typeof node[field] === 'string') {
        regex.lastIndex = 0;
        updated = { ...updated, [field]: (node[field] as string).replace(regex, replaceTerm) };
      }
    }
    // Standaard Slate children
    if (Array.isArray(node.children)) {
      updated = { ...updated, children: replaceInNodes(node.children, regex, replaceTerm) };
    }
    return updated;
  });
}

function extractTextFromNodes(nodes: SlateNode[]): string {
  let text = '';
  for (const node of nodes) {
    if (typeof node.text === 'string') text += node.text + ' ';
    for (const field of NESTED_SLATE_FIELDS) {
      if (Array.isArray(node[field])) text += extractTextFromNodes(node[field] as SlateNode[]);
    }
    for (const field of NESTED_STRING_FIELDS) {
      if (typeof node[field] === 'string') text += node[field] + ' ';
    }
    if (Array.isArray(node.children)) text += extractTextFromNodes(node.children);
  }
  return text;
}

function snippetsFromText(fullText: string, replaceTerm: string, fieldLabel: string, caseSensitive: boolean): Snippet[] {
  const regex = createRegex(replaceTerm, caseSensitive);
  const results: Snippet[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(fullText)) !== null) {
    const start = Math.max(0, m.index - 40);
    const end = Math.min(fullText.length, m.index + m[0].length + 40);
    results.push({
      field: fieldLabel,
      before: (start > 0 ? '...' : '') + fullText.slice(start, m.index),
      match: m[0],
      after: fullText.slice(m.index + m[0].length, end) + (end < fullText.length ? '...' : ''),
    });
    if (results.length >= 20) break; // max 20 snippets
  }
  return results;
}

// --- Public API ---

export function countInSlate(nodes: SlateNode[], searchTerm: string, caseSensitive: boolean): number {
  const regex = createRegex(searchTerm, caseSensitive);
  return countInNodes(nodes, regex);
}

export function replaceInSlate(nodes: SlateNode[], searchTerm: string, replaceTerm: string, caseSensitive: boolean): SlateNode[] {
  const regex = createRegex(searchTerm, caseSensitive);
  return replaceInNodes(nodes, regex, replaceTerm);
}

export function countInString(text: string, searchTerm: string, caseSensitive: boolean): number {
  const regex = createRegex(searchTerm, caseSensitive);
  return (text.match(regex) || []).length;
}

export function replaceInString(text: string, searchTerm: string, replaceTerm: string, caseSensitive: boolean): string {
  const regex = createRegex(searchTerm, caseSensitive);
  return text.replace(regex, replaceTerm);
}

export function extractSnippets(nodes: SlateNode[] | string, replaceTerm: string, fieldLabel: string, caseSensitive: boolean): Snippet[] {
  const fullText = typeof nodes === 'string' ? nodes : extractTextFromNodes(nodes);
  return snippetsFromText(fullText, replaceTerm, fieldLabel, caseSensitive);
}
