import { defineConfig } from 'vitepress'
import { generateBaseSidebar, generateWhisSidebar, allIndexLink } from './sidebar.mts'
import { pagefindPlugin } from 'vitepress-plugin-pagefind'
import markdownItExtensible from 'markdown-it-extensible'
// https://vitepress.dev/reference/site-config
export default defineConfig({
    vite: {
        publicDir: '../.vitepress/public',
        plugins: [pagefindPlugin()],
        define: {
            // 在构建时注入当前时间戳
            __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
        },

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
            { text: '理论目录', link: '/base' + allIndexLink },
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
