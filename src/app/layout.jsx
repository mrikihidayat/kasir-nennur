import './globals.css';

export const metadata = {
  title: 'Kasir Warung Ibu Eni',
  description: 'Dashboard Admin Kasir Lauk Pauk',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="bg-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
