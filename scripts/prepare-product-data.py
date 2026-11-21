"""Depura los cuatro CSV fuera de PostgreSQL y genera una carga revisable."""
import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

FILES = {
    "defects": "defect_catalog rp nuevo.csv",
    "productDefects": "defectos productos pr nuevo.csv",
    "products": "productos rp nuevo.csv",
    "varieties": "variedad productos rp nuevo.csv",
}
# Solo correcciones de escritura. No se inventan límites ni unidades.
WORDS = {"BROCOLI": "BRÓCOLI", "LIMON": "LIMÓN", "FRANCES": "FRANCÉS", "HIERVA BUENA": "HIERBABUENA"}
EXCLUDED_PRODUCTS = {"APIO"}
QUALITY_OBSERVATIONS = {
    16: "Confirmar operadores y unidad del intervalo > 1/8 > 1/4.",
    22: "Confirmar si significa diámetro menor de 25 o mayor de 35 mm.",
    24: "Indicar unidad del diámetro < 30.",
    25: "Indicar unidad del diámetro > 50.",
    28: "Confirmar si significa diámetro menor de 4 o mayor de 8 mm.",
    38: "Indicar unidad del largo < 30.",
    40: "Indicar unidad del largo > 50.",
    41: "Confirmar si largo > 7 lleva pulgadas y equivale al defecto 78.",
    42: "Confirmar si significa longitud menor de 35 o mayor de 45 mm.",
    71: "Confirmar el significado de sobremaduras > 12 mm en arveja.",
    32: "Confirmar si golpe de sol y quemadura de sol son criterios diferentes; ambos están en los mismos aguacates.",
    67: "Revisar junto con golpe de sol (defecto 32).",
}


def display(value):
    return " ".join(unicodedata.normalize("NFC", value).strip().upper().split())


def key(value):
    value = re.sub(r"\s*([<>]=?)\s*", r" \1 ", display(value))
    value = re.sub(r"(\d)\s*(MM|CM|CMS|LBS)\b", r"\1 \2", value)
    value = " ".join(re.sub(r"\s*/\s*", " / ", value).split())
    decomposed = unicodedata.normalize("NFD", value).replace("N\u0303", "Ñ")
    return "".join(c for c in decomposed if not unicodedata.combining(c))


def boolean(value):
    if value not in ("true", "false"):
        raise ValueError(f"Booleano inválido: {value!r}")
    return value == "true"


def percentage(value, positive=False):
    number = float(value)
    if not (0 < number <= 100 if positive else 0 <= number <= 100):
        raise ValueError(f"Porcentaje inválido: {value!r}")
    return int(number) if number.is_integer() else number


def load_csv(directory, name):
    with (directory / name).open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    ids = [int(row["id"]) for row in rows]
    if any(id_ <= 0 for id_ in ids) or len(ids) != len(set(ids)):
        raise ValueError(f"IDs inválidos o repetidos en {name}")
    return sorted(rows, key=lambda row: int(row["id"]))


