// .vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme'
import BuildTime from './components/BuildTime.vue'
import './styles/custom.css'

export default {
    extends: DefaultTheme,
    enhanceApp({ app }: { app: any }) {
        // 全局注册自定义组件
        app.component('BuildTime', BuildTime)
    },
}