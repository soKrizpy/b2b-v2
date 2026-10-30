'use server';
// src/features/ai/actions.ts
// All Gemini Server Actions for the LMS:
//   1. generateCurriculum   — admin: generate full topic JSON from title+level
//   2. explainQuizAnswer    — student: deeper explanation for a wrong quiz answer
//   3. draftProgressReport  — teacher/admin: draft session progress report
//   4. chatWithTutor        — student: topic-aware AI tutor message

import {
  ai,
  GEMINI_FLASH_MODEL,
  FALLBACK_GEMINI_MODELS,
  hasGeminiApiKey,
  generateContentWithFallback,
} from '@/features/ai/gemini';
import { requireAdmin, getAuthUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import {
  curriculumJsonSchema,
  normalizeTopicChallenges,
  encodeFinalAssessment,
  finalAssessmentSchema,
} from '@/features/curriculum/validation';

export type AiResult<T = string> =
  | { success: true;  data: T }
  | { success: false; error: string };

// ── 1. generateCurriculum ─────────────────────────────────────────────────────
// Generates a single-topic JSON payload (nodes + quiz + challenge) ready to
// paste into the Module Builder import textarea.

export async function generateCurriculum(
  _prev: AiResult | null,
  formData: FormData
): Promise<AiResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };
  if (!hasGeminiApiKey()) {
    return { success: false, error: 'Fitur AI belum dikonfigurasi (GEMINI_API_KEY belum tersedia).' };
  }

  const topicTitle  = (formData.get('topic_title')  as string | null)?.trim();
  const level       = (formData.get('level')        as string | null)?.trim() ?? 'beginner';
  const moduleTitle = (formData.get('module_title') as string | null)?.trim() ?? 'Modul';
  const lang        = 'Bahasa Indonesia';

  if (!topicTitle) return { success: false, error: 'Judul topik wajib diisi.' };

  const prompt = `
You are an expert educational content creator for a kids & teens coding LMS called Bits2Bytes.
Generate a complete curriculum topic JSON for the following:

Topic Title: "${topicTitle}"
Module: "${moduleTitle}"
Level: ${level}
Language: ${lang}

Return ONLY valid JSON matching this exact schema (no markdown, no code block):
{
  "module_title": "${moduleTitle}",
  "module_order": 0,
  "level": "${level}",
  "gamification_type": "mimo",
  "topics": [
    {
      "topic_title": "${topicTitle}",
      "topic_order": 0,
      "description": "<2-3 sentence topic overview in ${lang}>",
      "nodes": [
        {
          "node_id": "node-01",
          "order": 0,
          "type": "lesson",
          "title": "Slide 1: Konsep dasar",
          "content": "Penjelasan yang jelas, bertahap, dan sesuai usia 10-16 tahun dalam Bahasa Indonesia.",
          "xp": 10
        },
        {
          "node_id": "node-02",
          "order": 1,
          "type": "theory",
          "title": "Slide 2: Konsep lanjutan",
          "content": "Penjelasan yang jelas, bertahap, dan sesuai usia 10-16 tahun dalam Bahasa Indonesia.",
          "xp": 10
        },
        {
          "node_id": "node-03",
          "order": 2,
          "type": "code",
          "title": "Slide 3: Contoh kode",
          "content": "Pengantar contoh kode yang dijelaskan bertahap dalam Bahasa Indonesia.",
          "code_content": "<kode contoh yang valid>",
          "code_language": "text",
          "xp": 10
        },
        {
          "node_id": "node-04",
          "order": 3,
          "type": "practice",
          "title": "Slide 4: Latihan pemahaman",
          "instructions": "Latihan pemahaman singkat tentang konsep slide ini.",
          "options": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
          "correct_option": "Pilihan A",
          "xp": 15
        },
        {
          "node_id": "node-05",
          "order": 4,
          "type": "lesson",
          "title": "Slide 5: Penerapan konsep",
          "content": "Penjelasan yang jelas, bertahap, dan sesuai usia 10-16 tahun dalam Bahasa Indonesia.",
          "xp": 10
        },
        {
          "node_id": "node-06",
          "order": 5,
          "type": "theory",
          "title": "Slide 6: Kesalahan umum",
          "content": "Penjelasan yang jelas, bertahap, dan sesuai usia 10-16 tahun dalam Bahasa Indonesia.",
          "xp": 10
        },
        {
          "node_id": "node-07",
          "order": 6,
          "type": "code",
          "title": "Slide 7: Eksperimen kode",
          "content": "Pengantar contoh kode yang dijelaskan bertahap dalam Bahasa Indonesia.",
          "code_content": "<kode contoh yang valid>",
          "code_language": "text",
          "xp": 10
        },
        {
          "node_id": "node-08",
          "order": 7,
          "type": "practice",
          "title": "Slide 8: Tantangan mini",
          "instructions": "Latihan pemahaman singkat tentang konsep slide ini.",
          "options": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
          "correct_option": "Pilihan A",
          "xp": 15
        },
        {
          "node_id": "node-09",
          "order": 8,
          "type": "lesson",
          "title": "Slide 9: Rangkuman",
          "content": "Penjelasan yang jelas, bertahap, dan sesuai usia 10-16 tahun dalam Bahasa Indonesia.",
          "xp": 10
        },
        {
          "node_id": "node-10",
          "order": 9,
          "type": "challenge",
          "title": "Slide 10: Challenge proyek",
          "instructions": "Langkah proyek, kriteria keberhasilan, dan instruksi mengirim URL proyek publik.",
          "xp": 30
        }
      ],
      "quiz": [
        {
          "question": "<question 1 in ${lang}>",
          "options": ["A", "B", "C", "D"],
          "answer_index": 0,
          "explanation": "<why option A is correct, in ${lang}>"
        },
        {
          "question": "<question 2 in ${lang}>",
          "options": ["A", "B", "C", "D"],
          "answer_index": 1,
          "explanation": "<why option B is correct, in ${lang}>"
        },
        {
          "question": "<question 3 in ${lang}>",
          "options": ["A", "B", "C", "D"],
          "answer_index": 2,
          "explanation": "<why option C is correct, in ${lang}>"
        },
        {
          "question": "<question 4 in ${lang}>",
          "options": ["A", "B", "C", "D"],
          "answer_index": 3,
          "explanation": "<why option D is correct, in ${lang}>"
        },
        {
          "question": "<question 5 in ${lang}>",
          "options": ["A", "B", "C", "D"],
          "answer_index": 0,
          "explanation": "<why option A is correct, in ${lang}>"
        }
      ],
      "challenge": {
        "title": "Mini Project: <project name>",
        "instructions": "<project description and acceptance criteria in ${lang}>",
        "submission_type": "link",
        "xp": 30
      }
    }
  ]
}

STRICT CONTENT RULES:
- Generate between 10 and 20 learning slides for this topic (inclusive), represented as 10–20 items in the schema \`nodes\` array. Each node is one structured learning slide/card; do not add a separate \`slides\` field because the import schema is strict. Include a meaningful mix of lesson/theory, code, practice, and at least one challenge node.
- Generate exactly 5 quiz questions for this topic. Each question must have exactly 4 options, one correct answer_index (0-3), and a meaningful explanation.
- Keep the module final exam separate from topic quizzes. Do not create a per-topic exam. The platform has a separate module-level \`final_assessment\` with exactly 20 questions; it must unlock only after the student completes every published topic in the module and assess the combined learning outcomes across all topics. This endpoint generates one topic at a time, so do not fabricate a module-wide \`final_assessment\` from this single topic. Keep the JSON compatible with the strict curriculum import schema.
- Keep the challenge submission_type as "link"; students must submit a working public project URL.
Make the content engaging, age-appropriate (10-16 years old), and educational.
All text must be in ${lang}.
Return ONLY the JSON object, nothing else.
`.trim();

  try {
    const text = await generateContentWithFallback({
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.9,
        responseMimeType: 'application/json',
      },
    });

    // Strip any markdown code block wrapping if present
    const clean = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Validate the generated JSON against the same strict import contract used by the Module Builder.
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(clean);
    } catch {
      return { success: false, error: 'Gemini mengembalikan JSON yang tidak valid. Silakan generate ulang.' };
    }

    const validated = curriculumJsonSchema.safeParse(parsedJson);
    if (!validated.success) {
      const issue = validated.error.issues[0];
      return {
        success: false,
        error: `Materi dari Gemini belum memenuhi aturan 10–20 node dan tepat 5 quiz: ${issue?.message ?? 'struktur tidak valid'}.`,
      };
    }

    const generatedTopics = validated.data.flatMap((module) => module.topics);
    const missingLinkChallenge = generatedTopics.some((topic) => {
      const challenges = normalizeTopicChallenges(topic.challenge);
      return !topic.nodes.some((node) => node.type === 'challenge')
        || !challenges?.length
        || challenges.some((challenge) => challenge.submission_type !== 'link');
    });
    if (missingLinkChallenge) {
      return {
        success: false,
        error: 'Setiap topik hasil AI wajib memiliki node challenge dan challenge dengan submission_type "link". Silakan generate ulang.',
      };
    }

    return { success: true, data: clean };
  } catch (err) {
    console.error('[generateCurriculum]', err);
    return { success: false, error: 'Gagal menghasilkan konten kurikulum. Coba lagi.' };
  }
}