def prepare(directory, output):
    source = {kind: load_csv(directory, filename) for kind, filename in FILES.items()}
    clean = {"varieties": [], "products": [], "defects": [], "productDefects": []}
    maps = {kind: {} for kind in clean}
    changes = []
    excluded_product_ids = {int(row["id"]) for row in source["products"] if key(row["name"]) in EXCLUDED_PRODUCTS}
    retained_variety_ids = {int(row["variety_product_id"]) for row in source["products"] if int(row["id"]) not in excluded_product_ids}
    excluded_variety_ids = {int(row["variety_product_id"]) for row in source["products"] if int(row["id"]) in excluded_product_ids} - retained_variety_ids
    exclusions = []
    for kind in ("varieties", "defects"):
        unique = {}
        for row in source[kind]:
            old_id, original = int(row["id"]), row["name"]
            if kind == "varieties" and old_id in excluded_variety_ids:
                exclusions.append({"entity": kind, "sourceId": old_id, "reason": "Variedad exclusiva de APIO, excluido por solicitud"})
                continue
            name = original if kind == "defects" else display(original)
            if kind == "varieties":
                for wrong, right in WORDS.items():
                    name = re.sub(r"\b" + re.escape(wrong) + r"\b", right, name)
            normalized = key(name)
            if not normalized:
                raise ValueError(f"Nombre vacío: {kind} {old_id}")
            if normalized not in unique:
                unique[normalized] = {"id": len(unique) + 1, "name": name, "activo": boolean(row["activo"])}
            else:
                unique[normalized]["activo"] |= boolean(row["activo"])
            maps[kind][old_id] = unique[normalized]["id"]
            if name != original:
                changes.append({"entity": kind, "sourceId": old_id, "before": original, "after": name})
        clean[kind] = list(unique.values())

    unique_products = {}
    for row in source["products"]:
        if int(row["id"]) in excluded_product_ids:
            exclusions.append({"entity": "products", "sourceId": int(row["id"]), "reason": "APIO excluido por solicitud"})
            continue
        name = display(row["name"])
        for wrong, right in WORDS.items():
            name = re.sub(r"\b" + re.escape(wrong) + r"\b", right, name)
        variety_id = maps["varieties"][int(row["variety_product_id"])]
        identity = (key(name), variety_id)
        record = {"id": len(unique_products) + 1, "name": name, "varietyProductId": variety_id,
                  "acceptedPercentage": percentage(row["accepted_percentage"], True),
                  "evaluatePests": boolean(row["evaluate_pests"]), "activo": boolean(row["activo"])}
        if identity in unique_products:
            existing = unique_products[identity]
            if any(existing[field] != record[field] for field in ("acceptedPercentage", "evaluatePests")):
                raise ValueError(f"Configuración incompatible del producto repetido: {name}")
            existing["activo"] |= record["activo"]
            record = existing
        else:
            unique_products[identity] = record
        maps["products"][int(row["id"])] = record["id"]
        if name != row["name"]:
            changes.append({"entity": "products", "sourceId": int(row["id"]), "before": row["name"], "after": name})
    clean["products"] = list(unique_products.values())

    unique_links = {}
    for row in source["productDefects"]:
        if int(row["product_id"]) in excluded_product_ids:
            exclusions.append({"entity": "productDefects", "sourceId": int(row["id"]), "reason": "Asociación de APIO excluido por solicitud"})
            continue
        old_catalog_id = int(row["defect_catalog_id"])
        product_id = maps["products"][int(row["product_id"])]
        defect_id = maps["defects"][old_catalog_id]
        identity = product_id, defect_id
        tolerance = percentage(row["tolerance_percentage"])
        if identity in unique_links:
            record = unique_links[identity]
            if record["tolerancePercentage"] != tolerance:
                raise ValueError(f"Tolerancias incompatibles: producto {product_id}, defecto {defect_id}")
            record["activo"] |= boolean(row["activo"])
        else:
            record = {"id": len(unique_links) + 1, "productId": product_id, "defectCatalogId": defect_id,
                      "tolerancePercentage": tolerance, "activo": boolean(row["activo"])}
            unique_links[identity] = record
        maps["productDefects"][int(row["id"])] = record["id"]
    clean["productDefects"] = list(unique_links.values())
    observations = [{"sourceId": int(row["id"]), "id": maps["defects"][int(row["id"])], "name": row["name"], "observation": QUALITY_OBSERVATIONS[int(row["id"])],
                "products": "; ".join(sorted({next(p["name"] for p in source["products"] if p["id"] == link["product_id"])
                              for link in source["productDefects"] if link["defect_catalog_id"] == row["id"] and int(link["product_id"]) not in excluded_product_ids}))}
               for row in source["defects"] if int(row["id"]) in QUALITY_OBSERVATIONS]
    dataset = {"version": 1, **clean}
    output.mkdir(parents=True, exist_ok=True)
    (output / "products.json").write_text(json.dumps(dataset, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    exports = {**clean, "quality_review": observations, "corrections": changes, "exclusions": exclusions,
               "id_map": [{"entity": kind, "sourceId": old, "id": new} for kind, mapping in maps.items() for old, new in mapping.items()]}
    for kind, rows in exports.items():
        with (output / f"{kind}.csv").open("w", encoding="utf-8-sig", newline="") as stream:
            if rows:
                writer = csv.DictWriter(stream, fieldnames=rows[0].keys())
                writer.writeheader()
                writer.writerows(rows)
    report = ["REPORTE FINAL DE PREPARACIÓN DE PRODUCTOS", "",
              "Preparación fuera de la base de datos. Este reporte no confirma una ejecución en producción.",
              "APIO queda fuera de la carga: productos, asociaciones y su variedad exclusiva.",
              "Se conservaron los porcentajes de tolerancia de los demás productos.", "", "CANTIDADES: ORIGEN -> CARGA"]
    report.extend(f"{kind}: {len(source[kind])} -> {len(rows)}" for kind, rows in clean.items())
    report.extend(["", "OBSERVACIONES PARA EL DEPARTAMENTO DE CALIDAD",
                   "El responsable confirmó que estos nombres coinciden con la base anterior.",
                   "Se conservan exactamente como la fuente. Su revisión posterior no bloquea la carga.", ""])
    for row in observations:
        report.extend([f"ID original {row['sourceId']} / ID nuevo {row['id']}: {row['name']}",
                       f"Productos: {row['products']}", f"Revisar: {row['observation']}", ""])
    (output / "REPORTE_FINAL.txt").write_text("\n".join(report), encoding="utf-8")
    print(json.dumps({"source": {kind: len(rows) for kind, rows in source.items()},
                      "clean": {kind: len(rows) for kind, rows in clean.items()}, "qualityObservations": len(observations)}, ensure_ascii=False))
    return dataset


if __name__ == "__main__":
    csv_directory = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Downloads"
    prepare(csv_directory, Path(__file__).resolve().parents[1] / "data" / "products")
