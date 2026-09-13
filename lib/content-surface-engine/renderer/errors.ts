// CSE-2 — REFERENCE renderer errors.

export class UnsupportedBlockKindError extends Error {
  readonly blockId: string;
  readonly blockKind: string;
  constructor(blockId: string, blockKind: string) {
    super(
      `REFERENCE renderer (reference@1) does not support block kind "${blockKind}" ` +
        `(block id="${blockId}"). Fail-closed by design: an unknown block must not silently ` +
        `disappear.`,
    );
    this.name = "UnsupportedBlockKindError";
    this.blockId = blockId;
    this.blockKind = blockKind;
  }
}
