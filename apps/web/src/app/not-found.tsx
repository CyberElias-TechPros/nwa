import Link from 'next/link';
export default function NotFound() {
  return (
    <main>
      <h1>We couldn&apos;t find that plan.</h1>
      <p className="muted">Check the link, or <Link href="/">go home</Link>.</p>
    </main>
  );
}
