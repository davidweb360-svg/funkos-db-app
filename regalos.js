const REMOTE_BASE_URL = "https://www.listacompletade.com";

let allFunkos = [];

const missingCountEl = document.getElementById("missingCount");
const searchInput = document.getElementById("searchInput");
const sagaFilter = document.getElementById("sagaFilter");
const funkoGrid = document.getElementById("funkoGrid");
const template = document.getElementById("giftCardTemplate");

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
    return fullUrl;
  } catch (error) {
    return getFallbackImage();
  }
}

function populateSagaFilter(items) {
  const sagas = [...new Set(
    items.map(item => (item?.saga || "").trim()).filter(Boolean)
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
  const saga = sagaFilter.value;

  return allFunkos.filter(item => {
    const nombre = (item.nombre || "").toLowerCase();
    const sagaTexto = (item.saga || "").toLowerCase();
    const numero = String(item.numero || "").toLowerCase();
    const tengo = !!item.tengo;

    if (tengo) return false;

    const matchesSearch =
      !search ||
      nombre.includes(search) ||
      sagaTexto.includes(search) ||
      numero.includes(search);

    const matchesSaga =
      saga === "all" || (item.saga || "") === saga;

    return matchesSearch && matchesSaga;
  });
}

function render() {
  const items = getFilteredItems();
  missingCountEl.textContent = items.length;

  funkoGrid.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Ahora mismo no hay resultados con esos filtros.";
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

    setLink(amazonLink, item.amazon);
    setLink(ebayLink, item.ebay);
    setLink(aliLink, item.aliexpress);

    funkoGrid.appendChild(clone);
  });
}

async function init() {
  try {
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
    console.error("Error inicializando regalos:", error);
    funkoGrid.innerHTML = `
      <div class="empty">
        Error cargando la página: ${error.message}
      </div>
    `;
  }
}

searchInput.addEventListener("input", render);
sagaFilter.addEventListener("change", render);

init();