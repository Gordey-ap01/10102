(function () {
  const pageStateEl = document.getElementById("page-state");
  const pageState = pageStateEl ? JSON.parse(pageStateEl.textContent) : { page: "home", root: "." };
  const root = pageState.root || ".";
  const app = document.getElementById("app");
  const selectedServices = new Map();
  let records = [];
  let currentServices = [];
  let currentDevice = null;
  let brandCounterTimer = null;
  const mapEmbedUrl =
    "https://yandex.ru/map-widget/v1/?ll=137.026408%2C50.568069&mode=search&oid=27521144258&ol=biz&z=12";

  const branches = [
    {
      id: "vokzalnaya",
      title: "Вокзальная, 47",
      schedule: "Ежедневно 10:00-19:00",
      phone: "+7 (994) 076-01-01",
    },
    {
      id: "orehova",
      title: "Орехова, 54",
      schedule: "Ежедневно 10:00-19:00",
      phone: "+7 (994) 076-01-01",
    },
  ];

  const onsiteBranch = {
    id: "onsite",
    title: "Заказать выезд",
    schedule: "Мастер приедет к вам после согласования времени",
    phone: "+7 (994) 076-01-01",
  };

  const categoryCopy = {
    telefony: {
      title: "Телефоны",
      repairTitle: "Ремонт телефонов",
      subtitle: "Замена компонентов, стекла экрана, прошивка и извлечение данных.",
      intro: "Меняем экраны, аккумуляторы и другие компоненты, меняем стекло с сохранением оригинального дисплея, прошиваем и извлекаем данные.",
      icon: phoneIcon,
    },
    noutbuki: {
      title: "Ноутбуки",
      repairTitle: "Ремонт ноутбуков",
      subtitle: "Ремонт плат, чистка, настройка программ, апгрейд и модернизация.",
      intro: "Ремонтируем платы, перепаиваем процессоры и видеокарты, чистим, настраиваем программы, улучшаем и модернизируем ноутбуки.",
      icon: laptopIcon,
    },
    kompyutery: {
      title: "Компьютеры",
      repairTitle: "Ремонт компьютеров",
      subtitle: "Системные блоки, моноблоки, сборка, чистка, настройка и выездной ремонт.",
      intro: "Чистим и настраиваем программы, ремонтируем платы, улучшаем и модернизируем компьютеры для дома, офиса и игр.",
      icon: pcIcon,
    },
    pristavki: {
      title: "Приставки",
      repairTitle: "Ремонт игровых приставок",
      subtitle: "Пайка, прошивка, чиповка, чистка, обслуживание и ремонт джойстиков.",
      intro: "Ремонтируем и паяем приставки, прошиваем и чипуем, обслуживаем и чистим, восстанавливаем джойстики.",
      icon: consoleIcon,
    },
    videokarty: {
      title: "Видеокарты",
      repairTitle: "Ремонт видеокарт",
      subtitle: "Чистка, термопрокладки, пайка, BIOS и системы охлаждения.",
      intro: "Обслуживаем охлаждение, меняем термопрокладки, восстанавливаем питание, прошиваем BIOS и выполняем сложную пайку.",
      icon: gpuIcon,
    },
    gejmpady: {
      title: "Геймпады",
      repairTitle: "Ремонт геймпадов",
      subtitle: "Стики, кнопки, аккумуляторы, разъёмы и триггеры.",
      intro: "Ремонтируем стики, кнопки, аккумуляторы, разъёмы и триггеры контроллеров PlayStation, Xbox и Nintendo.",
      icon: gamepadIcon,
    },
  };

  document.addEventListener("DOMContentLoaded", () => {
    initCounters();
    initGlobalBookingButtons();
    loadCatalog();
    if (new URLSearchParams(location.search).has("sent")) {
      setTimeout(() => openBookingModal("sent"), 400);
    }
  });

  async function loadCatalog() {
    try {
      const response = await fetch(`${root}/data/services.csv`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Services ${response.status}`);
      const text = await response.text();
      records = parseCSV(text).map(normalizeRecord);
      if (!app) return;
      if (pageState.page === "category") renderCategoryPage(pageState.category);
      if (pageState.page === "model") {
        renderModelPage(pageState.category, pageState.brand, pageState.model);
      }
      if (pageState.page === "onsite") renderOnsitePage();
    } catch (error) {
      if (app) {
        app.innerHTML = `<section class="section"><div class="container"><div class="error-box">Не удалось загрузить услуги и цены. Попробуйте обновить страницу или позвоните в сервис.</div></div></section>`;
      }
      console.error(error);
    }
  }

  function normalizeRecord(row, index) {
    return {
      id: row.id || `service-${index}`,
      position: row["вид_работы"] || row["позиция"] || row.position || "",
      category: row["категория"] || row.category || "",
      cost: row["цена"] || row["стоимость"] || row.cost || "",
      description: row["описание"] || row.description || "",
      image: row["фото_1"] || row["ссылка_на_картинку"] || row.image || "",
      categorySlug: row.category_slug || "",
      categoryTitle: row.category_title || row["категория"] || "",
      brandSlug: row.brand_slug || "",
      brand: row["бренд"] || row.brand || "",
      modelSlug: row.model_slug || "",
      model: row["устройство"] || row.model || "",
      time: row["время_от"] || row.time || "",
      badge: row["пометка"] || row.badge || "",
      pageUrl: row.page_url || "",
    };
  }

  function parseCSV(text) {
    const firstLine = text.split(/\r?\n/, 1)[0] || "";
    const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (quoted) {
        if (char === '"' && next === '"') {
          field += '"';
          i += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          field += char;
        }
      } else if (char === '"') {
        quoted = true;
      } else if (char === delimiter) {
        row.push(field);
        field = "";
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (char !== "\r") {
        field += char;
      }
    }
    if (field || row.length) {
      row.push(field);
      rows.push(row);
    }

    const headers = rows.shift() || [];
    return rows
      .filter((line) => line.some(Boolean))
      .map((line) =>
        headers.reduce((acc, header, idx) => {
          acc[header] = line[idx] || "";
          return acc;
        }, {})
      );
  }

  function renderCategoryPage(categorySlug) {
    const categoryRecords = records.filter((record) => record.categorySlug === categorySlug);
    if (!categoryRecords.length) {
      renderNotFound("Категория не найдена");
      return;
    }
    const active = pickDefaultDevice(categoryRecords);
    renderCatalog(active);
  }

  function renderModelPage(categorySlug, brandSlug, modelSlug) {
    const active =
      records.find(
        (record) =>
          record.categorySlug === categorySlug &&
          record.brandSlug === brandSlug &&
          record.modelSlug === modelSlug
      ) || null;
    if (!active) {
      renderNotFound("Устройство не найдено");
      return;
    }
    renderCatalog(active);
  }

  function renderOnsitePage() {
    const onsiteRecords = records.filter((record) =>
      ["noutbuki", "kompyutery"].includes(record.categorySlug)
    );
    const active = pickDefaultDevice(onsiteRecords);
    if (!active) {
      renderNotFound("Выездной ремонт пока не настроен");
      return;
    }
    renderCatalog(active, { onsite: true });
  }

  function renderCatalog(activeRecord, options = {}) {
    const category = categoryCopy[activeRecord.categorySlug] || {
      title: activeRecord.category,
      repairTitle: activeRecord.categoryTitle,
      subtitle: "",
      intro: "",
      icon: pcIcon,
    };
    const categoryRecords = records.filter((record) => record.categorySlug === activeRecord.categorySlug);
    const brands = uniqueBy(categoryRecords, "brandSlug");
    const activeBrandRecords = categoryRecords.filter(
      (record) => record.brandSlug === activeRecord.brandSlug
    );
    const models = uniqueBy(activeBrandRecords, "modelSlug");
    currentServices = getServices(activeRecord);
    currentDevice = {
      categorySlug: activeRecord.categorySlug,
      category: category.title,
      brand: activeRecord.brand,
      model: formatDeviceName(activeRecord.brand, activeRecord.model),
      image: activeRecord.image,
    };

    app.innerHTML = `
      <div class="page-shell">
        <section class="catalog-top">
          <div class="container catalog-top__inner">
            <div class="catalog-tabs">
              ${renderTopTabs(activeRecord.categorySlug, options.onsite)}
            </div>
          </div>
        </section>

        <section class="section catalog-section">
          <div class="container">
            <div class="catalog-controls">
              <div>
                <div class="control-heading">
                  <p class="control-label">Бренд / тип устройства</p>
                  ${renderBrandCounter(activeRecord)}
                </div>
                <div class="chip-row">
                  ${brands
                    .map((brand) => {
                      const firstModel = categoryRecords.find((record) => record.brandSlug === brand.brandSlug);
                      return `<a class="chip ${brand.brandSlug === activeRecord.brandSlug ? "active" : ""}" href="${modelHref(
                        firstModel
                      )}">${escapeHTML(brand.brand)}</a>`;
                    })
                    .join("")}
                </div>
              </div>
              <div>
                <p class="control-label">Модель</p>
                <div class="chip-row">
                  ${models
                    .map(
                      (model) =>
                        `<a class="chip ${model.modelSlug === activeRecord.modelSlug ? "active" : ""}" href="${modelHref(
                          model
                        )}">${escapeHTML(model.model)}</a>`
                    )
                    .join("")}
                </div>
              </div>
            </div>

            <div class="device-workspace">
              ${renderDeviceCard(activeRecord, category, options)}
              ${renderPricePanel(activeRecord, category)}
            </div>

            <div class="note-box">
              Стоимость указана за работу без детали. Полная цена с запчастью подтверждается мастером после диагностики или уточнения модели.
              Можно выбрать несколько услуг и отправить одну заявку.
            </div>
          </div>
        </section>
        ${renderContactSection()}
      </div>
    `;

    bindServiceButtons();
    syncBookingBar();
    startBrandCounter(activeRecord);
  }

  function renderTopTabs(activeSlug, onsite) {
    const tabs = [
      { slug: "telefony", label: "Телефоны", href: `${root}/remont/telefony/index.html` },
      { slug: "noutbuki", label: "Ноутбуки", href: `${root}/remont/noutbuki/index.html` },
      { slug: "kompyutery", label: "Компьютеры", href: `${root}/remont/kompyutery/index.html` },
      { slug: "onsite", label: "Выездной ремонт", href: `${root}/remont/vyezdnoj-remont/index.html` },
    ];
    return tabs
      .map((tab) => {
        const active = tab.slug === activeSlug || (onsite && tab.slug === "onsite");
        const visualSlug = tab.slug === "onsite" ? "vyezd" : tab.slug;
        return `<a class="tab tab--${visualSlug} ${active ? "active" : ""}" href="${tab.href}">
          <span class="tab-icon tab-icon--${visualSlug}" aria-hidden="true">${tabIcon(visualSlug)}</span>
          <span>${tab.label}</span>
        </a>`;
      })
      .join("");
  }

  function tabIcon(slug) {
    const icons = {
      telefony: phoneIcon,
      noutbuki: laptopIcon,
      kompyutery: pcIcon,
      vyezd: pcIcon,
    };
    return (icons[slug] || pcIcon)();
  }

  function renderDeviceCard(activeRecord, category, options = {}) {
    const deviceName = formatDeviceName(activeRecord.brand, activeRecord.model);
    const title = options.onsite
      ? `Выездной ремонт: ${deviceName}`
      : deviceName;
    return `
      <article class="device-card">
        <div class="device-card__media">
          ${
            activeRecord.image
              ? `<img src="${escapeAttr(activeRecord.image)}" alt="${escapeAttr(title)}" loading="eager">`
              : `<div class="device-card__placeholder" aria-hidden="true"></div>`
          }
          <div class="device-media-tags" aria-hidden="true">
            <span>от 30 мин</span>
            <span>гарантия до 12 мес</span>
            <span>2 филиала</span>
          </div>
        </div>
        <div class="device-card__body">
          <p class="device-kicker">${escapeHTML(category.title)}</p>
          <h2 class="device-title">${escapeHTML(title)}</h2>
          <p class="device-description">${escapeHTML(
            options.onsite
              ? "Мастер приедет домой, в офис или на производство. Возможен ремонт на месте или доставка устройства в сервис после диагностики."
              : category.intro
          )}</p>
          <div class="device-facts">
            <span><strong>от 30 мин</strong> типовой ремонт</span>
            <span><strong>до 12 мес</strong> гарантия</span>
            <span><strong>2 филиала</strong> в городе</span>
          </div>
        </div>
      </article>
    `;
  }

  function renderPricePanel(activeRecord, category) {
    const services = getServices(activeRecord);
    const firstServices = services.slice(0, 7);
    const extraServices = services.slice(7);
    return `
      <article class="prices-panel">
        <div class="prices-panel__head">
          <div>
            <p class="eyebrow">Цена работы без детали</p>
            <p>${escapeHTML(category.subtitle)}</p>
          </div>
          <span class="warranty-pill">Гарантия до 12 мес</span>
        </div>
        <div class="price-list">
          ${firstServices.map(renderServiceRow).join("")}
          ${
            extraServices.length
              ? `<div class="extra-services" hidden>${extraServices.map(renderServiceRow).join("")}</div>
                <button class="expand-services" type="button" data-expanded="false">Раскройте весь список услуг</button>`
              : ""
          }
        </div>
      </article>
    `;
  }

  function renderServiceRow(service) {
    const free = /бесплатно/i.test(service.cost);
    const selected = selectedServices.has(service.id);
    return `
      <div class="price-row ${selected ? "selected" : ""}" data-service-id="${escapeAttr(service.id)}">
        <div class="price-row__name">
          ${escapeHTML(service.position)}
          ${service.badge ? `<span class="badge">${escapeHTML(service.badge)}</span>` : ""}
          <div class="price-row__desc">${escapeHTML(service.description)}</div>
        </div>
        <div class="price-row__time">${escapeHTML(service.time || "по согласованию")}</div>
        <div class="price-row__price ${free ? "free" : ""}">${escapeHTML(service.cost)}</div>
        <button class="select-service" type="button">${selected ? "Выбрано" : "Выбрать"}</button>
      </div>
    `;
  }

  function renderBrandCounter(activeRecord) {
    return `
      <div class="brand-counter" data-brand-counter>
        <strong data-brand-counter-value>${formatNumber(getBrandCounterStart(activeRecord))}</strong>
        <span>отремонтировано устройств ${escapeHTML(activeRecord.brand)}</span>
      </div>
    `;
  }

  function startBrandCounter(activeRecord) {
    if (brandCounterTimer) {
      clearInterval(brandCounterTimer);
      brandCounterTimer = null;
    }
    const valueEl = document.querySelector("[data-brand-counter-value]");
    if (!valueEl) return;
    let value = getBrandCounterStart(activeRecord);
    valueEl.textContent = formatNumber(value);
    brandCounterTimer = setInterval(() => {
      value += randomInt(1, 4);
      valueEl.textContent = formatNumber(value);
      valueEl.classList.remove("bump");
      void valueEl.offsetWidth;
      valueEl.classList.add("bump");
    }, 2000);
  }

  function getBrandCounterStart(activeRecord) {
    const seed = hashString(`${activeRecord.categorySlug}-${activeRecord.brandSlug}`);
    return 520 + (seed % 3200);
  }

  function hashString(value) {
    return String(value).split("").reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);
  }

  function renderContactSection() {
    return `
      <section id="contacts" class="section section-gray contact-section">
        <div class="container">
          <div class="section-head">
            <p class="eyebrow">Контакты</p>
            <h2 class="section-title">Остались вопросы? Свяжитесь - бесплатная консультация!</h2>
            <p class="section-text">Филиалы работают ежедневно с 10:00 до 19:00 без перерывов и выходных. Можно приехать в сервис или оставить заявку на выезд мастера.</p>
          </div>
          <div class="contact-grid">
            <form class="contact-form" action="https://formsubmit.co/shineteatr@gmail.com" method="POST">
              <input type="hidden" name="_subject" value="Заявка с сайта Сервис 101">
              <input type="hidden" name="_template" value="table">
              <input type="hidden" name="_captcha" value="false">
              <input class="input" type="text" name="Имя" placeholder="Ваше имя" required>
              <input class="input" type="tel" name="Телефон" placeholder="+7 (___) ___-__-__" required>
              <select class="input" name="Тип устройства" required>
                <option value="">Тип устройства</option>
                <option>Смартфон или планшет</option>
                <option>Ноутбук</option>
                <option>Компьютер</option>
                <option>Игровая приставка</option>
                <option>Геймпад</option>
                <option>Другое</option>
              </select>
              <textarea class="input" name="Описание" rows="5" placeholder="Опишите неисправность"></textarea>
              <button class="btn btn-primary" type="submit">Отправить заявку</button>
            </form>
            <div class="contact-card">
              <div class="branch-list">
                <a class="branch-item" href="https://go.2gis.com/ooow7o" target="_blank" rel="noreferrer">
                  <strong>ул. Вокзальная, 47</strong>
                  <span>Ежедневно 10:00-19:00</span>
                </a>
                <a class="branch-item" href="https://go.2gis.com/8z19r" target="_blank" rel="noreferrer">
                  <strong>ул. Орехова, 54</strong>
                  <span>Ежедневно 10:00-19:00</span>
                </a>
              </div>
              <div class="contact-lines">
                <a href="tel:+79940760101">+7 (994) 076-01-01</a>
                <a href="mailto:101kms@mail.ru">101kms@mail.ru</a>
              </div>
              <iframe class="map-frame" title="Сервис 101 на карте" src="${mapEmbedUrl}" loading="lazy"></iframe>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function getServices(activeRecord) {
    return records.filter(
      (record) =>
        record.categorySlug === activeRecord.categorySlug &&
        record.brandSlug === activeRecord.brandSlug &&
        record.modelSlug === activeRecord.modelSlug
    );
  }

  function pickDefaultDevice(sourceRecords) {
    return sourceRecords[0];
  }

  function uniqueBy(sourceRecords, key) {
    const seen = new Set();
    return sourceRecords.filter((record) => {
      if (seen.has(record[key])) return false;
      seen.add(record[key]);
      return true;
    });
  }

  function modelHref(record) {
    return `${root}/remont/${record.categorySlug}/${record.brandSlug}/${record.modelSlug}/index.html`;
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

  function renderNotFound(message) {
    app.innerHTML = `
      <section class="section">
        <div class="container">
          <div class="error-box">${escapeHTML(message)}. Вернитесь на <a href="${root}/index.html">главную</a>.</div>
        </div>
      </section>
    `;
  }

  function bindServiceButtons() {
    document.querySelectorAll(".expand-services").forEach((button) => {
      button.addEventListener("click", () => {
        const extra = button.previousElementSibling;
        const expanded = button.dataset.expanded === "true";
        if (!extra) return;
        extra.hidden = expanded;
        button.dataset.expanded = expanded ? "false" : "true";
        button.textContent = expanded ? "Раскройте весь список услуг" : "Скрыть список услуг";
      });
    });

    document.querySelectorAll(".price-row").forEach((row) => {
      const id = row.dataset.serviceId;
      const service = currentServices.find((item) => item.id === id);
      row.querySelector(".select-service").addEventListener("click", () => {
        if (!service) return;
        if (selectedServices.has(id)) {
          selectedServices.delete(id);
        } else {
          selectedServices.set(id, service);
        }
        row.classList.toggle("selected", selectedServices.has(id));
        row.querySelector(".select-service").textContent = selectedServices.has(id) ? "Выбрано" : "Выбрать";
        syncBookingBar();
      });
    });
  }

  function syncBookingBar() {
    let bar = document.querySelector(".booking-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "booking-bar";
      bar.innerHTML = `
        <div class="booking-bar__text"></div>
        <button class="btn btn-primary" type="button">Записаться</button>
      `;
      document.body.appendChild(bar);
      bar.querySelector("button").addEventListener("click", () => openBookingModal());
    }
    const count = selectedServices.size;
    bar.classList.toggle("visible", count > 0);
    bar.querySelector(".booking-bar__text").innerHTML =
      count > 0
        ? `<strong>${count}</strong> ${plural(count, "услуга выбрана", "услуги выбраны", "услуг выбрано")}`
        : "";
  }

  function initGlobalBookingButtons() {
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-open-booking]");
      if (!trigger) return;
      event.preventDefault();
      openBookingModal();
    });
  }

  function openBookingModal(mode) {
    const modal = ensureModal();
    document.body.classList.add("modal-open");
    modal.classList.add("visible");
    if (mode === "sent") {
      modal.querySelector(".modal__head p").textContent =
        "Заявка отправлена. Мастер свяжется с вами, чтобы уточнить устройство, филиал и время.";
    }
    renderModalServices();
    renderBranchCards();
    updateFormHiddenFields();
  }

  function closeBookingModal() {
    const modal = document.querySelector(".modal");
    if (!modal) return;
    modal.classList.remove("visible");
    document.body.classList.remove("modal-open");
  }

  function ensureModal() {
    let modal = document.querySelector(".modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal__dialog" role="dialog" aria-modal="true" aria-label="Запись на ремонт">
        <div class="modal__head">
          <div>
            <h3>Запись на ремонт</h3>
            <p>Проверьте услуги, выберите филиал и оставьте контакты.</p>
          </div>
          <button class="modal__close" type="button" aria-label="Закрыть">×</button>
        </div>
        <form class="booking-form" action="https://formsubmit.co/shineteatr@gmail.com" method="POST">
          <input type="hidden" name="_subject" value="Новая заявка с сайта Сервис 101">
          <input type="hidden" name="_template" value="table">
          <input type="hidden" name="_captcha" value="false">
          <input type="hidden" name="_next" value="">
          <input type="hidden" name="Устройство" value="">
          <input type="hidden" name="Услуги" value="">
          <input type="hidden" name="Филиал" value="">

          <div class="form-section">
            <p>Услуги</p>
            <div class="selected-list"></div>
          </div>

          <div class="form-section">
            <p>Филиал</p>
            <div class="branch-grid"></div>
          </div>

          <div class="field-grid">
            <label>
              <span class="sr-only">Имя</span>
              <input class="input" type="text" name="Имя" placeholder="Имя" required>
            </label>
            <label>
              <span class="sr-only">Телефон</span>
              <input class="input" type="tel" name="Телефон" placeholder="+7 (___) ___-__-__" required>
            </label>
          </div>

          <button class="btn btn-dark" type="submit">Отправить заявку</button>
          <p class="form-footnote">Нажимая кнопку, вы отправляете заявку в Сервис 101. Мастер перезвонит и уточнит детали ремонта.</p>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeBookingModal();
    });
    modal.querySelector(".modal__close").addEventListener("click", closeBookingModal);
    modal.querySelector("form").addEventListener("submit", () => {
      updateFormHiddenFields();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeBookingModal();
    });
    return modal;
  }

  function renderModalServices() {
    const list = document.querySelector(".selected-list");
    if (!list) return;
    const source = currentServices.length ? currentServices : Array.from(selectedServices.values());
    if (!source.length) {
      list.innerHTML = `<div class="service-check">Услуги можно уточнить после звонка мастера</div>`;
      return;
    }
    list.innerHTML = source
      .map(
        (service) => `
          <label class="service-check">
            <input type="checkbox" value="${escapeAttr(service.id)}" ${
              selectedServices.has(service.id) ? "checked" : ""
            }>
            <span>${escapeHTML(service.position)} · ${escapeHTML(service.cost)}</span>
          </label>
        `
      )
      .join("");
    list.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", () => {
        const service = source.find((item) => item.id === input.value);
        if (!service) return;
        if (input.checked) selectedServices.set(service.id, service);
        else selectedServices.delete(service.id);
        refreshRenderedServiceRows();
        syncBookingBar();
        updateFormHiddenFields();
      });
    });
  }

  function renderBranchCards() {
    const grid = document.querySelector(".branch-grid");
    if (!grid) return;
    const needsOnsite = shouldShowOnsite();
    const list = needsOnsite ? [...branches, onsiteBranch] : branches;
    grid.innerHTML = list
      .map(
        (branch, index) => `
          <label class="branch-card">
            <input type="radio" name="branch_choice" value="${escapeAttr(branch.id)}" ${index === 0 ? "checked" : ""}>
            <strong>${escapeHTML(branch.title)}</strong>
            <span>${escapeHTML(branch.schedule)}</span>
            <span>${escapeHTML(branch.phone)}</span>
          </label>
        `
      )
      .join("");
    grid.querySelectorAll("input").forEach((input) =>
      input.addEventListener("change", updateFormHiddenFields)
    );
  }

  function shouldShowOnsite() {
    if (currentDevice && ["noutbuki", "kompyutery"].includes(currentDevice.categorySlug)) return true;
    return Array.from(selectedServices.values()).some((service) =>
      ["noutbuki", "kompyutery"].includes(service.categorySlug)
    );
  }

  function refreshRenderedServiceRows() {
    document.querySelectorAll(".price-row").forEach((row) => {
      const selected = selectedServices.has(row.dataset.serviceId);
      row.classList.toggle("selected", selected);
      const button = row.querySelector(".select-service");
      if (button) button.textContent = selected ? "Выбрано" : "Выбрать";
    });
  }

  function updateFormHiddenFields() {
    const form = document.querySelector(".booking-form");
    if (!form) return;
    const selected = Array.from(selectedServices.values());
    const checkedBranch = form.querySelector('input[name="branch_choice"]:checked');
    const branch = [...branches, onsiteBranch].find((item) => item.id === checkedBranch?.value) || branches[0];
    form.elements["Устройство"].value = currentDevice
      ? `${currentDevice.category}: ${currentDevice.brand} ${currentDevice.model}`
      : "Не выбрано";
    form.elements["Услуги"].value = selected.length
      ? selected.map((service) => `${service.position} (${service.cost})`).join("; ")
      : "Уточнить по телефону";
    form.elements["Филиал"].value = `${branch.title}; ${branch.schedule}; ${branch.phone}`;
    form.elements["_next"].value = `${location.origin}${location.pathname}?sent=1`;
  }

  function initCounters() {
    const counters = [
      { id: "counter-phones", value: 1540, min: 1, max: 4 },
      { id: "counter-laptops", value: 620, min: 1, max: 2 },
      { id: "counter-total", value: 3470, min: 2, max: 7 },
    ];
    counters.forEach((counter) => writeCounter(counter.id, counter.value));
    const schedule = [5000, 10000, 30000];
    let step = 0;

    function tick() {
      counters.forEach((counter) => {
        counter.value += randomInt(counter.min, counter.max);
        writeCounter(counter.id, counter.value);
      });
      const nextDelay = schedule[step % schedule.length];
      step += 1;
      setTimeout(tick, nextDelay);
    }

    setTimeout(tick, schedule[0]);
  }

  function writeCounter(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = formatNumber(value);
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("ru-RU").format(value);
  }

  function plural(count, one, few, many) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHTML(value);
  }

  function phoneIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="2.5" width="10" height="19" rx="2.4"></rect><path d="M10 6.2h4"></path><path d="M11 18h2"></path></svg>';
  }

  function laptopIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="5" width="16" height="10" rx="1.8"></rect><path d="M2.5 18.5h19"></path><path d="M7 18.5h10"></path></svg>';
  }

  function consoleIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 8.5c0-1.4 1.1-2.5 2.5-2.5h9c1.4 0 2.5 1.1 2.5 2.5V15c0 1.4-1.1 2.5-2.5 2.5h-9C6.1 17.5 5 16.4 5 15V8.5Z"></path><path d="M8 10.5h3"></path><path d="M9.5 9v3"></path><circle cx="15.6" cy="12" r="0.75"></circle><circle cx="17.7" cy="12" r="0.75"></circle></svg>';
  }

  function pcIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="5" width="17" height="11" rx="1.8"></rect><path d="M8 19h8"></path><path d="M10 16h4"></path></svg>';
  }

  function gpuIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="7" width="13" height="8" rx="1.8"></rect><circle cx="10" cy="11" r="2.1"></circle><path d="M18 9.5h2.5v5H18"></path><path d="M6 15v3"></path><path d="M9 15v3"></path></svg>';
  }

  function gamepadIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6.5 9.5c1.3-1.6 3.4-2.6 5.5-2.6s4.2 1 5.5 2.6c1.5 1.8 2.6 4.5 1.1 6.3-1 1.2-2.9 1.3-4.1.3l-1.1-.9c-.8-.7-1.9-.7-2.7 0l-1.1.9c-1.2 1-3.1.9-4.1-.3-1.5-1.8-.4-4.5 1.1-6.3Z"></path><path d="M8.5 11.2h2"></path><path d="M9.5 10.2v2"></path><circle cx="15.6" cy="11.2" r="0.55"></circle><circle cx="16.9" cy="12.5" r="0.55"></circle></svg>';
  }
})();
