/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { UserProfile } from '../types';

/** Bu e-postalar otomatik yönetici kabul edilir (profil oluşturma / yükseltme). */
export const OWNER_ADMIN_EMAILS = ['keremarcaa@gmail.com', 'admin@harappe.com'] as const;

export function emailGrantsAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return (OWNER_ADMIN_EMAILS as readonly string[]).includes(email);
}

export function profileIndicatesAdmin(
  profile: UserProfile | null | undefined,
  email: string | null | undefined
): boolean {
  return Boolean(profile?.isAdmin || emailGrantsAdmin(email));
}
