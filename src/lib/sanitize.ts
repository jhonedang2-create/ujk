import sanitizeHtml from 'sanitize-html';

const allowedTags = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
  'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a',
];

export function cleanRichText(value: string) {
  return sanitizeHtml(value, {
    allowedTags,
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          ...attribs,
          ...(attribs.target === '_blank' ? { rel: 'noopener noreferrer nofollow' } : {}),
        },
      }),
    },
  });
}

export function plainText(value: string) {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();
}
