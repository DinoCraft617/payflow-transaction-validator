// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

// Configura el exportador para enviar trazas a Tempo
const traceExporter = new OTLPTraceExporter({
  url: 'http://tempo:4318/v1/traces', // Dirección interna de Docker
});

const sdk = new NodeSDK({
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: 'payflow-transaction-validator', // Nombre que saldrá en Grafana
});

// Iniciar el rastreo
try {
  sdk.start();
  console.log('Tracing inicializado correctamente y enviando a Tempo');
} catch (error) {
  console.error('Error al iniciar tracing:', error);
}

// Manejo de cierre limpio
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminado'))
    .catch((error) => console.log('Error terminando tracing', error))
    .finally(() => process.exit(0));
});