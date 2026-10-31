<!-- docs/.vitepress/theme/components/IdiomCompare.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

interface DiffItem {
  word: string
  meaning: string
  tone: string
  applicable: string
  collocation: string
}

interface DiffGroup {
  title: string
  items: DiffItem[]
}

const slotRef = ref<HTMLElement>()
const groups = ref<DiffGroup[]>([])
const ready = ref(false)
const keyword = ref('')

const ALIASES = {
  meaning: ['含义', '释义', '意思'],
  tone: ['感情色彩', '色彩', '褒贬'],
  applicable: ['适用对象', '对象', '适用'],
  collocation: ['常见搭配', '搭配', '用法']
} as const

const POS_FIELDS = ['meaning', 'tone', 'applicable', 'collocation'] as const

const TONE_TAGS: { key: string; cls: string }[] = [
  { key: '褒义', cls: 'tag-good' },
  { key: '积极', cls: 'tag-good' },
  { key: '贬义', cls: 'tag-bad' },
  { key: '消极', cls: 'tag-bad' },
  { key: '中性', cls: 'tag-neutral' }
]

function toneTags(tone: string) {
  if (!tone) return []
  return TONE_TAGS.filter(t => tone.includes(t.key)).map(t => ({ text: t.key, cls: t.cls }))
}

function toneClass(tone: string) {
  if (/贬义|消极/.test(tone)) return 'tone-bad'
  if (/褒义|积极/.test(tone)) return 'tone-good'
  return 'tone-neutral'
}

function textOf(el: Element | null): string {
  return (el?.textContent || '').replace(/\s+/g, ' ').trim()
}

/** 把 li 内的内容按“段落”拆开：p、blockquote、直接文本都算一段，跳过嵌套列表 */
function collectParagraphs(li: HTMLLIElement): string[] {
  const paras: string[] = []
  const push = (s: string) => {
    const t = s.replace(/\s+/g, ' ').trim()
    if (t) paras.push(t)
  }
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        push(child.textContent || '')
        continue
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue
      const el = child as HTMLElement
      const tag = el.tagName.toLowerCase()
      if (tag === 'ol' || tag === 'ul') continue
      if (tag === 'div' || tag === 'section' || tag === 'article') {
        walk(el)
        continue
      }
      push(el.textContent || '')
    }
  }
  walk(li)
  return paras
}

function assignFields(paras: string[]): DiffItem {
  const word = paras[0] || ''
  const rest = paras.slice(1)
  const item: DiffItem = { word, meaning: '', tone: '', applicable: '', collocation: '' }

  const byKey: Record<string, string> = {}
  const byPos: string[] = []

  for (const p of rest) {
    const m = p.match(/^([^：:]{1,10})[：:]\s*(.+)$/)
    if (m) {
      const key = m[1].trim()
      let matched = false
      for (const [field, aliases] of Object.entries(ALIASES)) {
        if (aliases.some(a => key.includes(a))) {
          byKey[field] = m[2].trim()
          matched = true
          break
        }
      }
      if (!matched) byPos.push(p)
    } else {
      byPos.push(p)
    }
  }

  let pi = 0
  for (const field of POS_FIELDS) {
    if (byKey[field]) (item as any)[field] = byKey[field]
    else if (pi < byPos.length) (item as any)[field] = byPos[pi++]
  }

  return item
}

function parseGroup(li: HTMLLIElement): DiffGroup | null {
  const clone = li.cloneNode(true) as HTMLElement
  clone.querySelectorAll('ul, ol').forEach(el => el.remove())
  const title = textOf(clone)
  if (!title) return null

  const items: DiffItem[] = []
  // 兼容“缩进写法”：* 下面嵌套 ol/ul
  const wordLis = Array.from(
    li.querySelectorAll<HTMLLIElement>(':scope > ol > li, :scope > ul > li')
  )
  for (const wli of wordLis) {
    const item = parseWordLi(wli)
    if (item) items.push(item)
  }
  return { title, items }
}

function parseWordLi(li: HTMLLIElement): DiffItem | null {
  const paras = collectParagraphs(li)
  if (!paras.length) return null
  return assignFields(paras)
}

onMounted(() => {
  const root = slotRef.value
  if (!root) return

  const parsed: DiffGroup[] = []
  let current: DiffGroup | null = null

  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName.toLowerCase()
      if (tag === 'ul' || tag === 'ol') {
        for (const li of Array.from(child.children)) {
          if (li.tagName.toLowerCase() !== 'li') continue
          if (tag === 'ul') {
            // 组标题
            const g = parseGroup(li as HTMLLIElement)
            if (g) {
              if (current && current.items.length) parsed.push(current)
              current = g
            }
          } else if (tag === 'ol') {
            // 平级词项：* 下面没嵌套 ol 时，这里的 li 就是词项
            if (current) {
              const item = parseWordLi(li as HTMLLIElement)
              if (item) current.items.push(item)
            }
          }
        }
      } else if (['div', 'section', 'article'].includes(tag)) {
        walk(child)
      }
    }
  }
  walk(root)

  if (current && current.items.length) parsed.push(current)
  groups.value = parsed
  ready.value = true
})

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return groups.value
  return groups.value.filter(g =>
    g.title.toLowerCase().includes(q) ||
    g.items.some(it =>
      [it.word, it.meaning, it.tone, it.applicable, it.collocation]
        .some(v => v.toLowerCase().includes(q))
    )
  )
})
</script>

