import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { chatWithTutor } from '@/features/ai/actions';
import { TeacherAdminChatbot } from '@/features/ai/components/TeacherAdminChatbot';

vi.mock('@/features/ai/actions', () => ({
  chatWithTutor: vi.fn(),
}));

describe('TeacherAdminChatbot failure and retry behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  async function openAndSend(message: string) {
    render(<TeacherAdminChatbot role="teacher" />);
    fireEvent.click(
      screen.getByRole('button', { name: /Buka Byte Copilot AI untuk Guru dan Admin/i })
    );
    const input = screen.getByPlaceholderText(/Tanya ide kurikulum, kuis, atau evaluasi Guru/i);
    fireEvent.change(input, { target: { value: message } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Pesan' }));
    return input;
  }

  it('shows a generic failure and restores manually typed text when the server action rejects', async () => {
    const message = 'Bantu susun tiga soal Scratch.';
    vi.mocked(chatWithTutor).mockRejectedValueOnce(new Error('transport failure'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const input = await openAndSend(message);

    await waitFor(() => {
      expect(screen.getByText(/Layanan AI gagal merespons/i)).toBeInTheDocument();
    });
    expect(input).toHaveValue(message);
    expect(screen.queryByText(message)).not.toBeInTheDocument();
  });

  it('restores manually typed text when the action returns an error result', async () => {
    const message = 'Bantu susun tiga soal Scratch.';
    vi.mocked(chatWithTutor).mockResolvedValueOnce({
      success: false,
      error: 'Layanan sedang tidak tersedia.',
    } as never);

    const input = await openAndSend(message);

    await waitFor(() => {
      expect(screen.getByText('Layanan sedang tidak tersedia.')).toBeInTheDocument();
    });
    expect(input).toHaveValue(message);
    expect(screen.queryByText(message)).not.toBeInTheDocument();
  });

  it('appends a successful answer and leaves the input empty', async () => {
    const message = 'Jelaskan variabel untuk pemula.';
    vi.mocked(chatWithTutor).mockResolvedValueOnce({
      success: true,
      data: 'Variabel adalah tempat menyimpan nilai.',
    } as never);

    const input = await openAndSend(message);

    await waitFor(() => {
      expect(screen.getByText('Variabel adalah tempat menyimpan nilai.')).toBeInTheDocument();
    });
    expect(input).toHaveValue('');
    expect(screen.getByText(message)).toBeInTheDocument();
  });
});
