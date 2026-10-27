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
import { moduleImportSchema } from '@/features/curriculum/validation';

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

  const topicTitle  = (formData.get('topic_title') as string | null)?.trim();
  const level       = (formData.get('level') as string | null)?.trim() ?? 'beginner';
  const moduleTitle = (formData.get('module_title') as string | null)?.trim() ?? 'Modul';
  const lang = 'Bahasa Indonesia';

  if (!topicTitle) return { success: false, error: 'Judul topik wajib diisi.' };

  const basePrompt = `
Kamu adalah perancang kurikulum coding Bits2Bytes. Buat SATU topik lengkap dan siap diimpor berdasarkan:
Judul topik: "${topicTitle}"
Modul: "${moduleTitle}"
Level: ${level}
Bahasa: ${lang}

Keluarkan HANYA JSON valid (tanpa Markdown/code fence) dengan struktur:
{
  "module_title": "${moduleTitle}",
  "module_order": 0,
  "level": "${level}",
  "gamification_type": "mimo",
  "topics": [{
    "topic_title": "${topicTitle}",
    "topic_order": 0,
    "description": "Ringkasan topik 2-3 kalimat",
    "nodes": [
      {"node_id":"node-01","order":0,"type":"lesson","title":"Konsep utama","content":"Penjelasan lengkap 3-5 kalimat dalam Bahasa Indonesia.","xp":10},
      {"node_id":"node-02","order":1,"type":"code","title":"Contoh kode","content":"Pengantar contoh.","code_content":"Kode contoh yang valid atau relevan.","code_language":"python","xp":10},
      {"node_id":"node-03","order":2,"type":"practice","title":"Latihan konsep","instructions":"Pertanyaan latihan.","options":["Pilihan A","Pilihan B","Pilihan C","Pilihan D"],"correct_option":"Pilihan A","xp":15},
      {"node_id":"node-04","order":3,"type":"lesson","title":"Langkah penerapan","content":"Uraian langkah demi langkah yang jelas.","xp":10},
      {"node_id":"node-05","order":4,"type":"code","title":"Contoh kedua","content":"Penjelasan singkat.","code_content":"Contoh kode kedua yang berbeda.","code_language":"python","xp":10},
      {"node_id":"node-06","order":5,"type":"practice","title":"Latihan penerapan","instructions":"Tugas penerapan konsep.","options":["Pilihan A","Pilihan B","Pilihan C","Pilihan D"],"correct_option":"Pilihan B","xp":15},
      {"node_id":"node-07","order":6,"type":"lesson","title":"Kesalahan umum","content":"Jelaskan jebakan umum dan cara menghindarinya.","xp":10},
      {"node_id":"node-08","order":7,"type":"code","title":"Eksperimen kecil","content":"Pengantar eksperimen.","code_content":"Kode eksperimen yang dapat dicoba.","code_language":"python","xp":10},
      {"node_id":"node-09","order":8,"type":"practice","title":"Debugging atau analisis","instructions":"Tugas analisis masalah atau debugging.","options":["Pilihan A","Pilihan B","Pilihan C","Pilihan D"],"correct_option":"Pilihan C","xp":15},
      {"node_id":"node-10","order":9,"type":"challenge","title":"Proyek mini: judul proyek","instructions":"Tugas proyek dengan hasil yang dapat diperiksa.","content":"Kriteria hasil akhir.","xp":20}
    ],
    "quiz": [
      {"question":"Soal 1 yang spesifik pada topik","options":["A","B","C","D"],"answer_index":0,"explanation":"Alasan jawaban benar."},
      {"question":"Soal 2 menguji konsep berbeda","options":["A","B","C","D"],"answer_index":1,"explanation":"Alasan jawaban benar."},
      {"question":"Soal 3 berbasis penerapan","options":["A","B","C","D"],"answer_index":2,"explanation":"Alasan jawaban benar."},
      {"question":"Soal 4 berbasis analisis","options":["A","B","C","D"],"answer_index":3,"explanation":"Alasan jawaban benar."},
      {"question":"Soal 5 menguji pemahaman menyeluruh","options":["A","B","C","D"],"answer_index":0,"explanation":"Alasan jawaban benar."}
    ],
    "challenge": {
      "title":"Proyek Mini: judul proyek sesuai topik",
      "instructions":"Deskripsi proyek, langkah pengerjaan, hasil yang dikumpulkan, dan kriteria keberhasilan yang terukur dalam Bahasa Indonesia.",
      "submission_type":"link",
      "xp":30
    }
  }]
}

ATURAN WAJIB NODE:
1. Setiap topik harus memiliki 10 sampai 20 node (inklusif). Jangan berhenti pada 5 node dan jangan membuat kurang dari 10.
2. Tentukan jumlah secara DINAMIS sesuai cakupan/kompleksitas topik dan level:
   - topik sempit/sederhana: 10-12 node;
   - topik cakupan menengah: 13-16 node;
   - topik luas, banyak subkonsep, atau level advanced: 17-20 node.
   Jangan selalu memilih jumlah yang sama; cakup subkonsep secara bertahap tanpa mengulang atau membuat node pengisi.
3. Semua node harus benar-benar ditulis lengkap dan relevan, bukan placeholder. Gunakan node_id unik node-01 hingga node-NN, order berurutan mulai dari 0 tanpa lompatan.
4. Variasikan tipe lesson, code, practice, theory/quiz jika relevan, dan challenge. Wajib ada minimal satu node bertipe "challenge" yang merupakan proyek praktik nyata. Jangan membuat node duplikat.
5. "challenge" di tingkat topik juga WAJIB berupa satu proyek nyata: instruksi harus menyebut hasil yang harus dibuat/dikumpulkan, langkah kerja, dan kriteria keberhasilan. Bukan sekadar pertanyaan atau refleksi.

ATURAN WAJIB QUIZ:
6. Buat TEPAT 5 soal pilihan ganda (bukan 3), berbeda satu sama lain dan mencakup konsep, penerapan, analisis, serta pemahaman topik.
7. Setiap soal harus memiliki tepat 4 opsi non-kosong, answer_index bilangan bulat 0-3 yang sesuai dengan jawaban yang benar, dan explanation dalam Bahasa Indonesia.
8. Konten berbahasa Indonesia, sesuai level ${level}, edukatif, akurat, konkret, dan tidak mengulang pertanyaan/opsi sekadar untuk memenuhi jumlah.
Keluarkan seluruh JSON dan tidak ada teks lain.
`.trim();

  let lastValidationError = 'Respons AI tidak valid.';
  try {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const retryInstruction = attempt === 1
        ? ''
        : `\n\nPERBAIKI OUTPUT SEBELUMNYA. Kesalahan validasi: ${lastValidationError}. Keluarkan ulang JSON LENGKAP yang valid, bukan hanya bagian yang salah. Pastikan 10-20 node, tepat 5 soal, dan proyek challenge lengkap.`;
      const text = await generateContentWithFallback({
        contents: `${basePrompt}${retryInstruction}`,
        config: {
          temperature: 0.6,
          topP: 0.85,
          maxOutputTokens: 8192,
        },
      });

      const clean = text
        .replace(new RegExp('^\\x60\\x60\\x60json\\s*', 'i'), '')
        .replace(new RegExp('^\\x60\\x60\\x60\\s*', 'i'), '')
        .replace(new RegExp('\\s*\\x60\\x60\\x60$'), '')
        .trim();

      let parsed: unknown;
      try {
        parsed = JSON.parse(clean);
      } catch {
        lastValidationError = 'Respons bukan JSON valid.';
        continue;
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        lastValidationError = 'Akar JSON harus berupa object modul.';
        continue;
      }

      const moduleObject = parsed as Record<string, unknown>;
      const topics = moduleObject.topics;
      if (!Array.isArray(topics) || topics.length !== 1 || !topics[0] || typeof topics[0] !== 'object' || Array.isArray(topics[0])) {
        lastValidationError = 'JSON wajib memuat tepat satu topik.';
        continue;
      }

      const topic = topics[0] as Record<string, unknown>;
      if (!Array.isArray(topic.nodes) || topic.nodes.length < 10 || topic.nodes.length > 20) {
        lastValidationError = `Jumlah node harus 10-20; AI menghasilkan ${Array.isArray(topic.nodes) ? topic.nodes.length : 0}.`;
        continue;
      }
      if (!Array.isArray(topic.quiz) || topic.quiz.length !== 5) {
        lastValidationError = `Quiz harus tepat 5 soal pilihan ganda; AI menghasilkan ${Array.isArray(topic.quiz) ? topic.quiz.length : 0}.`;
        continue;
      }
      const hasProjectNode = topic.nodes.some((node) =>
        Boolean(node && typeof node === 'object' && !Array.isArray(node)
          && (node as Record<string, unknown>).type === 'challenge')
      );
      if (!hasProjectNode) {
        lastValidationError = 'Nodes wajib menyertakan satu node bertipe challenge/proyek.';
        continue;
      }
      const challenge = topic.challenge && typeof topic.challenge === 'object' && !Array.isArray(topic.challenge)
        ? topic.challenge as Record<string, unknown>
        : null;
      const projectText = `${String(challenge?.title ?? '')} ${String(challenge?.instructions ?? '')}`.toLowerCase();
      if (!challenge || !/(proyek|project)/i.test(projectText)) {
        lastValidationError = 'Challenge tingkat topik wajib berupa proyek nyata dengan instruksi dan kriteria keberhasilan.';
        continue;
      }

      const normalizedPayload = {
        ...moduleObject,
        topics: [{
          ...topic,
          nodes: topic.nodes.map((node, index) => ({
            ...(node && typeof node === 'object' && !Array.isArray(node) ? node as Record<string, unknown> : {}),
            node_id: `node-${String(index + 1).padStart(2, '0')}`,
            order: index,
          })),
        }],
      };
      const validation = moduleImportSchema.safeParse(normalizedPayload);
      if (!validation.success) {
        lastValidationError = validation.error.issues
          .slice(0, 3)
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('; ');
        continue;
      }

      return { success: true, data: JSON.stringify(validation.data) };
    }

    return {
      success: false,
      error: `Generator belum menghasilkan kurikulum sesuai aturan (10–20 node, tepat 5 soal pilihan ganda, dan proyek challenge) setelah 3 percobaan. Coba generate ulang. Detail: ${lastValidationError}`,
    };
  } catch (err) {
    console.error('[generateCurriculum]', err);
    return { success: false, error: 'Gagal menghasilkan konten kurikulum. Coba lagi.' };
  }
}

// ── 2. explainQuizAnswer ──────────────────────────────────────────────────────
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

// ── 3. draftProgressReport ────────────────────────────────────────────────────
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

// ── 4. chatWithTutor ──────────────────────────────────────────────────────────
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
