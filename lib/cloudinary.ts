/**
 * Resolves a Cloudinary image URL with sensible defaults.
 * Adds automatic format and quality parameters when missing and
 * returns a safe fallback gradient when the source is undefined.
 */
export function resolveCloudinaryImage(source?: string | null, fallback = 'linear-gradient(135deg, #4959c5, #7f8fe6)'): string {
  if (!source) {
    return fallback;
  }

  try {
    const url = new URL(source, source.startsWith('http') ? undefined : 'https://res.cloudinary.com/');
    if (!url.pathname.includes('/image/upload/')) {
      return `url(${url.toString()})`;
    }

    const segments = url.pathname.split('/');
    const uploadIndex = segments.findIndex((segment) => segment === 'upload');
    if (uploadIndex !== -1) {
      const transformationSegment = segments[uploadIndex + 1];
      if (!transformationSegment || transformationSegment === '') {
        segments.splice(uploadIndex + 1, 0, 'f_auto,q_auto');
      } else if (!transformationSegment.includes('f_auto')) {
        segments[uploadIndex + 1] = `f_auto,q_auto,${transformationSegment}`;
      }
      url.pathname = segments.join('/');
    }
    return `url(${url.toString()})`;
  } catch {
    return `url(${source})`;
  }
}

export function stripCloudinaryDomain(source?: string | null): string | null {
  if (!source) {
    return null;
  }
  try {
    const url = new URL(source, source.startsWith('http') ? undefined : 'https://res.cloudinary.com/');
    return url.toString();
  } catch {
    return source;
  }
}
