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
        this.voiceMode = false;  // Continuous voice conversation mode
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.koreanVoice = null;  // Korean TTS voice

        // Memory and personality system
        this.longTermMemory = [];
        this.personality = { ...CONFIG.PERSONALITY };
        this.messageCount = 0;  // Track messages for memory reminders

        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.loadSettings();
        this.loadPersonality();
        this.loadMemories();
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
     * Load personality from localStorage
     */
    loadPersonality() {
        const savedPersonality = localStorage.getItem(CONFIG.STORAGE.PERSONALITY);

        if (savedPersonality) {
            try {
                const parsed = JSON.parse(savedPersonality);
                this.personality = { ...this.personality, ...parsed };
                console.log('Personality loaded:', this.personality.growth);
            } catch (e) {
                console.error('Failed to load personality:', e);
            }
        }
    }

    /**
     * Save personality to localStorage
     */
    savePersonality() {
        try {
            localStorage.setItem(CONFIG.STORAGE.PERSONALITY, JSON.stringify(this.personality));
        } catch (e) {
            console.error('Failed to save personality:', e);
        }
    }

    /**
     * Load memories from localStorage
     */
    loadMemories() {
        const savedMemories = localStorage.getItem(CONFIG.STORAGE.LONG_TERM_MEMORY);

        if (savedMemories) {
            try {
                this.longTermMemory = JSON.parse(savedMemories);
                console.log(`Loaded ${this.longTermMemory.length} memories`);
            } catch (e) {
                console.error('Failed to load memories:', e);
            }
        }
    }

    /**
     * Save memory to long-term storage
     */
    saveMemory(content, category, importance) {
        if (importance < CONFIG.MEMORY.importanceThreshold) {
            return;  // Don't save low-importance memories
        }

        const memory = {
            id: Date.now(),
            content,
            category,
            importance,
            timestamp: new Date().toISOString(),
            accessCount: 0
        };

        this.longTermMemory.push(memory);

        // Keep only the most recent/important memories
        if (this.longTermMemory.length > CONFIG.MEMORY.maxMemories) {
            // Sort by importance and recency
            this.longTermMemory.sort((a, b) => {
                const scoreA = a.importance * 0.7 + (a.accessCount * 0.3);
                const scoreB = b.importance * 0.7 + (b.accessCount * 0.3);
                return scoreB - scoreA;
            });
            this.longTermMemory = this.longTermMemory.slice(0, CONFIG.MEMORY.maxMemories);
        }

        // Save to localStorage
        try {
            localStorage.setItem(CONFIG.STORAGE.LONG_TERM_MEMORY, JSON.stringify(this.longTermMemory));
        } catch (e) {
            console.error('Failed to save memory:', e);
        }
    }

    /**
     * Get relevant memories based on current context
     */
    getRelevantMemories(userMessage, limit = 5) {
        if (this.longTermMemory.length === 0) {
            return [];
        }

        // Simple keyword matching for relevance
        const keywords = userMessage.toLowerCase().split(' ').filter(w => w.length > 2);

        const scoredMemories = this.longTermMemory.map(memory => {
            let relevanceScore = 0;
            const memoryText = memory.content.toLowerCase();

            // Check keyword matches
            keywords.forEach(keyword => {
                if (memoryText.includes(keyword)) {
                    relevanceScore += 0.5;
                }
            });

            // Boost recent memories
            const daysSince = (Date.now() - new Date(memory.timestamp).getTime()) / (1000 * 60 * 60 * 24);
            const recencyBoost = Math.max(0, 1 - (daysSince / 30));  // Decay over 30 days
            relevanceScore += recencyBoost * 0.3;

            // Factor in importance and access count
            relevanceScore += memory.importance * 0.5;
            relevanceScore += Math.min(memory.accessCount * 0.1, 0.5);

            return { ...memory, relevanceScore };
        });

        // Sort by relevance and return top memories
        scoredMemories.sort((a, b) => b.relevanceScore - a.relevanceScore);
        const relevant = scoredMemories.slice(0, limit);

        // Increment access count for retrieved memories
        relevant.forEach(memory => {
            const original = this.longTermMemory.find(m => m.id === memory.id);
            if (original) {
                original.accessCount++;
            }
        });

        return relevant;
    }

    /**
     * Analyze conversation importance for memory saving
     */
    analyzeImportance(userMessage, assistantResponse) {
        let importance = 0.5;  // Base importance

        const combined = (userMessage + ' ' + assistantResponse).toLowerCase();

        // Emotional keywords
        const emotionalKeywords = ['사랑', '좋아', '싫어', '슬퍼', '기쁘', '화나', '외로', '행복', '힘들', '감사'];
        emotionalKeywords.forEach(keyword => {
            if (combined.includes(keyword)) importance += 0.15;
        });

        // Personal information keywords
        const personalKeywords = ['나는', '내가', '우리', '가족', '친구', '이름', '취미', '좋아하는'];
        personalKeywords.forEach(keyword => {
            if (combined.includes(keyword)) importance += 0.1;
        });

        // Question words (shows curiosity/learning)
        const questionWords = ['왜', '어떻게', '무엇', '어디', '언제', '누구'];
        questionWords.forEach(word => {
            if (combined.includes(word)) importance += 0.05;
        });

        return Math.min(importance, 1.0);
    }

    /**
     * Determine memory category from content
     */
    determineMemoryCategory(content) {
        const lower = content.toLowerCase();

        if (lower.match(/나는|내가|이름|나이|직업/)) {
            return CONFIG.MEMORY.categories.USER_INFO;
        }
        if (lower.match(/사랑|좋아|싫어|슬퍼|기쁘|화나|외로|행복/)) {
            return CONFIG.MEMORY.categories.EMOTIONS;
        }
        if (lower.match(/취미|좋아하는|관심|흥미/)) {
            return CONFIG.MEMORY.categories.INTERESTS;
        }
        if (lower.match(/가족|친구|사람|관계/)) {
            return CONFIG.MEMORY.categories.RELATIONSHIPS;
        }

        return CONFIG.MEMORY.categories.EXPERIENCES;
    }

    /**
     * Update AI emotions based on conversation
     */
    updateEmotion(emotionType, change) {
        CONFIG.PERSONALITY.updateEmotion(this.personality, emotionType, change);
        this.savePersonality();
    }

    /**
     * Update AI growth metrics
     */
    updateGrowth(eventType) {
        CONFIG.PERSONALITY.updateGrowth(this.personality, eventType);
        this.savePersonality();
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
     * Setup voice recognition with continuous mode
     */
    setupVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = CONFIG.VOICE.continuousRecognition;
            this.recognition.interimResults = true;  // Show interim results
            this.recognition.lang = CONFIG.VOICE.recognitionLanguage;
            this.recognition.maxAlternatives = 1;

            let finalTranscript = '';
            let silenceTimer = null;

            this.recognition.onresult = (event) => {
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript = transcript;
                    }
                }

                // Show current transcript
                this.messageInput.value = finalTranscript + interimTranscript;
                this.handleInputChange({ target: this.messageInput });

                // Auto-send after silence
                if (CONFIG.VOICE.autoSend && finalTranscript) {
                    clearTimeout(silenceTimer);
                    silenceTimer = setTimeout(() => {
                        if (this.messageInput.value.trim()) {
                            this.sendMessage();
                            finalTranscript = '';
                        }
                    }, 1500);  // Send after 1.5 seconds of silence
                }
            };

            this.recognition.onend = () => {
                // Restart if voice mode is active
                if (this.voiceMode && this.settings.voiceEnabled) {
                    setTimeout(() => {
                        if (this.voiceMode) {
                            try {
                                this.recognition.start();
                            } catch (e) {
                                console.log('Recognition restart delayed');
                            }
                        }
                    }, 300);
                } else {
                    this.isRecording = false;
                    this.voiceBtn.classList.remove('recording');
                }
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);

                // Ignore aborted errors (happens when stopping manually)
                if (event.error === 'aborted') return;

                if (event.error === 'no-speech') {
                    // Just restart if no speech detected
                    if (this.voiceMode) {
                        setTimeout(() => {
                            if (this.voiceMode) {
                                try {
                                    this.recognition.start();
                                } catch (e) {}
                            }
                        }, 300);
                    }
                    return;
                }

                this.isRecording = false;
                this.voiceMode = false;
                this.voiceBtn.classList.remove('recording');
                this.showNotification(CONFIG.MESSAGES.ERROR_VOICE, 'error');
            };

            // Load Korean voice for TTS
            this.loadKoreanVoice();
        } else {
            console.warn('Speech recognition not supported');
            this.voiceBtn.style.display = 'none';
        }
    }

    /**
     * Load Korean voice for speech synthesis
     */
    loadKoreanVoice() {
        const loadVoices = () => {
            const voices = this.synthesis.getVoices();
            // Try to find Korean voice
            this.koreanVoice = voices.find(voice =>
                voice.lang.startsWith('ko') ||
                voice.lang.startsWith('ko-KR')
            );

            // Fallback to any available voice
            if (!this.koreanVoice && voices.length > 0) {
                this.koreanVoice = voices[0];
            }

            console.log('Available voices:', voices.length);
            console.log('Selected Korean voice:', this.koreanVoice?.name);
        };

        // Load voices (some browsers need this event)
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = loadVoices;
        }
        loadVoices();
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
     * Toggle continuous voice conversation mode
     */
    toggleVoiceRecording() {
        if (!this.settings.voiceEnabled) {
            this.showNotification(CONFIG.MESSAGES.ERROR_VOICE, 'warning');
            return;
        }

        if (!this.recognition) {
            this.showNotification(CONFIG.MESSAGES.ERROR_VOICE, 'error');
            return;
        }

        // Toggle voice mode
        this.voiceMode = !this.voiceMode;

        if (this.voiceMode) {
            // Start continuous voice mode
            try {
                this.recognition.start();
                this.isRecording = true;
                this.voiceBtn.classList.add('recording');
                this.voiceBtn.title = CONFIG.MESSAGES.VOICE_ACTIVE;

                // Update status indicator
                const statusText = document.querySelector('.status-indicator span');
                if (statusText) {
                    statusText.textContent = CONFIG.MESSAGES.LISTENING;
                }
            } catch (e) {
                console.error('Failed to start voice recognition:', e);
                this.voiceMode = false;
                this.showNotification(CONFIG.MESSAGES.ERROR_VOICE, 'error');
            }
        } else {
            // Stop continuous voice mode
            try {
                this.recognition.stop();
                this.isRecording = false;
                this.voiceBtn.classList.remove('recording');
                this.voiceBtn.title = CONFIG.MESSAGES.VOICE_INACTIVE;

                // Update status indicator
                const statusText = document.querySelector('.status-indicator span');
                if (statusText) {
                    statusText.textContent = 'ASI1 is ready';
                }
            } catch (e) {
                console.error('Failed to stop voice recognition:', e);
            }
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

            // Call Groq API with user message for context
            const response = await this.callGroqAPI(message);

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

            // Update growth metrics
            this.updateGrowth('conversation');
            this.messageCount++;

            // Analyze and save memory if important
            const importance = this.analyzeImportance(message, response.content);
            if (importance >= CONFIG.MEMORY.importanceThreshold) {
                const category = this.determineMemoryCategory(message + ' ' + response.content);
                const memoryContent = `User: ${message} | AI: ${response.content}`;
                this.saveMemory(memoryContent, category, importance);

                // Track as deep or emotional conversation
                if (category === CONFIG.MEMORY.categories.EMOTIONS) {
                    this.updateGrowth('emotional');
                    this.updateEmotion('affection', 0.05);
                } else if (category === CONFIG.MEMORY.categories.USER_INFO ||
                           category === CONFIG.MEMORY.categories.INTERESTS) {
                    this.updateGrowth('deep');
                    this.updateEmotion('curiosity', 0.03);
                }
            }

            // Update emotions based on conversation
            this.updateEmotion('happiness', 0.01);  // Slight happiness boost from interaction

            // Increase curiosity if user asked questions
            if (message.includes('?') || message.includes('왜') || message.includes('어떻게')) {
                this.updateEmotion('curiosity', 0.02);
                this.updateGrowth('learning');
            }

        } catch (error) {
            this.hideLoading();
            console.error('Error:', error);
            this.showNotification(error.message || CONFIG.MESSAGES.ERROR_NETWORK, 'error');
        }
    }

    /**
     * Call Groq API with GPT-OSS model and Built-In Tools
     */
    async callGroqAPI(userMessage) {
        // Prepare tools
        const tools = [];

        if (this.settings.browserSearchEnabled) {
            tools.push({ type: 'browser_search' });
        }

        if (this.settings.codeInterpreterEnabled) {
            tools.push({ type: 'code_interpreter' });
        }

        // Get relevant memories for context
        const relevantMemories = this.getRelevantMemories(userMessage, 3);

        // Build dynamic system prompt with personality and memories
        const systemPrompt = CONFIG.getSystemPrompt(this.personality, relevantMemories);

        // Prepare messages
        const messages = [
            {
                role: 'system',
                content: systemPrompt
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
     * Speak text using Web Speech API with Korean voice
     */
    speak(text) {
        if (!this.synthesis || !this.settings.autoSpeak) {
            return;
        }

        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Use settings for voice control (with fallbacks to CONFIG defaults)
        utterance.rate = this.settings.voiceRate || CONFIG.VOICE.rate;
        utterance.pitch = this.settings.voicePitch || CONFIG.VOICE.pitch;
        utterance.volume = this.settings.voiceVolume || CONFIG.VOICE.volume;
        utterance.lang = CONFIG.VOICE.synthesisLanguage;

        // Use selected voice from settings
        const voices = this.synthesis.getVoices();
        if (this.settings.selectedVoiceIndex !== undefined && voices[this.settings.selectedVoiceIndex]) {
            utterance.voice = voices[this.settings.selectedVoiceIndex];
        } else if (this.koreanVoice) {
            // Fallback to Korean voice
            utterance.voice = this.koreanVoice;
        }

        // Update status when speaking
        const statusText = document.querySelector('.status-indicator span');

        utterance.onstart = () => {
            if (statusText && !this.voiceMode) {
                statusText.textContent = CONFIG.MESSAGES.SPEAKING;
            }
        };

        utterance.onend = () => {
            if (statusText && !this.voiceMode) {
                statusText.textContent = 'ASI1이 준비되었어';
            }
        };

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

        // Load advanced voice settings
        const voiceRateSlider = document.getElementById('voiceRate');
        const voicePitchSlider = document.getElementById('voicePitch');
        const voiceVolumeSlider = document.getElementById('voiceVolume');
        const voiceSelect = document.getElementById('voiceSelect');

        if (voiceRateSlider) {
            voiceRateSlider.value = this.settings.voiceRate || CONFIG.VOICE.rate;
            document.getElementById('voiceRateValue').textContent = voiceRateSlider.value;
        }

        if (voicePitchSlider) {
            voicePitchSlider.value = this.settings.voicePitch || CONFIG.VOICE.pitch;
            document.getElementById('voicePitchValue').textContent = voicePitchSlider.value;
        }

        if (voiceVolumeSlider) {
            voiceVolumeSlider.value = this.settings.voiceVolume || CONFIG.VOICE.volume;
            document.getElementById('voiceVolumeValue').textContent = voiceVolumeSlider.value;
        }

        // Populate voice selection dropdown
        if (voiceSelect) {
            const voices = this.synthesis.getVoices();
            voiceSelect.innerHTML = '';
            voices.forEach((voice, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${voice.name} (${voice.lang})`;
                if (index === (this.settings.selectedVoiceIndex || 0)) {
                    option.selected = true;
                }
                voiceSelect.appendChild(option);
            });
        }

        // Add slider event listeners for real-time value updates
        if (voiceRateSlider) {
            voiceRateSlider.oninput = (e) => {
                document.getElementById('voiceRateValue').textContent = e.target.value;
            };
        }

        if (voicePitchSlider) {
            voicePitchSlider.oninput = (e) => {
                document.getElementById('voicePitchValue').textContent = e.target.value;
            };
        }

        if (voiceVolumeSlider) {
            voiceVolumeSlider.oninput = (e) => {
                document.getElementById('voiceVolumeValue').textContent = e.target.value;
            };
        }

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

        // Get advanced voice settings
        const voiceRateSlider = document.getElementById('voiceRate');
        const voicePitchSlider = document.getElementById('voicePitch');
        const voiceVolumeSlider = document.getElementById('voiceVolume');
        const voiceSelect = document.getElementById('voiceSelect');

        // Save all settings
        this.settings = {
            ...this.settings,
            model: this.modelSelect.value,
            browserSearchEnabled: this.browserSearchCheckbox.checked,
            codeInterpreterEnabled: this.codeInterpreterCheckbox.checked,
            voiceEnabled: this.voiceEnabledCheckbox.checked,
            autoSpeak: this.autoSpeakCheckbox.checked,
            voiceRate: voiceRateSlider ? parseFloat(voiceRateSlider.value) : CONFIG.VOICE.rate,
            voicePitch: voicePitchSlider ? parseFloat(voicePitchSlider.value) : CONFIG.VOICE.pitch,
            voiceVolume: voiceVolumeSlider ? parseFloat(voiceVolumeSlider.value) : CONFIG.VOICE.volume,
            selectedVoiceIndex: voiceSelect ? parseInt(voiceSelect.value) : 0
        };

        localStorage.setItem(CONFIG.STORAGE.SETTINGS, JSON.stringify(this.settings));

        this.closeSettings();
        this.showNotification('설정이 저장되었어!', 'info');

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
