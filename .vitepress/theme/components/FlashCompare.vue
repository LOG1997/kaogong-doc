<!-- docs/.vitepress/theme/components/IdiomCompare.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'

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

// —— 弹窗状态 ——
const activeGroup = ref<DiffGroup | null>(null)

function openDetail(g: DiffGroup) {
    activeGroup.value = g
}
function closeDetail() {
    activeGroup.value = null
}
function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && activeGroup.value) closeDetail()
}
watch(activeGroup, (val) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = val ? 'hidden' : ''
})

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

function collectParagraphs(li: HTMLLIElement): string[] {
    const paras: string[] = []
    const push = (s: string) => {
        const t = s.trim()
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
            push(el.innerHTML)
        }
    }
    walk(li)
    return paras
}

function stripTags(html: string): string {
    return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function assignFields(paras: string[]): DiffItem {
    const word = stripTags(paras[0] || '')
    const rest = paras.slice(1)
    const item: DiffItem = { word, meaning: '', tone: '', applicable: '', collocation: '' }

    const byKey: Record<string, string> = {}
    const byPos: string[] = []

    for (const p of rest) {
        const plain = stripTags(p)
        const m = plain.match(/^([^：:]{1,10})[：:]\s*(.+)$/)
        if (m) {
            const key = m[1].trim()
            const idx = p.indexOf(m[1]) + m[1].length
            const after = p.slice(idx).replace(/^[：:]\s*/, '')
            let matched = false
            for (const [field, aliases] of Object.entries(ALIASES)) {
                if (aliases.some(a => key.includes(a))) {
                    byKey[field] = after
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
    if (root) {
        const parsed: DiffGroup[] = []
        let current: DiffGroup | null = null

        const walk = (node: Element) => {
            for (const child of Array.from(node.children)) {
                const tag = child.tagName.toLowerCase()
                if (tag === 'ul' || tag === 'ol') {
                    for (const li of Array.from(child.children)) {
                        if (li.tagName.toLowerCase() !== 'li') continue
                        if (tag === 'ul') {
                            const g = parseGroup(li as HTMLLIElement)
                            if (g) {
                                if (current && current.items.length) parsed.push(current)
                                current = g
                            }
                        } else if (tag === 'ol') {
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
    }

    window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown)
    if (typeof document !== 'undefined') document.body.style.overflow = ''
})

const filtered = computed(() => {
    const q = keyword.value.trim().toLowerCase()
    if (!q) return groups.value
    return groups.value.filter(g =>
        g.title.toLowerCase().includes(q) ||
        g.items.some(it =>
            [it.word, it.meaning, it.tone, it.applicable, it.collocation]
                .map(v => stripTags(v).toLowerCase())
                .some(v => v.includes(q))
        )
    )
})
</script>

<template>
    <div class="cmp-cards">
        <div v-if="ready" class="cmp-search">
            <input v-model="keyword" type="search" class="cmp-search-input" placeholder="搜索词名、含义、色彩、对象、搭配…"
                aria-label="搜索辨析" />
            <span class="cmp-count">{{ filtered.length }} / {{ groups.length }}</span>
        </div>

        <div ref="slotRef" class="cmp-source" :class="{ 'is-hidden': ready }">
            <slot />
        </div>

        <div v-if="ready" class="cmp-list">
            <div
                v-for="g in filtered"
                :key="g.title"
                class="cmp-card"
                role="button"
                tabindex="0"
                @click="openDetail(g)"
                @keydown.enter="openDetail(g)"
            >
                <div class="cmp-title">{{ g.title }}</div>
                <div class="cmp-body">
                    <div v-for="it in g.items" :key="it.word" class="cmp-item">
                        <div class="cmp-word">{{ it.word }}</div>
                        <div v-if="it.meaning" class="cmp-row">
                            <span class="cmp-label label-meaning">义</span>
                            <span class="cmp-val" v-html="it.meaning"></span>
                        </div>
                        <div v-if="it.tone" class="cmp-row" :class="toneClass(it.tone)">
                            <span class="cmp-label label-tone">色</span>
                            <span class="cmp-val">
                                <span v-for="t in toneTags(stripTags(it.tone))" :key="t.text" class="tone-tag"
                                    :class="t.cls">{{ t.text }}</span>
                                <span class="tone-text" v-html="it.tone"></span>
                            </span>
                        </div>
                        <div v-if="it.applicable" class="cmp-row">
                            <span class="cmp-label label-applicable">用</span>
                            <span class="cmp-val" v-html="it.applicable"></span>
                        </div>
                        <div v-if="it.collocation" class="cmp-row">
                            <span class="cmp-label label-collocation">搭</span>
                            <span class="cmp-val" v-html="it.collocation"></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <p v-if="ready && filtered.length === 0" class="cmp-empty">
            没有匹配「{{ keyword }}」的辨析
        </p>

        <!-- 详情弹窗 -->
        <Teleport to="body">
            <Transition name="cmp-modal">
                <div v-if="activeGroup" class="cmp-modal-mask" @click.self="closeDetail">
                    <div class="cmp-modal-panel" role="dialog" aria-modal="true">
                        <button class="cmp-modal-close" @click="closeDetail" aria-label="关闭">×</button>
                        <div class="cmp-modal-title">{{ activeGroup.title }}</div>
                        <div class="cmp-modal-body">
                            <div v-for="it in activeGroup.items" :key="it.word" class="cmp-modal-item">
                                <div class="cmp-modal-word">{{ it.word }}</div>
                                <div v-if="it.meaning" class="cmp-modal-field">
                                    <span class="cmp-label label-meaning">义</span>
                                    <div class="cmp-modal-val" v-html="it.meaning"></div>
                                </div>
                                <div v-if="it.tone" class="cmp-modal-field" :class="toneClass(it.tone)">
                                    <span class="cmp-label label-tone">色</span>
                                    <div class="cmp-modal-val">
                                        <span v-for="t in toneTags(stripTags(it.tone))" :key="t.text"
                                            class="tone-tag" :class="t.cls">{{ t.text }}</span>
                                        <span class="tone-text" v-html="it.tone"></span>
                                    </div>
                                </div>
                                <div v-if="it.applicable" class="cmp-modal-field">
                                    <span class="cmp-label label-applicable">用</span>
                                    <div class="cmp-modal-val" v-html="it.applicable"></div>
                                </div>
                                <div v-if="it.collocation" class="cmp-modal-field">
                                    <span class="cmp-label label-collocation">搭</span>
                                    <div class="cmp-modal-val" v-html="it.collocation"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style>
.cmp-cards {
    margin: 12px 0;
}

.cmp-search {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
}

.cmp-search-input {
    flex: 1;
    padding: 6px 10px;
    font-size: 13px;
    border: 1px solid var(--vp-c-divider);
    border-radius: 6px;
    background: var(--vp-c-bg);
    color: var(--vp-c-text-1);
    outline: none;
    transition: border-color .2s;
}

.cmp-search-input:focus {
    border-color: var(--vp-c-brand-1);
}

.cmp-count {
    font-size: 12px;
    color: var(--vp-c-text-2);
    white-space: nowrap;
}

.cmp-source.is-hidden {
    display: none;
}

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
    display: flex;
    align-items: flex-start;
    gap: 4px;
    font-size: 12px;
    line-height: 1.55;
    margin-top: 3px;
}

.cmp-label {
    flex: none;
    width: 14px;
    font-size: 11px;
    line-height: 1.7;
    font-weight: 600;
    text-align: center;
    border-radius: 3px;
}

.label-meaning {
    color: #3b82f6;
    background: rgba(59, 130, 246, .12);
}

.label-tone {
    color: #8b5cf6;
    background: rgba(139, 92, 246, .12);
}

.label-applicable {
    color: #14b8a6;
    background: rgba(20, 184, 166, .12);
}

.label-collocation {
    color: #f59e0b;
    background: rgba(245, 158, 11, .12);
}

.dark .label-meaning {
    color: #60a5fa;
    background: rgba(59, 130, 246, .18);
}

.dark .label-tone {
    color: #a78bfa;
    background: rgba(139, 92, 246, .18);
}

.dark .label-applicable {
    color: #2dd4bf;
    background: rgba(20, 184, 166, .18);
}

.dark .label-collocation {
    color: #fbbf24;
    background: rgba(245, 158, 11, .18);
}

.cmp-val {
    flex: 1;
    color: var(--vp-c-text-2);
    word-break: break-word;
}

.tone-tag {
    display: inline-block;
    font-size: 10px;
    line-height: 1.5;
    font-weight: 600;
    padding: 0 5px;
    border-radius: 3px;
    margin-right: 3px;
    vertical-align: 1px;
}

.tag-good {
    color: var(--vp-c-green-1);
    background: var(--vp-c-green-soft);
}

.tag-bad {
    color: var(--vp-c-yellow-1);
    background: var(--vp-c-yellow-soft);
}

.tag-neutral {
    color: var(--vp-c-text-2);
    background: var(--vp-c-default-soft);
}

.cmp-row.tone-good .tone-text {
    color: var(--vp-c-green-1);
}

.cmp-row.tone-bad .tone-text {
    color: var(--vp-c-yellow-1);
}

.cmp-row.tone-neutral .tone-text {
    color: var(--vp-c-text-2);
}

.cmp-empty {
    text-align: center;
    color: var(--vp-c-text-2);
    font-size: 13px;
    margin-top: 12px;
}

/* 卡片可点击 */
.cmp-card {
    cursor: pointer;
}
.cmp-card:focus-visible {
    outline: 2px solid var(--vp-c-brand-1);
    outline-offset: 2px;
}
.cmp-card:hover {
    border-color: var(--vp-c-brand-1);
}

/* 弹窗遮罩 */
.cmp-modal-mask {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(0, 0, 0, .45);
    backdrop-filter: blur(2px);
}

/* 弹窗面板：比 IdiomCards 更宽，容纳多词对比 */
.cmp-modal-panel {
    position: relative;
    width: 100%;
    max-width: 760px;
    max-height: 85vh;
    overflow-y: auto;
    padding: 20px 22px;
    border-radius: 10px;
    background: var(--vp-c-bg);
    border: 1px solid var(--vp-c-divider);
    box-shadow: 0 12px 40px rgba(0, 0, 0, .25);
}
.cmp-modal-title {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 1px;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px dashed var(--vp-c-divider);
    color: var(--vp-c-text-1);
}
.cmp-modal-body {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
}
.cmp-modal-item {
    padding: 12px 14px;
    border: 1px solid var(--vp-c-divider);
    border-radius: 8px;
    background: var(--vp-c-bg-soft);
}
.cmp-modal-word {
    font-size: 17px;
    font-weight: 700;
    margin-bottom: 8px;
    color: var(--vp-c-brand-1);
}
.cmp-modal-field {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    font-size: 14px;
    line-height: 1.7;
    margin-top: 8px;
}
.cmp-modal-field .cmp-label {
    width: 18px;
    font-size: 12px;
    line-height: 1.8;
}
.cmp-modal-val {
    flex: 1;
    color: var(--vp-c-text-2);
    word-break: break-word;
}
.cmp-modal-field.tone-good .tone-text { color: var(--vp-c-green-1); }
.cmp-modal-field.tone-bad .tone-text { color: var(--vp-c-yellow-1); }
.cmp-modal-field.tone-neutral .tone-text { color: var(--vp-c-text-2); }

/* 关闭按钮 */
.cmp-modal-close {
    position: absolute;
    top: 10px;
    right: 12px;
    width: 28px;
    height: 28px;
    line-height: 1;
    font-size: 20px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--vp-c-text-2);
    cursor: pointer;
    transition: background .15s, color .15s;
}
.cmp-modal-close:hover {
    background: var(--vp-c-default-soft);
    color: var(--vp-c-text-1);
}

/* 过渡动画 */
.cmp-modal-enter-active,
.cmp-modal-leave-active {
    transition: opacity .18s ease;
}
.cmp-modal-enter-active .cmp-modal-panel,
.cmp-modal-leave-active .cmp-modal-panel {
    transition: transform .18s ease;
}
.cmp-modal-enter-from,
.cmp-modal-leave-to {
    opacity: 0;
}
.cmp-modal-enter-from .cmp-modal-panel,
.cmp-modal-leave-to .cmp-modal-panel {
    transform: translateY(8px) scale(.98);
}
</style>