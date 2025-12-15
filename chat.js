// Chat Agent Integration with n8n
class ChatAgent {
    constructor() {
        this.n8nWebhookUrl = 'https://flows.solvynaisolutions.com/webhook/215a51e1-f2b7-4b3a-867d-59df6ad495be'; // Replace with your n8n webhook URL
        this.sessionId = this.getOrCreateSessionId();
        this.isProcessing = false;
        this.hasExpandedChat = false;

        this.chatMessages = document.getElementById('chatMessages');
        this.chatWelcome = document.getElementById('chatWelcome');
        this.chatInput = document.getElementById('chatInput');
        this.chatSendBtn = document.getElementById('chatSendBtn');
        this.chatMicBtn = document.getElementById('chatMicBtn');
        this.chatContainer = document.querySelector('.chat-container');

        // Translation strings
        this.translations = {
            en: {
                processing: 'Processing...',
                recording: 'Recording... Click to stop',
                placeholder: 'Type a message to Maya...',
                agentName: 'Maya',
                rateLimitWait: 'You\'re sending messages too quickly. Please wait',
                rateLimitSeconds: 'seconds.',
                rateLimitBlock1min: 'Too many messages sent. You are blocked for 1 minute.',
                rateLimitBlock5min: 'Too many messages sent again. You are blocked for 5 minutes.',
                rateLimitBlockPermanent: 'You have been permanently blocked from sending messages. Please refresh the page to try again.',
                errorMicrophone: 'Could not access microphone. Please check permissions.',
                errorAudio: 'Sorry, there was an error processing your audio message. Please try again.',
                errorMessage: 'Sorry, there was an error processing your message. Please try again.'
            },
            'pt-br': {
                processing: 'Processando...',
                recording: 'Gravando... Clique para parar',
                placeholder: 'Digite uma mensagem para Maya...',
                agentName: 'Maya',
                rateLimitWait: 'Você está enviando mensagens muito rápido. Por favor, aguarde',
                rateLimitSeconds: 'segundos.',
                rateLimitBlock1min: 'Muitas mensagens enviadas. Você está bloqueado por 1 minuto.',
                rateLimitBlock5min: 'Muitas mensagens enviadas novamente. Você está bloqueado por 5 minutos.',
                rateLimitBlockPermanent: 'Você foi permanentemente bloqueado de enviar mensagens. Por favor, atualize a página para tentar novamente.',
                errorMicrophone: 'Não foi possível acessar o microfone. Por favor, verifique as permissões.',
                errorAudio: 'Desculpe, houve um erro ao processar sua mensagem de áudio. Por favor, tente novamente.',
                errorMessage: 'Desculpe, houve um erro ao processar sua mensagem. Por favor, tente novamente.'
            }
        };

        // Rate limiting properties
        this.messageTimestamps = [];
        this.rateLimitTime = 2000; // 2 seconds
        this.maxMessagesInWindow = 5;
        this.blockUntil = 0;
        this.warningCount = 0;

        // Audio recording properties
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;

        this.init();
    }

