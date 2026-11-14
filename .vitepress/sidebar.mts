// docs/.vitepress/sidebar.mts
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DefaultTheme } from 'vitepress'

type SidebarItem = DefaultTheme.SidebarItem

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const contentRoot = path.resolve(__dirname, "../docs/base") // 指向 docs 目录
const whisContentRoot = path.resolve(__dirname, "../docs/whis") // 错题本目录

const IGNORE_DIRS = new Set<string>([
    '.vitepress',
    'public',
    'node_modules',
    'images'
])

// 忽略的文件（README、LICENSE，以及我们自动生成的目录页本身）
const IGNORE_FILES = new Set<string>(['README.md', 'LICENSE.md', '目录.md'])

// 自动生成的“全部目录”页
const INDEX_FILE = '目录.md'
const INDEX_LINK = '/目录'

function getTitle(filePath: string, fallback: string): string {
    try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
        if (match) {
            const titleMatch = match[1].match(/^title:\s*(.+)$/m)
            if (titleMatch) {
                return titleMatch[1].trim().replace(/^['"]|['"]$/g, '')
            }
        }
    } catch { }
    return fallback
}
function toUrl(fullPath: string, isIndex: boolean, contentRootPath: string): string {
    // 相对 contentRoot 的路径，如 "常识/人体/人体健康.md"
    let rel = path.relative(contentRootPath, fullPath).replace(/\\/g, '/')

    // 保险：万一 contentRoot 算错，把可能出现的 docs/ 前缀剥掉
    rel = rel.replace(/^docs\//, '')

    if (isIndex) {
        const dir = path.dirname(rel)
        return dir === '.' ? '/' : `/${dir}/`
    }
    return `/${rel.replace(/\.md$/, '')}`
}
function buildItems(dir: string, extraIgnore: string[] = []): SidebarItem[] {
    const ignoreFiles = new Set([...IGNORE_FILES, ...extraIgnore])
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const dirs: fs.Dirent[] = []
    const files: fs.Dirent[] = []

    for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        if (entry.isDirectory()) {
            if (IGNORE_DIRS.has(entry.name)) continue
            dirs.push(entry)
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            if (ignoreFiles.has(entry.name)) continue
            files.push(entry)
        }
    }

    dirs.sort((a, b) => a.name.localeCompare(b.name, 'zh'))
    files.sort((a, b) => {
        if (a.name === 'index.md') return -1
        if (b.name === 'index.md') return 1
        return a.name.localeCompare(b.name, 'zh')
    })

    const items: SidebarItem[] = []

    for (const d of dirs) {
        const children = buildItems(path.join(dir, d.name))
        if (children.length > 0) {
            items.push({ text: d.name, collapsed: true, items: children })
        }
    }

    for (const f of files) {
        const fullPath = path.join(dir, f.name)
        const relative = path.relative(contentRoot, fullPath).replace(/\\/g, '/')
        const isIndex = f.name === 'index.md'
        const link = toUrl(fullPath, isIndex, contentRoot)
        // const dirName = path.dirname(relative)
        // const link: string = isIndex
        //     ? dirName === '.'
        //         ? '/'
        //         : `/${dirName}/`
        //     : `/${relative.replace(/\.md$/, '')}`

        const fallbackText = isIndex ? '概述' : f.name.replace(/\.md$/, '')
        const text = getTitle(fullPath, fallbackText)

        items.push({ text, link })
    }

    return items
}

/**
 * 把 sidebar 树渲染成 markdown 列表
 */
function renderItems(items: SidebarItem[], depth = 0): string {
    const pad = '  '.repeat(depth)
    let out = `${pad}<ul>\n`

    for (const item of items) {
        if (item.link) {
            const href = `/base${item.link}`.replace(/\/+/g, '/')
            out += `${pad}  <li><a href="${href}">${item.text ?? item.link}</a></li>\n`
        } else if (item.text && item.items && item.items.length > 0) {
            out += `${pad}  <li class="toc-branch">\n`
            out += `${pad}    <details>\n`
            out += `${pad}      <summary><strong>${item.text}</strong></summary>\n`
            out += renderItems(item.items, depth + 3)
            out += `${pad}    </details>\n`
            out += `${pad}  </li>\n`
        } else if (item.text) {
            out += `${pad}  <li><strong>${item.text}</strong></li>\n`
        }
    }

    out += `${pad}</ul>\n`
    return out
}
/**
 * 为单个目录生成 index.md（展示该目录下的层级结构）
 * @param dir 目标目录
 * @param overwrite 是否覆盖已存在的 index.md
 */
function writeDirIndex(dir: string, overwrite = false): void {
    const indexPath = path.join(dir, 'index.md')
    if (!overwrite && fs.existsSync(indexPath)) return

    // 关键：排除 index.md 自身，避免它出现在自己的目录里
    const items = buildItems(dir, ['index.md'])
    if (items.length === 0) return

    const dirName = path.basename(dir)
    const body = renderItems(items)
    const content = `---
title: ${dirName}目录
---

# ${dirName}目录

> 本页由 \`sidebar.mts\` 自动生成，请勿手动修改。

${body}

<style>
.vp-doc ul { list-style: none; padding-left: 16px; margin: 4px 0; }
.vp-doc > ul, .vp-doc ul > li > ul { padding-left: 0; }
.toc-branch > details {
  margin: 4px 0;
  border-left: 2px solid var(--vp-c-divider);
  padding-left: 10px;
}
.toc-branch > details > summary { cursor: pointer; padding: 2px 0; }
</style>`
    fs.writeFileSync(indexPath, content, 'utf-8')
}

/**
 * 只为 root 下的第一层子目录生成 index.md，不递归
 */
function writeAllDirIndexes(root: string, overwrite = false): void {
    const subs = fs.readdirSync(root, { withFileTypes: true })
        .filter(e =>
            e.isDirectory() &&
            !e.name.startsWith('.') &&
            !IGNORE_DIRS.has(e.name)
        )

    for (const sub of subs) {
        writeDirIndex(path.join(root, sub.name), overwrite)
    }
}


/**
 * 写出“全部目录”页面
 */
function writeIndexPage(items: SidebarItem[]): void {

    const body = renderItems(items)
    const content = `---
title: 全部目录
---

# 全部目录

> 本页由 \`sidebar.mts\` 自动生成，请勿手动修改。

${body}

<style>
.toc-branch > details {
  margin: 4px 0;
  border-left: 2px solid var(--vp-c-divider);
  padding-left: 10px;
}
.toc-branch > details > summary {
  cursor: pointer;
  padding: 2px 0;
}

/* 去掉圆点，用 padding-left 保留层级缩进 */
.vp-doc ul {
  list-style: none;
  padding-left: 16px;
  margin: 4px 0;
}
/* 最外层不留左内边距，避免整体右移 */
.vp-doc ul > li > ul,
.vp-doc > ul {
  padding-left: 0;
}

.toc-branch > details > summary::-webkit-details-marker {
  display: none;
}
</style>`

    fs.writeFileSync(path.join(contentRoot, INDEX_FILE), content, 'utf-8')
}

export function generateBaseSidebar(): SidebarItem[] {

    writeAllDirIndexes(contentRoot, true)
    const items = buildItems(contentRoot)
    writeIndexPage(items)

    // 在侧边栏顶部加一个入口
    return [
        { text: '📖 全部目录', link: INDEX_LINK },
        ...items
    ]
}

export function generateWhisSidebar(): SidebarItem[] {
    const items = buildItems(whisContentRoot)

    // 在侧边栏顶部加一个入口
    return [
        ...items
    ]
}


// 导出给 config 用，方便 nav 里引用
export const allIndexLink = INDEX_LINK