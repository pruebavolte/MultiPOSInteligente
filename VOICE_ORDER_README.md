# Sistema de Agente de Voz en Tiempo Real 🎤🤖

## Descripción

Sistema de conversación de voz bidireccional en tiempo real integrado en el menú compartido. Permite a los clientes tener una **conversación natural continua** con un agente de IA que escucha, responde con voz, y procesa pedidos automáticamente.

## Características

- **🎙️ Conversación de voz en tiempo real**: El agente escucha continuamente y responde automáticamente
- **🗣️ Respuestas con voz natural**: El agente habla usando Eleven Labs Text-to-Speech
- **⏱️ Detección automática de pausas**: Envía mensajes automáticamente después de 1.5 segundos de silencio
- **📝 Transcripción en vivo**: Ves lo que dices mientras hablas (texto final + provisional)
- **🔄 Turnos de conversación**: El reconocimiento se pausa mientras el agente habla
- **🧠 Procesamiento inteligente**: OpenRouter con Claude AI entiende contexto y productos
- **🌍 Multiidioma**: Soporte completo para español e inglés (voz y texto)
- **🛒 Integración automática**: Los productos se agregan al carrito sin intervención manual
- **📱 Panel lateral de productos**: Menú siempre visible para hacer clic rápido
- **⌨️ Entrada de texto alternativa**: También puedes escribir si lo prefieres

## Ubicación en el Proyecto

### Componentes Principales

1. **VoiceOrder Component** (`src/components/menu-digital/voice-order.tsx`)
   - Componente principal del agente de voz en tiempo real
   - Maneja Web Speech API para reconocimiento de voz continuo
   - Gestiona reproducción de audio (Text-to-Speech)
   - Detección automática de pausas y turnos de conversación

2. **Voice Order API** (`src/app/api/voice-order/route.ts`)
   - Endpoint que procesa los mensajes de texto del usuario
   - Integración con OpenRouter (Claude AI) para procesamiento inteligente
   - Mapea pedidos a productos del menú y genera respuestas

3. **Text-to-Speech API** (`src/app/api/text-to-speech/route.ts`)
   - Endpoint que convierte texto a voz usando Eleven Labs
   - Usa el modelo multilingual v2 para español e inglés
   - Retorna audio MP3 para reproducción en el navegador

4. **Menu Page** (`src/app/dashboard-user/menu/page.tsx`)
   - Sistema de tabs con "Ver Menú" y "Ordenar por Voz"
   - Integración del componente VoiceOrder

## Configuración

### 1. Variables de Entorno

Agrega la siguiente variable a tu archivo `.env`:

```env
# Eleven Labs Configuration (para órdenes por voz - speech to text)
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

**Nota:** OpenRouter ya está configurado en tu proyecto con `OPENROUTER_API_KEY`, por lo que no necesitas configurar nada adicional. El sistema de órdenes por voz usará el mismo modelo configurado en `OPENROUTER_MODEL` (por defecto `anthropic/claude-3.5-sonnet`).

### 2. Obtener API Key de Eleven Labs

1. Visita [Eleven Labs](https://elevenlabs.io/)
2. Crea una cuenta o inicia sesión
3. Ve a tu perfil > API Keys
4. Genera una nueva API key
5. Copia y pega en `ELEVENLABS_API_KEY`

### 3. Dependencias

El paquete de Eleven Labs ya está instalado:

```bash
pnpm add @elevenlabs/elevenlabs-js
```

## Uso

### Para Usuarios/Clientes

1. **Acceder al menú compartido**:
   - Navega a `/dashboard-user/menu`
   - O accede mediante link compartido: `/dashboard-user/menu?restaurantId=xxx`

2. **Ordenar por voz**:
   - Click en la pestaña "Ordenar por Voz"
   - Presiona el botón del micrófono
   - Habla tu pedido (ej: "Quiero dos hamburguesas y una coca cola")
   - El sistema transcribirá y procesará tu pedido
   - Los productos se agregarán automáticamente al carrito

3. **Ordenar por texto** (alternativa):
   - Escribe tu pedido en el campo de texto
   - Presiona Enter o el botón de enviar
   - El sistema procesará tu texto de la misma manera

### Ejemplos de Pedidos

**En Español:**
- "Quiero dos hamburguesas y una coca cola"
- "Me das tres tacos y dos refrescos por favor"
- "Una pizza grande y dos cervezas"
- "Dos café y un croissant"

**En Inglés:**
- "I want two burgers and a coke"
- "Can I get three tacos and two sodas please"
- "One large pizza and two beers"
- "Two coffees and a croissant"

## Flujo Técnico - Conversación en Tiempo Real

### 1. Inicio de Conversación
```typescript
Usuario presiona 🎤 -> startRecording()
                    -> Web Speech API inicia (continuous: true)
                    -> Estado: isRecording = true
                    -> Toast: "Conversación iniciada..."
