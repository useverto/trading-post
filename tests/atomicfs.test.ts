import { writeFileAtomic } from "@utils/atomicfs";

const file = Buffer.allocUnsafe(1024 * 1024); // 1MB

(async () => {
  await writeFileAtomic("xyz", file);
})();