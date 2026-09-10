// docs/.vitepress/sidebar.mts
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DefaultTheme } from 'vitepress'

type SidebarItem = DefaultTheme.SidebarItem

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const contentRoot = path.resolve(__dirname, "../docs") // 指向 docs 目录

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
function toUrl(fullPath: string, isIndex: boolean): string {
    // 相对 contentRoot 的路径，如 "常识/人体/人体健康.md"
    let rel = path.relative(contentRoot, fullPath).replace(/\\/g, '/')

    // 保险：万一 contentRoot 算错，把可能出现的 docs/ 前缀剥掉
    rel = rel.replace(/^docs\//, '')

    if (isIndex) {
        const dir = path.dirname(rel)
        return dir === '.' ? '/' : `/${dir}/`
    }
    return `/${rel.replace(/\.md$/, '')}`
}
function buildItems(dir: string): SidebarItem[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const dirs: fs.Dirent[] = []
    const files: fs.Dirent[] = []

    for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        if (entry.isDirectory()) {
            if (IGNORE_DIRS.has(entry.name)) continue
            dirs.push(entry)
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            if (IGNORE_FILES.has(entry.name)) continue
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
        const link = toUrl(fullPath, isIndex)
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
    let out = ''
    const indent = '  '.repeat(depth)
    for (const item of items) {
        if (item.link) {
            out += `${indent}- [${item.text ?? item.link}](${item.link})\n`
        } else if (item.text) {
            out += `${indent}- **${item.text}**\n`
        }
        if (item.items && item.items.length > 0) {
            out += renderItems(item.items, depth + 1)
        }
    }
    return out
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

${body}`
    fs.writeFileSync(path.join(contentRoot, INDEX_FILE), content, 'utf-8')
}

export function generateSidebar(): SidebarItem[] {
    const items = buildItems(contentRoot)
    writeIndexPage(items)

    // 在侧边栏顶部加一个入口
    return [
        { text: '📖 全部目录', link: INDEX_LINK },
        ...items
    ]
}

// 导出给 config 用，方便 nav 里引用
export const allIndexLink = INDEX_LINK