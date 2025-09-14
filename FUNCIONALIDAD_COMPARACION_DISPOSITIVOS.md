# Funcionalidad de Comparación de Dispositivos - ThingsBoard

## Tabla de Contenidos
1. [Introducción](#introducción)
2. [Contexto de Dispositivos IoT en ThingsBoard](#contexto-de-dispositivos-iot-en-thingsboard)
3. [Tipos de Dispositivos](#tipos-de-dispositivos)
4. [Métricas y Telemetría](#métricas-y-telemetría)
5. [Funcionalidad de Comparación](#funcionalidad-de-comparación)
6. [Guía de Uso](#guía-de-uso)
7. [Características Técnicas](#características-técnicas)
8. [Configuración Avanzada](#configuración-avanzada)

## Introducción

La funcionalidad de **Comparación de Dispositivos** es una nueva característica desarrollada para ThingsBoard que permite a los administradores y usuarios analizar, comparar y monitorear múltiples dispositivos IoT de manera simultánea. Esta herramienta facilita la identificación de patrones, anomalías y el rendimiento general de los dispositivos conectados.

## Contexto de Dispositivos IoT en ThingsBoard

### ¿Qué es un Dispositivo IoT en ThingsBoard?

En ThingsBoard, un dispositivo IoT es cualquier entidad física o virtual que puede:
- Enviar datos de telemetría (temperatura, humedad, presión, etc.)
- Recibir comandos RPC (Remote Procedure Call)
- Mantener atributos del dispositivo
- Generar alarmas basadas en condiciones específicas

### Arquitectura de Comunicación

Los dispositivos se comunican con ThingsBoard a través de varios protocolos:
- **MQTT**: Protocolo estándar para IoT
- **CoAP**: Protocolo ligero para redes con restricciones
- **LWM2M**: Protocolo de gestión de dispositivos
- **SNMP**: Protocolo de gestión de red
- **HTTP/HTTPS**: Para APIs REST

## Tipos de Dispositivos

### 1. Sensores
**Propósito**: Recopilar datos del entorno físico
- **Sensores de temperatura**: Monitorean temperatura ambiente
- **Sensores de humedad**: Miden humedad relativa
- **Sensores de presión**: Detectan cambios de presión atmosférica
- **Sensores de movimiento**: Detectan presencia o movimiento
- **Sensores de calidad del aire**: Monitorean contaminantes

**Características**:
- Envían datos periódicamente
- Bajo consumo de energía
- Conectividad inalámbrica (WiFi, LoRa, NB-IoT)

### 2. Gateways
**Propósito**: Actúan como puente entre dispositivos y la plataforma
- **Gateways industriales**: Conectan dispositivos legacy
- **Gateways de protocolo**: Traducen entre diferentes protocolos
- **Gateways de área**: Agregan datos de múltiples sensores

**Características**:
- Procesamiento local de datos
- Múltiples interfaces de comunicación
- Capacidad de almacenamiento local

### 3. Actuadores
**Propósito**: Ejecutar acciones físicas basadas en comandos
- **Relés**: Controlan dispositivos eléctricos
- **Motores**: Mueven componentes mecánicos
- **Válvulas**: Controlan flujo de fluidos
- **Bombas**: Mueven líquidos o gases

**Características**:
- Reciben comandos RPC
- Retroalimentación de estado
- Control de potencia variable

### 4. Monitores
**Propósito**: Supervisar sistemas complejos
- **Monitores de red**: Supervisan infraestructura de red
- **Monitores de servidor**: Monitorean servidores y aplicaciones
- **Monitores de proceso**: Supervisan procesos industriales

**Características**:
- Análisis en tiempo real
- Alertas automáticas
- Dashboards integrados

### 5. Controladores
**Propósito**: Gestionar y coordinar otros dispositivos
- **Controladores PLC**: Lógica de control industrial
- **Controladores de edificio**: Gestión de sistemas HVAC
- **Controladores de proceso**: Optimización de procesos

**Características**:
- Lógica de control programable
- Comunicación bidireccional
- Capacidad de toma de decisiones

## Métricas y Telemetría

### Tipos de Datos

#### 1. Telemetría (Time Series)
Datos que cambian en el tiempo:
- **Métricas numéricas**: Temperatura (25.5°C), Humedad (60%), Presión (1013.25 hPa)
- **Métricas de estado**: Online/Offline, Activo/Inactivo
- **Métricas de rendimiento**: Latencia, Throughput, Uptime

#### 2. Atributos
Datos estáticos o semi-estáticos:
- **Atributos del servidor**: Configuración, firmware version
- **Atributos compartidos**: Datos entre cliente y servidor
- **Atributos del cliente**: Datos específicos del dispositivo

#### 3. Alarmas
Eventos críticos que requieren atención:
- **Alarmas de umbral**: Valores fuera de rango normal
- **Alarmas de conectividad**: Dispositivo desconectado
- **Alarmas de rendimiento**: Degradación del servicio

### Métricas Comunes por Tipo de Dispositivo

#### Sensores
- **Temperatura**: Rango típico -40°C a +85°C
- **Humedad**: 0% a 100% HR
- **Presión**: 300 hPa a 1100 hPa
- **Conectividad**: Tiempo de respuesta, pérdida de paquetes

#### Gateways
- **Throughput**: Mensajes por segundo
- **Latencia**: Tiempo de procesamiento
- **Dispositivos conectados**: Número de dispositivos gestionados
- **Uso de CPU/Memoria**: Recursos del sistema

#### Actuadores
- **Estado de activación**: On/Off, Posición
- **Consumo de energía**: Watts, Amperios
- **Ciclos de operación**: Número de activaciones
- **Tiempo de respuesta**: Latencia de comando

## Funcionalidad de Comparación

### Características Principales

#### 1. Visualización Multi-Dispositivo
- **Vista de cuadrícula**: Tarjetas organizadas en grid
- **Vista de lista**: Lista detallada con métricas
- **Vista de tabla**: Tabla comparativa con datos tabulares

#### 2. Análisis de Rendimiento
- **Ranking automático**: Clasificación basada en criterios configurables
- **Detección de anomalías**: Identificación de valores atípicos
- **Alertas en tiempo real**: Notificaciones de problemas

#### 3. Filtrado y Búsqueda
- **Filtro por tipo**: Sensores, Gateways, Actuadores, etc.
- **Búsqueda por nombre**: Localización rápida de dispositivos
- **Filtro por estado**: Online/Offline, Con/Sin alertas

### Algoritmos de Análisis

#### 1. Cálculo de Ranking
```typescript
// Criterios de ranking disponibles:
- Rendimiento: Basado en uptime y latencia
- Tiempo de actividad: Basado en conectividad
- Personalizado: Basado en métricas específicas
```

#### 2. Detección de Anomalías
```typescript
// Método estadístico:
- Desviación estándar (σ)
- Umbral configurable (1.5σ, 2σ, 3σ)
- Identificación de valores atípicos
```

#### 3. Generación de Alertas
```typescript
// Tipos de alertas:
- Críticas: Valores fuera de umbral crítico
- Advertencias: Valores cerca de límites
- Informativas: Cambios de estado
```

## Guía de Uso

### Acceso a la Funcionalidad

1. **Navegación**:
   - Ir a **Funciones avanzadas** en el menú principal
   - Seleccionar **Comparación de dispositivos**

2. **Interfaz Principal**:
   - Título con badge "NUEVO"
   - Panel de configuración expandible
   - Sección de filtros
   - Área de visualización de dispositivos

### Configuración Básica

#### 1. Configuración General
- **Máximo de dispositivos**: Límite de dispositivos a mostrar (1-50)
- **Diseño**: Seleccionar entre Grid, Lista o Tabla
- **Métricas personalizadas**: Agregar métricas específicas

#### 2. Configuración de Análisis
- **Habilitar ranking**: Activar clasificación automática
- **Detección de anomalías**: Activar identificación de valores atípicos
- **Alertas offline**: Notificaciones de dispositivos desconectados

#### 3. Configuración de Umbrales
- **Umbral de anomalías**: Configurar sensibilidad (0.1σ - 5.0σ)
- **Criterios de ranking**: Seleccionar métrica principal
- **Tiempo de inactividad**: Definir tiempo para considerar offline

### Operaciones Principales

#### 1. Visualización de Dispositivos
```
Vista de Cuadrícula:
┌─────────────────┐ ┌─────────────────┐
│   Dispositivo 1 │ │   Dispositivo 2 │
│   Tipo: Sensor  │ │   Tipo: Gateway │
│   Estado: Online│ │   Estado: Online│
│   Ranking: #1   │ │   Ranking: #2   │
└─────────────────┘ └─────────────────┘
```

#### 2. Análisis de Métricas
- **Métricas en tiempo real**: Valores actualizados automáticamente
- **Histórico**: Acceso a datos históricos
- **Comparación**: Análisis lado a lado

#### 3. Gestión de Alertas
- **Visualización**: Alertas destacadas en tarjetas
- **Clasificación**: Críticas, Advertencias, Informativas
- **Acciones**: Navegación a detalles del dispositivo

### Funciones Avanzadas

#### 1. Exportación de Datos
- **Formato**: CSV, JSON
- **Contenido**: Métricas, rankings, alertas
- **Filtros**: Exportar solo dispositivos seleccionados

#### 2. Navegación a Detalles
- **Botón "Detalles"**: Acceso directo a página del dispositivo
- **Información completa**: Telemetría, atributos, alarmas
- **Configuración**: Edición de parámetros del dispositivo

#### 3. Actualización en Tiempo Real
- **WebSocket**: Conexión en tiempo real
- **Actualización automática**: Sin intervención del usuario
- **Indicadores de estado**: Loading, conectado, error

## Características Técnicas

### Arquitectura del Componente

#### 1. Estructura de Archivos
```
ui-ngx/src/app/modules/home/pages/device-comparison/
├── device-comparison-page.component.ts
├── device-comparison-page.component.html
├── device-comparison-page.component.scss
├── device-comparison-routing.module.ts
└── device-comparison.module.ts
```

#### 2. Servicios Utilizados
- **DeviceService**: Gestión de dispositivos
- **DeviceComparisonService**: Lógica de comparación
- **EntityService**: Operaciones de entidades
- **TelemetryWebsocketService**: Datos en tiempo real

#### 3. Modelos de Datos
```typescript
interface DeviceComparisonData {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  isOnline: boolean;
  lastSeen: number;
  metrics: MetricConfig[];
  score: number;
  rank: number;
  alerts: DeviceAlert[];
  isOutlier: boolean;
}
```

### Integración con ThingsBoard

#### 1. Menú y Navegación
- **Ubicación**: Funciones avanzadas > Comparación de dispositivos
- **Permisos**: Requiere autoridad TENANT_ADMIN
- **Routing**: Lazy loading para optimización

#### 2. Localización
- **Idioma**: Español (es_ES)
- **Traducciones**: Archivo locale.constant-es_ES.json
- **Claves**: Prefijo device-comparison.*

#### 3. Estilos y Temas
- **Paleta de colores**: Consistente con ThingsBoard
- **Responsive**: Adaptable a diferentes tamaños de pantalla
- **Material Design**: Componentes Angular Material

## Configuración Avanzada

### Personalización de Métricas

#### 1. Agregar Nueva Métrica
```typescript
const newMetric: MetricConfig = {
  label: 'Nueva Métrica',
  unit: 'unidad',
  thresholds: {
    warning: 50,
    error: 80
  }
};
```

#### 2. Configuración de Umbrales
- **Umbral de advertencia**: Valor que genera alerta de advertencia
- **Umbral crítico**: Valor que genera alerta crítica
- **Unidades**: Personalizables por métrica

### Optimización de Rendimiento

#### 1. Límites de Dispositivos
- **Máximo recomendado**: 50 dispositivos simultáneos
- **Paginación**: Para grandes cantidades de dispositivos
- **Filtrado**: Reducir carga de datos

#### 2. Actualización de Datos
- **Intervalo**: Configurable (1-60 segundos)
- **WebSocket**: Conexión persistente
- **Cache**: Almacenamiento local de datos

### Monitoreo y Alertas

#### 1. Configuración de Alertas
- **Tiempo de inactividad**: 5 minutos por defecto
- **Umbrales de métricas**: Configurables por dispositivo
- **Notificaciones**: Integración con sistema de notificaciones

#### 2. Logs y Auditoría
- **Registro de accesos**: Quién accede a la funcionalidad
- **Acciones realizadas**: Exportaciones, configuraciones
- **Errores**: Logging de problemas técnicos

## Casos de Uso

### 1. Monitoreo Industrial
**Escenario**: Fábrica con 30 sensores de temperatura
- **Objetivo**: Detectar fallos en sistemas de refrigeración
- **Métricas**: Temperatura, humedad, presión
- **Alertas**: Temperatura > 30°C, Humedad > 80%

### 2. Gestión de Edificios Inteligentes
**Escenario**: Edificio con múltiples sistemas
- **Dispositivos**: Sensores, actuadores, controladores
- **Métricas**: Consumo energético, ocupación, temperatura
- **Optimización**: Reducción de costos energéticos

### 3. Monitoreo de Redes
**Escenario**: Infraestructura de telecomunicaciones
- **Dispositivos**: Gateways, routers, switches
- **Métricas**: Latencia, throughput, disponibilidad
- **Objetivo**: Mantener SLA de servicio

## Solución de Problemas

### Problemas Comunes

#### 1. Dispositivos No Aparecen
- **Verificar permisos**: Usuario debe tener acceso a dispositivos
- **Comprobar filtros**: Asegurar que no hay filtros activos
- **Revisar conectividad**: Dispositivos deben estar registrados

#### 2. Datos No Se Actualizan
- **Verificar WebSocket**: Conexión en tiempo real
- **Comprobar configuración**: Intervalos de actualización
- **Revisar logs**: Errores en consola del navegador

#### 3. Alertas No Se Generan
- **Verificar umbrales**: Configuración de límites
- **Comprobar métricas**: Datos disponibles
- **Revisar configuración**: Alertas habilitadas

### Logs y Diagnóstico

#### 1. Logs del Navegador
```javascript
// Verificar conexión WebSocket
console.log('WebSocket status:', websocket.readyState);

// Verificar datos de dispositivos
console.log('Device data:', deviceData);
```

#### 2. Logs del Servidor
- **ThingsBoard logs**: Verificar errores del backend
- **Database logs**: Problemas de consulta
- **Transport logs**: Problemas de comunicación

## Flujo de Ejemplo Completo: Prueba de la Funcionalidad

### Escenario de Prueba: Monitoreo de Temperatura en Oficina

Este ejemplo guía paso a paso la creación de un sistema de monitoreo de temperatura para una oficina con múltiples sensores, demostrando todas las capacidades de la funcionalidad de comparación de dispositivos.

### Paso 1: Preparación del Entorno

#### 1.1 Acceso a ThingsBoard
1. **Iniciar sesión** en ThingsBoard con credenciales de administrador
2. **Verificar permisos** de TENANT_ADMIN
3. **Navegar** al dashboard principal

#### 1.2 Verificar Funcionalidad Disponible
1. **Ir** a **Funciones avanzadas** en el menú lateral
2. **Verificar** que aparece **Comparación de dispositivos**
3. **Confirmar** que el badge "NUEVO" está visible

### Paso 2: Creación de Dispositivos de Prueba

#### 2.1 Crear Perfil de Dispositivo
1. **Navegar** a **Device profiles** > **Device profiles**
2. **Hacer clic** en el botón **"+"** para crear nuevo perfil
3. **Configurar** el perfil:
   - **Nombre**: "Sensor de Temperatura Oficina"
   - **Tipo**: "sensor"
   - **Descripción**: "Perfil para sensores de temperatura en oficina"
4. **Guardar** el perfil

#### 2.2 Crear Dispositivos Individuales
Crear 5 dispositivos de prueba:

**Dispositivo 1 - Sala de Juntas**
1. **Ir** a **Devices** > **Devices**
2. **Hacer clic** en **"+"** para crear dispositivo
3. **Configurar**:
   - **Nombre**: "Sensor Sala Juntas"
   - **Tipo**: "sensor"
   - **Device profile**: "Sensor de Temperatura Oficina"
   - **Descripción**: "Sensor de temperatura en sala de juntas"
4. **Guardar** dispositivo

**Dispositivo 2 - Área de Trabajo**
1. **Crear** nuevo dispositivo
2. **Configurar**:
   - **Nombre**: "Sensor Area Trabajo"
   - **Tipo**: "sensor"
   - **Device profile**: "Sensor de Temperatura Oficina"
   - **Descripción**: "Sensor de temperatura en área de trabajo"
3. **Guardar** dispositivo

**Dispositivo 3 - Recepción**
1. **Crear** nuevo dispositivo
2. **Configurar**:
   - **Nombre**: "Sensor Recepcion"
   - **Tipo**: "sensor"
   - **Device profile**: "Sensor de Temperatura Oficina"
   - **Descripción**: "Sensor de temperatura en recepción"
3. **Guardar** dispositivo

**Dispositivo 4 - Cocina**
1. **Crear** nuevo dispositivo
2. **Configurar**:
   - **Nombre**: "Sensor Cocina"
   - **Tipo**: "sensor"
   - **Device profile**: "Sensor de Temperatura Oficina"
   - **Descripción**: "Sensor de temperatura en cocina"
3. **Guardar** dispositivo

**Dispositivo 5 - Almacén**
1. **Crear** nuevo dispositivo
2. **Configurar**:
   - **Nombre**: "Sensor Almacen"
   - **Tipo**: "sensor"
   - **Device profile**: "Sensor de Temperatura Oficina"
   - **Descripción**: "Sensor de temperatura en almacén"
3. **Guardar** dispositivo

### Paso 3: Configuración de Telemetría

#### 3.1 Simular Datos de Telemetría
Para cada dispositivo, simular datos de temperatura:

**Dispositivo 1 - Sala de Juntas (Temperatura Normal)**
1. **Ir** al dispositivo "Sensor Sala Juntas"
2. **Hacer clic** en **"Latest telemetry"**
3. **Simular** datos:
   - **temperature**: 22.5°C
   - **humidity**: 45%
   - **timestamp**: Tiempo actual

**Dispositivo 2 - Área de Trabajo (Temperatura Alta)**
1. **Ir** al dispositivo "Sensor Area Trabajo"
2. **Simular** datos:
   - **temperature**: 28.3°C
   - **humidity**: 60%
   - **timestamp**: Tiempo actual

**Dispositivo 3 - Recepción (Temperatura Normal)**
1. **Ir** al dispositivo "Sensor Recepcion"
2. **Simular** datos:
   - **temperature**: 23.1°C
   - **humidity**: 50%
   - **timestamp**: Tiempo actual

**Dispositivo 4 - Cocina (Temperatura Muy Alta)**
1. **Ir** al dispositivo "Sensor Cocina"
2. **Simular** datos:
   - **temperature**: 35.7°C
   - **humidity**: 75%
   - **timestamp**: Tiempo actual

**Dispositivo 5 - Almacén (Dispositivo Offline)**
1. **Ir** al dispositivo "Sensor Almacen"
2. **No simular** datos (mantener offline)

### Paso 4: Configuración de Alarmas

#### 4.1 Crear Regla de Alarma
1. **Ir** a **Rule chains** > **Rule chains**
2. **Crear** nueva regla de alarma para temperatura
3. **Configurar**:
   - **Condición**: temperature > 30°C
   - **Severidad**: CRITICAL
   - **Acción**: Enviar notificación

#### 4.2 Verificar Alarmas
1. **Ir** a **Alarms** > **Alarms**
2. **Verificar** que se generan alarmas para dispositivos con temperatura alta

### Paso 5: Uso de la Funcionalidad de Comparación

#### 5.1 Acceso a la Funcionalidad
1. **Navegar** a **Funciones avanzadas** > **Comparación de dispositivos**
2. **Verificar** que se carga la página correctamente
3. **Confirmar** que aparece el título con badge "NUEVO"

#### 5.2 Configuración Inicial
1. **Expandir** el panel de configuración
2. **Configurar** parámetros:
   - **Máximo de dispositivos**: 10
   - **Diseño**: Grid
   - **Habilitar ranking**: Sí
   - **Detección de anomalías**: Sí
   - **Alertas offline**: Sí
3. **Cerrar** el panel de configuración

#### 5.3 Verificación de Dispositivos
1. **Verificar** que aparecen los 5 dispositivos creados
2. **Confirmar** que se muestran:
   - Nombres reales de los dispositivos
   - Tipos correctos (sensor)
   - Estados (4 online, 1 offline)
   - Iconos apropiados

#### 5.4 Análisis de Métricas
1. **Observar** las métricas de temperatura:
   - Sala de Juntas: 22.5°C
   - Área de Trabajo: 28.3°C
   - Recepción: 23.1°C
   - Cocina: 35.7°C
   - Almacén: Sin datos (offline)

2. **Verificar** que los decimales se muestran con 2 decimales

#### 5.5 Verificación de Ranking
1. **Observar** el ranking automático:
   - **Ranking #1**: Sensor Sala Juntas (temperatura óptima)
   - **Ranking #2**: Sensor Recepcion (temperatura normal)
   - **Ranking #3**: Sensor Area Trabajo (temperatura alta)
   - **Ranking #4**: Sensor Cocina (temperatura crítica)
   - **Ranking #5**: Sensor Almacen (offline)

2. **Verificar** que los colores del ranking coinciden con la paleta de ThingsBoard

#### 5.6 Detección de Anomalías
1. **Identificar** dispositivos marcados como anomalías:
   - Sensor Cocina (temperatura muy alta)
   - Sensor Almacen (offline)

2. **Verificar** que aparecen con indicadores visuales (borde naranja)

#### 5.7 Verificación de Alertas
1. **Observar** las alertas generadas:
   - **Crítica**: Sensor Cocina (temperatura > 30°C)
   - **Advertencia**: Sensor Area Trabajo (temperatura alta)
   - **Offline**: Sensor Almacen (sin conexión)

2. **Verificar** que las alertas muestran valores con 2 decimales

### Paso 6: Pruebas de Funcionalidad Avanzada

#### 6.1 Filtrado por Tipo
1. **Usar** el filtro de tipo de dispositivo
2. **Seleccionar** "sensor"
3. **Verificar** que solo aparecen los sensores

#### 6.2 Búsqueda por Nombre
1. **Escribir** "Sala" en el campo de búsqueda
2. **Verificar** que solo aparece "Sensor Sala Juntas"
3. **Limpiar** la búsqueda

#### 6.3 Cambio de Vista
1. **Cambiar** a vista de lista
2. **Verificar** que se muestra la información en formato de lista
3. **Cambiar** a vista de tabla
4. **Verificar** que se muestra en formato tabular

#### 6.4 Navegación a Detalles
1. **Hacer clic** en "Detalles" del Sensor Cocina
2. **Verificar** que navega a la página del dispositivo
3. **Volver** a la comparación de dispositivos

#### 6.5 Exportación de Datos
1. **Hacer clic** en el botón "Exportar"
2. **Verificar** que se descarga un archivo con los datos
3. **Abrir** el archivo y verificar el contenido

### Paso 7: Pruebas de Tiempo Real

#### 7.1 Simulación de Cambios
1. **Cambiar** la temperatura del Sensor Area Trabajo a 32.5°C
2. **Verificar** que se actualiza automáticamente en la comparación
3. **Verificar** que cambia el ranking
4. **Verificar** que se genera nueva alarma crítica

#### 7.2 Simulación de Reconexión
1. **Simular** datos para el Sensor Almacen
2. **Verificar** que cambia de offline a online
3. **Verificar** que se actualiza el ranking
4. **Verificar** que desaparece la alarma offline

### Paso 8: Verificación de Configuración Avanzada

#### 8.1 Configuración de Umbrales
1. **Abrir** el panel de configuración
2. **Cambiar** el umbral de anomalías a 2.0σ
3. **Verificar** que cambia la detección de anomalías

#### 8.2 Configuración de Criterios de Ranking
1. **Cambiar** el criterio de ranking a "Tiempo de actividad"
2. **Verificar** que cambia el orden de los dispositivos

### Paso 9: Limpieza y Verificación Final

#### 9.1 Verificación de Funcionalidad Completa
1. **Confirmar** que todas las funciones trabajan correctamente:
   - Visualización de dispositivos reales
   - Ranking automático
   - Detección de anomalías
   - Alertas en tiempo real
   - Filtrado y búsqueda
   - Navegación a detalles
   - Exportación de datos
   - Actualización en tiempo real

#### 9.2 Verificación de Traducciones
1. **Confirmar** que todos los textos están en español
2. **Verificar** que no aparecen claves de traducción (device-comparison.*)
3. **Confirmar** que el badge "NUEVO" es visible

#### 9.3 Limpieza de Datos de Prueba
1. **Eliminar** los dispositivos de prueba creados
2. **Eliminar** el perfil de dispositivo de prueba
3. **Eliminar** las reglas de alarma de prueba

### Resultados Esperados

Al completar este flujo de prueba, deberías ver:

1. **5 dispositivos** mostrados en la comparación
2. **Ranking automático** basado en temperatura
3. **2 anomalías** detectadas (Cocina y Almacén)
4. **3 alertas** generadas (2 críticas, 1 offline)
5. **Actualización en tiempo real** de datos
6. **Funcionalidad completa** de filtrado y búsqueda
7. **Navegación** funcional a detalles de dispositivos
8. **Exportación** de datos exitosa
9. **Interfaz** completamente en español
10. **Estilos** consistentes con ThingsBoard

### Notas Importantes

- **Tiempo de ejecución**: Este flujo completo toma aproximadamente 30-45 minutos
- **Requisitos**: Acceso de administrador a ThingsBoard
- **Datos de prueba**: Los datos simulados son realistas para un entorno de oficina
- **Limpieza**: Siempre eliminar los datos de prueba al finalizar

## Conclusión

La funcionalidad de Comparación de Dispositivos proporciona una herramienta poderosa para el monitoreo y análisis de dispositivos IoT en ThingsBoard. Su diseño modular y configurable permite adaptarse a diferentes escenarios de uso, desde monitoreo industrial hasta gestión de edificios inteligentes.

La integración nativa con el ecosistema ThingsBoard asegura consistencia en la experiencia del usuario y aprovecha las capacidades existentes de la plataforma para telemetría, alarmas y gestión de dispositivos.

---

**Versión**: 1.0  
**Fecha**: Diciembre 2024  
**Compatibilidad**: ThingsBoard 3.6+  
**Autor**: Equipo de Desarrollo ThingsBoard
