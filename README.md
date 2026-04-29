# 中永和幼兒園抽籤小幫手

React + Vite 靜態網站，整理新北市中和區、永和區公立與非營利幼兒園缺額、地圖、距離與新手爸媽挑選重點。

## 本機開發

```bash
npm install
npm run dev
```

## 部署到 GitHub Pages

1. 在 GitHub 建立一個新 repo，例如 `ntpc-kindergarten-picker`。
2. 將本專案 push 到 `main` 分支。
3. 到 repo 的 `Settings` -> `Pages`，Source 選 `GitHub Actions`。
4. 每次 push 到 `main` 會自動 build 並部署。

## 更新資料

幼兒園清單在 `src/data/kindergartens.js`。

- `googleRating`：若從 Google Maps 查到評分，可填入數字，例如 `4.5`，清單頁的評價 filter 會自動生效。
- `lat` / `lng`：距離為直線粗估，實際接送時間請用 Google Maps 路線確認。
- `vacancies`：缺額以 2026-04-29 新北市 115 學年度公告為基準，若官方更動請直接更新。
