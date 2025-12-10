#!/bin/bash


CURRENT_COLOR=$(grep "server app-blue" nginx/nginx.conf > /dev/null && echo "blue" || echo "green")

if [ "$CURRENT_COLOR" == "blue" ]; then
  NEW_COLOR="green"
  NEW_PORT="3002"
else
  NEW_COLOR="blue"
  NEW_PORT="3001"
fi

echo "--- Iniciando despliegue Blue/Green ---"
echo "Color actual: $CURRENT_COLOR"
echo "Desplegando en: $NEW_COLOR"

# 1. Construcción
docker-compose build app-$NEW_COLOR
docker-compose up -d --no-deps app-$NEW_COLOR

# 2. Healthcheck
echo "Esperando a que $NEW_COLOR esté saludable..."
sleep 5
HEALTHY=false # Inicializamos la variable
for i in {1..10}; do
  # Healthcheck: Asegúrate de que curl esté disponible en tu Git Bash
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$NEW_PORT/health)
  if [ "$HTTP_CODE" == "200" ]; then
    echo "Salud confirmada en $NEW_COLOR."
    HEALTHY=true
    break
  fi
  echo "Intento $i: Servicio no listo aún..."
  sleep 3
done

if [ "$HEALTHY" != "true" ]; then
  echo "FALLO: El nuevo servicio no responde. Abortando despliegue."
  exit 1
fi

# 3. Switch de tráfico
echo "Cambiando tráfico hacia $NEW_COLOR..."

# --- CORRECCIÓN DE RUTA AQUÍ TAMBIÉN ---
sed -i "s/server app-$CURRENT_COLOR:3000;/server app-$NEW_COLOR:3000;/" nginx/nginx.conf

# 4. Recargar Nginx
docker-compose exec -T nginx nginx -s reload

echo "--- Despliegue Exitoso: Ahora sirviendo desde $NEW_COLOR ---"