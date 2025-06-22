document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const startScreen = document.getElementById('start-screen');
    const chatContainer = document.getElementById('chat-container');
    const startBtn = document.getElementById('start-btn');
    const chatBox = document.getElementById('chat-box');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const typingIndicator = document.getElementById('typing-indicator');

    // URL del webhook de n8n (¡Usa tu URL de ngrok aquí!)
    const N8N_WEBHOOK_URL = 'https://644f-38-199-5-114.ngrok-free.app/webhook/caca86f8-a730-4b55-a566-ed9ffe193507/chat';

    // Variable para guardar el ID de sesión de la conversación
    let sessionId = null;

    // --- MANEJADORES DE EVENTOS ---

    // Evento al hacer clic en "Comenzar"
    startBtn.addEventListener('click', () => {
        startScreen.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        
        // Genera un ID de sesión único para esta conversación
        sessionId = `web-session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        // Mensaje de bienvenida inicial
        addMessageToChat('¡Hola! Soy el asistente de "El Sabor de mi Tierra". ¿En qué puedo ayudarte hoy?', 'bot');
    });

    // Evento al enviar el formulario del chat
    chatForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Evita que la página se recargue
        const userMessage = messageInput.value.trim();

        if (userMessage && sessionId) {
            addMessageToChat(userMessage, 'user');
            messageInput.value = '';
            sendMessageToN8n(userMessage);
        }
    });

    // --- FUNCIONES AUXILIARES ---

    /**
     * Añade un mensaje a la caja de chat y hace scroll hacia abajo.
     * @param {string} text - El texto del mensaje.
     * @param {'user' | 'bot'} sender - Quién envía el mensaje.
     * @returns {HTMLElement} El elemento del mensaje creado.
     */
    function addMessageToChat(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        messageElement.textContent = text;
        chatBox.appendChild(messageElement);
        // Hacer scroll automático al final del chat
        chatBox.scrollTop = chatBox.scrollHeight;
        return messageElement;
    }

    /**
     * Envía el mensaje al webhook de n8n y procesa la respuesta en streaming.
     * @param {string} messageText - El mensaje del usuario.
     */
    async function sendMessageToN8n(messageText) {
        typingIndicator.classList.remove('hidden'); // Mostrar indicador "escribiendo..."
        
        try {
            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: messageText,
                    sessionId: sessionId, // Envía el ID para mantener el historial
                }),
            });

            if (!response.ok) {
                throw new Error(`Error en la respuesta del servidor: ${response.statusText}`);
            }

            // El webhook de chat de n8n devuelve una respuesta en streaming (stream)
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let botMessageElement = null;

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                
                // El streaming de n8n/langchain envía líneas con "data: {...}"
                const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

                for (const line of lines) {
                    try {
                        const jsonString = line.substring(6); // Quita "data: "
                        const data = JSON.parse(jsonString);
                        
                      // CÓDIGO NUEVO - SÍ FUNCIONA
if (data.response && data.response.output) { // <-- ¡Aquí está el cambio!
    if (!botMessageElement) {
        botMessageElement = addMessageToChat(data.response.output, 'bot'); // <-- ¡Y aquí!
    } else {
        botMessageElement.textContent += data.response.output; // <-- ¡Y aquí!
                                chatBox.scrollTop = chatBox.scrollHeight;
                            }
                        }
                    } catch (e) {
                        // Ignorar líneas que no sean JSON válido (pueden ser heartbeats o líneas vacías)
                    }
                }
            }
        } catch (error) {
            console.error('Error al conectar con el webhook de n8n:', error);
            addMessageToChat('Lo siento, ha ocurrido un error al conectar con el asistente. Por favor, inténtalo de nuevo más tarde.', 'bot');
        } finally {
            typingIndicator.classList.add('hidden'); // Ocultar indicador "escribiendo..."
        }
    }
});
