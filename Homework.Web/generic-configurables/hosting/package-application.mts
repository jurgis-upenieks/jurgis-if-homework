import { existsSync } from "node:fs";
import { access, cp, rm } from "node:fs/promises";
import { basename, join } from "node:path";

export async function packageApplication(directory = process.cwd()) {
  const standalone = join(directory, ".next/standalone");
  const output = join(directory, "build");
  const assets = join(directory, "public");
  const options = { recursive: true, filter: (path: string) => !basename(path).startsWith(".env") };

  await access(join(standalone, "server.js"));
  await access(join(directory, ".next/static"));
  await rm(output, { recursive: true, force: true });
  await cp(standalone, output, options);
  await cp(join(directory, ".next/static"), join(output, ".next/static"), options);

  if (existsSync(assets)) await cp(assets, join(output, "public"), options);
}

if (import.meta.main) await packageApplication();