<template>
  <div class="cmp-cards">
    <div v-if="ready" class="cmp-search">
      <input
        v-model="keyword"
        type="search"
        class="cmp-search-input"
        placeholder="搜索词名、含义、色彩、对象、搭配…"
        aria-label="搜索辨析"
      />
      <span class="cmp-count">{{ filtered.length }} / {{ groups.length }}</span>
    </div>

    <div ref="slotRef" class="cmp-source" :class="{ 'is-hidden': ready }">
      <slot />
    </div>

    <div v-if="ready" class="cmp-list">
      <div v-for="g in filtered" :key="g.title" class="cmp-card">
        <div class="cmp-title">{{ g.title }}</div>
        <div class="cmp-body">
          <div v-for="it in g.items" :key="it.word" class="cmp-item">
            <div class="cmp-word">{{ it.word }}</div>
            <div v-if="it.meaning" class="cmp-row">
              <span class="cmp-label label-meaning">义</span>
              <span class="cmp-val">{{ it.meaning }}</span>
            </div>
            <div v-if="it.tone" class="cmp-row" :class="toneClass(it.tone)">
              <span class="cmp-label label-tone">色</span>
              <span class="cmp-val">
                <span
                  v-for="t in toneTags(it.tone)"
                  :key="t.text"
                  class="tone-tag"
                  :class="t.cls"
                >{{ t.text }}</span>
                <span class="tone-text">{{ it.tone }}</span>
              </span>
            </div>
            <div v-if="it.applicable" class="cmp-row">
              <span class="cmp-label label-applicable">用</span>
              <span class="cmp-val">{{ it.applicable }}</span>
            </div>
            <div v-if="it.collocation" class="cmp-row">
              <span class="cmp-label label-collocation">搭</span>
              <span class="cmp-val">{{ it.collocation }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p v-if="ready && filtered.length === 0" class="cmp-empty">
      没有匹配「{{ keyword }}」的辨析
    </p>
  </div>
</template>

<style>
.cmp-cards { margin: 12px 0; }

.cmp-search {
  display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
}
.cmp-search-input {
  flex: 1; padding: 6px 10px; font-size: 13px;
  border: 1px solid var(--vp-c-divider); border-radius: 6px;
  background: var(--vp-c-bg); color: var(--vp-c-text-1); outline: none;
  transition: border-color .2s;
}
.cmp-search-input:focus { border-color: var(--vp-c-brand-1); }
.cmp-count { font-size: 12px; color: var(--vp-c-text-2); white-space: nowrap; }

.cmp-source.is-hidden { display: none; }

.cmp-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 12px 14px;
  background: var(--vp-c-bg-soft);
  margin-bottom: 12px;
}
.cmp-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--vp-c-divider);
  color: var(--vp-c-text-1);
}
.cmp-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px;
}
.cmp-item {
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
}
.cmp-word {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--vp-c-brand-1);
}

.cmp-row {
  display: flex; align-items: flex-start; gap: 4px;
  font-size: 12px; line-height: 1.55; margin-top: 3px;
}
.cmp-label {
  flex: none; width: 14px;
  font-size: 11px; line-height: 1.7; font-weight: 600;
  text-align: center; border-radius: 3px;
}
.label-meaning { color: #3b82f6; background: rgba(59, 130, 246, .12); }
.label-tone { color: #8b5cf6; background: rgba(139, 92, 246, .12); }
.label-applicable { color: #14b8a6; background: rgba(20, 184, 166, .12); }
.label-collocation { color: #f59e0b; background: rgba(245, 158, 11, .12); }

.dark .label-meaning { color: #60a5fa; background: rgba(59, 130, 246, .18); }
.dark .label-tone { color: #a78bfa; background: rgba(139, 92, 246, .18); }
.dark .label-applicable { color: #2dd4bf; background: rgba(20, 184, 166, .18); }
.dark .label-collocation { color: #fbbf24; background: rgba(245, 158, 11, .18); }

.cmp-val { flex: 1; color: var(--vp-c-text-2); word-break: break-word; }

.tone-tag {
  display: inline-block;
  font-size: 10px; line-height: 1.5; font-weight: 600;
  padding: 0 5px; border-radius: 3px;
  margin-right: 3px; vertical-align: 1px;
}
.tag-good { color: var(--vp-c-green-1); background: var(--vp-c-green-soft); }
.tag-bad { color: var(--vp-c-yellow-1); background: var(--vp-c-yellow-soft); }
.tag-neutral { color: var(--vp-c-text-2); background: var(--vp-c-default-soft); }

.cmp-row.tone-good .tone-text { color: var(--vp-c-green-1); }
.cmp-row.tone-bad .tone-text { color: var(--vp-c-yellow-1); }
.cmp-row.tone-neutral .tone-text { color: var(--vp-c-text-2); }

.cmp-empty {
  text-align: center; color: var(--vp-c-text-2); font-size: 13px; margin-top: 12px;
}
</style>