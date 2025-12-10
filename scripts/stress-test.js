import http from 'k6/http';
import { sleep, check } from 'k6';

// Configuración de la carga: sube a 50 usuarios en 1 minuto
export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Calentamiento
    { duration: '1m', target: 50 },  // Carga alta (stress)
    { duration: '30s', target: 0 },  // Enfriamiento
  ],
};

export default function () {
  // Petición al endpoint de tu microservicio
  const payload = JSON.stringify({
    amount: Math.floor(Math.random() * 1000),
    currency: 'MXN'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Nginx está en localhost puerto 80
  const res = http.post('http://localhost/validate', payload, params);

  // Verificamos que responda bien (Status 200)
  check(res, {
    'is status 200': (r) => r.status === 200,
  });

  sleep(1);
}