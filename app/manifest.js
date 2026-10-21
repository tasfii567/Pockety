export default function manifest() {
  return {
    name: 'Pocket Pop', short_name: 'Pocket Pop', start_url: '/', display: 'standalone',
    background_color: '#F3EDFF', theme_color: '#6C3BFF',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
  };
}
