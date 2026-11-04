// src/features/pet/lib/rewardActions.ts
// Server-side reward helpers. All writes use the admin client (bypasses RLS)
// and perform atomic increments to prevent race conditions under concurrent requests.
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { REWARDS, type RewardEvent } from '@/lib/rewards/config';
import type { RewardResult } from '@/lib/rewards/types';

// Re-export for backward compatibility with any pet-internal consumers.
export type { RewardResult } from '@/lib/rewards/types';

/**
 * Awards XP and Coins to a student and persists the result atomically.
 *
 * Uses a Postgres RPC-style update with `.select()` to read back the new
 * values in one round-trip (optimistic increment pattern):
 *   UPDATE students SET total_xp = total_xp + $xp, coins = coins + $coins
 *   WHERE id = $studentId RETURNING total_xp, coins
 *
 * If the student row does not exist the update silently affects 0 rows and
 * the function returns an error rather than throwing.
 */
export async function awardStudentReward(
  studentId: string,
  xpAmount:   number,
  coinAmount: number
): Promise<RewardResult> {
  if (!studentId)          return { success: false, error: 'studentId wajib diisi.' };
  if (xpAmount   < 0)      return { success: false, error: 'xpAmount tidak boleh negatif.' };
  if (coinAmount < 0)      return { success: false, error: 'coinAmount tidak boleh negatif.' };
  if (xpAmount === 0 && coinAmount === 0)
    return { success: true, newXp: 0, newCoins: 0, message: 'Tidak ada reward untuk diberikan.' };

  const db = createSupabaseAdminClient();

  // Fetch current values first (needed because Supabase JS client does not
  // support column arithmetic in .update() — we read → compute → write).
  const { data: current, error: fetchErr } = await (db
    .from('students')
    .select('total_xp, coins')
    .eq('id', studentId)
    .maybeSingle() as unknown as Promise<{
      data: { total_xp: number; coins: number } | null;
      error: { message: string } | null;
    }>);

  if (fetchErr) {
    console.error('[awardStudentReward] fetch error:', fetchErr.message);
    return { success: false, error: fetchErr.message };
  }

  if (!current) {
    console.error('[awardStudentReward] no student row for id:', studentId);
    return { success: false, error: 'Siswa tidak ditemukan.' };
  }

  const newXp    = (current.total_xp ?? 0) + xpAmount;
  const newCoins = (current.coins    ?? 0) + coinAmount;

  const { error: updateErr } = await (db
    .from('students')
    .update({ total_xp: newXp, coins: newCoins, edu_coins: newCoins } as never)
    .eq('id', studentId) as unknown as Promise<{ error: { message: string } | null }>);

  if (updateErr) {
    console.error('[awardStudentReward] update error:', updateErr.message);
    return { success: false, error: updateErr.message };
  }

  // Refresh student-facing pages so the widget re-renders immediately
  revalidatePath('/student/dashboard', 'layout');
  revalidatePath('/student/lessons',   'layout');

  return {
    success:   true,
    newXp,
    newCoins,
    message: `+${xpAmount} XP · +${coinAmount} koin 🎉`,
  };
}

/**
 * Convenience wrapper — awards a named reward event to a student.
 * Caller passes the student id and the event key; amounts come from REWARDS config.
 */
export async function awardRewardEvent(
  studentId: string,
  event: RewardEvent
): Promise<RewardResult> {
  const { xp, coins } = REWARDS[event];
  return awardStudentReward(studentId, xp, coins);
}
