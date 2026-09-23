import { Key, Pointer, PointerButton, PointerType, getResource, query } from "../index.ts";

if (false) {
  const state = getResource(Pointer);
  const x: number = state.x;
  const buttons: number = state.buttons;
  const mouse: 0 = PointerType.Mouse;
  const primary: 1 = PointerButton.Primary;
  query({ pointer: Pointer }).each(({ pointer }) => {
    const key: boolean = getResource(Pointer).buttons === 0 || pointer.pointer_type === PointerType.Mouse;
    // @ts-expect-error resource/query state is readonly
    pointer.x = 0;
    void x; void buttons; void mouse; void primary; void key; void Key.Space;
  });
}