// ── 2. generateModuleFinalAssessment ──────────────────────────────────────────
// Generates and persists a 20-question exam from every published topic in a module.

export async function generateModuleFinalAssessment(
  moduleId: number
): Promise<AiResult<{ topicCount: number; questionCount: number }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };
  if (!hasGeminiApiKey()) {
    return { success: false, error: 'Fitur AI belum dikonfigurasi (GEMINI_API_KEY belum tersedia).' };
  }
  if (!Number.isSafeInteger(moduleId) || moduleId <= 0) {
    return { success: false, error: 'ID modul tidak valid.' };
  }

  const db = createSupabaseAdminClient();
  const [{ data: moduleRow, error: moduleError }, { data: topicRows, error: topicsError }] = await Promise.all([
    db.from('modules').select('id, title, description').eq('id', moduleId).maybeSingle(),
    db.from('topics')
      .select('id, title, description, lesson_content, status, order_index')
      .eq('module_id', moduleId)
      .eq('status', 'published')
      .order('order_index', { ascending: true })
      .order('id', { ascending: true }),
  ]);

  if (moduleError || !moduleRow) {
    return { success: false, error: moduleError?.message ?? 'Modul tidak ditemukan.' };
  }
  if (topicsError) {
    return { success: false, error: `Gagal membaca topik modul: ${topicsError.message}` };
  }

  const publishedTopics = topicRows ?? [];
  if (publishedTopics.length === 0) {
    return { success: false, error: 'Belum ada topik berstatus published. Terbitkan topik terlebih dahulu.' };
  }

  const topicContext = publishedTopics.map((topic, index) => {
    const lessonContent = topic.lesson_content && typeof topic.lesson_content === 'object'
      ? topic.lesson_content as Record<string, unknown>
      : {};
    const nodes = Array.isArray(lessonContent.learningPath)
      ? lessonContent.learningPath
      : [];
    const nodeSummaries = nodes.map((rawNode) => {
      if (!rawNode || typeof rawNode !== 'object') return '';
      const node = rawNode as Record<string, unknown>;
      return [
        typeof node.title === 'string' ? node.title : '',
        typeof node.content === 'string' ? node.content : '',
        typeof node.instructions === 'string' ? node.instructions : '',
        typeof node.code_content === 'string' ? node.code_content : '',
      ].filter(Boolean).join(' — ');
    }).filter(Boolean);
    const quizQuestions = Array.isArray(lessonContent.quiz)
      ? lessonContent.quiz.map((rawQuestion) => {
          if (!rawQuestion || typeof rawQuestion !== 'object') return '';
          const question = rawQuestion as Record<string, unknown>;
          return typeof question.question === 'string' ? question.question : '';
        }).filter(Boolean)
      : [];

    return [
      `TOPIK ${index + 1}: ${topic.title}`,
      topic.description ? `Ringkasan: ${topic.description}` : '',
      'Materi inti:',
      ...nodeSummaries,
      'Pokok kuis:',
      ...quizQuestions,
    ].filter(Boolean).join('\n');
  }).join('\n\n').slice(0, 24000);

  const prompt = `
Kamu adalah penyusun asesmen kompetensi untuk LMS coding Bits2Bytes.
Susun UJIAN AKHIR MODUL berdasarkan seluruh topik published di bawah ini.
Nama modul: "${moduleRow.title}"
Jumlah topik yang wajib tercakup: ${publishedTopics.length}

KONTEKS MATERI:
${topicContext}

Keluarkan HANYA JSON valid dengan struktur persis:
{
  "title": "Ujian Akhir Modul: ${moduleRow.title}",
  "duration_minutes": 40,
  "questions": [
    {
      "id": 1,
      "question": "Pertanyaan...",
      "options": ["A", "B", "C", "D"],
      "answer_index": 0,
      "explanation": "Penjelasan..."
    }
  ]
}

ATURAN WAJIB:
- Tepat 20 soal, id berurutan 1 sampai 20.
- Setiap soal harus memiliki tepat 4 opsi, satu answer_index bernilai 0 sampai 3, dan explanation yang menjelaskan alasan jawaban benar.
- Sebarkan cakupan secara proporsional ke SELURUH ${publishedTopics.length} topik di atas. Jangan hanya menguji topik pertama atau topik terakhir.
- Uji pemahaman konsep, penerapan, penalaran, membaca/memperbaiki kode, dan pemecahan masalah sesuai materi yang benar-benar diajarkan.
- Jangan memasukkan konsep, sintaks, atau jawaban yang tidak didukung materi modul.
- Jangan menyalin mentah soal kuis topik; buat soal ujian gabungan yang mengukur pemahaman lintas topik.
- Bahasa Indonesia, jelas, ramah usia 10–16 tahun, tidak ambigu, dan tidak menggunakan pilihan "semua jawaban benar".
- Distribusikan posisi jawaban benar secara bervariasi.
- Jangan menambahkan markdown, komentar, properti lain, atau teks di luar JSON.
`.trim();

  try {
    const generated = await generateContentWithFallback({
      contents: prompt,
      config: {
        temperature: 0.45,
        topP: 0.85,
        responseMimeType: 'application/json',
      },
    });
    const clean = generated
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(clean);
    } catch {
      return { success: false, error: 'Gemini mengembalikan JSON yang tidak valid. Silakan coba generate ulang.' };
    }

    const parsed = finalAssessmentSchema.safeParse(parsedJson);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: `Hasil ujian dari Gemini tidak memenuhi schema 20 soal: ${issue?.message ?? 'format tidak valid'}.`,
      };
    }

    const { error: saveError } = await db
      .from('modules')
      .update({ description: encodeFinalAssessment(parsed.data) } as never)
      .eq('id', moduleId);
    if (saveError) {
      return { success: false, error: `Ujian berhasil dibuat tetapi gagal disimpan: ${saveError.message}` };
    }

    revalidatePath(`/admin/curriculum/${moduleId}`, 'layout');
    revalidatePath('/student/lessons', 'layout');
    revalidatePath(`/student/assessment/${moduleId}`, 'layout');

    return {
      success: true,
      data: { topicCount: publishedTopics.length, questionCount: parsed.data.questions.length },
    };
  } catch (error) {
    console.error('[generateModuleFinalAssessment]', error);
    return { success: false, error: 'Gemini gagal menyusun ujian akhir modul. Silakan coba lagi.' };
  }
}

