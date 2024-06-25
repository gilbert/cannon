import Debug from 'debug';
import { file } from 'tmp-promise';

import fs from 'fs-extra';

const debugLines: string[] = [];

Debug.log = function (buf) {
  console.error(buf);

  debugLines.push(buf);
};

export async function dumpLogs() {
  const { fd, path } = await file();

  await fs.write(fd, debugLines.join('\n'));

  console.log(`Dump file has been written to ${path}. When reporting an issue, please include this file.`);
}
