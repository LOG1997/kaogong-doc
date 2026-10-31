<!-- docs/.vitepress/theme/components/IdiomCards.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

interface Idiom {
  word: string
  meaning: string
  tone: string
  applicable: string
  collocation: string
}

const slotRef = ref<HTMLElement>()
const rows = ref<Idiom[]>([])
const ready = ref(false)
const keyword = ref('')

const TONE_TAGS: { key: string; cls: string }[] = [
  { key: '褒义', cls: 'tag-good' },
  { key: '积极', cls: 'tag-good' },
  { key: '贬义', cls: 'tag-bad' },
  { key: '消极', cls: 'tag-bad' },
  { key: '中性', cls: 'tag-neutral' }
]

function toneTags(tone: string): { text: string; cls: string }[] {
  if (!tone) return []
  return TONE_TAGS
    .filter(t => tone.includes(t.key))
    .map(t => ({ text: t.key, cls: t.cls }))
}

function toneClass(tone: string) {
  if (/贬义|消极/.test(tone)) return 'tone-bad'
  if (/褒义|积极/.test(tone)) return 'tone-good'
  return 'tone-neutral'
}

function textOf(el: Element | null): string {
  return (el?.textContent || '').replace(/\s+/g, ' ').trim()
}

type Block = { type: 'word'; el: Element } | { type: 'p'; el: Element }

function collectBlocks(root: HTMLElement): Block[] {
  const blocks: Block[] = []
  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName.toLowerCase()
      if (tag === 'ul' || tag === 'ol') {
        for (const li of Array.from(child.children)) {
          if (li.tagName.toLowerCase() === 'li') blocks.push({ type: 'word', el: li })
        }
      } else if (tag === 'p') {
        blocks.push({ type: 'p', el: child })
      } else if (['div', 'section', 'article'].includes(tag)) {
        walk(child)
      } else {
        blocks.push({ type: 'p', el: child })
      }
    }
  }
  walk(root)
  return blocks
}

onMounted(() => {
  const root = slotRef.value
  if (!root) return

  const blocks = collectBlocks(root)
  const parsed: Idiom[] = []
  let current: Idiom | null = null
  let fieldIndex = 0

  const pushCurrent = () => {
    if (current && current.word) parsed.push(current)
    current = null
    fieldIndex = 0
  }

  for (const b of blocks) {
    if (b.type === 'word') {
      pushCurrent()
      const word = textOf(b.el)
      if (!word) continue
      current = { word, meaning: '', tone: '', applicable: '', collocation: '' }
      fieldIndex = 0
    } else if (b.type === 'p' && current) {
      const t = textOf(b.el)
      if (!t) continue
      if (fieldIndex === 0) current.meaning = t
      else if (fieldIndex === 1) current.tone = t
      else if (fieldIndex === 2) current.applicable = t
      else if (fieldIndex === 3) current.collocation = t
      fieldIndex++
    }
  }
  pushCurrent()

  rows.value = parsed
  ready.value = true
})

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter(r =>
    [r.word, r.meaning, r.tone, r.applicable, r.collocation]
      .some(v => v.toLowerCase().includes(q))
  )
})
</script>

<template>
  <div class="idiom-cards">
    <div v-if="ready" class="idiom-search">
      <input
        v-model="keyword"
        type="search"
        class="idiom-search-input"
        placeholder="搜索词语、含义、感情色彩、适用对象、搭配…"
        aria-label="搜索成语"
      />
      <span class="idiom-count">{{ filtered.length }} / {{ rows.length }}</span>
    </div>

    <div ref="slotRef" class="idiom-source" :class="{ 'is-hidden': ready }">
      <slot />
    </div>

    <div v-if="ready" class="idiom-grid">
      <div v-for="r in filtered" :key="r.word" class="idiom-card">
        <div class="idiom-word">{{ r.word }}</div>
        <div v-if="r.meaning" class="idiom-row">
          <span class="idiom-label label-meaning">义</span><span class="idiom-val">{{ r.meaning }}</span>
        </div>
        <div v-if="r.tone" class="idiom-row" :class="toneClass(r.tone)">
          <span class="idiom-label label-tone">色</span>
          <span class="idiom-val">
            <span
              v-for="t in toneTags(r.tone)"
              :key="t.text"
              class="tone-tag"
              :class="t.cls"
            >{{ t.text }}</span>
            <span class="tone-text">{{ r.tone }}</span>
          </span>
        </div>
        <div v-if="r.applicable" class="idiom-row">
          <span class="idiom-label label-applicable">用</span><span class="idiom-val">{{ r.applicable }}</span>
        </div>
        <div v-if="r.collocation" class="idiom-row">
          <span class="idiom-label label-collocation">搭</span><span class="idiom-val">{{ r.collocation }}</span>
        </div>
      </div>
    </div>

    <p v-if="ready && filtered.length === 0" class="idiom-empty">
      没有匹配「{{ keyword }}」的成语
    </p>
  </div>
