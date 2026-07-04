import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const sdkEntry = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  build: {
    outDir: 'dist/sdk',
    emptyOutDir: true,
    lib: {
      entry: {
        index: sdkEntry('./src/playus/index.ts'),
        'native-bridge': sdkEntry('./src/playus/native-bridge.ts'),
        score: sdkEntry('./src/playus/score.ts'),
        phaser: sdkEntry('./src/playus/phaser/index.ts'),
        babylon: sdkEntry('./src/playus/babylon/index.ts'),
        three: sdkEntry('./src/playus/three/index.ts'),
        overlay: sdkEntry('./src/playus/overlay/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'phaser',
        '@babylonjs/core/Maths/math.color',
      ],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
});
