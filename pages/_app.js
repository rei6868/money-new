import Head from 'next/head';
import { useRouter } from 'next/router';

import { AuthProvider } from '../context/AuthContext';
import AppShell from '../components/layout/AppShell/AppShell';

import '../styles/design/tokens.css';
import '../styles/globals.css';

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // If on the login page, render page without the shell
  if (router.pathname === '/login') {
    return (
      <AuthProvider>
        <Head>
          <title>Money Flow</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.png" type="image/png" />
          <link rel="manifest" href="/site.webmanifest" />
          <meta name="theme-color" content="#0f172a" />
        </Head>
        <Component {...pageProps} />
      </AuthProvider>
    );
  }

  // For all other pages, wrap them in the main AppShell
  return (
    <AuthProvider>
      <Head>
        <title>Money Flow</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#0f172a" />
      </Head>
      <AppShell>
        <Component {...pageProps} />
      </AppShell>
    </AuthProvider>
  );
}
