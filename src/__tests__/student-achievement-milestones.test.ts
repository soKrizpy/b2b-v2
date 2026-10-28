import { describe, expect, it } from 'vitest';
import { getUnlockedAchievementMilestones, type AchievementMilestoneInput } from '@/features/dashboard/student/StudentAchievementBadges';

const baseline: AchievementMilestoneInput = {
  totalXp: 0,
  coins: 0,
  inventoryCount: 0,
  hasEquippedHat: false,
  certificateCount: 0,
  completedCount: 0,
  totalPossibleCount: 20,
};

describe('student achievement milestones', () => {
  it('does not award badges for progress the student has not made yet', () => {
    expect(getUnlockedAchievementMilestones(baseline)).toEqual([]);
  });

  it('unlocks level milestones using the shared XP curve', () => {
    const levelTwo = getUnlockedAchievementMilestones({ ...baseline, totalXp: 100 });
    expect(levelTwo.map((milestone) => milestone.id)).toContain('explorer');
    expect(levelTwo.map((milestone) => milestone.id)).not.toContain('logic-adventurer');

    const levelThree = getUnlockedAchievementMilestones({ ...baseline, totalXp: 230 });
    expect(levelThree.map((milestone) => milestone.id)).toContain('logic-adventurer');
  });

  it('recognizes learning progress milestones and full-curriculum mastery', () => {
    const firstTopic = getUnlockedAchievementMilestones({ ...baseline, completedCount: 1 });
    expect(firstTopic.map((milestone) => milestone.id)).toContain('novice-coder');

    const threeTopics = getUnlockedAchievementMilestones({ ...baseline, completedCount: 3 });
    expect(threeTopics.map((milestone) => milestone.id)).toContain('topic-trail');

    const allTopics = getUnlockedAchievementMilestones({
      ...baseline,
      completedCount: 20,
      totalPossibleCount: 20,
    });
    expect(allTopics.map((milestone) => milestone.id)).toContain('curriculum-master');
  });

  it('recognizes earned certificates, coins, and wardrobe achievements', () => {
    const milestones = getUnlockedAchievementMilestones({
      ...baseline,
      coins: 50,
      inventoryCount: 2,
      hasEquippedHat: true,
      certificateCount: 1,
    });
    const ids = milestones.map((milestone) => milestone.id);
    expect(ids).toContain('first-gold');
    expect(ids).toContain('coin-collector');
    expect(ids).toContain('pet-stylish');
    expect(ids).toContain('fashion-starter');
    expect(ids).toContain('certified-scholar');
    expect(ids).not.toContain('master-graduate');
  });
});
