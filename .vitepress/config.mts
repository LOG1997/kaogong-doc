import { defineConfig } from 'vitepress'
import { generateSidebar, allIndexLink } from './sidebar.mts'

// https://vitepress.dev/reference/site-config
export default defineConfig({
    vite: {
        define: {
            // 在构建时注入当前时间戳
            __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
        },
    },
    title: "kaogong-doc",
    srcDir: 'docs',
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
