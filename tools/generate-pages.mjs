import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const sourceRoot = path.resolve(projectRoot, "..");
const catalogPath = path.join(sourceRoot, "data", "catalog.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

const yandexUrl = "https://yandex.ru/maps/org/101/27521144258/?ll=136.988230%2C50.546031&z=17";
const twoGisUrl = "https://2gis.ru/komsomolsk-on-amur/firm/70000001053887975";
const googleUrl =
  "https://www.google.com/search?q=%D0%A1%D0%B5%D1%80%D0%B2%D0%B8%D1%81+101+%D0%A0%D0%B5%D0%BC%D0%BE%D0%BD%D1%82+%D0%BD%D0%BE%D1%83%D1%82%D0%B1%D1%83%D0%BA%D0%BE%D0%B2+%D0%B8%D0%B3%D1%80%D0%BE%D0%B2%D1%8B%D1%85+%D0%BF%D1%80%D0%B8%D1%81%D1%82%D0%B0%D0%B2%D0%BE%D0%BA+%D1%82%D0%B5%D0%BB%D0%B5%D1%84%D0%BE%D0%BD%D0%BE%D0%B2";

const categoryMeta = {
  telefony: {
    text: "Смартфоны Apple, Samsung, Xiaomi, Honor и Realme с быстрым подбором работ.",
    icon: phoneIcon(),
  },
  noutbuki: {
    text: "Матрицы, клавиатуры, питание, чистка, SSD и установка Windows.",
    icon: laptopIcon(),
  },
  kompyutery: {
    text: "Сборка, обслуживание, блоки питания, платы, ОС и выездной ремонт.",
    icon: pcIcon(),
  },
  pristavki: {
    text: "PlayStation, Xbox, Nintendo: HDMI, питание, чистка и ремонт плат.",
    icon: consoleIcon(),
  },
  videokarty: {
    text: "NVIDIA и AMD: термопрокладки, пайка, BIOS и системы охлаждения.",
    icon: gpuIcon(),
  },
  gejmpady: {
    text: "Стики, кнопки, аккумуляторы и разъёмы контроллеров.",
    icon: gamepadIcon(),
  },
};

const records = [];

for (const category of catalog.categories) {
  const brands = catalog.brands[category.id] || [];
  for (const brand of brands) {
    const services = resolveServices(brand.services);
    for (const model of brand.models) {
      services.forEach((service, index) => {
        records.push({
          id: `${category.id}-${brand.id}-${model.id}-${slugify(service.name)}-${index + 1}`,
          "позиция": service.name,
          "категория": category.name,
          "стоимость": service.price,
          "описание": `${brand.name} ${model.name}: ${service.time || "срок уточняется мастером"}`,
          "ссылка_на_картинку": category.icon,
          category_slug: category.id,
          category_title: category.title,
          brand_slug: brand.id,
          brand: brand.name,
          model_slug: model.id,
          model: model.name,
          time: service.time || "",
          badge: service.badge || "",
          page_url: `remont/${category.id}/${brand.id}/${model.id}/`,
        });
      });
    }
  }
}

ensureDir(path.join(projectRoot, "data"));
ensureDir(path.join(projectRoot, "scripts"));
writeFile(path.join(projectRoot, "data", "services.csv"), toCSV(records));

writeFile(
  path.join(projectRoot, "index.html"),
  layout({
    root: ".",
    page: "home",
    title: "Сервис 101 - ремонт техники в Комсомольске-на-Амуре",
    description:
      "Сервис 101: ремонт телефонов, ноутбуков, компьютеров, приставок, видеокарт и геймпадов. CSV-цены, выбор нескольких услуг и запись онлайн.",
    body: homeBody(),
    state: { page: "home", root: "." },
  })
);

for (const category of catalog.categories) {
  const categoryDir = path.join(projectRoot, "remont", category.id);
  ensureDir(categoryDir);
  writeFile(
    path.join(categoryDir, "index.html"),
    layout({
      root: "../..",
      page: "category",
      title: `${category.title} | Сервис 101`,
      description: `${category.title}: выберите бренд, модель и нужные услуги. Цены загружаются из CSV.`,
      body: loaderBody(category.title),
      state: { page: "category", root: "../..", category: category.id },
    })
  );

  const brands = catalog.brands[category.id] || [];
  for (const brand of brands) {
    for (const model of brand.models) {
      const modelDir = path.join(projectRoot, "remont", category.id, brand.id, model.id);
      ensureDir(modelDir);
      writeFile(
        path.join(modelDir, "index.html"),
        layout({
          root: "../../../..",
          page: "model",
          title: `Ремонт ${formatDeviceName(brand.name, model.name)} | Сервис 101`,
          description: `Ремонт ${formatDeviceName(brand.name, model.name)}: цены работ без детали, выбор нескольких услуг и запись в Сервис 101.`,
          body: loaderBody(`Ремонт ${formatDeviceName(brand.name, model.name)}`),
          state: {
            page: "model",
            root: "../../../..",
            category: category.id,
            brand: brand.id,
            model: model.id,
          },
        })
      );
    }
  }
}

const onsiteDir = path.join(projectRoot, "remont", "vyezdnoj-remont");
ensureDir(onsiteDir);
writeFile(
  path.join(onsiteDir, "index.html"),
  layout({
    root: "../..",
    page: "onsite",
    title: "Выездной ремонт компьютеров и ноутбуков | Сервис 101",
    description: "Выездной ремонт ноутбуков и компьютеров: выберите услуги и закажите выезд мастера.",
    body: loaderBody("Выездной ремонт компьютеров и ноутбуков"),
    state: { page: "onsite", root: "../..", category: "vyezdnoj-remont" },
  })
);

console.log(`Generated ${records.length} CSV rows and static pages in ${projectRoot}`);

function resolveServices(services) {
  if (Array.isArray(services)) return services;
  return catalog.serviceTemplates[services] || [];
}

function layout({ root, title, description, body, state }) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <meta name="description" content="${escapeHTML(description)}">
  <link rel="stylesheet" href="${root}/styles.css">
</head>
<body>
${header(root)}
<main id="app">
${body}
</main>
${footer(root)}
<script id="page-state" type="application/json">${JSON.stringify(state)}</script>
<script src="${root}/scripts/app.js" defer></script>
</body>
</html>
`;
}

function header(root) {
  return `<header class="site-header">
  <div class="container site-header__inner">
    <a class="brand" href="${root}/index.html" aria-label="Сервис 101">
      <span class="brand__mark">101</span>
      <span>
        <span class="brand__name">СЕРВИС 101</span>
        <span class="brand__city">Комсомольск-на-Амуре</span>
      </span>
    </a>
    <div class="odometer-strip" aria-label="Оживлённые устройства">
      <div class="odometer">
        <span class="odometer__num" id="counter-phones">1 540</span>
        <span class="odometer__label">телефоны</span>
      </div>
      <div class="odometer">
        <span class="odometer__num" id="counter-laptops">620</span>
        <span class="odometer__label">ноутбуки</span>
      </div>
      <div class="odometer">
        <span class="odometer__num" id="counter-total">3 470</span>
        <span class="odometer__label">всего</span>
      </div>
    </div>
    <div class="header-actions">
      <a href="tel:+79681702336">+7 (968) 170-23-36</a>
      <a class="btn btn-primary btn-sm" href="#" data-open-booking>Записаться</a>
    </div>
  </div>
</header>`;
}

function footer(root) {
  return `<footer class="footer">
  <div class="container footer__inner">
    <div>
      <strong>Сервис 101</strong><br>
      Вокзальная, 47 · Орехова, 54 · ежедневно 10:00-19:00
    </div>
    <div>
      <a href="tel:+79681702336">+7 (968) 170-23-36</a> · <a href="mailto:shineteatr@gmail.com">shineteatr@gmail.com</a>
    </div>
    <a class="btn btn-primary btn-sm" href="${root}/remont/telefony/index.html">Выбрать ремонт</a>
  </div>
</footer>`;
}

function homeBody() {
  return `<section class="hero">
  <div class="container hero__inner">
    <div>
      <p class="eyebrow eyebrow-light">Ремонт техники в одном месте</p>
      <h1>Сервис 101</h1>
      <p class="hero__lead">Ремонт телефонов, ноутбуков, компьютеров, игровых приставок и комплектующих. Выберите устройство, отметьте несколько работ и отправьте одну заявку без звонков по каждой услуге.</p>
      <div class="hero__actions">
        <a class="btn btn-primary" href="#specialization">Выбрать категорию</a>
        <a class="btn btn-ghost" href="#" data-open-booking>Записаться</a>
      </div>
      <div class="hero__proof">
        <div class="proof-card"><strong>от 30 минут</strong><span>простые работы и диагностика</span></div>
        <div class="proof-card"><strong>2 филиала</strong><span>без карты в форме записи</span></div>
        <div class="proof-card"><strong>CSV-цены</strong><span>обновляются без правки HTML</span></div>
      </div>
    </div>
    <div class="hero-visual" aria-hidden="true">
      <div class="hero-visual__glow"></div>
      <div class="float-card float-phone"></div>
      <div class="float-card float-panel"><span></span><span></span><span></span></div>
      <div class="float-card float-blue"><span></span><span></span></div>
      <div class="float-card float-violet"><span></span><span></span><span></span></div>
    </div>
  </div>
</section>

<section id="specialization" class="section section-white">
  <div class="container">
    <div class="section-head">
      <p class="eyebrow">Специализация сервиса</p>
      <h2 class="section-title">Выберите направление ремонта</h2>
      <p class="section-text">После выбора категории откроется подбор устройства и список услуг. На мобильной версии сначала показываем устройство и описание, затем цены.</p>
    </div>
    <div class="cat-grid">
      ${catalog.categories.map(categoryCard).join("")}
    </div>
  </div>
</section>

<section class="section section-gray">
  <div class="container">
    <div class="section-head">
      <p class="eyebrow">Возможности сервиса</p>
      <h2 class="section-title">Ремонтируем не только популярные устройства</h2>
      <p class="section-text">Структура сохранена как в проекте 3, но путь записи стал короче: категория, устройство, несколько услуг и одна форма.</p>
    </div>
    <div class="service-list">
      <div class="service-row"><p class="service-name">Ремонт телефонов</p><p class="service-desc">Экраны, аккумуляторы, стёкла, разъёмы, динамики, камеры и восстановление после влаги.</p></div>
      <div class="service-row"><p class="service-name">Ремонт ноутбуков</p><p class="service-desc">Чистка, замена матриц и клавиатур, SSD, Windows, питание и выезд мастера.</p></div>
      <div class="service-row"><p class="service-name">Компьютеры и видеокарты</p><p class="service-desc">Сборка ПК, апгрейд, блоки питания, платы, термопрокладки, пайка и BIOS.</p></div>
      <div class="service-row"><p class="service-name">Приставки и геймпады</p><p class="service-desc">PlayStation, Xbox, Nintendo, HDMI, питание, стики, кнопки и профилактика охлаждения.</p></div>
    </div>
  </div>
</section>

<section class="section section-white">
  <div class="container">
    <div class="section-head">
      <p class="eyebrow">Почему выбирают нас</p>
      <h2 class="section-title">Каталог понятный и быстрый</h2>
    </div>
    <div class="feature-grid">
      <div class="feature"><p class="feature-title">Сначала устройство</p><p class="feature-text">На странице модели слева стоит фото/описание, справа список работ. На мобильном порядок сохраняется: устройство, затем цены.</p></div>
      <div class="feature"><p class="feature-title">Несколько услуг</p><p class="feature-text">Вместо десятка кнопок «Записаться» у каждой строки есть «Выбрать», а запись отправляется одной заявкой.</p></div>
      <div class="feature"><p class="feature-title">Два филиала</p><p class="feature-text">В форме используются крупные карточки адресов с режимом и телефоном. Карта полностью убрана.</p></div>
      <div class="feature"><p class="feature-title">Отдельные URL</p><p class="feature-text">У каждого устройства своя страница для индексации: /remont/category/brand/model/.</p></div>
    </div>
  </div>
</section>

${reviewsBody()}

<section class="section section-white">
  <div class="container">
    <div class="cta-band">
      <h2>Выберите устройство и отправьте заявку за минуту</h2>
      <p>Если точной модели нет, оставьте заявку без выбора услуги. Мастер уточнит деталь, филиал и итоговую цену.</p>
      <div class="cta-actions">
        <a class="btn btn-primary" href="./remont/telefony/index.html">Начать с телефонов</a>
        <a class="btn btn-ghost" href="./remont/vyezdnoj-remont/index.html">Заказать выезд</a>
      </div>
    </div>
  </div>
</section>`;
}

function categoryCard(category) {
  const meta = categoryMeta[category.id] || { text: category.title, icon: pcIcon() };
  return `<a class="cat-card" href="./remont/${category.id}/index.html">
    <span class="cat-icon">${meta.icon}</span>
    <span>
      <span class="cat-title">${escapeHTML(category.name)}</span>
      <span class="cat-text">${escapeHTML(meta.text)}</span>
    </span>
    <span class="cat-open">Открыть</span>
  </a>`;
}

function reviewsBody() {
  return `<section id="reviews" class="section section-dark">
  <div class="container reviews-grid">
    <div class="rating-card">
      <p class="eyebrow eyebrow-light">Отзывы</p>
      <div class="rating-number">4.9</div>
      <div class="stars">★★★★★</div>
      <p class="section-text">Блок встроен в новый дизайн. Для официальной автоподгрузки виджета нужно вставить код из карточки компании Яндекс и 2ГИС в подготовленные слоты.</p>
      <div class="review-links">
        <a class="review-link" href="${yandexUrl}" target="_blank" rel="noreferrer">Яндекс Карты <span>читать</span></a>
        <a class="review-link" href="${twoGisUrl}" target="_blank" rel="noreferrer">2ГИС <span>читать</span></a>
        <a class="review-link" href="${googleUrl}" target="_blank" rel="noreferrer">Google <span>читать</span></a>
      </div>
      <p class="widget-note">Слоты для виджетов: <code>data-yandex-reviews-widget</code> и <code>data-2gis-reviews-widget</code>. Их можно заменить официальным embed-кодом из кабинетов без изменения верстки блока.</p>
    </div>
    <div class="review-cards">
      <article class="review-card"><p>Быстро нашли проблему, объяснили цену до ремонта и сразу предупредили по срокам. Удобно, что можно выбрать нужные работы заранее.</p><strong>Клиент Сервис 101</strong></article>
      <article class="review-card"><p>Отдал ноутбук на чистку и замену SSD. Понравилось, что не навязывают лишнего и дают понятную гарантию.</p><strong>Клиент Сервис 101</strong></article>
      <article class="review-card"><p>Меняли экран и стекло камеры. Записался через форму, филиал выбрал сразу, перезвонили быстро.</p><strong>Клиент Сервис 101</strong></article>
      <div class="review-card" data-yandex-reviews-widget><p>Сюда вставляется официальный виджет отзывов Яндекса из карточки организации.</p></div>
      <div class="review-card" data-2gis-reviews-widget><p>Сюда вставляется официальный виджет отзывов 2ГИС или код агрегатора отзывов.</p></div>
    </div>
  </div>
</section>`;
}

function loaderBody(title) {
  return `<section class="page-loader"><div class="container"><h1>${escapeHTML(title)}</h1><p>Загружаем услуги и цены из CSV...</p></div></section>`;
}

function toCSV(rows) {
  const headers = [
    "id",
    "позиция",
    "категория",
    "стоимость",
    "описание",
    "ссылка_на_картинку",
    "category_slug",
    "category_title",
    "brand_slug",
    "brand",
    "model_slug",
    "model",
    "time",
    "badge",
    "page_url",
  ];
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")).join("\n")}\n`;
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(file, text) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, text, "utf8");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/ё/g, "e")
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 44);
}

