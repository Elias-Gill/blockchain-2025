import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        hmr: {
            overlay: false // Disables the error overlay that takes control
        },
        watch: {
            usePolling: true // Better behavior in some terminals
        },
        proxy: {
            '/rpc': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                secure: false
            }
        }
    },
    clearScreen: false, // Prevents Vite from clearing the screen
    optimizeDeps: {
        include: [
            'ethers',
            '@ethersproject/providers',
            '@ethersproject/contracts'
        ]
    }
});
