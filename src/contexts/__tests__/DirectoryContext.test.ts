import { describe, it, expect } from 'vitest';
import { createSafeId } from '../DirectoryContext';

describe('createSafeId', () => {
  it('produces consistent ids for same input', () => {
    const id1 = createSafeId('/path/to/video', 'file.mp4');
    const id2 = createSafeId('/path/to/video', 'file.mp4');
    expect(id1).toBe(id2);
  });

  it('produces different ids for different input', () => {
    const id1 = createSafeId('/path/to/video', 'file.mp4');
    const id2 = createSafeId('/path/to/other', 'file.mp4');
    expect(id1).not.toBe(id2);
  });
});
