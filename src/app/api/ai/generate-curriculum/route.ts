import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { hasGeminiApiKey, generateContentWithFallback } from '@/features/ai/gemini';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.message }, { status: 403 });
    }

    if (!hasGeminiApiKey()) {
      return NextResponse.json(
        { success: false, error: 'Fitur AI belum dikonfigurasi (GEMINI_API_KEY belum tersedia).' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const topicTitle = (body.topic_title as string | undefined)?.trim();
    const level = (body.level as string | undefined)?.trim() ?? 'beginner';
    const moduleTitle = (body.module_title as string | undefined)?.trim() ?? 'Modul';
    const lang = 'Bahasa Indonesia';

    if (!topicTitle) {
      return NextResponse.json(
        { success: false, error: 'Judul topik wajib diisi.' },
        { status: 400 }
      );
    }

    const prompt = `
You are an expert curriculum designer for a youth coding platform called Bits2Bytes.
Generate a structured, engaging single-topic curriculum JSON for students (age 10-16).

Topic: "${topicTitle}"
Module: "${moduleTitle}"
Level: ${level}
Language: ${lang}

Return ONLY valid JSON matching this exact structure:
{
  "module_title": "${moduleTitle}",
  "module_order": 0,
  "level": "${level}",
  "gamification_type": "mimo",
  "topics": [
    {
      "topic_title": "${topicTitle}",
      "topic_order": 0,
      "description": "<2 concise sentences in ${lang}>",
      "nodes": [
        {
          "node_id": "node-01",
          "order": 0,
          "type": "lesson",
          "title": "<Concise Concept Title>",
          "content": "<Clear explanation, 2-3 sentences in ${lang}>",
          "xp": 10
        },
        {
          "node_id": "node-02",
          "order": 1,
          "type": "code",
          "title": "<Code Example Title>",
          "content": "<Brief 1-sentence intro>",
          "code_content": "<Concise practical code snippet>",
          "code_language": "text",
          "xp": 10
        },
        {
          "node_id": "node-03",
          "order": 2,
          "type": "practice",
          "title": "<Practice Question Title>",
          "instructions": "<Multiple choice question in ${lang}>",
          "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
          "correct_option": "Opsi A",
          "xp": 15
        },
        {
          "node_id": "node-04",
          "order": 3,
          "type": "lesson",
          "title": "<Application Lesson Title>",
          "content": "<Practical tips or deeper concept in 2-3 sentences>",
          "xp": 10
        },
        {
          "node_id": "node-05",
          "order": 4,
          "type": "challenge",
          "title": "Tantangan: <Task Title>",
          "instructions": "<Clear step-by-step student mission in ${lang}>",
          "xp": 20
        }
      ],
      "quiz": [
        {
          "question": "<Kuis 1 in ${lang}>",
          "options": ["A", "B", "C", "D"],
          "answer_index": 0,
          "explanation": "<Penjelasan singkat kenapa benar>"
        },
        {
          "question": "<Kuis 2 in ${lang}>",
          "options": ["A", "B", "C", "D"],
          "answer_index": 1,
          "explanation": "<Penjelasan singkat kenapa benar>"
        },
        {
          "question": "<Kuis 3 in ${lang}>",
          "options": ["A", "B", "C", "D"],
          "answer_index": 2,
          "explanation": "<Penjelasan singkat kenapa benar>"
        }
      ],
      "challenge": {
        "title": "Mini Proyek: <Project Name>",
        "instructions": "<Instruksi proyek singkat dan kriteria berhasil>",
        "submission_type": "link",
        "xp": 30
      }
    }
  ]
}
`.trim();

    const raw = await generateContentWithFallback({
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.9,
        responseMimeType: 'application/json',
      },
    });

    const clean = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Verify it is parseable JSON before returning
    JSON.parse(clean);

    return NextResponse.json({ success: true, data: clean });
  } catch (err: unknown) {
    console.error('[API /api/ai/generate-curriculum] Error:', err);
    const message = (err as { message?: string })?.message || 'Gagal menghasilkan kurikulum dengan AI.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
