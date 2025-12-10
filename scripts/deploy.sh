#!/bin/bash

# Identificar quién está activo actualmente revisando la config de Nginx
CURRENT_COLOR=$(grep "server app-blue" nginx.conf > /dev/null && echo "blue" || echo "green")

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

# 1. Actualizar el código y reconstruir SOLO el contenedor nuevo
# (En un escenario real, aquí harías 'docker pull user/imagen:tag')
docker-compose build app-$NEW_COLOR
docker-compose up -d --no-deps app-$NEW_COLOR

# 2. Esperar healthcheck (Validación post-despliegue) [cite: 32]
echo "Esperando a que $NEW_COLOR esté saludable..."
sleep 5 # Espera inicial
for i in {1..10}; do
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
  # No cambiamos Nginx, así que el tráfico sigue en el viejo. Rollback implícito.
  exit 1
fi

# 3. Switch de tráfico (Cambiar Nginx)
echo "Cambiando tráfico hacia $NEW_COLOR..."
# Usamos sed para reemplazar el color en la config de nginx
sed -i "s/server app-$CURRENT_COLOR:3000;/server app-$NEW_COLOR:3000;/" nginx.conf

# 4. Recargar Nginx (Sin tirar conexiones)
docker-compose exec -T nginx nginx -s reload

echo "--- Despliegue Exitoso: Ahora sirviendo desde $NEW_COLOR ---"