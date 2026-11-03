# Requirements Document

## Introduction

This feature removes the single-active-module restriction in the Bits2Bytes LMS so that students can study multiple modules in parallel. Today the system forces exactly one module to be `active` per student: the `setActiveStudentModule` server action pauses every other enrollment whenever a new module is activated, and the curriculum query only returns modules whose enrollment status is `active`. The result is that a paused module disappears entirely from the student's view, including the topics the student already finished.

The requested change introduces two new access tiers for a student's module enrollment:

- **Active Module** — full access. The student sees every published topic, and the existing meeting-based unlocking and quiz gating continue to drive progression.
- **Paused Module** — review-only access. The module remains visible and the student can open any topic they have already completed (as recorded in the `topic_progress` table), but topics the student has not finished stay hidden.

This lets an administrator activate several modules at once for parallel study, and lets a student revisit completed work in a module the administrator has since paused, without re-exposing unfinished content.

## Glossary

- **System**: The Bits2Bytes LMS application, comprising the Next.js App Router server components, server actions, and Supabase-backed query helpers described in this document.
- **Enrollment_Action**: The server action in `src/features/users/actions.ts` that creates or updates a row in the `student_modules` table, setting its `status` to `active` or `paused` for a given student and module.
- **Curriculum_Query**: The read-side query helper in `src/features/curriculum/queries.ts` (`getStudentModulesWithTopics`) that fetches a student's enrolled modules together with the topics that should be shown for each module.
- **Quest_Map**: The progression display rendered by `getQuestMapData` and shown either as the pixel-art `QuestMapClient` or the fallback `SimpleTopicList`, which renders a module's topics with their unlock and completion states.
- **Topic_Page**: The server component in `src/app/student/lessons/topic/[topicId]/page.tsx` that renders a single topic's lesson content, challenges, and quiz.
- **Student_Dashboard**: The student dashboard page (`src/app/student/dashboard/page.tsx`) and its shell, which summarize the student's modules, sessions, and progress.
- **Student_Module_Enrollment**: A row in the `student_modules` table linking a student to a module with a `status` of `active` or `paused`.
- **Active_Module**: A Student_Module_Enrollment whose `status` equals `active`, granting the student access to all published topics of that module under the existing meeting-based unlock gating.
- **Paused_Module**: A Student_Module_Enrollment whose `status` equals `paused`, granting the student review-only access limited to the module's Completed_Topics.
- **Completed_Topic**: A topic for which a record exists in the `topic_progress` table for a given student, indicating the student has finished that topic.
- **topic_progress**: The database table that records finished topics per student, storing `student_id`, `topic_id`, `engine_topic_id`, `xp_earned`, `best_quiz_score`, and `completed_at`.
- **student_modules**: The database table that stores Student_Module_Enrollments, with columns `student_id` (uuid), `module_id` (int), and `status` (`active` | `paused`).

## Requirements

### Requirement 1: Allow Multiple Active Module Enrollments

**User Story:** As an admin, I want to activate several modules for a student at the same time, so that the student can study multiple modules in parallel.

#### Acceptance Criteria

1. THE System SHALL permit 2 or more Student_Module_Enrollments with `status` `active` to exist for a single student simultaneously.
2. WHEN an admin activates a module for a student, THE Enrollment_Action SHALL set that Student_Module_Enrollment's `status` to `active`.
3. WHEN an admin activates a module for a student, THE Enrollment_Action SHALL leave every other Student_Module_Enrollment for that student at its existing `status`.
4. WHILE 2 or more Student_Module_Enrollments for a student have `status` `active`, THE Curriculum_Query SHALL return each of those modules with all of its published topics, including modules that have zero published topics.
5. IF an admin activates a module whose Student_Module_Enrollment already has `status` `active`, THEN THE Enrollment_Action SHALL leave that Student_Module_Enrollment's `status` as `active`.

### Requirement 2: Independent Module Activation and Pausing

**User Story:** As an admin, I want to activate and pause modules independently for a student, so that I can choose which modules are in full-access mode and which are in review-only mode without affecting the others.

#### Acceptance Criteria

1. WHEN an admin activates a module for a student, THE Enrollment_Action SHALL upsert a Student_Module_Enrollment with `status` `active` for that student and module.
2. WHEN an admin pauses a module for a student, THE Enrollment_Action SHALL set that Student_Module_Enrollment's `status` to `paused`.
3. WHEN an admin activates or pauses a single module for a student, THE Enrollment_Action SHALL modify only the Student_Module_Enrollment for that student and module.
4. IF a student has no existing Student_Module_Enrollment for a module an admin activates, THEN THE Enrollment_Action SHALL create a Student_Module_Enrollment with `status` `active` for that student and module.
5. IF a student has no existing Student_Module_Enrollment for a module an admin pauses, THEN THE Enrollment_Action SHALL create a Student_Module_Enrollment with `status` `paused` for that student and module.

### Requirement 3: Paused Modules Remain Visible to Students

**User Story:** As a student, I want to see my paused modules, so that I can review the topics I have already completed instead of losing access to them.

#### Acceptance Criteria

1. WHEN the Curriculum_Query is invoked for a student who has a Student_Module_Enrollment with `status` `paused`, THE Curriculum_Query SHALL include that module in the list of modules returned for the student.
2. WHEN the Curriculum_Query is invoked for a student, THE Curriculum_Query SHALL return all and only the Student_Module_Enrollments whose `status` is `active` or `paused` for that student.
3. IF a student has no Student_Module_Enrollment, THEN THE Curriculum_Query SHALL return an empty module list for that student.

### Requirement 4: Paused Modules Show Only Completed Topics

