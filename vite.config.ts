import { defineConfig } from 'vite';

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
    },
    server: {
        watch: {
        },
        port: 5200,
        hmr: {
            clientPort: 5200,
        }
    },
    base: "/"
});
