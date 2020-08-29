import { open, rename, fsync, unlink, close } from "fs";
import { write, PathLike } from "fs";
import { promisify } from "util";
import { join, dirname } from "path";

let fsunlink = promisify(unlink);
let fsrename = promisify(rename);
let fsfsync = promisify(fsync);
let fsopen = promisify(open);
let fsclose = promisify(close);

let counter = 0;

async function cleanup(dest: PathLike) {
  await fsunlink(dest);
}

async function writeLoop(
  fd: number,
  content: Buffer,
  contentLength: number,
  offset: number
): Promise<null | void> {
  return new Promise(async (resolve, reject) => {
    write(fd, content, offset, async function (err, bytesWritten) {
      resolve(
        bytesWritten < contentLength - offset
          ? await writeLoop(fd, content, contentLength, offset + bytesWritten)
          : null
      );
    });
  });
}

async function openLoop(dest: PathLike): Promise<number> {
  try {
    let fd = await fsopen(dest, "w");
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
    await fsfsync(fd);
    await fsclose(fd);
    await fsrename(tmp, path);
  } catch (err) {
    await fsclose(fd);
    await cleanup(tmp);
    throw new Error(err);
  }
}