**User Story:** As a student, I want a paused module to display only the topics I have already completed, so that I can review past work without seeing unfinished content.

#### Acceptance Criteria

1. WHILE a Student_Module_Enrollment has `status` `paused`, THE Curriculum_Query SHALL return only the topics of that module that are Completed_Topics for the student, where a Completed_Topic is a topic for which a matching record exists in the topic_progress table for that student indicating the topic has been completed.
2. WHILE a Student_Module_Enrollment has `status` `paused`, every topic THE Curriculum_Query returns for that module SHALL have a matching record in the topic_progress table for that student indicating the topic has been completed.
3. WHILE a Student_Module_Enrollment has `status` `active`, THE Curriculum_Query SHALL return every published topic of that module.
4. THE set of topics THE Curriculum_Query returns for a Paused_Module SHALL be a subset of the topics it returns for the same module as an Active_Module.
5. IF a topic has been completed by the student but is no longer published, THEN THE Curriculum_Query SHALL exclude that topic from the results returned for a Paused_Module.

### Requirement 5: Topic Page Access Control Across Module Tiers

**User Story:** As a student, I want to open a completed topic in a paused module, so that I can review its lesson content and quiz results.

#### Acceptance Criteria

1. WHEN a student requests a topic in a Paused_Module and a topic_progress record exists for that student and topic, THE Topic_Page SHALL render the topic content for the student.
2. WHEN a student requests a topic in a Paused_Module and no topic_progress record exists for that student and topic, THE Topic_Page SHALL return a not-found response.
3. WHEN a student requests a topic in an Active_Module and meeting-based unlock gating is satisfied, THE Topic_Page SHALL render the topic content for the student.
4. IF a student has no Student_Module_Enrollment for the module that owns a requested topic, THEN THE Topic_Page SHALL return a not-found response.
5. IF a student requests a topic in an Active_Module and meeting-based unlock gating is not satisfied, THEN THE Topic_Page SHALL return a not-found response.
6. WHEN a student requests a topic in a Paused_Module and the topic's status is not published, THEN THE Topic_Page SHALL return a not-found response.

### Requirement 6: Quest Map Rendering for Paused Modules

**User Story:** As a student, I want the Quest Map to show my completed topics in a paused module, so that I can see my progress history for that module.

#### Acceptance Criteria

1. WHILE a Student_Module_Enrollment has `status` `paused`, THE Quest_Map SHALL render only the topics of that module that are Completed_Topics for the student.
2. WHILE a Student_Module_Enrollment has `status` `paused`, THE Quest_Map SHALL mark every rendered topic of that module with the COMPLETED node status, regardless of the meeting-based unlock and quiz-gating logic that applies to Active_Modules.
3. WHILE a Student_Module_Enrollment has `status` `paused`, THE Quest_Map SHALL hide topics that are not Completed_Topics for the student.
4. WHILE a Student_Module_Enrollment has `status` `active`, THE Quest_Map SHALL render every published topic of that module using the existing meeting-based unlock and quiz gating.
5. IF a Paused_Module has zero Completed_Topics for the student, THEN THE Quest_Map SHALL render zero topic nodes for that module.

### Requirement 7: Dashboard Reflects All Accessible Modules

**User Story:** As a student, I want my dashboard to count every module I can still access, so that the module summary stays accurate when modules are paused.

#### Acceptance Criteria

1. THE Student_Dashboard SHALL display a module count equal to the number of modules in the accessible module list defined by Acceptance Criteria 2, 3, and 4.
2. IF a Paused_Module contains at least one Completed_Topic for the student, THEN THE Student_Dashboard SHALL include that Paused_Module in the accessible module list.
3. THE Student_Dashboard SHALL include an Active_Module in the accessible module list regardless of whether the student has completed any of its topics.
4. IF a Paused_Module contains zero Completed_Topics for the student, THEN THE Student_Dashboard SHALL exclude that Paused_Module from the accessible module list.

### Requirement 8: Module Selector Distinguishes Active and Paused Modules

**User Story:** As a student, I want the module selector on the lessons page to show which modules are active and which are paused, so that I can tell full-access modules apart from review-only modules.

#### Acceptance Criteria

1. WHEN the lessons page renders a module selector for a student with more than one accessible module, THE System SHALL list every Student_Module_Enrollment whose `status` is `active` or `paused` for that student.
2. WHILE a module is an Active_Module, THE module selector SHALL display a visible label containing the text "active" for that module's entry.
3. WHILE a module is a Paused_Module, THE module selector SHALL display a visible label containing the text "paused" for that module's entry.
4. WHEN a student selects a Paused_Module in the module selector, THE System SHALL render that module using the Paused_Module topic filtering defined in Requirement 4.
5. WHEN a student selects an Active_Module in the module selector, THE System SHALL render that module with all published topics visible using the existing meeting-based unlock and quiz gating.

### Requirement 9: Admin Module Management Interface Reflects Multiple Active Modules

**User Story:** As an admin, I want to see and manage multiple active modules for a student, so that I can activate and pause modules independently from a single interface.

#### Acceptance Criteria

1. WHEN the admin views a student's module list, THE System SHALL display every Student_Module_Enrollment for that student with its current `status`.
2. WHILE a module is an Active_Module, THE System SHALL display a control to pause that module independently.
3. WHILE a module is a Paused_Module, THE System SHALL display a control to activate that module independently.
4. WHEN an admin activates a module using the module management interface, THE Enrollment_Action SHALL execute without changing the `status` of any other Student_Module_Enrollment.
5. WHEN an admin pauses a module using the module management interface, THE Enrollment_Action SHALL execute without changing the `status` of any other Student_Module_Enrollment.