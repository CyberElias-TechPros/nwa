import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://naweagree.app';
  const pages = ['', '/how', '/about', '/principles', '/privacy', '/terms', '/safety', '/new'];
  return pages.map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
    changeFrequency: p === '' ? 'weekly' : 'monthly',
    priority: p === '' ? 1 : p === '/how' || p === '/new' ? 0.8 : 0.5,
  }));
}
