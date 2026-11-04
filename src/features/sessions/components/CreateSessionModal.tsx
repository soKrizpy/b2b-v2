// src/features/sessions/components/CreateSessionModal.tsx
// Floating create button + modal — client component used on Admin dashboard.
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { MeetingForm } from "./MeetingForm";
import { Button } from "@/components/ui/Button";
import type { TeacherOption, StudentOption } from "@/features/sessions/queries";

interface Props { teachers: TeacherOption[]; students: StudentOption[] }

export function CreateSessionModal({ teachers, students }: Props) {
  const router   = useRouter();
  const [open, setOpen] = useState(false);
  const handleSuccess = useCallback(() => { setOpen(false); router.refresh(); }, [router]);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2 shadow-lg shadow-indigo-200/80 dark:shadow-indigo-950/40 px-5 py-2.5">
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
        </svg>
        Buat Jadwal
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Buat Jadwal Kelas" size="lg">
        <MeetingForm mode="create" teachers={teachers} students={students} onSuccess={handleSuccess} />
      </Modal>
    </>
  );
}
