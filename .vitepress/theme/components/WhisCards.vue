<!-- docs/.vitepress/theme/components/WhisCards.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'

interface Question {
    category: string
    title: string
    titlePlain: string
    titleLevel: 2 | 3
    anchorId: string
    tags: string[]
    knowledge: string
    feature: string
    method: string
    reason: string
    reflection: string
    screenshot: string
}

const slotRef = ref<HTMLElement>()
const rows = ref<Question[]>([])
const ready = ref(false)

const keyword = ref('')
const tagFilter = ref<string[]>([])
const activeItem = ref<Question | null>(null)

const ALL_TAGS = ['薄弱题', '错题', '重点题', '难题']

const ALIASES = {
    tags: ['标签'],
    knowledge: ['要点', '知识点'],
    feature: ['特点', '特征'],
    method: ['方法', '解法', '做法'],
    reason: ['错因', '做错原因', '错误原因'],
    reflection: ['反思', '总结'],
    screenshot: ['题目', '截图', '图片', '题图']
} as const

function textOf(el: Element | null): string {
    return (el?.textContent || '').replace(/\s+/g, ' ').trim()
}

function stripTags(html: string): string {
    return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function htmlOf(el: Element | null): string {
    return (el?.innerHTML || '').trim()
}

function extractField(li: HTMLElement): { key: string; value: string } | null {
    const clone = li.cloneNode(true) as HTMLElement
    // 删除这一行：
    // clone.querySelectorAll('ul, ol').forEach(el => el.remove())

    const blocks: string[] = []
    for (const child of Array.from(clone.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
            const t = (child.textContent || '').trim()
            if (t) blocks.push(t)
        } else if (child.nodeType === Node.ELEMENT_NODE) {
            const el = child as HTMLElement
            const tag = el.tagName.toLowerCase()
            if (tag === 'p' || tag === 'div') {
                const inner = el.innerHTML.trim()
                if (inner) blocks.push(inner)
            } else {
                blocks.push(el.outerHTML)
            }
        }
    }
    if (blocks.length === 0) return null

    const firstBlock = blocks[0]
    const colonIdx = firstBlock.search(/[：:]/)
    if (colonIdx < 0) return null

    const key = stripTags(firstBlock.slice(0, colonIdx)).trim()
    if (!key) return null

    const restOfFirst = firstBlock.slice(colonIdx + 1).replace(/^[：:\s]+/, '').trim()

    const parts: string[] = []
    if (restOfFirst) parts.push(wrapBlock(restOfFirst))
    for (let i = 1; i < blocks.length; i++) {
        parts.push(wrapBlock(blocks[i]))
    }

    return { key, value: parts.join('') }
}
function wrapBlock(s: string): string {
    const t = s.trim()
    if (!t) return ''
    if (/^<(p|div|ul|ol|blockquote|pre|table|h[1-6])\b/i.test(t)) return t
    return `<p>${t}</p>`
}
function parseTags(html: string): string[] {
    return stripTags(html)
        .split(/[,，、;；\s]+/)
        .map(t => t.trim())
        .filter(Boolean)
}

function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && activeItem.value) closeDetail()
}

