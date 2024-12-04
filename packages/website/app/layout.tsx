import './globals.css';
import localFont from 'next/font/local';
import Header from '../components/header';
import Footer from '../components/footer';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata = {
  title: 'React Scan',
  description: 'scan ur app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="px-8 sm:px-20 pt-20 pb-4 max-w-[700px] mx-auto ">
          <Header />
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
