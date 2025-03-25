import html from './index.html';
import qrscript from './qr.js';

export default {
    async fetch(request: Request): Promise<Response> {
      if (request.url.endsWith('/qr.js')) {
          return new Response(qrscript, {
              headers: { "Content-Type": "application/javascript" },
          });
      }
      return new Response(html, {
          headers: { 'Content-Type': 'text/html' },
      });
    },
};
