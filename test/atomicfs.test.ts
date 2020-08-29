import { writeFileAtomic } from '../src/utils/atomicfs';

const file = Buffer.allocUnsafe(1024 * 1024); // 1MB

describe('Atomic fs tests', () => {
  it('write atomic fs', async () => {
    await writeFileAtomic('xyz', file);
  });
});
