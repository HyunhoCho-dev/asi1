/**
 * ASI1 - AI Companion
 * CTTechnologies
 */

class ASI1 {
    constructor() {
        this.apiKey = null;
        this.settings = { ...CONFIG.SETTINGS };
        this.conversationHistory = [];
        this.isRecording = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;

        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.loadSettings();
        this.initializeElements();
        this.attachEventListeners();
        this.setupVoiceRecognition();
        this.checkAPIKey();
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const savedApiKey = localStorage.getItem(CONFIG.STORAGE.API_KEY);
        const savedSettings = localStorage.getItem(CONFIG.STORAGE.SETTINGS);

        if (savedApiKey) {
            this.apiKey = savedApiKey;
        }

        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        // Main screens
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.chatInterface = document.getElementById('chatInterface');

        // Chat elements
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.voiceBtn = document.getElementById('voiceBtn');
        this.charCount = document.getElementById('charCount');

        // Modal elements
        this.settingsModal = document.getElementById('settingsModal');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.saveBtn = document.getElementById('saveBtn');

        // Settings inputs
        this.apiKeyInput = document.getElementById('apiKey');
        this.modelSelect = document.getElementById('modelSelect');
        this.browserSearchCheckbox = document.getElementById('browserSearch');
        this.codeInterpreterCheckbox = document.getElementById('codeInterpreter');
        this.voiceEnabledCheckbox = document.getElementById('voiceEnabled');
        this.autoSpeakCheckbox = document.getElementById('autoSpeak');

        // Other elements
        this.startBtn = document.getElementById('startBtn');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.toolsUsed = document.getElementById('toolsUsed');
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Start button
        this.startBtn.addEventListener('click', () => this.startConversation());

        // Message input
        this.messageInput.addEventListener('input', (e) => this.handleInputChange(e));
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Send button
        this.sendBtn.addEventListener('click', () => this.sendMessage());

        // Voice button
        this.voiceBtn.addEventListener('click', () => this.toggleVoiceRecording());

        // Settings modal
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeModalBtn.addEventListener('click', () => this.closeSettings());
        this.cancelBtn.addEventListener('click', () => this.closeSettings());
        this.saveBtn.addEventListener('click', () => this.saveSettings());

        // Close modal on outside click
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettings();
            }
        });
    }

    /**
     * Setup voice recognition
     */
    setupVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = CONFIG.VOICE.language;

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.messageInput.value = transcript;
                this.handleInputChange({ target: this.messageInput });
            };

            this.recognition.onend = () => {
                this.isRecording = false;
                this.voiceBtn.classList.remove('recording');
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isRecording = false;
                this.voiceBtn.classList.remove('recording');
                this.showNotification('Voice recognition error. Please try again.', 'error');
            };
        } else {
            console.warn('Speech recognition not supported');
            this.voiceBtn.style.display = 'none';
        }
    }

    /**
     * Check if API key is configured
     */
    checkAPIKey() {
        if (!this.apiKey) {
            this.showNotification(CONFIG.MESSAGES.NO_API_KEY, 'warning');
        }
    }

    /**
     * Start conversation (hide welcome, show chat)
     */
    startConversation() {
        if (!this.apiKey) {
            this.openSettings();
            this.showNotification(CONFIG.MESSAGES.ERROR_API_KEY, 'error');
            return;
        }

        this.welcomeScreen.classList.add('hidden');
        this.chatInterface.classList.remove('hidden');
        this.messageInput.focus();
    }

    /**
     * Handle input change
     */
    handleInputChange(e) {
        const value = e.target.value;
        const length = value.length;

        this.charCount.textContent = length;
        this.sendBtn.disabled = length === 0 || length > 2000;

        // Auto-resize textarea
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    }

    /**
     * Toggle voice recording
     */
    toggleVoiceRecording() {
        if (!this.settings.voiceEnabled) {
            this.showNotification('Voice input is disabled. Enable it in settings.', 'warning');
            return;
        }

        if (!this.recognition) {
            this.showNotification(CONFIG.MESSAGES.ERROR_VOICE, 'error');
            return;
        }

        if (this.isRecording) {
            this.recognition.stop();
            this.isRecording = false;
            this.voiceBtn.classList.remove('recording');
        } else {
            this.recognition.start();
            this.isRecording = true;
            this.voiceBtn.classList.add('recording');
        }
    }

    /**
     * Send message to AI
     */
    async sendMessage() {
        const message = this.messageInput.value.trim();

        if (!message || !this.apiKey) {
            return;
        }

        // Add user message to chat
        this.addMessage('user', message);

        // Clear input
        this.messageInput.value = '';
        this.charCount.textContent = '0';
        this.sendBtn.disabled = true;
        this.messageInput.style.height = 'auto';

        // Show loading
        this.showLoading();

        try {
            // Add to conversation history
            this.conversationHistory.push({
                role: 'user',
                content: message
            });

            // Call Groq API
            const response = await this.callGroqAPI();

            // Hide loading
            this.hideLoading();

            // Add assistant response
            this.addMessage('assistant', response.content, response.tools);

            // Speak response if enabled
            if (this.settings.autoSpeak) {
                this.speak(response.content);
            }

            // Add to conversation history
            this.conversationHistory.push({
                role: 'assistant',
                content: response.content
            });

        } catch (error) {
            this.hideLoading();
            console.error('Error:', error);
            this.showNotification(error.message || CONFIG.MESSAGES.ERROR_NETWORK, 'error');
        }
    }

    /**
     * Call Groq API with GPT-OSS model and Built-In Tools
     */
    async callGroqAPI() {
        // Prepare tools
        const tools = [];

        if (this.settings.browserSearchEnabled) {
            tools.push({ type: 'browser_search' });
        }

        if (this.settings.codeInterpreterEnabled) {
            tools.push({ type: 'code_interpreter' });
        }

        // Prepare messages
        const messages = [
            {
                role: 'system',
                content: CONFIG.SYSTEM_PROMPT
            },
            ...this.conversationHistory
        ];

        // Make API request
        const response = await fetch(`${CONFIG.API.BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.settings.model,
                messages: messages,
                tools: tools.length > 0 ? tools : undefined,
                max_tokens: this.settings.maxTokens,
                temperature: this.settings.temperature
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        const choice = data.choices[0];

        // Extract tool usage information
        let toolsUsed = [];
        if (choice.message.tool_calls) {
            toolsUsed = choice.message.tool_calls.map(tc => ({
                name: tc.function.name,
                type: tc.type
            }));
        }

        return {
            content: choice.message.content,
            tools: toolsUsed
        };
    }

    /**
     * Add message to chat
     */
    addMessage(role, content, tools = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = '<div class="avatar-small"></div>';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        // Format content (simple markdown-like formatting)
        const formattedContent = this.formatContent(content);
        contentDiv.innerHTML = `<p>${formattedContent}</p>`;

        // Add tools information if present
        if (tools && tools.length > 0) {
            const toolsDiv = document.createElement('div');
            toolsDiv.className = 'message-tools';
            toolsDiv.innerHTML = `🛠️ Used: ${tools.map(t => t.name || t.type).join(', ')}`;
            contentDiv.appendChild(toolsDiv);

            // Update header tools badge
            this.updateToolsBadge(tools);
        }

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    /**
     * Format content with basic markdown-like syntax
     */
    formatContent(content) {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    /**
     * Update tools badge in header
     */
    updateToolsBadge(tools) {
        this.toolsUsed.innerHTML = '';
        tools.forEach(tool => {
            const badge = document.createElement('span');
            badge.className = 'tool-badge';
            badge.textContent = tool.name || tool.type;
            this.toolsUsed.appendChild(badge);
        });

        // Clear after 5 seconds
        setTimeout(() => {
            this.toolsUsed.innerHTML = '';
        }, 5000);
    }

    /**
     * Speak text using Web Speech API
     */
    speak(text) {
        if (!this.synthesis || !this.settings.autoSpeak) {
            return;
        }

        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = CONFIG.VOICE.rate;
        utterance.pitch = CONFIG.VOICE.pitch;
        utterance.volume = CONFIG.VOICE.volume;
        utterance.lang = CONFIG.VOICE.language;

        this.synthesis.speak(utterance);
    }

    /**
     * Show loading overlay
     */
    showLoading() {
        this.loadingOverlay.classList.remove('hidden');
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Simple alert for now - can be enhanced with a custom notification system
        console.log(`[${type.toUpperCase()}]`, message);

        // Add a temporary message in chat
        const notificationDiv = document.createElement('div');
        notificationDiv.className = 'message system';
        notificationDiv.style.cssText = `
            text-align: center;
            padding: 12px;
            margin: 16px 0;
            background: ${type === 'error' ? '#fee' : type === 'warning' ? '#ffa' : '#eff'};
            border-radius: 8px;
            color: ${type === 'error' ? '#c00' : type === 'warning' ? '#880' : '#008'};
        `;
        notificationDiv.textContent = message;

        if (this.chatInterface && !this.chatInterface.classList.contains('hidden')) {
            this.chatMessages.appendChild(notificationDiv);
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

            // Remove after 5 seconds
            setTimeout(() => {
                notificationDiv.remove();
            }, 5000);
        }
    }

    /**
     * Open settings modal
     */
    openSettings() {
        // Load current settings into form
        this.apiKeyInput.value = this.apiKey || '';
        this.modelSelect.value = this.settings.model;
        this.browserSearchCheckbox.checked = this.settings.browserSearchEnabled;
        this.codeInterpreterCheckbox.checked = this.settings.codeInterpreterEnabled;
        this.voiceEnabledCheckbox.checked = this.settings.voiceEnabled;
        this.autoSpeakCheckbox.checked = this.settings.autoSpeak;

        this.settingsModal.classList.remove('hidden');
    }

    /**
     * Close settings modal
     */
    closeSettings() {
        this.settingsModal.classList.add('hidden');
    }

    /**
     * Save settings
     */
    saveSettings() {
        // Save API key
        const newApiKey = this.apiKeyInput.value.trim();
        if (newApiKey) {
            this.apiKey = newApiKey;
            localStorage.setItem(CONFIG.STORAGE.API_KEY, newApiKey);
        }

        // Save other settings
        this.settings = {
            ...this.settings,
            model: this.modelSelect.value,
            browserSearchEnabled: this.browserSearchCheckbox.checked,
            codeInterpreterEnabled: this.codeInterpreterCheckbox.checked,
            voiceEnabled: this.voiceEnabledCheckbox.checked,
            autoSpeak: this.autoSpeakCheckbox.checked
        };

        localStorage.setItem(CONFIG.STORAGE.SETTINGS, JSON.stringify(this.settings));

        this.closeSettings();
        this.showNotification('Settings saved successfully!', 'info');

        // If we now have an API key and we're on welcome screen, enable start button
        if (this.apiKey && !this.welcomeScreen.classList.contains('hidden')) {
            this.checkAPIKey();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.asi1 = new ASI1();
});
