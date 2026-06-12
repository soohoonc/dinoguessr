import { readFile, writeFile } from "node:fs/promises";

const DATA_FILE = new URL("../public/data/dinosaurs.json", import.meta.url);
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 3600;
const USER_AGENT = "dinoguessr-popularity-builder/1.0";
const CURATED_POPULARITY = [
  "Tyrannosaurus",
  "Velociraptor",
  "Triceratops",
  "Stegosaurus",
  "Spinosaurus",
  "Brachiosaurus",
  "Ankylosaurus",
  "Allosaurus",
  "Diplodocus",
  "Apatosaurus",
  "Brontosaurus",
  "Parasaurolophus",
  "Iguanodon",
  "Pachycephalosaurus",
  "Carnotaurus",
  "Dilophosaurus",
  "Deinonychus",
  "Gallimimus",
  "Compsognathus",
  "Pteranodon",
  "Therizinosaurus",
  "Giganotosaurus",
  "Carcharodontosaurus",
  "Argentinosaurus",
  "Utahraptor",
  "Edmontosaurus",
  "Corythosaurus",
  "Hadrosaurus",
  "Plesiosaurus",
  "Mosasaurus",
  "Archaeopteryx",
  "Maiasaura",
  "Plateosaurus",
  "Coelophysis",
  "Baryonyx",
  "Suchomimus",
  "Ceratosaurus",
  "Albertosaurus",
  "Daspletosaurus",
  "Tarbosaurus",
  "Yutyrannus",
  "Oviraptor",
  "Citipati",
  "Microraptor",
  "Protoceratops",
  "Styracosaurus",
  "Centrosaurus",
  "Chasmosaurus",
  "Torosaurus",
  "Pachyrhinosaurus",
  "Saurolophus",
  "Lambeosaurus",
  "Ouranosaurus",
  "Mamenchisaurus",
  "Camarasaurus",
  "Amargasaurus",
  "Dreadnoughtus",
  "Patagotitan",
  "Acrocanthosaurus",
  "Cryolophosaurus",
  "Monolophosaurus",
  "Concavenator",
  "Eoraptor",
  "Herrerasaurus",
  "Ornithomimus",
  "Struthiomimus",
  "Pelecanimimus",
  "Troodon",
  "Dracorex",
  "Hypsilophodon",
  "Dryosaurus",
  "Kentrosaurus",
  "Polacanthus",
  "Nodosaurus",
  "Minmi",
  "Sauropelta",
  "Euoplocephalus",
  "Shantungosaurus",
  "Tenontosaurus",
  "Megalosaurus",
  "Mapusaurus",
  "Rugops",
  "Majungasaurus",
  "Masiakasaurus",
  "Nigersaurus",
  "Psittacosaurus",
  "Leaellynasaura",
  "Muttaburrasaurus",
  "Australovenator",
  "Qianzhousaurus",
  "Sinoceratops",
  "Kosmoceratops",
  "Diabloceratops",
  "Nasutoceratops",
  "Regaliceratops"
];

const curatedRank = new Map(
  CURATED_POPULARITY.map((name, index) => [normalizeKey(name), index + 1])
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeKey(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function articleKey(value) {
  return String(value).trim().replace(/\s+/g, "_").toLowerCase();
}

function curatedBonus(record) {
  const rank = curatedRank.get(normalizeKey(record.name));
  return rank ? 1_000_000 - rank * 5_000 : 0;
}

function titleFor(record) {
  return record.source?.wikipediaTitle || record.name;
}

async function fetchBatch(records) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "pageviews",
    redirects: "1",
    titles: records.map(titleFor).join("|")
  });
  const url = `https://en.wikipedia.org/w/api.php?${params}`;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15000)
    });

    if (response.status === 429) {
      if (attempt === 5) throw new Error("Wikimedia rate limit");
      await sleep(10000 * attempt);
      continue;
    }

    if (!response.ok) {
      if (attempt === 5) throw new Error(`HTTP ${response.status}`);
      await sleep(1000 * attempt);
      continue;
    }

    const payload = await response.json();
    const redirects = new Map(
      (payload.query?.redirects ?? []).map((redirect) => [
        articleKey(redirect.from),
        articleKey(redirect.to)
      ])
    );
    const pageviews = new Map();

    for (const page of Object.values(payload.query?.pages ?? {})) {
      const key = articleKey(page.title);
      const views = Object.values(page.pageviews ?? {}).reduce(
        (sum, value) => sum + Number(value || 0),
        0
      );
      pageviews.set(key, views);
    }

    return new Map(
      records.map((record) => {
        const originalKey = articleKey(titleFor(record));
        const redirectedKey = redirects.get(originalKey) ?? originalKey;
        return [record.id, pageviews.get(redirectedKey) ?? 0];
      })
    );
  }
}

function tierForRank(rank, total) {
  const easyLimit = Math.ceil(total * 0.16);
  const mediumLimit = Math.ceil(total * 0.5);

  if (rank <= easyLimit) return "easy";
  if (rank <= mediumLimit) return "medium";
  return "hard";
}

async function main() {
  const payload = JSON.parse(await readFile(DATA_FILE, "utf8"));
  const dinosaurs = Array.isArray(payload.dinosaurs) ? payload.dinosaurs : [];
  const pageviewsById = new Map();
  let source = "English Wikipedia recent pageviews + curated fallback";
  let rateLimited = false;

  process.stdout.write(`Ranking ${dinosaurs.length} dinosaurs\n`);

  for (let index = 0; index < dinosaurs.length; index += BATCH_SIZE) {
    const batch = dinosaurs.slice(index, index + BATCH_SIZE);

    if (!rateLimited) {
      try {
        const batchPageviews = await fetchBatch(batch);
        for (const [id, views] of batchPageviews) {
          pageviewsById.set(id, views);
        }
      } catch (error) {
        rateLimited = true;
        source = "English Wikipedia recent pageviews where available + curated fallback";
        process.stdout.write(`${error.message}; using curated fallback\n`);
      }
    }

    process.stdout.write(
      `Ranked source batch ${Math.min(index + BATCH_SIZE, dinosaurs.length)}/${dinosaurs.length}\n`
    );

    if (!rateLimited) await sleep(BATCH_DELAY_MS);
  }

  const ranked = dinosaurs
    .map((record) => {
      const pageviews = pageviewsById.get(record.id) ?? 0;
      return {
        id: record.id,
        name: record.name,
        pageviews,
        score: pageviews + curatedBonus(record),
        sourceTitle: titleFor(record)
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.pageviews - left.pageviews ||
        left.name.localeCompare(right.name)
    );

  const rankById = new Map(
    ranked.map((record, index) => [
      record.id,
      {
        rank: index + 1,
        pageviews: record.pageviews,
        score: record.score,
        tier: tierForRank(index + 1, ranked.length),
        sourceTitle: record.sourceTitle
      }
    ])
  );

  payload.meta = {
    ...payload.meta,
    popularityGeneratedAt: new Date().toISOString(),
    popularitySource: source,
    popularityTiers:
      "Easy is the top 16% by popularity score, Medium is the next 34%, Hard is the rest."
  };
  payload.dinosaurs = dinosaurs.map((record) => ({
    ...record,
    facts: Array.isArray(record.facts)
      ? record.facts.filter(
          (fact) => !String(fact).toLowerCase().startsWith("locomotion")
        )
      : [],
    popularity: rankById.get(record.id)
  }));

  await writeFile(DATA_FILE, `${JSON.stringify(payload)}\n`, "utf8");
  process.stdout.write(`Wrote popularity ranks to ${DATA_FILE.pathname}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
