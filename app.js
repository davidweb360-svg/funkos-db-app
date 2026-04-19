const STORAGE_KEY = "funkos-db-progress-v1";
const REMOTE_BASE_URL = "https://www.listacompletade.com";

let allFunkos = [];
let userProgress = {};

const totalCountEl = document.getElementById("totalCount");
const ownedCountEl = document.getElementById("ownedCount");
const missingCountEl = document.getElementById("missingCount");
const boxedCountEl = document.getElementById("boxedCount");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const boxFilter = document.getElementById("boxFilter");
const sagaFilter = document.getElementById("sagaFilter");
const exportBtn = document.getElementById("exportBtn");
const resetBtn = document.getElementById("resetBtn");

const funkoGrid = document.getElementById("funkoGrid");
const template = document.getElementById("funkoCardTemplate");

function getFunkoKey(funko) {
  return [
    funko.numero || "",
    funko.nombre || "",
    funko.saga || "",
    funko.tiraje || "",
    funko.linea || "",
    funko.anio || ""
  ].join("||");
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    userProgress = raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("Error cargando progreso:", error);
    userProgress = {};
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userProgress));
}

function mergeFunko(funko) {
  const key = getFunkoKey(funko);
  const progress = userProgress[key] || {};

  return {
    ...funko,
    tengo: progress.tengo ?? funko.tengo ?? false,
    caja: progress.caja ?? funko.caja ?? false,
    estado: progress.estado ?? funko.estado ?? "",
    prioridad: progress.prioridad ?? funko.prioridad ?? "",
    notas: progress.notas ?? funko.notas ?? ""
  };
}

function updateSummary() {
  totalCountEl.textContent = allFunkos.length;
  ownedCountEl.textContent = allFunkos.filter(f => mergeFunko(f).tengo).length;
  missingCountEl.textContent = allFunkos.filter(f => !mergeFunko(f).tengo).length;
  boxedCountEl.textContent = allFunkos.filter(f => mergeFunko(f).caja).length;
}

