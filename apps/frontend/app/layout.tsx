import type { ReactNode } from 'react';

export const metadata = {
  title: 'Voice Loan Assistant Dashboard',
  description: 'Monitor AI loan advisory calls and model performance.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto max-w-6xl p-6">{children}</main>
      </body>
    </html>
  );
}

