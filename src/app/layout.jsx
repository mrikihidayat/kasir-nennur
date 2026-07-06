import './globals.css';
import PWAInstall from '@/components/PWAInstall';

export const metadata = {
  title: 'Kasir Warung Ibu Eni',
  description: 'Dashboard Admin Kasir Lauk Pauk',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kasir Lauk',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export const viewport = {
  themeColor: '#7e22ce',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="bg-gray-100 min-h-screen">
        <PWAInstall />
        {children}
      </body>
    </html>
  );
}