</template>

<style>
.idiom-cards { margin: 12px 0; }

.idiom-search {
  display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
}
.idiom-search-input {
  flex: 1; padding: 6px 10px; font-size: 13px;
  border: 1px solid var(--vp-c-divider); border-radius: 6px;
  background: var(--vp-c-bg); color: var(--vp-c-text-1); outline: none;
  transition: border-color .2s;
}
.idiom-search-input:focus { border-color: var(--vp-c-brand-1); }
.idiom-count { font-size: 12px; color: var(--vp-c-text-2); white-space: nowrap; }

.idiom-source.is-hidden { display: none; }

.idiom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 8px;
}
.idiom-card {
  border: 1px solid var(--vp-c-divider); border-radius: 6px;
  padding: 8px 10px; background: var(--vp-c-bg-soft);
  transition: box-shadow .15s, transform .15s;
  line-height: 1.5;
}
.idiom-card:hover {
  box-shadow: 0 3px 10px rgba(0, 0, 0, .07); transform: translateY(-1px);
}
.idiom-word {
  font-size: 15px; font-weight: 700; letter-spacing: 1px;
  margin-bottom: 4px; color: var(--vp-c-text-1);
}

.idiom-row {
  display: flex; align-items: flex-start; gap: 4px;
  font-size: 12px; line-height: 1.55; margin-top: 2px;
}
.idiom-label {
  flex: none; width: 14px;
  color: var(--vp-c-text-3); font-size: 11px; line-height: 1.7;
  text-align: center;
  background: var(--vp-c-default-soft); border-radius: 3px;
}
/* 义：蓝 */
.label-meaning {
  color: #3b82f6;
  background: rgba(59, 130, 246, .12);
}
/* 色：紫 */
.label-tone {
  color: #8b5cf6;
  background: rgba(139, 92, 246, .12);
}
/* 用：青 */
.label-applicable {
  color: #14b8a6;
  background: rgba(20, 184, 166, .12);
}
/* 搭：橙 */
.label-collocation {
  color: #f59e0b;
  background: rgba(245, 158, 11, .12);
}

/* 暗色模式稍微提亮文字，背景加一点不透明度 */
.dark .label-meaning { color: #60a5fa; background: rgba(59, 130, 246, .18); }
.dark .label-tone { color: #a78bfa; background: rgba(139, 92, 246, .18); }
.dark .label-applicable { color: #2dd4bf; background: rgba(20, 184, 166, .18); }
.dark .label-collocation { color: #fbbf24; background: rgba(245, 158, 11, .18); }
.idiom-val { flex: 1; color: var(--vp-c-text-2); word-break: break-word; }

/* 感情色彩 tag */
.tone-tag {
  display: inline-block;
  font-size: 10px; line-height: 1.5; font-weight: 600;
  padding: 0 5px; border-radius: 3px;
  margin-right: 3px; vertical-align: 1px;
}
.tag-good { color: var(--vp-c-green-1); background: var(--vp-c-green-soft); }
.tag-bad { color: var(--vp-c-yellow-1); background: var(--vp-c-yellow-soft); }
.tag-neutral { color: var(--vp-c-text-2); background: var(--vp-c-default-soft); }

/* 感情色彩文字颜色：褒义绿、贬义黄、中性灰 */
.idiom-row.tone-good .tone-text { color: var(--vp-c-green-1); }
.idiom-row.tone-bad .tone-text { color: var(--vp-c-yellow-1); }
.idiom-row.tone-neutral .tone-text { color: var(--vp-c-text-2); }

.idiom-empty {
  text-align: center; color: var(--vp-c-text-2); font-size: 13px; margin-top: 12px;
}
</style>