// ── 3. explainQuizAnswer ──────────────────────────────────────────────────────
// Returns a richer, conversational explanation for a quiz question the student
// got wrong. No auth restriction — student role check via getAuthUser.

export async function explainQuizAnswer(
  _prev: AiResult | null,
  formData: FormData
): Promise<AiResult> {
  const auth = await getAuthUser();
  if (!auth.ok) return { success: false, error: 'Tidak terautentikasi.' };
  if (!hasGeminiApiKey()) {
    return { success: false, error: 'Fitur AI belum dikonfigurasi (GEMINI_API_KEY belum tersedia).' };
  }

  const question    = (formData.get('question')     as string | null)?.trim();
  const wrongAnswer = (formData.get('wrong_answer') as string | null)?.trim();
  const rightAnswer = (formData.get('right_answer') as string | null)?.trim();
  const explanation = (formData.get('explanation')  as string | null)?.trim();
  const topicTitle  = (formData.get('topic_title')  as string | null)?.trim() ?? 'topik ini';

  if (!question || !rightAnswer) return { success: false, error: 'Data tidak lengkap.' };

  const prompt = `
Kamu adalah tutor coding yang ramah dan sabar untuk siswa berusia 10-16 tahun di platform Bits2Bytes.

Seorang siswa baru saja menjawab soal quiz tentang "${topicTitle}" dengan salah.

Pertanyaan: "${question}"
Jawaban siswa (salah): "${wrongAnswer}"
Jawaban benar: "${rightAnswer}"
Penjelasan singkat: "${explanation}"

Tolong berikan penjelasan yang lebih panjang dan mudah dipahami dalam Bahasa Indonesia:
- Gunakan analogi atau contoh nyata yang relatable untuk anak muda
- Jelaskan mengapa jawaban siswa salah dengan cara yang tidak menyalahkan
- Perkuat mengapa jawaban yang benar adalah benar
- Berikan tips supaya mereka tidak lupa lagi
- Maksimal 4 paragraf pendek
- Gunakan emoji yang relevan sesekali untuk membuat lebih engaging
- Akhiri dengan kalimat semangat
`.trim();

  try {
    const text = await generateContentWithFallback({
      contents: prompt,
      config: {
        temperature: 0.9,
        topP: 0.95,
      },
    });
    return { success: true, data: text };
  } catch (err) {
    console.error('[explainQuizAnswer]', err);
    return { success: false, error: 'Gagal mendapatkan penjelasan.' };
  }
}

