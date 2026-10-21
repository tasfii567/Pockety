import { Fredoka, Nunito } from 'next/font/google';
import './globals.css';

const head = Fredoka({ subsets: ['latin'], variable: '--fh' });
const body = Nunito({ subsets: ['latin'], variable: '--fb' });

export const metadata = { title: 'Pocket Pop', description: 'Colorful money tracker with daily reminders' };
export const viewport = { themeColor: '#6C3BFF', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${head.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