onMounted(() => {
    const root = slotRef.value
    if (root) {
        const parsed: Question[] = []
        let currentCategory = ''
        let current: Question | null = null
        let h2Consumed = false

        const pushCurrent = () => {
            if (current && current.titlePlain) parsed.push(current)
            current = null
            h2Consumed = false
        }

        const newQuestion = (category: string, titleHtml: string, titlePlain: string, titleLevel: 2 | 3): Question => ({
            category,
            title: titleHtml,
            titlePlain,
            titleLevel,
            anchorId: '',
            tags: [],
            knowledge: '',
            feature: '',
            method: '',
            reason: '',
            reflection: '',
            screenshot: ''
        })

        const walk = (node: Element) => {
            for (const child of Array.from(node.children)) {
                const tag = child.tagName.toLowerCase()
                if (tag === 'h2') {
                    pushCurrent()
                    const h2Html = htmlOf(child)
                    const h2Plain = stripTags(h2Html)
                    if (!h2Plain) continue
                    currentCategory = h2Plain
                    const anchorId = child.id || ''
                    // if (child.id) child.removeAttribute('id')   // ← 新增
                    current = newQuestion('', h2Html, h2Plain, 2)
                    current.anchorId = anchorId
                    h2Consumed = false
                } else if (tag === 'h3') {
                    const titleHtml = htmlOf(child)
                    const titlePlain = stripTags(titleHtml)
                    if (!titlePlain) continue
                    const anchorId = child.id || ''
                    // if (child.id) child.removeAttribute('id')
                    if (current && !h2Consumed) {
                        current.category = currentCategory
                        current.title = titleHtml
                        current.titlePlain = titlePlain
                        current.titleLevel = 3
                        current.anchorId = anchorId
                        h2Consumed = true
                    } else {
                        pushCurrent()
                        current = newQuestion(currentCategory, titleHtml, titlePlain, 3)
                        current.anchorId = anchorId
                        h2Consumed = true
                    }
                } else if (tag === 'ul' || tag === 'ol') {
                    if (current) {
                        for (const li of Array.from(child.children)) {
                            if (li.tagName.toLowerCase() !== 'li') continue
                            const kv = extractField(li as HTMLElement)
                            if (!kv) continue
                            const { key, value } = kv
                            if (ALIASES.tags.some(a => key.includes(a))) current.tags = parseTags(value)
                            else if (ALIASES.knowledge.some(a => key.includes(a))) current.knowledge = value
                            else if (ALIASES.feature.some(a => key.includes(a))) current.feature = value
                            else if (ALIASES.method.some(a => key.includes(a))) current.method = value
                            else if (ALIASES.reason.some(a => key.includes(a))) current.reason = value
                            else if (ALIASES.reflection.some(a => key.includes(a))) current.reflection = value
                            else if (ALIASES.screenshot.some(a => key.includes(a))) current.screenshot = value
                        }
                    }
                } else if (['div', 'section', 'article'].includes(tag)) {
                    walk(child)
                }
            }
        }
        walk(root)
        pushCurrent()

        rows.value = parsed
        ready.value = true
        nextTick(() => {
            // 此时卡片已经渲染，大纲也已基于源 id 生成，可以安全清理源 id 了
            slotRef.value?.querySelectorAll('h2[id], h3[id]').forEach(el => {
                el.removeAttribute('id')
            })
        })
        nextTick(() => {
            const hash = decodeURIComponent(window.location.hash.slice(1))
            if (!hash) return
            const el = document.getElementById(hash)
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
    }

    window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown)
    if (typeof document !== 'undefined') document.body.style.overflow = ''
})

watch(activeItem, (val) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = val ? 'hidden' : ''
})

function openDetail(q: Question) {
    activeItem.value = q
}
function closeDetail() {
    activeItem.value = null
}

function toggleTag(t: string) {
    const i = tagFilter.value.indexOf(t)
    if (i >= 0) tagFilter.value.splice(i, 1)
    else tagFilter.value.push(t)
}

const filtered = computed(() => {
    const q = keyword.value.trim().toLowerCase()
    return rows.value.filter(r => {
        if (tagFilter.value.length > 0) {
            if (!tagFilter.value.some(t => r.tags.includes(t))) return false
        }
        if (q) {
            const hay = [
                r.category,
                r.titlePlain,
                r.tags.join(' '),
                stripTags(r.knowledge),
                stripTags(r.feature),
                stripTags(r.method),
                stripTags(r.reason),
                stripTags(r.reflection)
            ].join(' ').toLowerCase()
            if (!hay.includes(q)) return false
        }
        return true
    })
})

function tagClass(t: string) {
    if (t === '薄弱题') return 'tag-weak'
    if (t === '错题') return 'tag-wrong'
    if (t === '重点题') return 'tag-key'
    if (t === '难题') return 'tag-hard'
    return 'tag-other'
}
</script>

