export const questionImageExtensions = ['png', 'svg', 'jpg', 'jpeg', 'webp', 'avif', 'gif'];
export const questionImageGlob = `questions/**/*.{${questionImageExtensions.join(',')}}`;
export const pwaPrecacheGlobPatterns = [
  `**/*.{html,js,css,webmanifest,${questionImageExtensions.join(',')}}`,
];
export const maximumQuestionImageBytes = 2 * 1024 * 1024;

export function isQuestionImagePath(src) {
  return (
    typeof src === 'string' &&
    /^questions\/(sc|nw)\/(a1|a2)\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(png|svg|jpg|jpeg|webp|avif|gif)$/.test(
      src,
    )
  );
}

export function questionImageUrl(src, base) {
  return isQuestionImagePath(src) ? `${base.endsWith('/') ? base : `${base}/`}${src}` : undefined;
}
