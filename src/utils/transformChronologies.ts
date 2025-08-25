type Code = "EX" | "IM";

export function normKey(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[\s\-_()/.,]+/g, " ")
    .trim();
}

const SRC = {
  kodi_r: ["Numri R"],
  tipi_procedures: ["Tipi procedures"],
  lloji_dav: [
    "Lloji DAV",
    "Lloji DAV (data e fatures)",
    "Lloji DAV (data e faturës)",
  ],
  kodi8: ["Kodi 8 shifror"],
  gds_ds3: ["Gds Ds3", "Pershkrimi"],
  palet: ["Tar Sup Qty1 SUM", "Tar Sup Qty1"],
  cmimi_art_monedhe: ["Cmimi artikullit monedhe"],
  shuma_paguar: ["Shuma paguar"],
  pesha_neto: ["Pesha neto kg"],
  vlera_stat: ["Vlera statistikore"],
  vlera_fatures: ["Vlera e Fatures"],
  transp_brendshem_eur: ["transp i brend", "Transp brend ne leke"],
  emri_eksportuesit: ["Emri eksportuesit"],
};

export function buildResolver(rows: Record<string, any>[]) {
  const keys = new Set<string>();
  for (const r of rows) Object.keys(r).forEach((k) => keys.add(k));
  const normToOrig = new Map<string, string>();
  for (const k of keys) normToOrig.set(normKey(k), k);

  return (labels: string[]): string | undefined => {
    for (const l of labels) {
      const hit = normToOrig.get(normKey(l));
      if (hit) return hit;
    }
    for (const l of labels) {
      const nl = normKey(l);
      for (const [nk, orig] of normToOrig.entries()) {
        if (nk.includes(nl) || nl.includes(nk)) return orig;
      }
    }
    return undefined;
  };
}

export function parseRequestedCode(q: string | undefined): Code {
  const s = String(q ?? "")
    .trim()
    .toUpperCase();
  const t = s.replace(/[^A-Z0-9]/g, "");
  if (t === "EX" || t === "EXPORT" || t === "EKSPORT" || t.startsWith("EXP"))
    return "EX";
  if (t === "IM" || t === "IMPORT" || t === "IMPORTI" || t.startsWith("IMP"))
    return "IM";
  return "EX";
}

function detectCodeFromCell(raw: any): Code | null {
  const s = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (!s) return null;
  const t = s.replace(/[^A-Z0-9]/g, "");
  if (t === "EX") return "EX";
  if (t === "IM") return "IM";
  if (t === "EXPORT" || t === "EKSPORT" || t.startsWith("EXP")) return "EX";
  if (t === "IMPORT" || t === "IMPORTI" || t.startsWith("IMP")) return "IM";
  return null;
}

const ORDER_IMPORT = [
  "Kodi R",
  "Tipi procedures",
  "Lloji DAV (data e fatures)",
  "kodi 4 shifror",
  "pershkrim",
  "Palet",
  "Cmimi artikullit monedhe",
  "Shuma paguar",
  "Pesha neto kg",
  "Vlera statistikore",
  "Vlera e Fatures",
  "transp i brendshem (EUR)",
];

const ORDER_EXPORT = [
  ...ORDER_IMPORT,
  "Emri eksportuesit",
  "Vlere poliuretan",
  "Vlera e mallit (calculated)",
];

export function transformByCode(
  rows: Record<string, any>[],
  requested: Code,
  vlerePoliuretan?: string
) {
  if (!rows?.length) return [];

  const resolve = buildResolver(rows);
  const col = {
    kodi_r: resolve(SRC.kodi_r),
    tipi_procedures: resolve(SRC.tipi_procedures),
    lloji_dav: resolve(SRC.lloji_dav),
    kodi8: resolve(SRC.kodi8),
    gds_ds3: resolve(SRC.gds_ds3),
    palet: resolve(SRC.palet),
    cmimi: resolve(SRC.cmimi_art_monedhe),
    shuma: resolve(SRC.shuma_paguar),
    pesha_neto: resolve(SRC.pesha_neto),
    vlera_stat: resolve(SRC.vlera_stat),
    vlera_fatures: resolve(SRC.vlera_fatures),
    transp_eur: resolve(SRC.transp_brendshem_eur),
    emri_eksportuesit: resolve(SRC.emri_eksportuesit),
  };

  const get = (r: Record<string, any>, k?: string) => (k ? r[k] ?? "" : "");

  const out: Record<string, any>[] = [];

  for (const r of rows) {
    const davCode = detectCodeFromCell(get(r, col.lloji_dav));
    if (!davCode || davCode !== requested) continue;

    const kodi8raw = String(get(r, col.kodi8) ?? "").replace(/\D/g, "");

    const base: Record<string, any> = {
      "Kodi R": get(r, col.kodi_r),
      "Tipi procedures": get(r, col.tipi_procedures),
      "Lloji DAV (data e fatures)": get(r, col.lloji_dav),
      "kodi 4 shifror": kodi8raw.slice(0, 4),
      pershkrim: get(r, col.gds_ds3),
      Palet: get(r, col.palet),
      "Cmimi artikullit monedhe": get(r, col.cmimi),
      "Shuma paguar": get(r, col.shuma),
      "Pesha neto kg": get(r, col.pesha_neto),
      "Vlera statistikore": get(r, col.vlera_stat),
      "Vlera e Fatures": get(r, col.vlera_fatures),
      "transp i brendshem (EUR)": get(r, col.transp_eur),
    };

    if (requested === "EX") {
      base["Emri eksportuesit"] = get(r, col.emri_eksportuesit);
      base["Vlere poliuretan"] = vlerePoliuretan ?? "";
      base["Vlera e mallit (calculated)"] = "";
    }

    out.push(base);
  }

  const ORDER = requested === "EX" ? ORDER_EXPORT : ORDER_IMPORT;
  return out.map((row) => {
    const o: Record<string, any> = {};
    for (const k of ORDER) o[k] = row[k] ?? "";
    return o;
  });
}
