import { defineConfig } from 'vite';
import { resolve } from 'path';

const fullReloadAlways = {
    name: 'full-reload-always',
    handleHotUpdate({ server }) {
      server.ws.send({ type: "full-reload" })
      return []
    },
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [fullReloadAlways],
    resolve: {
        alias: {
        },
    },
    build: {
        sourcemap: true,
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                browse: resolve(__dirname, 'pages/browse.html'),
            },
        }
    },
    server: {
        watch: {
        },
        port: 5200,
        hmr: {
            clientPort: 5200,
        }
    },
    base: "/hci-book-app/",
});
