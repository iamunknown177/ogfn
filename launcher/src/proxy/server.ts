import express from 'express';
import { LauncherConfig } from '../config';

const app = express();
let server: any = null;

export function startProxy(config: LauncherConfig): void {
  const settings = config.getSettings();
  const proxyPort = settings.proxyPort || 3000;
  const targetHost = settings.serverAddress || 'localhost';
  const targetPort = settings.serverPort || 8080;

  const isRemote = targetHost !== 'localhost' && targetHost !== '127.0.0.1';
  const protocol = isRemote ? 'https' : 'http';
  const baseUrl = isRemote ? `${protocol}://${targetHost}` : `${protocol}://${targetHost}:${targetPort}`;

  app.use('/fortnite/*', (req, res) => {
    const targetUrl = `${baseUrl}${req.url}`;
    console.log(`Proxying: ${req.method} ${req.url} -> ${targetUrl}`);
    res.redirect(targetUrl);
  });

  app.all('/api/*', (req, res) => {
    const targetUrl = `${baseUrl}${req.url}`;
    console.log(`API Proxy: ${req.method} ${req.url} -> ${targetUrl}`);
    res.redirect(targetUrl);
  });

  try {
    server = app.listen(proxyPort, () => {
      console.log(`Proxy server running on port ${proxyPort}`);
      console.log(`Forwarding to ${baseUrl}`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Proxy] Port ${proxyPort} in use, skipping proxy`);
        server = null;
        return;
      }
      console.error('Proxy server error:', err);
    });
  } catch (err: any) {
    if (err.code === 'EADDRINUSE') {
      console.log(`[Proxy] Port ${proxyPort} in use, skipping proxy`);
    } else {
      console.error('Proxy server error:', err);
    }
  }
}

export function stopProxy(): void {
  if (server) {
    server.close();
    server = null;
    console.log('Proxy server stopped');
  }
}