function populateSagaFilter(items) {
  const sagas = [...new Set(
    items
      .map(item => (item?.saga || "").trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));

  sagaFilter.innerHTML = `<option value="all">Todas</option>`;

  sagas.forEach(saga => {
    const option = document.createElement("option");
    option.value = saga;
    option.textContent = saga;
    sagaFilter.appendChild(option);
  });
}

function getFilteredItems() {
  const search = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const box = boxFilter.value;
  const saga = sagaFilter.value;

  return allFunkos
    .map(mergeFunko)
    .filter(item => {
      const nombre = (item.nombre || "").toLowerCase();
      const sagaTexto = (item.saga || "").toLowerCase();
      const numero = String(item.numero || "").toLowerCase();

      const matchesSearch =
        !search ||
        nombre.includes(search) ||
        sagaTexto.includes(search) ||
        numero.includes(search);

      const matchesStatus =
        status === "all" ||
        (status === "owned" && item.tengo) ||
        (status === "missing" && !item.tengo);

      const matchesBox =
        box === "all" ||
        (box === "boxed" && item.caja) ||
        (box === "unboxed" && !item.caja);

      const matchesSaga =
        saga === "all" || (item.saga || "") === saga;

      return matchesSearch && matchesStatus && matchesBox && matchesSaga;
    });
}

function setLink(anchor, url) {
  if (url && String(url).trim()) {
    anchor.href = url;
    anchor.classList.remove("hidden");
  } else {
    anchor.removeAttribute("href");
    anchor.classList.add("hidden");
  }
}

function getFallbackImage() {
  return "data:image/svg+xml;utf8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#6b7280">
        Sin imagen
      </text>
    </svg>
  `);
}

function getImageUrl(url) {
  if (!url || !String(url).trim()) {
    return getFallbackImage();
  }

  const cleanUrl = String(url).trim();

  try {
    const fullUrl = new URL(cleanUrl, REMOTE_BASE_URL).href;
    const lowerUrl = fullUrl.toLowerCase();

    const looksLikeFunkoImage =
      lowerUrl.includes("/dragon-ball/funko-pop/figuras/") ||
      lowerUrl.includes("/dragon-ball/funko-pop/miniaturas/");

    const looksGeneric =
      lowerUrl.includes("listas-completas-de") ||
      lowerUrl.includes("figuras-funko-pop-animation-de-dragon-ball.jpg_1515856084.jpg") ||
      lowerUrl.includes("logo") ||
      lowerUrl.includes("banner") ||
      lowerUrl.includes("cabecera") ||
      lowerUrl.includes("/wp-content/") ||
      lowerUrl.includes("/themes/");

    if (!looksLikeFunkoImage || looksGeneric) {
      return getFallbackImage();
    }

    return fullUrl;
  } catch (error) {
    console.warn("URL de imagen no válida:", cleanUrl, error);
    return getFallbackImage();
  }
}

function render() {
  const items = getFilteredItems();
  updateSummary();

  funkoGrid.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No hay resultados con esos filtros.";
    funkoGrid.appendChild(empty);
    return;
  }

  items.forEach(item => {
    const clone = template.content.cloneNode(true);

    const img = clone.querySelector(".funko-image");
    const name = clone.querySelector(".funko-name");
    const number = clone.querySelector(".funko-number");
    const saga = clone.querySelector(".funko-saga");
    const year = clone.querySelector(".meta-year");
    const print = clone.querySelector(".meta-print");
    const line = clone.querySelector(".meta-line");

    const ownedCheckbox = clone.querySelector(".toggle-owned");
    const boxedCheckbox = clone.querySelector(".toggle-boxed");

    const stateInput = clone.querySelector(".input-state");
    const priorityInput = clone.querySelector(".input-priority");
    const notesInput = clone.querySelector(".input-notes");

    const amazonLink = clone.querySelector(".link-amazon");
    const ebayLink = clone.querySelector(".link-ebay");
    const aliLink = clone.querySelector(".link-aliexpress");

    img.src = getImageUrl(item.imagen);
    img.alt = item.nombre || "Funko";

    img.onerror = () => {
      img.onerror = null;
      img.src = getFallbackImage();
    };

    name.textContent = item.nombre || "Sin nombre";
    number.textContent = item.numero ? `#${item.numero}` : "#-";
    saga.textContent = item.saga || "Sin saga";
    year.textContent = item.anio ? `Año: ${item.anio}` : "";
    print.textContent = item.tiraje ? `Tiraje: ${item.tiraje}` : "";
    line.textContent = item.linea ? `Línea: ${item.linea}` : "";

    ownedCheckbox.checked = !!item.tengo;
    boxedCheckbox.checked = !!item.caja;
    stateInput.value = item.estado || "";
    priorityInput.value = item.prioridad || "";
    notesInput.value = item.notas || "";

    setLink(amazonLink, item.amazon);
    setLink(ebayLink, item.ebay);
    setLink(aliLink, item.aliexpress);

    ownedCheckbox.addEventListener("change", () => {
      const key = getFunkoKey(item);
      userProgress[key] = {
        ...userProgress[key],
        tengo: ownedCheckbox.checked
      };
      saveProgress();
      render();
    });

    boxedCheckbox.addEventListener("change", () => {
      const key = getFunkoKey(item);
      userProgress[key] = {
        ...userProgress[key],
        caja: boxedCheckbox.checked
      };
      saveProgress();
      render();
    });

    stateInput.addEventListener("input", () => {
      const key = getFunkoKey(item);
      userProgress[key] = {
        ...userProgress[key],
        estado: stateInput.value
      };
      saveProgress();
    });

    priorityInput.addEventListener("input", () => {
      const key = getFunkoKey(item);
      userProgress[key] = {
        ...userProgress[key],
        prioridad: priorityInput.value
      };
      saveProgress();
    });

    notesInput.addEventListener("input", () => {
      const key = getFunkoKey(item);
      userProgress[key] = {
        ...userProgress[key],
        notas: notesInput.value
      };
      saveProgress();
    });

    funkoGrid.appendChild(clone);
  });
}

function exportProgress() {
  const merged = allFunkos.map(mergeFunko);
  const blob = new Blob([JSON.stringify(merged, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "mi-coleccion-funkos.json";
  a.click();
}

async function init() {
  try {
    loadProgress();

    const response = await fetch("./data/funkos.json");
    if (!response.ok) {
      throw new Error(`No se pudo cargar data/funkos.json (${response.status})`);
    }

    allFunkos = await response.json();

    if (!Array.isArray(allFunkos)) {
      throw new Error("data/funkos.json no contiene un array válido");
    }

    populateSagaFilter(allFunkos);
    render();
  } catch (error) {
    console.error("Error inicializando la app:", error);
    funkoGrid.innerHTML = `
      <div class="empty">
        Error cargando la app: ${error.message}
      </div>
    `;
  }
}

searchInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);
boxFilter.addEventListener("change", render);
sagaFilter.addEventListener("change", render);
exportBtn.addEventListener("click", exportProgress);

resetBtn.addEventListener("click", () => {
  const ok = confirm("Esto borrará tu progreso guardado en este navegador. ¿Seguro?");
  if (!ok) return;

  localStorage.removeItem(STORAGE_KEY);
  userProgress = {};
  render();
});

init();