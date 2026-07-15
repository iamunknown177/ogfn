import express from 'express';
import { LauncherConfig } from '../config';

const app = express();
let server: any = null;

export function startProxy(config: LauncherConfig): void {
  const settings = config.getSettings();
  const proxyPort = settings.proxyPort || 3000;
  const targetHost = settings.serverAddress || 'localhost';
  const targetPort = settings.serverPort || 8080;

  app.use('/fortnite/*', (req, res) => {
    const targetUrl = `http://${targetHost}:${targetPort}${req.url}`;
    
    console.log(`Proxying: ${req.method} ${req.url} -> ${targetUrl}`);
    
    res.redirect(targetUrl);
  });

  app.all('/api/*', (req, res) => {
    const targetUrl = `http://${targetHost}:${targetPort}${req.url}`;
    
    console.log(`API Proxy: ${req.method} ${req.url} -> ${targetUrl}`);
    
    res.redirect(targetUrl);
  });

  server = app.listen(proxyPort, () => {
    console.log(`Proxy server running on port ${proxyPort}`);
    console.log(`Forwarding to ${targetHost}:${targetPort}`);
  });

  server.on('error', (err: any) => {
    console.error('Proxy server error:', err);
  });
}

export function stopProxy(): void {
  if (server) {
    server.close();
    server = null;
    console.log('Proxy server stopped');
  }
}