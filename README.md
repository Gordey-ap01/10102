# 10102

Static redesign of Service 101 based on project 3.

## Update prices

Edit `data/services.csv`. The site reads this file on page load, so changed prices,
descriptions and image links are pulled into the public pages without editing HTML.

CSV columns used by the site:

- `позиция`
- `категория`
- `стоимость`
- `описание`
- `ссылка_на_картинку`
- `category_slug`
- `brand_slug`
- `model_slug`

To regenerate SEO pages after adding new devices, run:

```bash
node tools/generate-pages.mjs
```

## Verify locally

```bash
node tools/local-server.mjs 8082
node tools/verify-browser.mjs http://127.0.0.1:8082
```
