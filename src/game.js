export function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[next]] = [copy[next], copy[index]];
  }
  return copy;
}

export function pickQuestion(dinosaurs, previousId) {
  if (!dinosaurs.length) return null;

  let answer = dinosaurs[Math.floor(Math.random() * dinosaurs.length)];
  if (dinosaurs.length > 1) {
    while (answer.id === previousId) {
      answer = dinosaurs[Math.floor(Math.random() * dinosaurs.length)];
    }
  }

  const sameClade = answer.taxonomy?.clades?.at(1);
  const cladePool = shuffle(
    dinosaurs.filter((candidate) => {
      if (candidate.id === answer.id) return false;
      if (!sameClade) return true;
      return candidate.taxonomy?.clades?.includes(sameClade);
    })
  );
  const fallbackPool = shuffle(
    dinosaurs.filter((candidate) => candidate.id !== answer.id)
  );
  const distractors = [];

  for (const candidate of [...cladePool, ...fallbackPool]) {
    if (!distractors.some((choice) => choice.name === candidate.name)) {
      distractors.push(candidate);
    }
    if (distractors.length === 3) break;
  }

  return {
    answer,
    choices: shuffle([answer, ...distractors]).map((choice) => ({
      id: choice.id,
      name: choice.name
    }))
  };
}

export function normalizeGuess(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function answerNames(dinosaur) {
  const names = new Set([dinosaur.name, dinosaur.taxonomy?.genus]);
  const firstNamePart = dinosaur.name?.split(/\s+/).at(0);
  if (firstNamePart && dinosaur.name.includes(" ")) {
    names.add(firstNamePart);
  }

  return Array.from(names).filter(Boolean);
}

function editDistance(left, right) {
  const distances = Array.from({ length: left.length + 1 }, (_, index) => [
    index
  ]);

  for (let index = 1; index <= right.length; index += 1) {
    distances[0][index] = index;
  }

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      distances[leftIndex][rightIndex] = Math.min(
        distances[leftIndex - 1][rightIndex] + 1,
        distances[leftIndex][rightIndex - 1] + 1,
        distances[leftIndex - 1][rightIndex - 1] + cost
      );
    }
  }

  return distances[left.length][right.length];
}

export function answerHint(dinosaur) {
  const answer = answerNames(dinosaur).at(0) ?? dinosaur.name;
  const letterCount = answer.replace(/[^a-z]/gi, "").length;

  return `${answer.at(0).toUpperCase()} • ${letterCount} letters`;
}

export function isCorrectGuess(guess, dinosaur) {
  const normalizedGuess = normalizeGuess(guess);
  if (!normalizedGuess) return false;

  return answerNames(dinosaur).some((name) => {
    const normalizedName = normalizeGuess(name);
    if (normalizedName === normalizedGuess) return true;

    const tolerance = normalizedName.length >= 9 ? 2 : 1;
    return editDistance(normalizedGuess, normalizedName) <= tolerance;
  });
}
