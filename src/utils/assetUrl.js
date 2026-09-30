// The same build works at the domain root and under the Pages tools directory.
export const basePath = new URL(document.querySelector('script[data-atlas]').src).pathname.replace(
  /\/bundle\.js$/,
  ''
);
export default function assetUrl(file) {
  return `${basePath}/${file}`;
}
