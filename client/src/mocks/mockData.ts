export const demoWords = {
  animals: ["CAT", "DOG", "ELEPHANT", "TURTLE", "BUTTERFLY"],
  objects: ["PENCIL", "CHAIR", "PHONE", "UMBRELLA", "CLOCK"],
  places: ["HOUSE", "SCHOOL", "BEACH", "CASTLE", "HOSPITAL"],
  actions: ["DANCING", "SWIMMING", "SLEEPING", "RUNNING", "COOKING"],
};

export const getRandomWords = (count = 3): string[] => {
  const words = Object.values(demoWords).flat();
  return [...words].sort(() => Math.random() - 0.5).slice(0, Math.max(1, Math.min(count, 5)));
};