<template>
    <div class="whis-cards">
        <div v-if="ready" class="whis-filter">
            <div class="whis-filter-row">
                <input v-model="keyword" type="search" class="whis-search" placeholder="搜索分类、题目、要点、特点、方法、错因、反思…"
                    aria-label="搜索错题" />
                <span class="whis-count">{{ filtered.length }} / {{ rows.length }}</span>
            </div>
            <div class="whis-filter-row">
                <button v-for="t in ALL_TAGS" :key="t" class="whis-tag-btn"
                    :class="[tagClass(t), { active: tagFilter.includes(t) }]" @click="toggleTag(t)">{{ t }}</button>
            </div>
        </div>

        <div ref="slotRef" class="whis-source" :class="{ 'is-hidden': ready }">
            <slot />
        </div>

        <div v-if="ready" class="whis-list">
            <div v-for="(r, i) in filtered" :key="i" :id="r.anchorId || undefined" class="whis-card" role="button"
                tabindex="0" @click="openDetail(r)" @keydown.enter="openDetail(r)">
                <component :is="`h${r.titleLevel}`" :id="r.anchorId || undefined" class="whis-card-head">
                    <span v-if="r.category" class="whis-category">{{ r.category }}</span>
                    <span class="whis-title" :class="`is-h${r.titleLevel}`" v-html="r.title"></span>
                    <!-- 标签部分也可以放在里面 -->
                    <span class="whis-tags">
                        <span v-for="t in r.tags" :key="t" class="whis-tag" :class="tagClass(t)">{{ t }}</span>
                    </span>
                </component>
                <div class="whis-body">
                    <div v-if="r.knowledge" class="whis-field">
                        <span class="whis-label label-knowledge">要点</span>
                        <div class="whis-val" v-html="r.knowledge"></div>
                    </div>
                    <div v-if="r.feature" class="whis-field">
                        <span class="whis-label label-feature">特点</span>
                        <div class="whis-val" v-html="r.feature"></div>
                    </div>
                    <div v-if="r.method" class="whis-field">
                        <span class="whis-label label-method">方法</span>
                        <div class="whis-val" v-html="r.method"></div>
                    </div>
                    <div v-if="r.reason" class="whis-field">
                        <span class="whis-label label-reason">错因</span>
                        <div class="whis-val" v-html="r.reason"></div>
                    </div>
                    <div v-if="r.reflection" class="whis-field">
                        <span class="whis-label label-reflection">反思</span>
                        <div class="whis-val" v-html="r.reflection"></div>
                    </div>
                </div>

                <div v-if="r.screenshot" class="whis-question">
                    <span class="whis-question-label">题目</span>
                    <div class="whis-question-body" v-html="r.screenshot"></div>
                </div>
            </div>
        </div>

        <p v-if="ready && filtered.length === 0" class="whis-empty">没有匹配的题目</p>

        <Teleport to="body">
            <Transition name="whis-modal">
                <div v-if="activeItem" class="whis-modal-mask" @click.self="closeDetail">
                    <div class="whis-modal-panel" role="dialog" aria-modal="true">
                        <div class="whis-modal-topbar">
                            <button class="whis-modal-close" @click="closeDetail" aria-label="关闭">×</button>
                        </div>

                        <div class="whis-modal-head">
                            <span v-if="activeItem.category" class="whis-category">{{ activeItem.category }}</span>
                            <span class="whis-modal-title" :class="`is-h${activeItem.titleLevel}`"
                                v-html="activeItem.title"></span>
                            <span v-if="activeItem.tags.length" class="whis-modal-tags">
                                <span v-for="t in activeItem.tags" :key="t" class="whis-tag" :class="tagClass(t)">{{ t
                                }}</span>
                            </span>
                        </div>

                        <div v-if="activeItem.knowledge" class="whis-modal-field">
                            <span class="whis-label label-knowledge">要点</span>
                            <div class="whis-modal-val" v-html="activeItem.knowledge"></div>
                        </div>
                        <div v-if="activeItem.feature" class="whis-modal-field">
                            <span class="whis-label label-feature">特点</span>
                            <div class="whis-modal-val" v-html="activeItem.feature"></div>
                        </div>
                        <div v-if="activeItem.method" class="whis-modal-field">
                            <span class="whis-label label-method">方法</span>
                            <div class="whis-modal-val" v-html="activeItem.method"></div>
                        </div>
                        <div v-if="activeItem.reason" class="whis-modal-field">
                            <span class="whis-label label-reason">错因</span>
                            <div class="whis-modal-val" v-html="activeItem.reason"></div>
                        </div>
                        <div v-if="activeItem.reflection" class="whis-modal-field">
                            <span class="whis-label label-reflection">反思</span>
                            <div class="whis-modal-val" v-html="activeItem.reflection"></div>
                        </div>

                        <div v-if="activeItem.screenshot" class="whis-modal-question">
                            <span class="whis-question-label">题目</span>
                            <div class="whis-question-body" v-html="activeItem.screenshot"></div>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style>
.whis-cards {
    margin: 12px 0;
}

.whis-filter {
    position: sticky;
    top: var(--vp-nav-height);
    /* ← 关键：停靠在导航栏下方 */
    z-index: 10;
    padding: 10px 0;
    margin-bottom: 10px;
    background: var(--vp-c-bg);
    border-bottom: 1px solid var(--vp-c-divider);
}

.whis-filter-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 8px;
}

.whis-filter-row:last-child {
    margin-bottom: 0;
}

.whis-search {
    flex: 1;
    min-width: 200px;
    padding: 6px 10px;
    font-size: 13px;
    border: 1px solid var(--vp-c-divider);
    border-radius: 6px;
    background: var(--vp-c-bg);
    color: var(--vp-c-text-1);
    outline: none;
    transition: border-color .2s;
}

