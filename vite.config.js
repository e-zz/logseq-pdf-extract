import vue from '@vitejs/plugin-vue'

export default {
    base: './',
    plugins: [
        vue()
    ],
    optimizeDeps: {
        include: ['vue-virtual-scroller'],
        plugins: [
            vue()
        ]
    }
}
