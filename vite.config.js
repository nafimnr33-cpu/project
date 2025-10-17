import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',  // Allow LAN access
        port: 5173,       // You can change if needed
        open: true,       // Auto open in browser
    },
})