```

### 2. Usuario Habla (Continuo)
```typescript
Usuario habla -> Web Speech API transcribe en tiempo real
              -> onresult evento:
                 ├─ Texto provisional (gris/cursiva) -> setInterimTranscript()
                 └─ Texto final (negro) -> setTranscript()

              -> Se muestra en el chat mientras habla:
                 "Quiero dos hamburguesas" (final)
                 "y una coca" (provisional)
```

### 3. Detección de Pausa (Automático)
```typescript
Usuario termina de hablar (onspeechend evento)
  -> setIsUserSpeaking(false)
  -> 2 segundos de silencio detectados
  -> clearTimeout() del timer anterior
  -> setTimeout(() => processMessage(), 2000)

  -> processMessage() se ejecuta automáticamente:
     ├─ Agrega mensaje del usuario al chat
     ├─ POST /api/voice-order
     │  {
     │    text: "Quiero dos hamburguesas y una coca cola",
     │    products: [...],
     │    language: "es"
     │  }
     └─ Estado: isProcessing = true
```

### 4. Procesamiento AI (OpenRouter)
```typescript
Claude AI analiza el mensaje:
  - Productos mencionados
  - Cantidades solicitadas
  - Contexto de la conversación
  - Mapeo con productos del menú

Responde con:
{
  items: [
    { productId: "burger-id", quantity: 2 },
    { productId: "coke-id", quantity: 1 }
  ],
  response: "Perfecto, he agregado 2 hamburguesas y 1 coca cola a tu carrito. ¿Algo más?"
}
```

### 5. Agente Responde con Voz
```typescript
Respuesta recibida:
  -> Agrega mensaje del agente al chat
  -> Web Speech API se PAUSA (recognition.stop())
  -> speakText(response) se ejecuta:
     ├─ POST /api/text-to-speech
     │  { text: "Perfecto, he agregado...", language: "es" }
     ├─ Eleven Labs genera audio MP3
     └─ Audio se reproduce en el navegador

  -> Estado: isSpeaking = true
  -> Chat muestra: "Hablando..."
```

### 6. Productos al Carrito
```typescript
Mientras el agente habla:
  -> items.forEach(item => {
       const product = products.find(p => p.id === item.productId);
       for (let i = 0; i < item.quantity; i++) {
         onAddToCart(product);
       }
     });

  -> Toast: "✅ Productos agregados al carrito"
```

### 7. Vuelta al Usuario (Automático)
```typescript
Audio del agente termina:
  -> audio.onended evento
  -> isSpeaking = false
  -> Web Speech API se REANUDA automáticamente (recognition.start())
  -> Usuario puede hablar de nuevo inmediatamente

  -> CICLO SE REPITE desde el paso 2
```

### 8. Fin de Conversación
```typescript
Usuario presiona 🎤 nuevamente -> stopRecording()
                               -> recognition.stop()
                               -> Detiene audio si está reproduciendo
                               -> Limpia timers
                               -> Toast: "Conversación finalizada"
```

## Arquitectura del Sistema - Conversación Bidireccional

```
                    ┌──────────────────────────────────┐
                    │      VoiceOrder Component        │
                    │   (Agente de Voz en Tiempo Real) │
                    └──────────┬───────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────┐    ┌──────────────────┐    ┌────────────────┐