.whis-search:focus {
    border-color: var(--vp-c-brand-1);
}

.whis-count {
    font-size: 12px;
    color: var(--vp-c-text-2);
    white-space: nowrap;
}

.whis-tag-btn {
    padding: 4px 12px;
    font-size: 12px;
    border-radius: 999px;
    border: 1px solid var(--vp-c-divider);
    background: var(--vp-c-bg);
    color: var(--vp-c-text-2);
    cursor: pointer;
    transition: all .15s;
}

.whis-tag-btn:hover {
    border-color: var(--vp-c-text-3);
}

.whis-tag-btn.active {
    font-weight: 700;
    color: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, .18);
    transform: translateY(-1px);
}

.whis-tag-btn.tag-weak.active {
    background: #d97706;
    border-color: #d97706;
}

.whis-tag-btn.tag-wrong.active {
    background: #dc2626;
    border-color: #dc2626;
}

.whis-tag-btn.tag-key.active {
    background: #2563eb;
    border-color: #2563eb;
}

.whis-tag-btn.tag-hard.active {
    background: #7c3aed;
    border-color: #7c3aed;
}

.whis-source.is-hidden {
    display: none;
}

.whis-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.whis-card {
    border: 1px solid var(--vp-c-divider);
    border-radius: 8px;
    padding: 12px 14px;
    background: var(--vp-c-bg-soft);
    cursor: pointer;
    transition: border-color .15s, box-shadow .15s, transform .15s;
    scroll-margin-top: 80px;
}

.whis-card:hover {
    border-color: var(--vp-c-brand-1);
    box-shadow: 0 3px 12px rgba(0, 0, 0, .06);
}

.whis-card:focus-visible {
    outline: 2px solid var(--vp-c-brand-1);
    outline-offset: 2px;
}

.whis-card-head {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    margin: 0 0 8px 0 !important;
    padding: 0 0 8px 0 !important;
    background: transparent !important;
    border-top: none !important;
    /* 只保留你需要的下边距 */
    font-size: inherit;
    font-weight: inherit;
    line-height: inherit;

    border-bottom: 1px dashed var(--vp-c-divider);
}

.whis-category {
    font-size: 14px;
    font-weight: 700;
    color: var(--vp-c-brand-1);
    padding: 1px 8px;
    border-radius: 4px;
    background: var(--vp-c-brand-soft);
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
}

.whis-title {
    color: var(--vp-c-text-1);
}

.whis-title p {
    margin: 0;
    display: inline;
}

.whis-title.is-h2 {
    font-size: 16px;
    font-weight: 700;
}

.whis-title.is-h3 {
    font-size: 13px;
    font-weight: 600;
    color: var(--vp-c-text-2);
}

.whis-tags {
    display: inline-flex;
    gap: 4px;
    flex-wrap: wrap;
    margin-left: auto;
}

.whis-tag {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 7px;
    border-radius: 999px;
    line-height: 1.6;
}

.tag-weak {
    color: #d97706;
    background: rgba(245, 158, 11, .15);
}

.tag-wrong {
    color: #dc2626;
    background: rgba(239, 68, 68, .15);
}

.tag-key {
    color: #2563eb;
    background: rgba(59, 130, 246, .15);
}

.tag-hard {
    color: #7c3aed;
    background: rgba(139, 92, 246, .15);
}

.tag-other {
    color: var(--vp-c-text-2);
    background: var(--vp-c-default-soft);
}

.whis-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.whis-field {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 13px;
    line-height: 1.65;
}

.whis-label {
    flex: none;
    min-width: 34px;
    padding: 0 6px;
    font-size: 11px;
    line-height: 1.9;
    font-weight: 600;
    text-align: center;
    border-radius: 3px;
    white-space: nowrap;
}

.label-knowledge {
    color: #3b82f6;
    background: rgba(59, 130, 246, .12);
}

.label-feature {
    color: #f97316;
    background: rgba(249, 115, 22, .12);
}

.label-method {
    color: #14b8a6;
    background: rgba(20, 184, 166, .12);
}

.label-reason {
    color: #ef4444;
    background: rgba(239, 68, 68, .12);
}

.label-reflection {
    color: #8b5cf6;
    background: rgba(139, 92, 246, .12);
}

.dark .label-knowledge {
    color: #60a5fa;
    background: rgba(59, 130, 246, .18);
}

.dark .label-feature {
    color: #fb923c;
    background: rgba(249, 115, 22, .18);
}

.dark .label-method {
    color: #2dd4bf;
    background: rgba(20, 184, 166, .18);
}

