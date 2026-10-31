// .vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme'
import BuildTime from './components/BuildTime.vue'
import './styles/custom.css'
import './styles/root.css'
import FlashCard from './components/FlashCard.vue'
import FlashCompare from './components/FlashCompare.vue'
export default {
    extends: DefaultTheme,
    enhanceApp({ app }: { app: any }) {
        // 全局注册自定义组件
        app.component('BuildTime', BuildTime),
        app.component('FlashCard',FlashCard),
        app.component('FlashCompare',FlashCompare)
    },
}