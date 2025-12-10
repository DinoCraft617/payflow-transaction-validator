// app.js
require('./tracing');
const express = require('express');
const promClient = require('prom-client');
const app = express();
const port = process.env.PORT || 3000;

// --- 1. Configuración de Métricas (Prometheus) [cite: 37] ---
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Métrica personalizada: Latencia de transacciones [cite: 39]
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de las peticiones HTTP en segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.2, 0.5, 1, 1.5]
});
register.registerMetric(httpRequestDuration);

// Métrica personalizada: Contador de errores [cite: 42]
const errorCounter = new promClient.Counter({
  name: 'transaction_errors_total',
  help: 'Total de errores en transacciones',
  labelNames: ['type']
});
register.registerMetric(errorCounter);

// --- 2. Middleware de Logging JSON [cite: 7, 50] ---
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Registrar métrica de latencia
    httpRequestDuration.labels(req.method, req.path, res.statusCode).observe(duration / 1000);
    
    // Log estructurado en JSON
    console.log(JSON.stringify({
      level: res.statusCode >= 500 ? 'ERROR' : 'INFO',
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration,
      service: 'transaction-validator'
    }));
  });
  next();
});

// --- 3. Endpoints del Negocio ---

// Endpoint crítico: Validar Transacción
app.post('/validate', (req, res) => {
  // Simulación de "Latencia en horarios pico" [cite: 5]
  const delay = Math.random() * 600; // Random entre 0 y 600ms
  
  setTimeout(() => {
    // Simulación de "Errores 500" esporádicos [cite: 6]
    if (Math.random() < 0.1) { // 10% de fallo
      errorCounter.inc({ type: 'db_connection' });
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.status(200).json({ status: 'approved', id: Math.floor(Math.random() * 10000) });
  }, delay);
});

// Endpoint de Métricas para Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Endpoint de Salud (Vital para el Blue/Green)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.listen(port, () => {
  console.log(JSON.stringify({ level: 'INFO', message: `Servidor iniciado en puerto ${port}` }));
});