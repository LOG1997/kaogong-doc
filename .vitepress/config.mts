import { defineConfig } from 'vitepress'
import { generateBaseSidebar, generateWhisSidebar, allIndexLink } from './sidebar.mts'
import { pagefindPlugin } from 'vitepress-plugin-pagefind'
import markdownItExtensible from 'markdown-it-extensible'
import { withMermaid } from 'vitepress-mermaid-plugin'
import { withPwa } from '@vite-pwa/vitepress'
// import mermaidPlugin from '@vitepress-plugin/mermaid'
// https://vitepress.dev/reference/site-config
export default withPwa(withMermaid(defineConfig({
    pwa: {
        outDir: '/.vitepress/dist',
        manifest: {
            name: 'kaogong-doc',
            short_name: 'kd',
            description: 'mkda',
            theme_color: '#ffffff',
            background_color: '#ffffff',
            icons: [
                // 需要你准备实际存在的图标文件
                {
                    src: '/kaogong-doc/pwa-192x192.png', // 注意你的 base 路径
                    sizes: '192x192',
                    type: 'image/png'
                },
                {
                    src: '/kaogong-doc/pwa-512x512.png',
                    sizes: '512x512',
                    type: 'image/png'
                }
            ]
        },
        // 可选：Workbox 缓存策略配置
        workbox: {
            globDirectory: '.vitepress/dist',
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'], // 默认缓存的文件类型
        }
    },
    vite: {
        publicDir: '../.vitepress/public',
        plugins: [
            pagefindPlugin(),
            // mermaidPlugin(),
        ],
        define: {
            // 在构建时注入当前时间戳
            __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
        },
        optimizeDeps: {
            include: ['dayjs', 'mermaid']
        }
    },
    title: "kaogong-doc",
    srcDir: 'docs',
    head: [
        // 标准 favicon.ico (建议包含 16x16, 32x32, 48x48)
        ['link', { rel: 'icon', type: 'image/x-icon', href: '/kaogong-doc/favicon.ico' }],
        // 适用于现代浏览器的 PNG 图标
        ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/kaogong-doc/favicon-32x32.png' }],
        ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/kaogong-doc/favicon-16x16.png' }],
        // 适用于 iOS 设备添加到主屏幕
        ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],
    ],
    description: "kaogong-doc",
    base: '/kaogong-doc',
    markdown: {
        math: true,
        config: (md) => {
            md.use(markdownItExtensible, {

                injectStyles: false,
                inlineDirectives: [
                    {
                        name: 'red',           // Markdown 里使用的标识
                        className: 'red-underline', // 生成的 CSS 类名
                        tag: 'span'            // 包裹文字的 HTML 标签
                    }
                ]
            })
        }
    },
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            { text: 'Home', link: '/' },
            { text: '理论知识', link: '/base' + allIndexLink },
            { text: '错难重薄', link: '/whis' },
            { component: 'BuildTime' },
        ],
        outline: {
            level: [2, 3],
            label: '页面导航' // 这个是你当前看到的大纲标题，可按需保留
        },
        // sidebar: [
        //     {
        //         text: 'Examples',
        //         items: [
        //             { text: 'Markdown Examples', link: '/markdown-examples' },
        //             // { text: 'Runtime API Examples', link: '/api-examples' }
        //         ]
        //     }
        // ],
        // sidebar: generateSidebar('/base'),
        sidebar: {
            '/base': {
                base: '/base',
                items: generateBaseSidebar()
            },
            '/whis': {
                base: '/whis',
                items: generateWhisSidebar()
            }
        },

        socialLinks: [
            { icon: 'github', link: 'https://github.com/LOG1997/kaogong-doc' }
        ]
    }
})
)
)