// ── 4. draftProgressReport ────────────────────────────────────────────────────
// Drafts a progress report for a teacher or admin to edit before submitting.

export async function draftProgressReport(
  _prev: AiResult | null,
  formData: FormData
): Promise<AiResult> {
  const auth = await getAuthUser();
  if (!auth.ok) return { success: false, error: 'Tidak terautentikasi.' };
  if (auth.role !== 'teacher' && auth.role !== 'admin') {
    return { success: false, error: 'Akses ditolak.' };
  }
  if (!hasGeminiApiKey()) {
    return { success: false, error: 'Fitur AI belum dikonfigurasi (GEMINI_API_KEY belum tersedia).' };
  }

  const sessionTitle = (formData.get('session_title') as string | null)?.trim() ?? 'sesi ini';
  const studentNames = (formData.get('student_names') as string | null)?.trim() ?? 'siswa';
  const topicHint    = (formData.get('topic_hint')    as string | null)?.trim() ?? '';

  const prompt = `
Kamu adalah asisten guru yang membantu menulis laporan perkembangan belajar siswa.

Detail sesi:
- Judul sesi: "${sessionTitle}"
- Nama siswa: "${studentNames}"
${topicHint ? `- Materi/topik: "${topicHint}"` : ''}

Tulis laporan perkembangan dalam Bahasa Indonesia yang:
1. Dimulai dengan ringkasan topik yang dipelajari
2. Menyebutkan poin-poin positif perkembangan siswa
3. Memberikan catatan area yang perlu ditingkatkan (dengan nada positif dan konstruktif)
4. Menyertakan saran untuk latihan di rumah
5. Panjang: 3-4 paragraf
6. Nada: profesional tapi hangat, cocok dibaca orang tua
7. Jangan gunakan nama siswa jika ada lebih dari satu, gunakan "para siswa"

Tulis laporan saja, tanpa judul atau header tambahan.
`.trim();

  try {
    const text = await generateContentWithFallback({
      contents: prompt,
      config: {
        temperature: 0.9,
        topP: 0.95,
      },
    });
    return { success: true, data: text };
  } catch (err) {
    console.error('[draftProgressReport]', err);
    return { success: false, error: 'Gagal membuat draf laporan.' };
  }
}

