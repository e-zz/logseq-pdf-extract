import vue from '@vitejs/plugin-vue'

export default {
    base: './',
    plugins: [
        vue()
    ],
    optimizeDeps: {
        plugins: [
            vue()
        ]
    }
}
