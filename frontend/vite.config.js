import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'src/page/login.html'),
        register: resolve(__dirname, 'src/page/register.html'),
        dashboard: resolve(__dirname, 'src/page/dashboard.html'),
        upload: resolve(__dirname, 'src/page/upload.html'),
        spreadsheet: resolve(__dirname, 'src/page/spreadsheet.html'),
      }
    }
  }
});
