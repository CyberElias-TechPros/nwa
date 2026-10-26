import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main style={{ padding: 32, maxWidth: 480, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>You're offline</h1>
      <p>NaWeAgree needs a connection to load or update plans right now. Reconnect and try again.</p>
      <p>Already-loaded plans will come back once you're online. Your responses are stored locally until they can be sent (W10).</p>
      <p>
        <Link href="/">Try home</Link>
      </p>
    </main>
  );
}
