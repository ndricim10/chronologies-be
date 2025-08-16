type Mode = "IMPORT" | "EXPORT";

const pick = (row: Record<string, any>, candidates: string[]) => {
  const map: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) map[k.trim().toLowerCase()] = v;
  for (const c of candidates) {
    const key = c.trim().toLowerCase();
    if (map[key] !== undefined) return map[key];
    const hit = Object.keys(map).find(
      (k) => k.includes(key) || key.includes(k)
    );
    if (hit) return map[hit];
  }
  return "";
};

export function transformRows(
  rows: Record<string, any>[],
  mode: Mode,
  vlerePoliuretan?: string
) {
  const orderImport = [
    "Kodi R",
    "Tipi i procedures (numri i fatures)",
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
  const orderExport = [
    ...orderImport,
    "Emri eksportuesit",
    "Vlere poliuretan",
    "Vlera e mallit (calculated)",
  ];

  const out = rows.map((r) => {
    const kodi8 = String(
      pick(r, ["kodi 8 shifror", "kodi 8", "8-shifror kodi"])
    ).replace(/\D/g, "");
    const base: Record<string, any> = {
      "Kodi R": pick(r, ["kodi r", "kodi_r"]),
      "Tipi i procedures (numri i fatures)": pick(r, ["tipi i procedures"]),
      "Lloji DAV (data e fatures)": pick(r, ["lloji dav", "data e fatures"]),
      "kodi 4 shifror": kodi8.slice(0, 4),
      pershkrim: pick(r, ["gds"]), // NOTE: original "pershkrim" is dropped
      Palet: pick(r, ["tar sup qty1 sum", "tar sup qty1", "qty1"]),
      "Cmimi artikullit monedhe": pick(r, [
        "cmimi artikullit monedhe",
        "cmimi artikullit",
      ]),
      "Shuma paguar": pick(r, ["shuma paguar", "shuma e paguar"]),
      "Pesha neto kg": pick(r, ["pesha neto kg", "pesha neto"]),
      "Vlera statistikore": pick(r, ["vlera statistikore", "vlera statistike"]),
      "Vlera e Fatures": pick(r, ["vlera e fatures", "vlera fature"]),
      "transp i brendshem (EUR)": pick(r, [
        "transp i brendshem (eur)",
        "transport i brendshem (eur)",
        "transp i brendshem",
      ]),
    };

    if (mode === "EXPORT") {
      base["Emri eksportuesit"] = pick(r, [
        "emri eksportuesit",
        "emri i eksportuesit",
      ]);
      base["Vlere poliuretan"] = vlerePoliuretan ?? "";
      base["Vlera e mallit (calculated)"] = "";
    }
    return base;
  });

  const order = mode === "EXPORT" ? orderExport : orderImport;
  return out.map((row) => {
    const o: Record<string, any> = {};
    for (const k of order) o[k] = row[k] ?? "";
    return o;
  });
}
