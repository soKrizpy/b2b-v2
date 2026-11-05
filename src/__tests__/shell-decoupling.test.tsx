// src/__tests__/shell-decoupling.test.tsx
// Verifies that DashboardAppShell is feature-agnostic — no AI import, supports
// the headerExtras slot, and renders correctly with and without extras.

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';

// Mock next/navigation and next/image before importing the shell.
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/dashboard' }));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement('img', { src, alt }),
}));

// Mock the motion library to avoid framer-motion complexity in tests.
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('div', props, children),
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('span', props, children),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<unknown>) =>
    React.createElement(React.Fragment, null, children),
}));

// Mock auth components.
vi.mock('@/features/auth/components/SignOutButton', () => ({
  SignOutButton: () => React.createElement('button', null, 'Sign Out'),
}));

vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => React.createElement('div', { 'data-testid': 'theme-toggle' }),
}));

const SHELL_PATH = path.resolve(
  __dirname,
  '..',
  'components',
  'DashboardAppShell.tsx'
);

describe('DashboardAppShell — feature decoupling', () => {
  const source = fs.readFileSync(SHELL_PATH, 'utf-8');

  it('does not import from @/features/ai', () => {
    expect(source).not.toMatch(/@\/features\/ai/);
    expect(source).not.toMatch(/TeacherAdminChatbot/);
  });

  it('accepts an optional headerExtras prop', () => {
    expect(source).toMatch(/headerExtras\?/);
  });

  it('renders the headerExtras slot when provided', async () => {
    const { DashboardAppShell } = await import('@/components/DashboardAppShell');
    const { container } = render(
      React.createElement(DashboardAppShell, {
        role: 'admin' as const,
        fullName: 'Test Admin',
        currentPath: '/admin/dashboard',
        headerExtras: React.createElement('div', { 'data-testid': 'extra-slot' }, 'AI Chatbot'),
      }, 'Content')
    );
    expect(screen.getByTestId('extra-slot')).toBeDefined();
    expect(container.textContent).toContain('AI Chatbot');
  });

  it('renders without headerExtras (no crash)', async () => {
    const { DashboardAppShell } = await import('@/components/DashboardAppShell');
    const { container } = render(
      React.createElement(DashboardAppShell, {
        role: 'teacher' as const,
        fullName: 'Test Teacher',
        currentPath: '/teacher/dashboard',
      }, 'Content')
    );
    expect(container.textContent).toContain('Content');
  });
});

describe('src/components/ directory — no feature imports', () => {
  const componentsDir = path.resolve(__dirname, '..', 'components');

  it('contains no import from @/features/ai', () => {
    const files = fs.readdirSync(componentsDir).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));
    for (const file of files) {
      const filePath = path.join(componentsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).not.toMatch(/@\/features\/ai/);
    }
  });
});