// ── 5. chatWithTutor ──────────────────────────────────────────────────────────
// Topic-aware AI tutor. Receives the topic context + conversation history.

export interface ChatMessage {
  role:    'user' | 'model';
  content: string;
}

export async function chatWithTutor(
  _prev: AiResult | null,
  formData: FormData
): Promise<AiResult> {
  const auth = await getAuthUser();
  if (!auth.ok) return { success: false, error: 'Tidak terautentikasi.' };
  if (auth.role !== 'teacher' && auth.role !== 'admin') {
    return { success: false, error: 'Akses ditolak. Bot Chat hanya tersedia untuk guru dan admin.' };
  }

  const topicTitle   = (formData.get('topic_title')   as string | null)?.trim() ?? 'Pusat Manajemen Pembelajaran';
  const topicContext = (formData.get('topic_context') as string | null)?.trim() ?? '';
  const userMessage  = (formData.get('message')       as string | null)?.trim();
  const historyRaw   = (formData.get('history')       as string | null) ?? '[]';

  if (!userMessage) return { success: false, error: 'Pesan kosong.' };
  if (!hasGeminiApiKey()) {
    return { success: false, error: 'AI Copilot sedang tidak tersedia (GEMINI_API_KEY belum tersedia).' };
  }

  let history: ChatMessage[] = [];
  try { history = JSON.parse(historyRaw); } catch { history = []; }

  const roleLabel = auth.role === 'admin' ? 'Administrator' : 'Guru / Pengajar';
  const systemPrompt = `
Kamu adalah Byte Copilot AI, asisten kecerdasan buatan khusus untuk ${roleLabel} pada platform edukasi coding Bits2Bytes.
Konteks pengguna: ${roleLabel} (Bits2Bytes LMS).
${topicTitle && topicTitle !== 'Pusat Manajemen Pembelajaran' ? `Fokus/Topik bahasan: "${topicTitle}".` : ''}
${topicContext ? `\nKonteks materi/catatan:\n${topicContext.slice(0, 1500)}` : ''}

Peran & Tanggung Jawabmu:
- Membantu merancang kurikulum, silabus, dan ide proyek coding interaktif (Scratch, Python, Web Development, Algoritma, Game Dev, Database) untuk siswa usia 8-18 tahun.
- Membantu menyusun soal kuis, tantangan kode (challenges), dan rubrik penilaian beserta pembahasannya.
- Memberikan strategi pedagogis dan diferensiasi pembelajaran bagi siswa yang kesulitan maupun yang cepat paham.
- Membantu menyusun draf feedback laporan berkala, catatan evaluasi pertemuan, serta pesan komunikasi untuk orang tua.
- Menjawab pertanyaan seputar manajemen kelas, kurikulum, dan pengajaran teknologi secara lugas, solutif, ramah, dan profesional.

Aturan Respon:
- Gunakan Bahasa Indonesia yang profesional, ramah, dan solutif.
- Jika menyertakan kode program, gunakan format markdown code block.
- Berikan saran yang actionable dan mudah diterapkan dalam sesi bimbingan belajar.
`.trim();

  const chatConfig = {
    systemInstruction: systemPrompt,
    temperature: 0.8,
    topP: 0.95,
  };
  const chatHistory = [
    { role: 'user',  parts: [{ text: 'Halo Byte Copilot!' }] },
    { role: 'model', parts: [{ text: `Halo! Saya Byte Copilot, asisten AI khusus ${roleLabel} Bits2Bytes. Siap membantu persiapan materi belajar, bank soal kuis, maupun saran pedagogis. Ada yang bisa saya bantu hari ini? 🎓✨` }] },
    ...history.map((m) => ({
      role:  m.role as 'user' | 'model',
      parts: [{ text: m.content }],
    })),
  ];

  const candidateModels = Array.from(
    new Set([GEMINI_FLASH_MODEL, ...FALLBACK_GEMINI_MODELS])
  );

  let lastError: unknown = null;
  for (const model of candidateModels) {
    try {
      const chat = ai.chats.create({
        model,
        config: chatConfig,
        history: chatHistory,
      });

      const result = await chat.sendMessage({ message: userMessage });
      const text = (result.text ?? '').trim();
      if (text) {
        return { success: true, data: text };
      }
    } catch (err: unknown) {
      console.warn(`[chatWithTutor] Model ${model} failed, trying next candidate:`, (err as { status?: number; message?: string })?.message || err);
      lastError = err;
    }
  }

  console.error('[chatWithTutor] All candidate models failed:', lastError);
  return { success: false, error: 'Byte sedang tidak tersedia. Coba lagi sebentar.' };
}
