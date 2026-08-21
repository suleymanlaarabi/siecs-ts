export const median = (values: number[]) => {
  values.sort((a, b) => a - b);
  return values[values.length >> 1]!;
};

export function measure(run: () => void) {
  for (let index = 0; index < 4; index++) run();
  const samples: number[] = [];
  for (let index = 0; index < 10; index++) {
    const start = performance.now();
    run();
    samples.push(performance.now() - start);
  }
  return median(samples);
}

export function measurePair(first: () => void, second: () => void) {
  for (let index = 0; index < 4; index++) {
    first();
    second();
  }
  const firstSamples: number[] = [];
  const secondSamples: number[] = [];
  for (let index = 0; index < 10; index++) {
    const runs = index & 1 ? [second, first] : [first, second];
    for (const run of runs) {
      const start = performance.now();
      run();
      (run === first ? firstSamples : secondSamples).push(
        performance.now() - start,
      );
    }
  }
  return { first: median(firstSamples), second: median(secondSamples) };
}