    init() {
        // Bind event listeners
        this.chatSendBtn.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isProcessing) {
                this.sendMessage();
            }
        });

        // Microphone button - toggle recording
        this.chatMicBtn.addEventListener('click', () => this.toggleRecording());

        console.log('Chat initialized with session ID:', this.sessionId);
    }

    // Get current language
    getCurrentLanguage() {
        const urlParams = new URLSearchParams(window.location.search);
        const lang = urlParams.get('lang');
        return lang === 'pt' || lang === 'pt-br' ? 'pt-br' : 'en';
    }

    // Get translated string
    t(key) {
        const lang = this.getCurrentLanguage();
        return this.translations[lang][key] || this.translations.en[key];
    }

    // Generate or retrieve session ID from localStorage
    getOrCreateSessionId() {
        let sessionId = localStorage.getItem('solvyn_chat_session_id');

        if (!sessionId) {
            // Generate unique session ID
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('solvyn_chat_session_id', sessionId);
        }

        return sessionId;
    }

    // Check if user is rate limited
    checkRateLimit() {
        const now = Date.now();

        // Check if currently blocked
        if (this.blockUntil > now) {
            const remainingSeconds = Math.ceil((this.blockUntil - now) / 1000);
            return {
                blocked: true,
                message: `${this.t('rateLimitWait')} ${remainingSeconds} ${this.t('rateLimitSeconds')}`
            };
        }

        // Clean up old timestamps (older than rate limit window)
        this.messageTimestamps = this.messageTimestamps.filter(
            timestamp => now - timestamp < this.rateLimitTime
        );

        // Check if exceeding rate limit
        if (this.messageTimestamps.length >= this.maxMessagesInWindow) {
            this.warningCount++;

            if (this.warningCount === 1) {
                // First violation: 1 minute block
                this.blockUntil = now + 60000; // 1 minute
                return {
                    blocked: true,
                    message: this.t('rateLimitBlock1min')
                };
            } else if (this.warningCount === 2) {
                // Second violation: 5 minute block
                this.blockUntil = now + 300000; // 5 minutes
                return {
                    blocked: true,
                    message: this.t('rateLimitBlock5min')
                };
            } else {
                // Third violation: permanent block (until page reload)
                this.blockUntil = Infinity;
                return {
                    blocked: true,
                    message: this.t('rateLimitBlockPermanent')
                };
            }
        }

        return { blocked: false };
    }

    // Toggle audio recording
    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    // Start audio recording
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());

                // Send audio message with blob for playback
                await this.sendAudioMessage(audioBlob);
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.updateRecordingUI(true);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.addMessage(this.t('errorMicrophone'), 'error');
        }
    }

    // Stop audio recording
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.updateRecordingUI(false);
        }
    }

    // Update UI during recording
    updateRecordingUI(isRecording) {
        if (isRecording) {
            this.chatMicBtn.classList.add('recording');
            // Change to stop icon (square)
            this.chatMicBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2"></rect>
                </svg>
            `;
            this.chatInput.placeholder = this.t('recording');
            this.chatInput.disabled = true;
            this.chatSendBtn.disabled = true;
        } else {
            this.chatMicBtn.classList.remove('recording');
            // Change back to microphone icon
            this.chatMicBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
            `;
            this.chatInput.placeholder = this.t('placeholder');
            if (!this.isProcessing) {
                this.chatInput.disabled = false;
                this.chatSendBtn.disabled = false;
            }
        }
    }

    // Convert audio blob to base64 and send
    async sendAudioMessage(audioBlob) {
        // Check rate limiting
        const rateLimitCheck = this.checkRateLimit();
        if (rateLimitCheck.blocked) {
            this.addMessage(rateLimitCheck.message, 'error');
            return;
        }

        // Record this message timestamp
        this.messageTimestamps.push(Date.now());

        // Create audio URL for playback
        const audioUrl = URL.createObjectURL(audioBlob);

        // Show audio player in chat
        this.addAudioMessage(audioUrl, 'user');

        // Disable input while processing
        this.setProcessing(true);

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Convert blob to base64
            const base64Audio = await this.blobToBase64(audioBlob);

            // Send to n8n webhook
            const response = await fetch(this.n8nWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    audioBase64: base64Audio,
                    messageType: 'audio',
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Try to parse as JSON first, fall back to plain text
            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
                console.log('n8n JSON response:', data);

                // Remove typing indicator
                this.removeTypingIndicator();

                if (data.response) {
                    this.addMessage(data.response, 'agent');
                } else if (data.message) {
                    this.addMessage(data.message, 'agent');
                } else if (data.output) {
                    this.addMessage(data.output, 'agent');
                } else {
                    this.addMessage(JSON.stringify(data), 'agent');
                }
            } else {
                data = await response.text();
                console.log('n8n text response:', data);

                // Remove typing indicator
                this.removeTypingIndicator();

                this.addMessage(data, 'agent');
            }

        } catch (error) {
            console.error('Error sending audio message:', error);

            // Remove typing indicator
            this.removeTypingIndicator();

            this.addMessage(this.t('errorAudio'), 'error');
        } finally {
            this.setProcessing(false);
        }
    }

    // Convert blob to base64
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Remove the data:audio/webm;base64, prefix to get only base64
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Send message to n8n webhook
    async sendMessage() {
        const message = this.chatInput.value.trim();

        if (!message || this.isProcessing) {
            return;
        }

        // Check rate limiting
        const rateLimitCheck = this.checkRateLimit();
        if (rateLimitCheck.blocked) {
            this.addMessage(rateLimitCheck.message, 'error');
            this.chatInput.value = '';
            return;
        }

        // Record this message timestamp
        this.messageTimestamps.push(Date.now());

        // Display user message
        this.addMessage(message, 'user');

        // Clear input
        this.chatInput.value = '';

        // Disable input while processing
        this.setProcessing(true);

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Send to n8n webhook
            const response = await fetch(this.n8nWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    message: message,
                    messageType: 'text',
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Try to parse as JSON first, fall back to plain text
            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
                console.log('n8n JSON response:', data);

                // Remove typing indicator
                this.removeTypingIndicator();

                // Display agent response - check multiple possible response fields
                if (data.response) {
                    this.addMessage(data.response, 'agent');
                } else if (data.message) {
                    this.addMessage(data.message, 'agent');
                } else if (data.output) {
                    this.addMessage(data.output, 'agent');
                } else {
                    this.addMessage(JSON.stringify(data), 'agent');
                }
            } else {
                // Handle plain text response
                data = await response.text();
                console.log('n8n text response:', data);

                // Remove typing indicator
                this.removeTypingIndicator();

                this.addMessage(data, 'agent');
            }

        } catch (error) {
            console.error('Error sending message:', error);

            // Remove typing indicator
            this.removeTypingIndicator();

            this.addMessage(this.t('errorMessage'), 'error');
        } finally {
            this.setProcessing(false);
        }
    }

    // Show chat messages and hide welcome
    showChatMessages() {
        if (this.chatWelcome.style.display !== 'none') {
            this.chatWelcome.style.display = 'none';
            this.chatMessages.style.display = 'flex';

            // Expand chat container on first message
            if (!this.hasExpandedChat) {
                this.hasExpandedChat = true;
                // Small delay to ensure display change happens first
                setTimeout(() => {
                    this.chatContainer.classList.add('expanded');
                }, 50);
            }
        }
    }

    // Add audio message with player to chat interface
    addAudioMessage(audioUrl, type) {
        // Show chat messages on first message
        this.showChatMessages();

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', `chat-message-${type}`);

        // Create message wrapper
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message-wrapper');

        // Create content container
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        // Create audio player bubble
        const audioBubble = document.createElement('div');
        audioBubble.classList.add('message-bubble', 'audio-bubble');

        // Create custom audio player
        const playerContainer = document.createElement('div');
        playerContainer.classList.add('custom-audio-player');

        // Hidden audio element
        const audioElement = document.createElement('audio');
        audioElement.src = audioUrl;
        audioElement.classList.add('audio-element');

        // Play/Pause button
        const playBtn = document.createElement('button');
        playBtn.classList.add('audio-play-btn');
        playBtn.innerHTML = `
            <svg class="play-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
            <svg class="pause-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
        `;

        // Progress bar container
        const progressContainer = document.createElement('div');
        progressContainer.classList.add('audio-progress-container');

        const progressBar = document.createElement('div');
        progressBar.classList.add('audio-progress-bar');

        const progressFill = document.createElement('div');
        progressFill.classList.add('audio-progress-fill');

        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressBar);

        // Time display
        const timeDisplay = document.createElement('span');
        timeDisplay.classList.add('audio-time');
        timeDisplay.textContent = '0:00';

        // Assemble player
        playerContainer.appendChild(playBtn);
        playerContainer.appendChild(progressContainer);
        playerContainer.appendChild(timeDisplay);
        playerContainer.appendChild(audioElement);

        // Event listeners
        playBtn.addEventListener('click', () => {
            if (audioElement.paused) {
                audioElement.play();
                playBtn.querySelector('.play-icon').style.display = 'none';
                playBtn.querySelector('.pause-icon').style.display = 'block';
            } else {
                audioElement.pause();
                playBtn.querySelector('.play-icon').style.display = 'block';
                playBtn.querySelector('.pause-icon').style.display = 'none';
            }
        });

        audioElement.addEventListener('timeupdate', () => {
            const progress = (audioElement.currentTime / audioElement.duration) * 100;
            progressFill.style.width = `${progress}%`;

            const currentMinutes = Math.floor(audioElement.currentTime / 60);
            const currentSeconds = Math.floor(audioElement.currentTime % 60);
            timeDisplay.textContent = `${currentMinutes}:${currentSeconds.toString().padStart(2, '0')}`;
        });

        audioElement.addEventListener('ended', () => {
            playBtn.querySelector('.play-icon').style.display = 'block';
            playBtn.querySelector('.pause-icon').style.display = 'none';
            progressFill.style.width = '0%';
            timeDisplay.textContent = '0:00';
        });

        audioElement.addEventListener('loadedmetadata', () => {
            const duration = audioElement.duration;
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        });

        // Click on progress bar to seek
        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            audioElement.currentTime = pos * audioElement.duration;
        });

        audioBubble.appendChild(playerContainer);
        contentDiv.appendChild(audioBubble);

        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.classList.add('message-timestamp');
        timestamp.textContent = this.getCurrentTime();
        contentDiv.appendChild(timestamp);

        messageWrapper.appendChild(contentDiv);
        messageDiv.appendChild(messageWrapper);
        this.chatMessages.appendChild(messageDiv);

        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    // Add message to chat interface
    addMessage(text, type) {
        // Show chat messages on first message
        this.showChatMessages();

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', `chat-message-${type}`);

        // Create message wrapper (for icon + content)
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message-wrapper');

        // Add icon for Maya (agent messages)
        if (type === 'agent') {
            const iconDiv = document.createElement('div');
            iconDiv.classList.add('message-icon');
            iconDiv.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    <circle cx="12" cy="16" r="1"></circle>
                </svg>
            `;
            messageWrapper.appendChild(iconDiv);
        }

        // Create content container (name + bubble + time)
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        // Add name for Maya
        if (type === 'agent') {
            const nameDiv = document.createElement('div');
            nameDiv.classList.add('message-name');
            nameDiv.textContent = this.t('agentName');
            contentDiv.appendChild(nameDiv);
        }

        // Create message bubble
        const messageBubble = document.createElement('div');
        messageBubble.classList.add('message-bubble');
        messageBubble.textContent = text;
        contentDiv.appendChild(messageBubble);

        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.classList.add('message-timestamp');
        timestamp.textContent = this.getCurrentTime();
        contentDiv.appendChild(timestamp);

        messageWrapper.appendChild(contentDiv);
        messageDiv.appendChild(messageWrapper);
        this.chatMessages.appendChild(messageDiv);

        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    // Get current time in HH:MM format
    getCurrentTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // Show typing indicator
    showTypingIndicator() {
        // Remove any existing typing indicator first
        this.removeTypingIndicator();

        const typingDiv = document.createElement('div');
        typingDiv.classList.add('chat-message', 'chat-message-typing');
        typingDiv.id = 'typingIndicator';

        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message-wrapper');

        // Add Maya's icon
        const iconDiv = document.createElement('div');
        iconDiv.classList.add('message-icon');
        iconDiv.innerHTML = `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                <circle cx="12" cy="16" r="1"></circle>
            </svg>
        `;
        messageWrapper.appendChild(iconDiv);

        // Create content container
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        // Add name
        const nameDiv = document.createElement('div');
        nameDiv.classList.add('message-name');
        nameDiv.textContent = this.t('agentName');
        contentDiv.appendChild(nameDiv);

        // Create typing bubble with dots
        const typingBubble = document.createElement('div');
        typingBubble.classList.add('typing-bubble');
        typingBubble.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        contentDiv.appendChild(typingBubble);

        messageWrapper.appendChild(contentDiv);
        typingDiv.appendChild(messageWrapper);
        this.chatMessages.appendChild(typingDiv);

        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    // Remove typing indicator
    removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // Set processing state
    setProcessing(isProcessing) {
        this.isProcessing = isProcessing;

        if (isProcessing) {
            this.chatInput.disabled = true;
            this.chatSendBtn.disabled = true;
            this.chatInput.placeholder = this.t('processing');
        } else {
            this.chatInput.disabled = false;
            this.chatSendBtn.disabled = false;
            this.chatInput.placeholder = this.t('placeholder');
            this.chatInput.focus();
        }
    }
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatAgent = new ChatAgent();
});