│ Web Speech   │    │  Voice Order API │    │ Text-to-Speech │
│ API (STT)    │    │  (Processing)    │    │  API (TTS)     │
│              │    │                  │    │                │
│ - Continuous │    │ ┌──────────────┐ │    │ ┌────────────┐ │
│ - Real-time  │───▶│ │  OpenRouter  │ │◀───│ │ Eleven Labs│ │
│ - Spanish/   │    │ │  Claude AI   │ │    │ │ Multilingual│ │
│   English    │    │ └──────────────┘ │    │ │ Voice (TTS)│ │
│              │    │                  │    │ └────────────┘ │
│ - Pause      │    │ Product Matching │    │                │
│   Detection  │    │ Cart Integration │    │ MP3 Audio      │
└──────────────┘    └──────────────────┘    └────────────────┘
        │                      │                      │
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                   ┌───────────▼────────────┐
                   │   CONVERSACIÓN FLUJO   │
                   │                        │
                   │  1. Usuario habla      │
                   │     ↓                  │
                   │  2. Transcripción live │
                   │     ↓                  │
                   │  3. Pausa detectada    │
                   │     ↓                  │
                   │  4. Procesa con AI     │
                   │     ↓                  │
                   │  5. Agente responde    │
                   │     (con voz)          │
                   │     ↓                  │
                   │  6. Productos al cart  │
                   │     ↓                  │
                   │  7. Vuelve a escuchar  │
                   │     ↓                  │
                   │  [Repite ciclo 1-7]    │
                   └────────────────────────┘
```

## Personalización

### Modificar el Prompt de AI

Edita el prompt en `src/app/api/voice-order/route.ts`:

```typescript
const systemPrompt = `
  // Tu prompt personalizado aquí
  // Puedes agregar contexto específico de tu restaurante
  // Modificar el formato de respuesta
  // Agregar reglas especiales
`;
```

### Agregar Idiomas

Modifica el componente `VoiceOrder` para agregar más idiomas:

```typescript
const messages = [
  {
    role: "assistant",
    content: language === "es" ? "..." :
             language === "en" ? "..." :
             language === "fr" ? "..." : "...",
  }
];
```

### Personalizar Interfaz

El componente usa Tailwind CSS y Shadcn/ui. Modifica los estilos en:
- `src/components/menu-digital/voice-order.tsx`

## Troubleshooting

### Error: "No se pudo acceder al micrófono"

**Solución:**
- Verifica que el navegador tenga permisos de micrófono
- Asegúrate de estar en HTTPS (o localhost)
- Revisa la configuración de privacidad del navegador

### Error: "Failed to transcribe audio"

**Solución:**
- Verifica que `ELEVENLABS_API_KEY` esté configurada correctamente
- Revisa tu cuota de Eleven Labs
- Confirma que el formato de audio sea compatible

### Error: "Error al procesar el audio"

**Solución:**
- Verifica que `OPENROUTER_API_KEY` esté configurada correctamente
- Revisa los logs del servidor para más detalles
- Confirma que tengas créditos disponibles en OpenRouter
- Verifica que el modelo configurado esté disponible

### Los productos no se agregan al carrito

**Solución:**
- Verifica que los nombres de productos en el menú coincidan
- Revisa los logs para ver qué productos identificó la AI
- Prueba con nombres más específicos o exactos

## Performance

- **Transcripción en tiempo real**: Instantánea (Web Speech API nativa)
- **Detección de pausa**: 1.5 segundos de silencio
- **Procesamiento AI**: ~2-4 segundos (OpenRouter)
- **Generación de voz**: ~1-2 segundos (Eleven Labs TTS)
- **Total por turno**: ~3-6 segundos desde que terminas de hablar hasta que el agente responde
- **Experiencia**: Conversación natural y fluida sin intervención manual

## Limitaciones

- Requiere conexión a internet
- **Web Speech API solo funciona en Chrome, Edge y Safari** (no Firefox por ahora)
- Depende de la calidad del micrófono
- Sujeto a las cuotas de la API de OpenRouter
- El reconocimiento puede fallar con acentos muy marcados o ruido de fondo
- Requiere permisos de micrófono del navegador

## Mejoras Futuras

- [ ] Cache de transcripciones comunes
- [ ] Sugerencias de autocompletado
- [ ] Historial de pedidos por voz
- [ ] Soporte para modificadores (ej: "sin cebolla", "extra queso")
- [ ] Integración con sistema de pagos por voz
- [ ] Analytics de pedidos por voz

## Soporte

Para problemas o preguntas:
1. Revisa los logs del navegador (Console)
2. Revisa los logs del servidor
3. Verifica las configuraciones de API keys
4. Consulta la documentación de Eleven Labs y OpenRouter

## Licencia

Este proyecto utiliza:
- Eleven Labs API (sujeto a términos de servicio)
- OpenRouter API (sujeto a términos de servicio)
