import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = "https://restasaurus.onrender.com/api/v1/dinosaurs";
const GALLERY_URL = "https://dinosaurpictures.org/";
const OUTPUT_FILE = new URL("../public/data/dinosaurs.json", import.meta.url);
const MIN_RECORDS = 1000;
const PAGE_LIMIT = 24;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function compact(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function firstSentence(text) {
  const clean = compact(text)
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([,.;:])/g, "$1");
  const match = clean.match(/^(.+?[.!?])\s+[A-Z0-9"']/);
  return match ? match[1] : clean.slice(0, 260);
}

function valuesFrom(items, key = "value") {
  return Array.isArray(items)
    ? items.map((item) => compact(item?.[key])).filter(Boolean)
    : [];
}

function normalizeNameKey(value) {
  return compact(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function pageUrlForGalleryName(name) {
  return `https://dinosaurpictures.org/${encodeURIComponent(name).replaceAll("%20", "-")}-pictures`;
}

function extractGalleryData(html) {
  const match = html.match(
    /var galleryData = (\[[\s\S]*?\]);\s*\n\s*if \(galleryData/
  );
  if (!match) {
    throw new Error("Could not find DinosaurPictures gallery data.");
  }

  return JSON.parse(match[1]);
}

async function fetchGalleryImages() {
  const response = await fetch(GALLERY_URL, {
    headers: {
      "User-Agent": "dinoguessr-data-builder/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch gallery data: ${response.status}`);
  }

  const html = await response.text();
  const galleryItems = extractGalleryData(html);
  const images = new Map();

  for (const item of galleryItems) {
    if (item?.creatureType !== "dinosaur" || !item.s3Url || !item.name) {
      continue;
    }

    images.set(normalizeNameKey(item.name), {
      name: compact(item.name),
      url: compact(item.s3Url),
      period: compact(item.period),
      diet: compact(item.eats),
      sourceUrl: pageUrlForGalleryName(item.name),
      isAiGenerated: Boolean(item.isAiGenerated)
    });
  }

  return images;
}

function normalizeRecord(dinosaur, galleryImage) {
  const classification = dinosaur.classificationInfo ?? {};
  const family = valuesFrom(classification.familyInfo).at(-1) ?? "";
  const genus = valuesFrom(classification.genusInfo).at(-1) ?? "";
  const species = valuesFrom(classification.speciesInfo).at(-1) ?? "";
  const clades = Array.isArray(classification.clade)
    ? classification.clade.map(compact).filter(Boolean)
    : [];

  const facts = [
    compact(dinosaur.temporalRange) && `Lived: ${compact(dinosaur.temporalRange)}`,
    compact(dinosaur.diet) && `Diet: ${compact(dinosaur.diet)}`,
    family && `Family: ${family}`,
    clades.length > 1 && `Clade: ${clades.slice(0, 3).join(" / ")}`
  ].filter(Boolean);

  return {
    id: dinosaur.id,
    name: compact(dinosaur.name),
    imageUrl: galleryImage.url,
    imageTitle: `${compact(dinosaur.name)} clue image`,
    imageDescription: `Curated full-body dinosaur image from DinosaurPictures.org.`,
    imageProvider: "DinosaurPictures.org",
    facts: facts.slice(0, 4),
    description: firstSentence(dinosaur.description ?? ""),
    taxonomy: {
      genus,
      species,
      family,
      clades
    },
    source: {
      wikipediaUrl: compact(dinosaur.source?.wikipediaURL),
      wikipediaTitle: compact(dinosaur.source?.pageTitle),
      textLicense: compact(dinosaur.source?.license),
      textLicenseUrl: compact(dinosaur.source?.licenseURL),
      imageProvider: "DinosaurPictures.org",
      imageSourceUrl: galleryImage.sourceUrl,
      originalWikimediaImageUrl: compact(dinosaur.image?.imageURL),
      originalWikimediaTitle: compact(dinosaur.image?.title)
    }
  };
}

async function fetchPage(page) {
  const url = `${BASE_URL}?page=${page}`;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "dinoguessr-data-builder/1.0"
      }
    });

    if (response.ok) {
      return response.json();
    }

    if (attempt === 3) {
      throw new Error(`Failed to fetch page ${page}: ${response.status}`);
    }

    await sleep(750 * attempt);
  }
}

async function main() {
  const records = [];
  const galleryImages = await fetchGalleryImages();

  process.stdout.write(
    `Fetched ${galleryImages.size} DinosaurPictures dinosaur images\n`
  );

  for (let page = 1; page <= PAGE_LIMIT; page += 1) {
    const payload = await fetchPage(page);
    const pageRecords = Array.isArray(payload.data) ? payload.data : [];

    for (const item of pageRecords) {
      const galleryImage = galleryImages.get(normalizeNameKey(item.name));
      if (!galleryImage) continue;

      const record = normalizeRecord(item, galleryImage);
      if (
        record.name &&
        record.imageUrl &&
        record.description &&
        record.facts.length >= 2
      ) {
        records.push(record);
      }
    }

    process.stdout.write(
      `Fetched page ${page}: ${records.length} usable records\n`
    );

    if (!payload.nextPage) break;
  }

  const unique = Array.from(
    new Map(records.map((record) => [record.name, record])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  if (unique.length < MIN_RECORDS) {
    throw new Error(
      `Expected at least ${MIN_RECORDS} usable dinosaur records, got ${unique.length}`
    );
  }

  const output = {
    meta: {
      name: "Dinoguessr dinosaur dataset",
      count: unique.length,
      generatedAt: new Date().toISOString(),
      source: "RESTasaurus API + DinosaurPictures.org",
      sourceUrl: "https://restasaurus.onrender.com/api/v1/dinosaurs",
      sourceDocs: "https://vikiru.github.io/restasaurus/",
      imageSourceUrl: "https://dinosaurpictures.org/",
      upstreamNotes:
        "Facts are normalized from RESTasaurus/Wikipedia. Clue images are matched from DinosaurPictures.org to avoid isolated-bone and name-labeled Wikimedia source images."
    },
    dinosaurs: unique
  };

  await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(output)}\n`, "utf8");
  process.stdout.write(
    `Wrote ${unique.length} records to ${OUTPUT_FILE.pathname}\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
