import { expect, test } from "bun:test";
import { defer, entity, getName, Name, query, set, setName } from "../index.ts";

test("owns UTF-8 names and exposes them through Name queries", () => {
  const object = entity();
  setName(object.entity, "Joueur é🦊");
  expect(getName(object.entity)).toBe("Joueur é🦊");
  object.setName("Player");
  set(object.entity, Name, { value: "Final" });

  query({ name: Name }).each((row) => expect(row.name.value).toBe("Final"));
});

test("copies deferred names before the temporary UTF-8 buffer is restored", () => {
  const object = entity();
  defer(() => set(object.entity, Name, { value: "déféré" }));
  expect(object.getName()).toBe("déféré");
});
