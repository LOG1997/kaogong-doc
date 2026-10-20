import { defineConfig } from 'vitepress'
import { generateSidebar, allIndexLink } from './sidebar.mts'

// https://vitepress.dev/reference/site-config
export default defineConfig({
    vite: {
        publicDir: '../.vitepress/public',
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
        math: true
    },
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            { text: 'Home', link: '/' },
            { text: '全部目录', link: allIndexLink },
            { component: 'BuildTime' },
        ],

        // sidebar: [
        //     {
        //         text: 'Examples',
        //         items: [
        //             { text: 'Markdown Examples', link: '/markdown-examples' },
        //             // { text: 'Runtime API Examples', link: '/api-examples' }
        //         ]
        //     }
        // ],
        sidebar: generateSidebar(),

        socialLinks: [
            { icon: 'github', link: 'https://github.com/LOG1997/kaogong-doc' }
        ]
    }
})
