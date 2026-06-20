// Minimal Payload lexical JSON → HTML converter for page rendering

interface LexNode {
  type: string
  text?: string
  format?: number
  tag?: string
  listType?: 'bullet' | 'number'
  children?: LexNode[]
  url?: string
}

function renderNode(node: LexNode): string {
  if (node.type === 'text') {
    let t = (node.text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    if (!t) return ''
    const fmt = node.format ?? 0
    if (fmt & 1) t = `<strong>${t}</strong>`
    if (fmt & 2) t = `<em>${t}</em>`
    if (fmt & 8) t = `<u>${t}</u>`
    if (fmt & 4) t = `<s>${t}</s>`
    if (fmt & 32) t = `<code>${t}</code>`
    return t
  }

  const inner = (node.children ?? []).map(renderNode).join('')

  switch (node.type) {
    case 'root': return inner
    case 'paragraph': return `<p>${inner}</p>`
    case 'heading': return `<${node.tag ?? 'h2'}>${inner}</${node.tag ?? 'h2'}>`
    case 'list': return node.listType === 'number' ? `<ol>${inner}</ol>` : `<ul>${inner}</ul>`
    case 'listitem': return `<li>${inner}</li>`
    case 'quote': return `<blockquote>${inner}</blockquote>`
    case 'link': {
      // Reject javascript: and data: protocol URLs to prevent XSS
      const href = (node.url ?? '#').trim()
      const safe = /^(https?:\/\/|\/|#)/i.test(href) ? href : '#'
      return `<a href="${safe.replace(/"/g, '&quot;')}">${inner}</a>`
    }
    case 'linebreak': return '<br />'
    default: return inner
  }
}

export function lexicalToHtml(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const root = (data as { root?: LexNode }).root
  if (!root) return ''
  return renderNode(root)
}
