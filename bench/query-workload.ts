import { component, query, write } from "../index.ts";
import { native as binding } from "../src/runtime.ts";
import { genericQuery } from "./generic-query.ts";

interface Result {
  archetypes: number;
  fields: number;
  generated: number;
  generic: number;
  native: number;
  speedup: number;
  nativeRatio: number;
}

const median = (values: number[]) => {
  values.sort((a, b) => a - b);
  return values[values.length >> 1]!;
};

function measurePair(generated: () => void, generic: () => void) {
  for (let index = 0; index < 4; index++) {
    generated();
    generic();
  }

  const generatedSamples: number[] = [];
  const genericSamples: number[] = [];

  for (let index = 0; index < 10; index++) {
    const runs = index & 1 ? [generic, generated] : [generated, generic];
    for (const run of runs) {
      const start = performance.now();
      run();
      (run === generated ? generatedSamples : genericSamples).push(
        performance.now() - start,
      );
    }
  }

  return {
    generated: median(generatedSamples),
    generic: median(genericSamples),
  };
}

function measure(run: () => void) {
  for (let index = 0; index < 4; index++) run();
  const samples: number[] = [];
  for (let index = 0; index < 10; index++) {
    const start = performance.now();
    run();
    samples.push(performance.now() - start);
  }
  return median(samples);
}

function nativeQuery(descriptor: Record<string, number>) {
  const terms = new Uint32Array(Object.values(descriptor));
  return binding.siecs_ts_query_init(terms, terms.length, null, 0);
}

function callback(fieldCount: number) {
  switch (fieldCount) {
    case 1:
      return (row: any) => row.a.value++;
    case 2:
      return (row: any) => {
        row.a.value++;
        row.b.value++;
      };
    default:
      return (row: any) => {
        row.a.value++;
        row.b.value++;
        row.c.value++;
        row.d.value++;
      };
  }
}

function fixture(prefix: string, archetypes: number, entityCount: number) {
  const fields = [
    component(`${prefix}A`, { value: "i32" }),
    component(`${prefix}B`, { value: "i32" }),
    component(`${prefix}C`, { value: "i32" }),
    component(`${prefix}D`, { value: "i32" }),
  ];
  const tagCount = Math.ceil(Math.log2(archetypes));
  const tags = Array.from({ length: tagCount }, (_, index) =>
    component(`${prefix}Tag${index}`),
  );

  for (let index = 0; index < entityCount; index++) {
    const entity = binding.ecs_new();
    for (const field of fields) binding.ecs_add_cid(entity, field);
    const table = index % archetypes;
    for (let bit = 0; bit < tags.length; bit++) {
      if (table & (1 << bit)) binding.ecs_add_cid(entity, tags[bit]!);
    }
  }

  return fields;
}

export function runQueryBenchmark(entityCount = 100_000): Result[] {
  const results: Result[] = [];

  for (const archetypes of [1, 8, 64]) {
    const fields = fixture(`Bench${archetypes}_`, archetypes, entityCount);

    for (const fieldCount of [1, 2, 4]) {
      const descriptor: Record<string, number> = {};
      const generatedDescriptor: Record<string, ReturnType<typeof write>> = {};
      const names = ["a", "b", "c", "d"];
      for (let index = 0; index < fieldCount; index++) {
        descriptor[names[index]!] = (fields[index]! as number) | (2 << 16);
        generatedDescriptor[names[index]!] = write(fields[index]!);
      }

      const generated = query(generatedDescriptor) as {
        each(callback: (row: any) => void): void;
      };
      const generic = genericQuery(descriptor);
      const native = nativeQuery(descriptor);
      const update = callback(fieldCount);
      const times = measurePair(
        () => generated.each(update),
        () => generic.each(update),
      );
      const nativeRepeats = 50;
      const nativeTime =
        measure(() => {
          for (let index = 0; index < nativeRepeats; index++) {
            binding.siecs_ts_bench_i32(native, fieldCount);
          }
        }) / nativeRepeats;

      results.push({
        archetypes,
        fields: fieldCount,
        generated: times.generated,
        generic: times.generic,
        native: nativeTime,
        speedup: times.generic / times.generated,
        nativeRatio: times.generated / nativeTime,
      });
    }
  }

  return results;
}
