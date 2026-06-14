# ROMEO Grab Driver Tracker

เว็บแอปสำหรับดูรายได้ รายจ่าย เป้าหมาย และประสิทธิภาพการขับ Grab จากข้อมูลตั้งต้นใน Google Sheet

## ใช้งานบนเครื่อง

```bash
npm install
npm run dev
```

เปิดที่ `http://127.0.0.1:5173/`

## Deploy

โปรเจกต์นี้ตั้งค่า base path สำหรับ GitHub Pages ไว้แล้ว หลัง build ให้ publish โฟลเดอร์ `dist` ไปที่ branch `gh-pages`

URL หลัง deploy:

`https://romeototo.github.io/grab-driver-tracker/`

## สถานะปัจจุบัน

- เป็น frontend static app
- ใช้ข้อมูลตั้งต้นจาก Google Sheet
- ฟอร์มเพิ่มบันทึกอัปเดตข้อมูลในหน้าเว็บทันที แต่ยังไม่ได้เขียนกลับ Google Sheet จริง
- ขั้นต่อไปที่เหมาะคือเพิ่ม backend/API สำหรับ sync Google Sheet

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
