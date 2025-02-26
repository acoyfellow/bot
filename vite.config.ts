import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { mdsvex } from 'mdsvex'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte({
      extensions: ['.svelte', '.md'],
      preprocess: [
        mdsvex({
          extensions: ['.md']
        })
      ]
    }),
    cloudflare(),
    tailwindcss()
  ],
})
