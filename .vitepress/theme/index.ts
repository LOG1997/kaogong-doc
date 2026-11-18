// .vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme'
import BuildTime from './components/BuildTime.vue'
import FlashCard from './components/FlashCard.vue'
import FlashCompare from './components/FlashCompare.vue'
import RegisterSW from './components/RegisterSW.vue'
import WhisCards from './components/WhisCards.vue'
import './styles/root.css'
import './styles/custom.css'


import { h } from 'vue'

export default {
    extends: DefaultTheme,
    Layout() {
        return h(DefaultTheme.Layout, null, {
            'layout-bottom': () => h(RegisterSW)
        })
    },
    enhanceApp({ app }: { app: any }) {
        // 全局注册自定义组件
        app.component('BuildTime', BuildTime),
            app.component('FlashCard', FlashCard),
            app.component('FlashCompare', FlashCompare),
            app.component('WhisCards', WhisCards)
    },
}