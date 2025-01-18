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
        ],
        server: {
            watch: {
                // Use polling to watch for file changes
                usePolling: true,
            },
            hmr: {
                // Enable HMR
                protocol: 'ws',
                host: 'localhost',
            },
        },
    }
}
