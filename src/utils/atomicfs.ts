import { open, write, rename, fsync, unlink, FileHandle } from "fs/promises";
import { PathLike } from "fs";
import { join, dirname } from "path";

let counter = 0;

async function cleanup(dest: PathLike) {
  await unlink(dest);
}

async function writeLoop(
  fd: FileHandle,
  content: Buffer,
  contentLength: number,
  offset: number
): Promise<null | void> {
  let { bytesWritten } = await write(fd, content, offset);
  return bytesWritten < contentLength - offset
    ? await writeLoop(fd, content, contentLength, offset + bytesWritten)
    : null;
}

async function openLoop(dest: PathLike): Promise<FileHandle> {
  try {
    let fd = await open(dest, "w");
    return fd;
  } catch (err) {
    return err.code === "EMFILE" ? await openLoop(dest) : err;
  }
}

export async function writeFileAtomic(path: string, content: string | Buffer) {
  const tmp = join(dirname(path), "." + process.pid + "." + counter++);
  let fd = await openLoop(tmp);
  const contentLength = Buffer.byteLength(content);
  try {
    await writeLoop(fd, Buffer.from(content), contentLength, 0);
    await fsync(fd);
    fd.close();
    await rename(tmp, path);
  } catch (err) {
    fd.close();
    await cleanup(tmp);
  }
}
