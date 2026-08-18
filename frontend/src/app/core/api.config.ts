// Frontend y API comparten origen: en Docker nginx enruta /api y /oauth2 al backend,
// y en `ng serve` lo hace el proxy de desarrollo (proxy.conf.json).
export const API_BASE_URL = '';

/** Devuelve true si la URL apunta a nuestra API (y no a un tercero como Google). */
export function isApiUrl(url: string): boolean {
  return url.startsWith('/api/');
}