.dark .label-reason {
    color: #f87171;
    background: rgba(239, 68, 68, .18);
}

.dark .label-reflection {
    color: #a78bfa;
    background: rgba(139, 92, 246, .18);
}

.whis-val {
    flex: 1;
    color: var(--vp-c-text-2);
    word-break: break-word;
}

.whis-val p {
    margin: 0;
}

.whis-val p+p {
    margin-top: 6px;
}

.whis-val strong {
    color: var(--vp-c-text-1);
}

.whis-val ol,
.whis-val ul {
    margin: 4px 0;
    padding-left: 20px;
}

.whis-val ol li,
.whis-val ul li {
    margin: 2px 0;
}

.whis-modal-val ol,
.whis-modal-val ul {
    margin: 4px 0;
    padding-left: 20px;
}

.whis-modal-val ol li,
.whis-modal-val ul li {
    margin: 2px 0;
}

.whis-question {
    margin-top: 12px;
    padding: 10px 12px 12px;
    border: 2px dashed var(--vp-c-brand-1);
    border-radius: 8px;
    background: var(--vp-c-brand-soft);
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.whis-question-label {
    align-self: flex-start;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    padding: 2px 10px;
    border-radius: 999px;
    color: #fff;
    background: var(--vp-c-brand-1);
}

.whis-question-body img {
    display: block;
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    border: 1px solid var(--vp-c-divider);
    background: var(--vp-c-bg);
}

.whis-question-body p {
    margin: 0;
}

.whis-empty {
    text-align: center;
    color: var(--vp-c-text-2);
    font-size: 13px;
    margin-top: 16px;
}

/* ===== 弹窗 ===== */
.whis-modal-mask {
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

.whis-modal-panel {
    position: relative;
    width: 100%;
    max-width: 680px;
    max-height: 85vh;
    overflow-y: auto;
    padding: 12px 22px 20px;
    border-radius: 10px;
    background: var(--vp-c-bg);
    border: 1px solid var(--vp-c-divider);
    box-shadow: 0 12px 40px rgba(0, 0, 0, .25);
}

.whis-modal-topbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 4px;
}

.whis-modal-close {
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

.whis-modal-close:hover {
    background: var(--vp-c-default-soft);
    color: var(--vp-c-text-1);
}

.whis-modal-head {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding-bottom: 10px;
    margin-bottom: 10px;
    border-bottom: 1px dashed var(--vp-c-divider);
}

.whis-modal-head .whis-category {
    font-size: 15px;
    font-weight: 700;
    color: var(--vp-c-brand-1);
    padding: 1px 10px;
    border-radius: 4px;
    background: var(--vp-c-brand-soft);
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
}

.whis-modal-title {
    color: var(--vp-c-text-1);
}

.whis-modal-title p {
    margin: 0;
    display: inline;
}

.whis-modal-title.is-h2 {
    font-size: 18px;
    font-weight: 700;
}

.whis-modal-title.is-h3 {
    font-size: 15px;
    font-weight: 600;
    color: var(--vp-c-text-2);
}

.whis-modal-tags {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
}

.whis-modal-field {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 14px;
    line-height: 1.7;
    margin-top: 10px;
}

.whis-modal-val {
    flex: 1;
    color: var(--vp-c-text-2);
    word-break: break-word;
}

.whis-modal-val p {
    margin: 0;
}

.whis-modal-val p+p {
    margin-top: 8px;
}

.whis-modal-val strong {
    color: var(--vp-c-text-1);
}

.whis-modal-question {
    margin-top: 16px;
    padding: 12px 14px 14px;
    border: 2px dashed var(--vp-c-brand-1);
    border-radius: 8px;
    background: var(--vp-c-brand-soft);
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.whis-modal-question .whis-question-label {
    align-self: flex-start;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    padding: 2px 12px;
    border-radius: 999px;
    color: #fff;
    background: var(--vp-c-brand-1);
}

.whis-modal-question .whis-question-body img {
    display: block;
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    border: 1px solid var(--vp-c-divider);
    background: var(--vp-c-bg);
}

.whis-modal-question .whis-question-body p {
    margin: 0;
}

.whis-modal-enter-active,
.whis-modal-leave-active {
    transition: opacity .18s ease;
}

.whis-modal-enter-active .whis-modal-panel,
.whis-modal-leave-active .whis-modal-panel {
    transition: transform .18s ease;
}

.whis-modal-enter-from,
.whis-modal-leave-to {
    opacity: 0;
}

.whis-modal-enter-from .whis-modal-panel,
.whis-modal-leave-to .whis-modal-panel {
    transform: translateY(8px) scale(.98);
}
</style>