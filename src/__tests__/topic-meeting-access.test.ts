import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getQuestMapData } from '@/features/quiz/questMapQueries';
import type { ModuleWithTopics } from '@/features/curriculum/queries';
import { getTopicMeetingDate, getTopicMeetingSessionNumber, hasTopicMeetingStarted, type TopicMeetingSchedule } from '@/features/quiz/topicMeetingAccess';

const state = vi.hoisted(() => ({ meetingRows: [] as Array<Record<string, unknown>> }));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        then: (resolve: (result: { data: unknown[]; error: null }) => unknown, reject?: (error: unknown) => unknown) =>
          Promise.resolve({ data: table === 'meeting_students' ? state.meetingRows : [], error: null }).then(resolve, reject),
      };
      return query;
    },
  }),
}));

function moduleRow(): ModuleWithTopics {
  return {
    id: 9,
    title: 'Meeting access module',
    description: null,
    level: 'beginner',
    gamification_type: 'quest',
    is_active: true,
    created_at: '',
    topics: [1, 2].map((session) => ({
      id: session,
      module_id: 9,
      title: `Topic ${session}`,
      order_index: session - 1,
      description: null,
      project_link: null,
      topic_link: null,
      engine_topic_id: null,
      lesson_content: { learningPath: [{ type: 'lesson', title: `Secret ${session}`, content: 'lesson body' }], quiz: [{ question: `Quiz ${session}` }] },
      status: 'published',
      published_at: null,
      created_at: '',
      challenge_count: 1,
    })),
  } as unknown as ModuleWithTopics;
}

function assignedMeeting(topicId: number, meetingDate: string): {
  meeting_id: number;
  has_joined: boolean;
  attendance_status: string | null;
  meetings: {
    id: number;
    module_id: number;
    topic_id: number;
    session_number: number;
    is_completed: boolean;
    progress_report: string | null;
    meeting_date: string;
  };
} {
  return {
    meeting_id: topicId,
    has_joined: false,
    attendance_status: null,
    meetings: {
      id: topicId,
      module_id: 9,
      topic_id: topicId,
      session_number: topicId,
      is_completed: false,
      progress_report: null,
      meeting_date: meetingDate,
    },
  };
}

describe('scheduled topic meeting access', () => {
  beforeEach(() => {
    state.meetingRows = [];
    vi.useRealTimers();
  });

  it('unlocks only the matching assigned session at its exact scheduled start and keeps it open later', () => {
    const schedule: TopicMeetingSchedule[] = [{
      topic_id: 2,
      session_number: 2,
      meeting_date: '2026-10-26T10:00:00.000Z',
    }];

    expect(hasTopicMeetingStarted(schedule, 2, new Date('2026-10-26T09:59:59.999Z'))).toBe(false);
    expect(hasTopicMeetingStarted(schedule, 2, new Date('2026-10-26T10:00:00.000Z'))).toBe(true);
    expect(hasTopicMeetingStarted(schedule, 2, new Date('2026-10-27T10:00:00.000Z'))).toBe(true);
    expect(hasTopicMeetingStarted(schedule, 1, new Date('2026-10-27T10:00:00.000Z'))).toBe(false);
  });

  it('does not unlock unassigned students and strips future lesson and quiz content from map data', async () => {
    const now = Date.now();
    state.meetingRows = [
      assignedMeeting(1, new Date(now - 60_000).toISOString()),
      assignedMeeting(2, new Date(now + 60_000).toISOString()),
    ];

    const reorderedModule = moduleRow();
    reorderedModule.topics.reverse();
    const assigned = await getQuestMapData('assigned-student', reorderedModule);
    const firstTopicNode = assigned.nodes.find((node) => node.topic.id === 1)!;
    const secondTopicNode = assigned.nodes.find((node) => node.topic.id === 2)!;
    expect(firstTopicNode.isUnlocked).toBe(true);
    expect(firstTopicNode.quizUnlocked).toBe(false);
    expect(firstTopicNode.topic.lesson_content).not.toBeNull();
    expect(secondTopicNode.isUnlocked).toBe(false);
    expect(secondTopicNode.status).toBe('LOCKED');
    expect(secondTopicNode.topic.lesson_content).toBeNull();
    expect(assigned.mod.topics.find((topic) => topic.id === 2)?.lesson_content).toBeNull();

    state.meetingRows = [];
    const unassigned = await getQuestMapData('unassigned-student', moduleRow());
    expect(unassigned.nodes.every((node) => !node.isUnlocked)).toBe(true);
    expect(unassigned.nodes.every((node) => node.topic.lesson_content === null)).toBe(true);
  });

  it('fails closed for duplicate topic mappings and hides ambiguous schedule details', () => {
    const schedules: TopicMeetingSchedule[] = [
      { topic_id: 2, session_number: 2, meeting_date: '2026-10-28T10:00:00.000Z' },
      { topic_id: 2, session_number: 2, meeting_date: '2026-10-29T10:00:00.000Z' },
    ];
    expect(hasTopicMeetingStarted(schedules, 2, new Date('2026-10-30T10:00:00.000Z'))).toBe(false);
    expect(getTopicMeetingDate(schedules, 2)).toBeNull();
    expect(getTopicMeetingSessionNumber(schedules, 2)).toBeNull();

    const uniqueSchedule = [schedules[0]];
    expect(hasTopicMeetingStarted(uniqueSchedule, 2, new Date('2026-10-28T10:00:00.000Z'))).toBe(true);
    expect(getTopicMeetingDate(uniqueSchedule, 2)).toBe('2026-10-28T10:00:00.000Z');
    expect(getTopicMeetingSessionNumber(uniqueSchedule, 2)).toBe(2);
    expect(hasTopicMeetingStarted([
      { ...uniqueSchedule[0], session_number: null },
    ], 2, new Date('2026-10-30T10:00:00.000Z'))).toBe(false);
    expect(getTopicMeetingDate(schedules, 1)).toBeNull();
    expect(getTopicMeetingSessionNumber(schedules, 1)).toBeNull();
  });

  it('does not unlock lessons or quizzes when assigned schedules duplicate a topic mapping', async () => {
    const completed = assignedMeeting(1, new Date(Date.now() - 60_000).toISOString());
    completed.has_joined = true;
    completed.meetings.is_completed = true;
    completed.meetings.progress_report = 'Teacher report submitted';
    state.meetingRows = [completed, { ...completed, meeting_id: 99, meetings: { ...completed.meetings, id: 99 } }];

    const result = await getQuestMapData('assigned-student', moduleRow());
    const node = result.nodes.find((item) => item.topic.id === 1)!;
    expect(node.isUnlocked).toBe(false);
    expect(node.isSessionReportSubmitted).toBe(false);
    expect(node.quizUnlocked).toBe(false);
    expect(node.topic.lesson_content).toBeNull();
    expect(node.meetingDate).toBeNull();
  });
});