function formatDeviceName(brand, model) {
  const brandText = String(brand || "").trim();
  const modelText = String(model || "").trim();
  if (!brandText) return modelText;
  if (!modelText) return brandText;
  const brandWords = brandText.split(/\s+/);
  const modelWords = modelText.split(/\s+/);
  const lastBrand = brandWords[brandWords.length - 1]?.toLowerCase();
  const firstModel = modelWords[0]?.toLowerCase();
  if (lastBrand && firstModel && lastBrand === firstModel) {
    const rest = modelWords.slice(1).join(" ");
    return rest ? `${brandText} ${rest}` : brandText;
  }
  return `${brandText} ${modelText}`;
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function phoneIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="7" y="2.5" width="10" height="19" rx="2.4"></rect><path d="M10 6.2h4"></path><path d="M11 18h2"></path></svg>';
}

function laptopIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="5" width="16" height="10" rx="1.8"></rect><path d="M2.5 18.5h19"></path><path d="M7 18.5h10"></path></svg>';
}

function consoleIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 8.5c0-1.4 1.1-2.5 2.5-2.5h9c1.4 0 2.5 1.1 2.5 2.5V15c0 1.4-1.1 2.5-2.5 2.5h-9C6.1 17.5 5 16.4 5 15V8.5Z"></path><path d="M8 10.5h3"></path><path d="M9.5 9v3"></path><circle cx="15.6" cy="12" r="0.75"></circle><circle cx="17.7" cy="12" r="0.75"></circle></svg>';
}

function pcIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.5" y="5" width="17" height="11" rx="1.8"></rect><path d="M8 19h8"></path><path d="M10 16h4"></path></svg>';
}

function gpuIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.5" y="7" width="13" height="8" rx="1.8"></rect><circle cx="10" cy="11" r="2.1"></circle><path d="M18 9.5h2.5v5H18"></path><path d="M6 15v3"></path><path d="M9 15v3"></path></svg>';
}

function gamepadIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6.5 9.5c1.3-1.6 3.4-2.6 5.5-2.6s4.2 1 5.5 2.6c1.5 1.8 2.6 4.5 1.1 6.3-1 1.2-2.9 1.3-4.1.3l-1.1-.9c-.8-.7-1.9-.7-2.7 0l-1.1.9c-1.2 1-3.1.9-4.1-.3-1.5-1.8-.4-4.5 1.1-6.3Z"></path><path d="M8.5 11.2h2"></path><path d="M9.5 10.2v2"></path><circle cx="15.6" cy="11.2" r="0.55"></circle><circle cx="16.9" cy="12.5" r="0.55"></circle></svg>';
}
