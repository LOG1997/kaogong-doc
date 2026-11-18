export const rizoLight = {
    name: 'rizo-light',
    type: 'light' as const,
    colors: {
        'editor.background': '#EDE5D4',
        'editor.foreground': '#1D1A2C',
    },
    tokenColors: [
        { scope: ['keyword', 'storage', 'storage.type'], settings: { foreground: '#0068B5', fontStyle: 'bold' } },
        { scope: ['entity.name.function', 'support.function', 'variable.function', 'entity.name.type', 'entity.name.class', 'support.class'], settings: { foreground: '#C21F7A' } },
        { scope: ['string', 'string.quoted', 'string.template', 'string.regexp'], settings: { foreground: '#1E7A4C' } },
        { scope: ['constant.numeric', 'constant.language', 'constant.character'], settings: { foreground: '#B4530A' } },
        { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#7A7263', fontStyle: 'italic' } },
        { scope: ['variable', 'variable.other', 'meta.object-literal.key'], settings: { foreground: '#1D1A2C' } },
        { scope: ['entity.name.tag', 'support.type.property-name', 'keyword.operator'], settings: { foreground: '#0068B5' } },
        { scope: ['punctuation', 'meta.brace'], settings: { foreground: '#7A7263' } },
    ],
}

export const rizoDark = {
    ...rizoLight,
    name: 'rizo-dark',
    type: 'dark' as const,
    colors: {
        'editor.background': '#1E1A29',
        'editor.foreground': '#F1EAD9',
    },
    tokenColors: [
        { scope: ['keyword', 'storage', 'storage.type'], settings: { foreground: '#5AA9E6', fontStyle: 'bold' } },
        { scope: ['entity.name.function', 'support.function', 'variable.function', 'entity.name.type', 'entity.name.class', 'support.class'], settings: { foreground: '#FF8CC7' } },
        { scope: ['string', 'string.quoted', 'string.template', 'string.regexp'], settings: { foreground: '#4CC38A' } },
        { scope: ['constant.numeric', 'constant.language', 'constant.character'], settings: { foreground: '#E0A040' } },
        { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#8B8273', fontStyle: 'italic' } },
        { scope: ['variable', 'variable.other', 'meta.object-literal.key'], settings: { foreground: '#F1EAD9' } },
        { scope: ['entity.name.tag', 'support.type.property-name', 'keyword.operator'], settings: { foreground: '#5AA9E6' } },
        { scope: ['punctuation', 'meta.brace'], settings: { foreground: '#8B8273' } },
    ],
}