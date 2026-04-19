import json
import re
import time
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.listacompletade.com/dragon-ball/figuras/funko-pop/lista-completa/"
HEADERS = {
    "User-Agent": "Mozilla/5.0"
}


def clean_text(text):
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def get_page_url(page):
    if page == 1:
        return BASE_URL
    return f"{BASE_URL}index.html?page={page}&reloaded="


def get_page(page):
    url = get_page_url(page)
    print(f"Leyendo página {page}: {url}")
    response = requests.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    return response.text


def extract_links_from_block(block_html):
    soup = BeautifulSoup(block_html, "html.parser")
    links = {
        "amazon": "",
        "ebay": "",
        "aliexpress": ""
    }

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        href_l = href.lower()

        if not links["amazon"] and ("amzn.to" in href_l or "amazon." in href_l):
            links["amazon"] = href
        elif not links["ebay"] and "ebay" in href_l:
            links["ebay"] = href
        elif not links["aliexpress"] and "aliexpress" in href_l:
            links["aliexpress"] = href

    return links


def extract_image_from_block(block_html):
    soup = BeautifulSoup(block_html, "html.parser")
    img = soup.find("img")
    if not img:
        return ""

    src = (img.get("src") or img.get("data-src") or "").strip()
    if src.startswith("/"):
        return urljoin(BASE_URL, src)
    return src


def parse_text_block(block_html):
    soup = BeautifulSoup(block_html, "html.parser")
    text = soup.get_text("\n")
    lines = [clean_text(x) for x in text.split("\n") if clean_text(x)]

    if not lines:
        return None

    # El título suele ser la primera línea útil del bloque
    nombre = lines[0]

    # Filtramos basura evidente
    if nombre.lower() in {"comprar:", "año:", "tiraje:", "saga:", "numero:", "línea:", "linea:"}:
        return None

    anio = ""
    tiraje = ""
    linea = ""
    saga = ""
    numero = ""

    i = 0
    while i < len(lines):
        label = lines[i].lower().replace(":", "")

        if label == "año" and i + 1 < len(lines):
            anio = lines[i + 1]

        elif label == "tiraje" and i + 1 < len(lines):
            tiraje = lines[i + 1]

        elif label in ("línea", "linea") and i + 1 < len(lines):
            linea = lines[i + 1]

        elif label == "saga":
            saga_parts = []
            j = i + 1
            while j < len(lines):
                candidate = lines[j].lower().replace(":", "")
                if candidate in {"año", "tiraje", "línea", "linea", "saga", "numero", "comprar"}:
                    break
                saga_parts.append(lines[j])
                j += 1
            saga = " - ".join(saga_parts)

        elif label == "numero" and i + 1 < len(lines):
            numero = lines[i + 1]

        i += 1

    # Solo aceptamos bloques que realmente parezcan fichas
    if not nombre or not anio or not tiraje or not saga or not numero:
        return None

    links = extract_links_from_block(block_html)
    imagen = extract_image_from_block(block_html)

    safe_name = re.sub(r"[^a-z0-9]+", "-", nombre.lower()).strip("-")

    return {
        "id": f"funko-{numero}-{safe_name}",
        "numero": numero,
        "nombre": nombre,
        "saga": saga,
        "anio": anio,
        "tiraje": tiraje,
        "linea": linea,
        "imagen": imagen,
        "amazon": links["amazon"],
        "ebay": links["ebay"],
        "aliexpress": links["aliexpress"],

        "tengo": False,
        "caja": False,
        "estado": "",
        "prioridad": "",
        "notas": ""
    }


def parse_page(html):
    # Partimos por cada <h4 ...>...</h4>
    parts = re.split(r"(?i)<h4[^>]*>", html)

    # La primera parte es cabecera de página, la ignoramos
    blocks = parts[1:]

    items = []
    seen = set()

    for block in blocks:
        item = parse_text_block(block)
        if not item:
            continue

        key = (
            item["numero"],
            item["nombre"],
            item["linea"],
            item["tiraje"],
            item["saga"]
        )

        if key not in seen:
            seen.add(key)
            items.append(item)

    return items


def main():
    all_items = []
    global_seen = set()

    for page in range(1, 40):
        html = get_page(page)
        items = parse_page(html)

        if not items:
            print(f"No se encontraron items en página {page}. Parando.")
            break

        new_count = 0
        for item in items:
            key = (
                item["numero"],
                item["nombre"],
                item["linea"],
                item["tiraje"],
                item["saga"]
            )
            if key not in global_seen:
                global_seen.add(key)
                all_items.append(item)
                new_count += 1

        print(f"Página {page}: {new_count} nuevos / total {len(all_items)}")
        time.sleep(1)

    with open("data/funkos.json", "w", encoding="utf-8") as f:
        json.dump(all_items, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Guardados {len(all_items)} funkos en data/funkos.json")


if __name__ == "__main__":
    main()