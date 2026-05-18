/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Laragon Windows: PATH'te php yoksa C:\laragon\bin\php\...\php.exe kullanılır.
 */

import { execFileSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { resolvePhpBinary } from './resolve-php.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
execFileSync(resolvePhpBinary(), [join(root, 'scripts', 'reset-legacy-data.php')], {
  stdio: 'inherit',
  cwd: root,
});
