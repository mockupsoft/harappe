/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

export function resolvePhpBinary() {
  if (process.env.PHP_BINARY?.trim()) return process.env.PHP_BINARY.trim();
  if (process.platform === 'win32') {
    const base = 'C:\\laragon\\bin\\php';
    if (existsSync(base)) {
      try {
        for (const d of readdirSync(base)) {
          const exe = join(base, d, 'php.exe');
          if (existsSync(exe)) return exe;
        }
      } catch {
        /* ignore */
      }
    }
  }
  return 'php';
}
