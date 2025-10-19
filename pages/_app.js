import Head from 'next/head';

import { AuthProvider } from '../context/AuthContext';

import '../styles/globals.css';

export default function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Head>
        <title>Money Flow</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon-new.ico" />
        <link rel="icon" type="image/svg+xml" href="/favicon-new.svg" />
        <link rel="apple-touch-icon" href="/icons/icon-card-192.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#0f172a" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
