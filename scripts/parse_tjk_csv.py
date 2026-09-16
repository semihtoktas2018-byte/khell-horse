#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TJK günlük yarış programı CSV -> data/latest.json dönüştürücü.

CSV noktalı virgülle ayrılmış, Türkçe karakter içerir.
Koşmaz olarak işaretli atlar dahil edilmez.
Oranlar akşam belli olduğu için şimdilik sabit (10) atanır.
"""

import csv
import glob
import json
import os
import re
import sys
from datetime import datetime

# Ata eklenen ekipman/işaret kodları (isimden temizlenir)
SUFFIX_CODES = {"KG", "K", "DB", "SK", "SKG", "SGKR", "GKR", "ÖG"}

TRACK = "Elazığ"
DATE = "2026-09-16"
UPDATED = "2026-09-16T22:14:00"


def find_csv():
    """Yükleme klasörlerinde ismi 'Elaz' içeren .csv dosyasını bulur."""
    search_dirs = [
        "/mnt/user-data/uploads",
        "/root/.claude/uploads",
        os.path.expanduser("~/.claude/uploads"),
    ]
    for base in search_dirs:
        if not os.path.isdir(base):
            continue
        for path in glob.glob(os.path.join(base, "**", "*.csv"), recursive=True):
            fname = os.path.basename(path)
            if "Elaz" in fname or "elaz" in fname.lower():
                return path
    # Son çare: komut satırı argümanı
    if len(sys.argv) > 1 and os.path.isfile(sys.argv[1]):
        return sys.argv[1]
    return None


def read_lines(path):
    for enc in ("utf-8-sig", "utf-8", "cp1254", "latin-5"):
        try:
            with open(path, "r", encoding=enc) as f:
                return f.read().splitlines()
        except UnicodeDecodeError:
            continue
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read().splitlines()


def first_number(text, cast=float):
    if text is None:
        return None
    t = text.replace(",", ".")
    m = re.search(r"-?\d+(?:\.\d+)?", t)
    return cast(m.group()) if m else None


def as_number(value):
    """Tam sayıysa int, değilse float döndürür."""
    if value is None:
        return None
    if float(value).is_integer():
        return int(value)
    return float(value)


def clean_name(raw):
    name = raw.strip()
    # (Koşmaz) vb. parantezli notları at
    name = re.sub(r"\(.*?\)", "", name).strip()
    tokens = name.split()
    # Sondaki ekipman/işaret kodlarını temizle
    while tokens and tokens[-1] in SUFFIX_CODES:
        tokens.pop()
    return " ".join(tokens)


def parse_last_runs(text):
    """K5K9Ç3 -> [5, 9, 3]. Harfi at, sayıyı al. Tireleri yok say."""
    if not text:
        return []
    runs = []
    for m in re.finditer(r"[A-Za-zÇçİıŞşĞğÜüÖö](\d)", text):
        runs.append(int(m.group(1)))
    return runs


def parse_surface(header_fields):
    joined = " ".join(header_fields).lower()
    if "sentetik" in joined:
        return "sentetik"
    if "çim" in joined or "cim" in joined:
        return "çim"
    if "kum" in joined:
        return "kum"
    return "kum"


def parse_distance(header_fields):
    for field in header_fields:
        m = re.search(r"(\d{3,5})\s*m\b", field)
        if m:
            return int(m.group(1))
    return 1400


def parse_time(first_field):
    m = re.search(r"(\d{1,2})[.:](\d{2})", first_field)
    if m:
        return f"{int(m.group(1)):02d}:{m.group(2)}"
    return ""


def is_race_header(fields):
    return bool(re.match(r"^\s*\d+\.\s*Kosu\s*:", fields[0]))


def is_horse_header(fields):
    return fields[0].strip() == "At No"


def is_horse_row(fields):
    return len(fields) >= 13 and re.fullmatch(r"\d+", fields[0].strip()) is not None


def main():
    csv_path = find_csv()
    if not csv_path:
        print("HATA: Elazığ CSV dosyası bulunamadı.", file=sys.stderr)
        sys.exit(1)
    print(f"CSV bulundu: {csv_path}")

    lines = read_lines(csv_path)
    rows = list(csv.reader(lines, delimiter=";"))

    races = []
    current = None

    for fields in rows:
        if not fields or all(c.strip() == "" for c in fields):
            continue

        if is_race_header(fields):
            if current is not None:
                races.append(current)
            m = re.match(r"^\s*(\d+)\.", fields[0])
            num = int(m.group(1)) if m else len(races) + 1
            current = {
                "raceName": f"{num}. Koşu",
                "time": parse_time(fields[0]),
                "track": TRACK,
                "surface": parse_surface(fields),
                "distance": parse_distance(fields),
                "type": fields[1].strip() if len(fields) > 1 else "",
                "horses": [],
            }
            continue

        if current is None:
            continue

        if is_horse_header(fields):
            continue

        if is_horse_row(fields):
            raw_name = fields[1].strip()
            # Koşmaz atları dahil etme
            if "Koşmaz" in raw_name or "Kosmaz" in raw_name:
                continue

            number = int(fields[0].strip())
            age = as_number(first_number(fields[2], float))
            weight = as_number(first_number(fields[5], float))
            jockey = fields[6].strip() if len(fields) > 6 else ""
            agf = as_number(first_number(fields[10], float)) if len(fields) > 10 else None
            last_runs = parse_last_runs(fields[12]) if len(fields) > 12 else []

            distance = current["distance"]
            surface = current["surface"]

            horse = {
                "number": number,
                "name": clean_name(raw_name),
                "jockey": jockey,
                "weight": weight if weight is not None else 55,
                "age": age if age is not None else 0,
                "lastRuns": last_runs,
                "surface": surface,
                "preferredSurface": surface,
                "distance": distance,
                "preferredDistanceMin": distance - 200,
                "preferredDistanceMax": distance + 200,
                "odds": 10,
                "agf": agf if agf is not None else 0,
                "isFavorite": False,
                "jockeyWinRate": 15,
                "trainerWinRate": 12,
            }
            current["horses"].append(horse)

    if current is not None:
        races.append(current)

    output = {
        "_meta": {
            "date": DATE,
            "track": TRACK,
            "updated": UPDATED,
            "source": "TJK CSV",
            "note": "Günlük yarış verisi.",
        },
        "races": races,
    }

    out_path = os.path.join(os.path.dirname(__file__), "..", "data", "latest.json")
    out_path = os.path.abspath(out_path)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    total_horses = sum(len(r["horses"]) for r in races)
    print(f"{len(races)} koşu, {total_horses} at yazıldı -> {out_path}")


if __name__ == "__main__":
    main()
