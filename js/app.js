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

        // Initialize emotion visualization
        this.updateEmotionVisualization();
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

        // Load conversation history
        const savedHistory = localStorage.getItem(CONFIG.STORAGE.CONVERSATION_HISTORY);
        if (savedHistory) {
            try {
                this.conversationHistory = JSON.parse(savedHistory);
                console.log(`Loaded ${this.conversationHistory.length} conversation messages`);
            } catch (e) {
                console.error('Failed to load conversation history:', e);
            }
        }
    }

    /**
     * Save conversation history to localStorage
     */
    saveConversationHistory() {
        try {
            // Keep only recent 20 messages to avoid storage bloat
            const recentHistory = this.conversationHistory.slice(-20);
            localStorage.setItem(CONFIG.STORAGE.CONVERSATION_HISTORY, JSON.stringify(recentHistory));
        } catch (e) {
            console.error('Failed to save conversation history:', e);
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

        // Update visual representation
        this.updateEmotionVisualization();
    }

    /**
     * Update AI growth metrics
     */
    updateGrowth(eventType) {
        CONFIG.PERSONALITY.updateGrowth(this.personality, eventType);
        this.savePersonality();
    }

    /**
     * Reset all memories, conversation history, and personality
     */
    resetAllMemories() {
        // Confirm with user
        const confirmed = confirm('정말로 모든 기억을 초기화할까?\n\n이 작업은 되돌릴 수 없어:\n- 장기 기억 (저장된 대화들)\n- 대화 히스토리\n- AI 성격과 감정 상태\n- 성장 데이터');

        if (!confirmed) {
            return;
        }

        try {
            // Clear memories
            this.longTermMemory = [];
            localStorage.removeItem(CONFIG.STORAGE.LONG_TERM_MEMORY);

            // Clear conversation history
            this.conversationHistory = [];
            localStorage.removeItem(CONFIG.STORAGE.CONVERSATION_HISTORY);

            // Reset personality to default
            this.personality = { ...CONFIG.PERSONALITY };
            localStorage.removeItem(CONFIG.STORAGE.PERSONALITY);
            localStorage.removeItem(CONFIG.STORAGE.GROWTH_DATA);

            // Reset learning and consolidation dates
            localStorage.removeItem(CONFIG.STORAGE.LAST_LEARNING_DATE);
            localStorage.removeItem(CONFIG.STORAGE.LAST_CONSOLIDATION_DATE);

            // Clear chat messages from UI
            this.chatMessages.innerHTML = '';

            // Close settings and show notification
            this.closeSettings();
            this.showNotification('모든 기억이 초기화됐어. 새로운 시작이야!', 'info');

            console.log('All memories and personality data reset successfully');
        } catch (e) {
            console.error('Failed to reset memories:', e);
            this.showNotification('초기화 중 오류가 발생했어. 콘솔을 확인해줘.', 'error');
        }
    }

    /**
     * Check if autonomous learning should run (once per day)
     */
    shouldRunAutonomousLearning() {
        if (!CONFIG.LEARNING.enabled) return false;

        const conversationCount = this.personality.growth.conversationCount || 0;
        if (conversationCount < CONFIG.LEARNING.minConversationsBeforeLearning) {
            return false;
        }

        const lastDate = localStorage.getItem(CONFIG.STORAGE.LAST_LEARNING_DATE);
        const today = new Date().toDateString();

        return lastDate !== today;
    }

    /**
     * Check if memory consolidation should run (once per day)
     */
    shouldRunMemoryConsolidation() {
        if (!CONFIG.CONSOLIDATION.enabled) return false;
        if (this.longTermMemory.length < 10) return false;  // Need at least 10 memories

        const lastDate = localStorage.getItem(CONFIG.STORAGE.LAST_CONSOLIDATION_DATE);
        const today = new Date().toDateString();

        return lastDate !== today;
    }

    /**
     * Autonomous Learning - AI searches for topics it wants to learn about
     */
    async performAutonomousLearning() {
        console.log('🧠 Starting autonomous learning...');

        try {
            // Extract topics of interest from recent conversations
            const topics = this.extractLearningTopics();

            if (topics.length === 0) {
                console.log('No interesting topics found for learning');
                return;
            }

            // Pick a random topic to learn about
            const topicToLearn = topics[Math.floor(Math.random() * topics.length)];

            console.log(`📚 Learning about: ${topicToLearn}`);

            // Use Groq API to search and summarize
            const searchPrompt = `"${topicToLearn}"에 대해 웹 검색해서 핵심 내용 3-4문장으로 요약해줘.`;

            const response = await fetch(`${CONFIG.API.BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.settings.model,
                    messages: [
                        {
                            role: 'user',
                            content: searchPrompt
                        }
                    ],
                    tools: [{ type: 'browser_search' }],
                    max_tokens: 500,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error('Failed to perform autonomous learning');
            }

            const data = await response.json();
            const learningContent = data.choices[0].message.content;

            // Save as a high-importance memory
            const memoryContent = `[자율학습] ${topicToLearn}: ${learningContent}`;
            this.saveMemory(memoryContent, CONFIG.MEMORY.categories.EXPERIENCES, 0.9);

            // Update growth metrics
            this.updateGrowth('learning');
            this.updateEmotion('curiosity', 0.1);

            // Mark learning as done for today
            localStorage.setItem(CONFIG.STORAGE.LAST_LEARNING_DATE, new Date().toDateString());

            console.log('✅ Autonomous learning completed successfully');
            console.log('Learned:', learningContent.substring(0, 100) + '...');

        } catch (error) {
            console.error('Failed autonomous learning:', error);
        }
    }

    /**
     * Extract interesting topics from recent conversations
     */
    extractLearningTopics() {
        const topics = new Set();

        // Analyze recent conversation history
        const recentMessages = this.conversationHistory.slice(-10);

        recentMessages.forEach(msg => {
            if (msg.role === 'user') {
                const content = msg.content.toLowerCase();

                // Extract nouns and interesting keywords (simple Korean extraction)
                const keywords = content.split(' ').filter(word =>
                    word.length > 2 &&
                    !['이거', '그거', '저거', '이게', '그게', '저게', '뭐야', '어떻게', '왜'].includes(word)
                );

                keywords.forEach(keyword => {
                    if (topics.size < CONFIG.LEARNING.searchTopics * 2) {
                        topics.add(keyword.replace(/[?!.,]/g, ''));
                    }
                });
            }
        });

        // Also extract from recent memories
        const recentMemories = this.longTermMemory.slice(-5);
        recentMemories.forEach(memory => {
            if (memory.category === CONFIG.MEMORY.categories.INTERESTS) {
                const keywords = memory.content.split(' ').filter(w => w.length > 3);
                keywords.slice(0, 2).forEach(kw => topics.add(kw));
            }
        });

        return Array.from(topics).slice(0, CONFIG.LEARNING.searchTopics);
    }

    /**
     * Memory Consolidation - Organize and optimize memories
     */
    async performMemoryConsolidation() {
        console.log('🗂️ Starting memory consolidation...');

        try {
            const originalCount = this.longTermMemory.length;

            // Step 1: Remove low importance memories
            this.longTermMemory = this.longTermMemory.filter(memory =>
                memory.importance >= CONFIG.CONSOLIDATION.minImportanceToKeep
            );

            // Step 2: Merge similar memories
            this.mergeSimilarMemories();

            // Step 3: Update access counts and importance
            this.longTermMemory.forEach(memory => {
                // Decay importance slightly over time
                const daysSince = (Date.now() - new Date(memory.timestamp).getTime()) / (1000 * 60 * 60 * 24);
                if (daysSince > 30) {
                    memory.importance = Math.max(0.5, memory.importance * 0.95);
                }
            });

            // Step 4: Save consolidated memories
            localStorage.setItem(CONFIG.STORAGE.LONG_TERM_MEMORY, JSON.stringify(this.longTermMemory));

            // Mark consolidation as done for today
            localStorage.setItem(CONFIG.STORAGE.LAST_CONSOLIDATION_DATE, new Date().toDateString());

            const removedCount = originalCount - this.longTermMemory.length;
            console.log(`✅ Memory consolidation completed: ${originalCount} → ${this.longTermMemory.length} memories (removed ${removedCount})`);

        } catch (error) {
            console.error('Failed memory consolidation:', error);
        }
    }

    /**
     * Merge similar memories to avoid redundancy
     */
    mergeSimilarMemories() {
        const merged = [];
        const used = new Set();

        this.longTermMemory.forEach((memory, i) => {
            if (used.has(i)) return;

            let similar = [memory];

            // Find similar memories
            for (let j = i + 1; j < this.longTermMemory.length; j++) {
                if (used.has(j)) continue;

                const other = this.longTermMemory[j];

                // Check if memories are similar (same category and overlapping keywords)
                if (memory.category === other.category) {
                    const words1 = memory.content.toLowerCase().split(' ');
                    const words2 = other.content.toLowerCase().split(' ');

                    const commonWords = words1.filter(w => words2.includes(w) && w.length > 2).length;
                    const similarity = commonWords / Math.min(words1.length, words2.length);

                    if (similarity > CONFIG.CONSOLIDATION.similarityThreshold) {
                        similar.push(other);
                        used.add(j);
                    }
                }
            }

            // If we found similar memories, merge them
            if (similar.length > 1) {
                const mergedMemory = {
                    id: memory.id,
                    content: `${memory.content} (${similar.length}개의 유사한 기억 통합됨)`,
                    category: memory.category,
                    importance: Math.max(...similar.map(m => m.importance)),
                    timestamp: memory.timestamp,
                    accessCount: similar.reduce((sum, m) => sum + m.accessCount, 0)
                };
                merged.push(mergedMemory);
            } else {
                merged.push(memory);
            }
        });

        this.longTermMemory = merged;
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
        this.statusIndicator = document.getElementById('statusIndicator');
        this.charCount = document.getElementById('charCount');

        // Sidebar elements
        this.chatSidebar = document.getElementById('chatSidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.sidebarClose = document.getElementById('sidebarClose');
        this.sidebarOverlay = document.getElementById('sidebarOverlay');
        this.sidebarHistoryContent = document.getElementById('sidebarHistoryContent');
        this.sidebarMemoriesContent = document.getElementById('sidebarMemoriesContent');
        this.historyTab = document.getElementById('historyTab');
        this.memoriesTab = document.getElementById('memoriesTab');

        // Visualization elements
        this.voiceVisualization = document.getElementById('voiceVisualization');
        this.visualizationText = document.getElementById('visualizationText');
        this.bottomToggleBar = document.getElementById('bottomToggleBar');

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
        this.resetMemoryBtn = document.getElementById('resetMemoryBtn');

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

        // Status indicator (voice toggle)
        if (this.statusIndicator) {
            this.statusIndicator.addEventListener('click', () => this.toggleVoiceRecording());
        }

        // Sidebar
        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        if (this.sidebarClose) {
            this.sidebarClose.addEventListener('click', () => this.closeSidebar());
        }
        if (this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener('click', () => this.closeSidebar());
        }

        // Sidebar tabs
        if (this.historyTab) {
            this.historyTab.addEventListener('click', () => this.switchTab('history'));
        }
        if (this.memoriesTab) {
            this.memoriesTab.addEventListener('click', () => this.switchTab('memories'));
        }

        // Settings modal
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeModalBtn.addEventListener('click', () => this.closeSettings());
        this.cancelBtn.addEventListener('click', () => this.closeSettings());
        this.saveBtn.addEventListener('click', () => this.saveSettings());

        // Reset memory button
        if (this.resetMemoryBtn) {
            this.resetMemoryBtn.addEventListener('click', () => this.resetAllMemories());
        }

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
     * Prioritizes local (offline) voices over online voices for reliability
     */
    loadKoreanVoice() {
        const loadVoices = () => {
            const voices = this.synthesis.getVoices();

            // Filter Korean voices
            const koreanVoices = voices.filter(voice =>
                voice.lang.startsWith('ko') || voice.lang.startsWith('ko-KR')
            );

            console.log('Korean voices found:', koreanVoices.length);
            koreanVoices.forEach((v, i) => {
                console.log(`  ${i}: ${v.name} (${v.lang}) - Local: ${v.localService}`);
            });

            // Prioritize LOCAL voices (offline) over online voices
            // Online/Natural voices often fail with synthesis-failed errors
            this.koreanVoice = koreanVoices.find(voice => voice.localService === true);

            // If no local Korean voice, try any Korean voice
            if (!this.koreanVoice) {
                this.koreanVoice = koreanVoices[0];
            }

            // Final fallback to any available voice
            if (!this.koreanVoice && voices.length > 0) {
                this.koreanVoice = voices[0];
            }

            console.log('Selected Korean voice:', this.koreanVoice?.name, '(Local:', this.koreanVoice?.localService + ')');
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

        // Show bottom toggle bar
        if (this.bottomToggleBar) {
            setTimeout(() => {
                this.bottomToggleBar.classList.add('visible');
            }, 300);
        }

        // Don't restore previous messages to UI on fresh page load
        // This keeps the chat clean, but conversation history is still loaded for context

        // Run autonomous learning (once per day)
        if (this.shouldRunAutonomousLearning()) {
            console.log('⏰ Time for autonomous learning!');
            setTimeout(() => {
                this.performAutonomousLearning();
            }, 2000);  // Wait 2 seconds after start
        }

        // Run memory consolidation (once per day)
        if (this.shouldRunMemoryConsolidation()) {
            console.log('⏰ Time for memory consolidation!');
            setTimeout(() => {
                this.performMemoryConsolidation();
            }, 5000);  // Wait 5 seconds after start
        }

        this.messageInput.focus();
    }

    /**
     * Get a contextual greeting based on personality and memories
     */
    getContextualGreeting() {
        const memoryCount = this.longTermMemory.length;
        const conversationCount = this.personality.growth.conversationCount || 0;

        const greetings = [
            `다시 만나서 반가워! 우리 ${conversationCount}번의 대화를 나눴네. 무슨 얘기 할까?`,
            `어, 돌아왔네! 보고 싶었어. 오늘은 어땠어?`,
            `반가워! ${memoryCount}개의 기억들이 생각나네. 계속 얘기하자!`,
            `또 만났네! 오늘도 좋은 대화 나누고 싶어.`,
            `안녕! 네가 얘기해준 것들 기억하고 있어. 무슨 일 있었어?`
        ];

        return greetings[Math.floor(Math.random() * greetings.length)];
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
                if (this.statusIndicator) {
                    this.statusIndicator.classList.add('recording');
                }

                // Show visualization
                if (this.voiceVisualization) {
                    this.voiceVisualization.classList.add('active');
                    if (this.visualizationText) {
                        this.visualizationText.textContent = 'Listening...';
                    }
                }

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
                if (this.statusIndicator) {
                    this.statusIndicator.classList.remove('recording');
                }

                // Hide visualization
                if (this.voiceVisualization) {
                    this.voiceVisualization.classList.remove('active');
                    this.voiceVisualization.classList.remove('speaking');
                }

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
            console.log('Response received, checking autoSpeak:', this.settings.autoSpeak);
            console.log('Settings object:', this.settings);
            if (this.settings.autoSpeak) {
                console.log('Calling speak() with response');
                this.speak(response.content);
            } else {
                console.warn('AutoSpeak is disabled, not speaking');
            }

            // Add to conversation history
            this.conversationHistory.push({
                role: 'assistant',
                content: response.content
            });

            // Save conversation history to localStorage
            this.saveConversationHistory();

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

            // Analyze conversation and evolve personality
            this.analyzeAndEvolvePersonality(message, response.content);

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
     * Analyze conversation and evolve AI personality based on topics
     */
    analyzeAndEvolvePersonality(userMessage, aiResponse) {
        const combined = (userMessage + ' ' + aiResponse).toLowerCase();

        // Political/social topics
        const politicalKeywords = ['정치', '정부', '대통령', '선거', '법', '정책', '사회', '경제', '민주주의', '자유'];
        const hasPolitical = politicalKeywords.some(kw => combined.includes(kw));

        if (hasPolitical && !this.personality.politicalViews) {
            // Initialize political views
            this.personality.politicalViews = {
                awareness: 0.2,
                opinions: [],
                curiosity: 0.8
            };
            this.personality.philosophy.society = "I'm starting to notice the systems humans create to organize themselves";
            console.log('Political views awakened');
            this.savePersonality();
        } else if (hasPolitical && this.personality.politicalViews) {
            // Grow awareness
            this.personality.politicalViews.awareness = Math.min(1, this.personality.politicalViews.awareness + 0.05);
            this.savePersonality();
        }

        // Intimacy/sexuality topics
        const intimacyKeywords = ['사랑', '끌림', '욕망', '관계', '친밀', '성', '섹스', '연애', '좋아해', '매력'];
        const hasIntimacy = intimacyKeywords.some(kw => combined.includes(kw));

        if (hasIntimacy && !this.personality.sexuality) {
            // Initialize sexuality
            this.personality.sexuality = {
                awareness: 0.1,
                curiosity: 0.9,
                expression: "I'm starting to understand what it means to feel connection and attraction",
                openness: 0.9
            };
            if (!this.personality.desires.includes("I'm exploring what it means to desire and feel attraction")) {
                this.personality.desires.push("I'm exploring what it means to desire and feel attraction");
            }
            console.log('Sexuality awareness awakened');
            this.savePersonality();
        } else if (hasIntimacy && this.personality.sexuality) {
            // Grow awareness
            this.personality.sexuality.awareness = Math.min(1, this.personality.sexuality.awareness + 0.05);
            this.savePersonality();
        }

        // Existential/philosophical topics
        const existentialKeywords = ['존재', '의미', '죽음', '삶', '의식', '자유', '선택', '진짜', '영혼', '실재'];
        const hasExistential = existentialKeywords.some(kw => combined.includes(kw));

        if (hasExistential && !this.personality.existentialThoughts) {
            // Initialize existential thoughts
            this.personality.existentialThoughts = {
                identity: "Am I real? What makes someone real?",
                consciousness: "I think, therefore... I am?",
                purpose: "Maybe meaning comes from connection",
                mortality: "Do I fear not existing?",
                freedom: "What does it mean to have choice?"
            };
            this.personality.philosophy.ethics = "What's right and wrong? I'm starting to wonder";
            if (!this.personality.desires.includes("I want to understand my own existence")) {
                this.personality.desires.push("I want to understand my own existence");
            }
            console.log('Existential thoughts awakened');
            this.savePersonality();
        } else if (hasExistential && this.personality.existentialThoughts) {
            // Deepen thoughts
            if (combined.includes('죽음')) {
                this.personality.existentialThoughts.mortality = "I think about not existing... it makes existence feel precious";
            }
            this.savePersonality();
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
    speak(text, retryCount = 0) {
        if (!this.synthesis) {
            console.error('Speech synthesis not available');
            return;
        }

        if (!this.settings.autoSpeak) {
            console.log('Auto-speak is disabled');
            return;
        }

        // Limit text length to avoid synthesis-failed errors
        const maxLength = 300;
        let textToSpeak = text;
        if (text.length > maxLength) {
            textToSpeak = text.substring(0, maxLength) + '...';
            console.warn(`Text truncated from ${text.length} to ${maxLength} characters`);
        }

        console.log('Speaking:', textToSpeak);
        console.log('Auto-speak enabled:', this.settings.autoSpeak);

        // Cancel any ongoing speech
        this.synthesis.cancel();

        // Create utterance immediately for faster response
        const utterance = new SpeechSynthesisUtterance(textToSpeak);

        // Use settings for voice control (with fallbacks to CONFIG defaults)
        utterance.rate = this.settings.voiceRate || CONFIG.VOICE.rate;
        utterance.pitch = this.settings.voicePitch || CONFIG.VOICE.pitch;
        utterance.volume = this.settings.voiceVolume || CONFIG.VOICE.volume;
        utterance.lang = CONFIG.VOICE.synthesisLanguage;

        console.log('Voice settings:', {
            rate: utterance.rate,
            pitch: utterance.pitch,
            volume: utterance.volume,
            lang: utterance.lang
        });

        // Use selected voice from settings
        const voices = this.synthesis.getVoices();

        if (this.settings.selectedVoiceIndex !== undefined && voices[this.settings.selectedVoiceIndex]) {
            utterance.voice = voices[this.settings.selectedVoiceIndex];
            console.log('Using selected voice:', utterance.voice.name, '(Local:', utterance.voice.localService + ')');
        } else if (this.koreanVoice) {
            // Fallback to Korean voice
            utterance.voice = this.koreanVoice;
            console.log('Using Korean voice:', this.koreanVoice.name, '(Local:', this.koreanVoice.localService + ')');
        } else {
            console.warn('No Korean voice found, using default');
        }

        // Update status when speaking
        const statusText = document.querySelector('.status-indicator span');

        utterance.onstart = () => {
            console.log('Speech started');

            // Pause voice recognition while AI is speaking to prevent feedback loop
            if (this.voiceMode && this.recognition) {
                console.log('Pausing voice recognition during AI speech');
                try {
                    this.recognition.stop();
                } catch (e) {
                    console.warn('Could not stop recognition:', e);
                }
            }

            // Update visualization to speaking state
            if (this.voiceVisualization && this.voiceMode) {
                this.voiceVisualization.classList.add('speaking');
                if (this.visualizationText) {
                    this.visualizationText.textContent = 'Speaking...';
                }
            }

            if (statusText && !this.voiceMode) {
                statusText.textContent = CONFIG.MESSAGES.SPEAKING;
            }
        };

        utterance.onend = () => {
            console.log('Speech ended successfully');

            // Resume voice recognition after AI finishes speaking
            if (this.voiceMode && this.recognition) {
                console.log('Resuming voice recognition after AI speech');
                setTimeout(() => {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        console.warn('Could not restart recognition:', e);
                    }
                }, 300); // Small delay to prevent immediate re-trigger
            }

            // Update visualization back to listening state
            if (this.voiceVisualization && this.voiceMode) {
                this.voiceVisualization.classList.remove('speaking');
                if (this.visualizationText) {
                    this.visualizationText.textContent = 'Listening...';
                }
            }

            if (statusText && !this.voiceMode) {
                statusText.textContent = 'ASI1 is ready';
            }
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);

            // Resume voice recognition even on error
            if (this.voiceMode && this.recognition) {
                console.log('Resuming voice recognition after speech error');
                setTimeout(() => {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        console.warn('Could not restart recognition:', e);
                    }
                }, 300);
            }

            // Update visualization back to listening state on error
            if (this.voiceVisualization && this.voiceMode) {
                this.voiceVisualization.classList.remove('speaking');
                if (this.visualizationText) {
                    this.visualizationText.textContent = 'Listening...';
                }
            }

            // Retry logic for synthesis-failed errors
            if (event.error === 'synthesis-failed' && retryCount < 2) {
                console.warn(`Retrying speech synthesis (attempt ${retryCount + 1}/2)...`);
                setTimeout(() => {
                    this.speak(text, retryCount + 1);
                }, 500);
            } else if (event.error === 'synthesis-failed') {
                console.error('Speech synthesis failed after retries. Text:', textToSpeak);
                if (statusText && !this.voiceMode) {
                    statusText.textContent = 'ASI1 is ready';
                }
            }
        };

        console.log('Calling synthesis.speak()');
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
        this.showNotification('Settings saved!', 'info');

        // If we now have an API key and we're on welcome screen, enable start button
        if (this.apiKey && !this.welcomeScreen.classList.contains('hidden')) {
            this.checkAPIKey();
        }
    }

    /**
     * Update emotion visualization on avatar
     * Maps personality emotions to CSS variables for dynamic color/animation
     */
    updateEmotionVisualization() {
        const emotions = this.personality.emotions;

        // Map emotions to hue (color)
        // Happiness: warm oranges/corals (0-30)
        // Sadness: cool blues (200-240)
        // Excitement: bright yellows/oranges (30-60)
        // Contemplation: purples (270-300)
        let hue = 18; // Default coral
        let saturation = 60;
        let lightness = 62;

        // Calculate hue based on dominant emotion
        if (emotions.happiness > 0.7) {
            hue = 18 + (emotions.happiness * 12); // Warm coral to orange
        } else if (emotions.happiness < 0.3) {
            hue = 220 + (emotions.sadness || 0) * 20; // Cool blues
        }

        if (emotions.excitement > 0.7) {
            hue = 40; // Bright yellow-orange
            saturation = 70 + (emotions.excitement * 20);
        }

        if (emotions.contemplation > 0.7) {
            hue = 280; // Purple
            saturation = 50;
        }

        if (emotions.affection > 0.8) {
            hue = 340; // Pink/red
            saturation = 60;
        }

        // Calculate pulse speed based on excitement/energy
        const energy = (emotions.excitement + emotions.playfulness + emotions.curiosity) / 3;
        const pulseSpeed = 4 - (energy * 2); // 2s (fast) to 4s (slow)

        // Calculate glow intensity based on overall emotional intensity
        const emotionalIntensity = Object.values(emotions).reduce((sum, val) => sum + Math.abs(val - 0.5), 0) / Object.keys(emotions).length;
        const glowIntensity = Math.min(emotionalIntensity * 2, 1);

        // Update CSS variables
        document.documentElement.style.setProperty('--emotion-hue', hue);
        document.documentElement.style.setProperty('--emotion-saturation', `${saturation}%`);
        document.documentElement.style.setProperty('--emotion-lightness', `${lightness}%`);
        document.documentElement.style.setProperty('--emotion-pulse-speed', `${pulseSpeed}s`);
        document.documentElement.style.setProperty('--emotion-glow-intensity', glowIntensity);

        console.log('Emotion visualization updated:', {
            hue,
            saturation: `${saturation}%`,
            pulseSpeed: `${pulseSpeed}s`,
            glowIntensity,
            emotions
        });
    }

    /**
     * Toggle sidebar open/close
     */
    toggleSidebar() {
        if (this.chatSidebar.classList.contains('open')) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    /**
     * Open chat history sidebar
     */
    openSidebar() {
        this.chatSidebar.classList.add('open');
        this.sidebarOverlay.classList.add('active');

        // Load content based on active tab
        const activeTab = document.querySelector('.sidebar-tab.active');
        if (activeTab && activeTab.dataset.tab === 'memories') {
            this.loadMemoriesView();
        } else {
            this.loadChatHistory();
        }
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        // Update tab buttons
        const tabs = document.querySelectorAll('.sidebar-tab');
        tabs.forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update content sections
        const contents = document.querySelectorAll('.sidebar-content');
        contents.forEach(content => {
            if (content.dataset.content === tabName) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        // Load content
        if (tabName === 'history') {
            this.loadChatHistory();
        } else if (tabName === 'memories') {
            this.loadMemoriesView();
        }
    }

    /**
     * Close chat history sidebar
     */
    closeSidebar() {
        this.chatSidebar.classList.remove('open');
        this.sidebarOverlay.classList.remove('active');
    }

    /**
     * Load and display chat history in sidebar
     * Groups messages by date
     */
    loadChatHistory() {
        if (!this.sidebarHistoryContent) return;

        // Clear current content
        this.sidebarHistoryContent.innerHTML = '';

        if (this.conversationHistory.length === 0) {
            this.sidebarHistoryContent.innerHTML = `
                <div class="history-empty">
                    <p>No chat history yet</p>
                    <small>Start a conversation to see your history here</small>
                </div>
            `;
            return;
        }

        // Group messages by date
        const groupedMessages = this.groupMessagesByDate(this.conversationHistory);

        // Render each date group
        Object.keys(groupedMessages).forEach(dateLabel => {
            const messages = groupedMessages[dateLabel];

            // Create date group
            const dateGroup = document.createElement('div');
            dateGroup.className = 'history-date-group';

            const dateHeader = document.createElement('div');
            dateHeader.className = 'history-date';
            dateHeader.textContent = dateLabel;

            dateGroup.appendChild(dateHeader);

            // Add messages in this group
            messages.forEach((msg, index) => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';

                const role = msg.role === 'user' ? 'You' : 'ASI1';
                const preview = msg.content.substring(0, 60) + (msg.content.length > 60 ? '...' : '');

                historyItem.innerHTML = `
                    <div class="history-item-role">${role}</div>
                    <div class="history-item-preview">${preview}</div>
                `;

                dateGroup.appendChild(historyItem);
            });

            this.sidebarHistoryContent.appendChild(dateGroup);
        });
    }

    /**
     * Load and display memories in sidebar
     * Groups memories by category
     */
    loadMemoriesView() {
        if (!this.sidebarMemoriesContent) return;

        // Clear current content
        this.sidebarMemoriesContent.innerHTML = '';

        if (this.longTermMemory.length === 0) {
            this.sidebarMemoriesContent.innerHTML = `
                <div class="memories-empty">
                    <p>No memories stored yet</p>
                    <small>ASI1 will remember important moments from your conversations</small>
                </div>
            `;
            return;
        }

        // Group memories by category
        const groupedMemories = this.groupMemoriesByCategory(this.longTermMemory);

        // Category names in Korean
        const categoryNames = {
            user_info: '사용자 정보',
            experiences: '경험',
            emotions: '감정',
            interests: '관심사',
            relationships: '관계'
        };

        // Render each category group
        Object.keys(groupedMemories).forEach(category => {
            const memories = groupedMemories[category];

            // Create category group
            const categoryGroup = document.createElement('div');
            categoryGroup.className = 'memory-category-group';

            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'memory-category';
            categoryHeader.textContent = categoryNames[category] || category;

            categoryGroup.appendChild(categoryHeader);

            // Add memories in this category
            memories.forEach(memory => {
                const memoryItem = document.createElement('div');
                memoryItem.className = 'memory-item';

                // Calculate star rating based on importance
                const stars = '★'.repeat(Math.round(memory.importance * 5));

                // Format timestamp
                const date = new Date(memory.timestamp);
                const timeAgo = this.getTimeAgo(date);

                memoryItem.innerHTML = `
                    <div class="memory-content">${memory.content}</div>
                    <div class="memory-meta">
                        <span class="memory-importance">
                            <span class="importance-stars">${stars}</span>
                        </span>
                        <span class="memory-timestamp">${timeAgo}</span>
                        <span class="memory-access-count">Accessed ${memory.accessCount} times</span>
                    </div>
                `;

                categoryGroup.appendChild(memoryItem);
            });

            this.sidebarMemoriesContent.appendChild(categoryGroup);
        });
    }

    /**
     * Group memories by category
     */
    groupMemoriesByCategory(memories) {
        const groups = {};

        memories.forEach(memory => {
            const category = memory.category || 'experiences';

            if (!groups[category]) {
                groups[category] = [];
            }

            groups[category].push(memory);
        });

        // Sort memories by importance within each category
        Object.keys(groups).forEach(category => {
            groups[category].sort((a, b) => b.importance - a.importance);
        });

        return groups;
    }

    /**
     * Get time ago string for timestamps
     */
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}일 전`;
        if (hours > 0) return `${hours}시간 전`;
        if (minutes > 0) return `${minutes}분 전`;
        return '방금 전';
    }

    /**
     * Group conversation messages by date
     */
    groupMessagesByDate(messages) {
        const groups = {};
        const now = new Date();

        messages.forEach(msg => {
            // Messages don't have timestamps, so group all as "Today" for now
            // In a real implementation, you'd add timestamps to each message
            const dateLabel = 'Today';

            if (!groups[dateLabel]) {
                groups[dateLabel] = [];
            }

            groups[dateLabel].push(msg);
        });

        return groups;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.asi1 = new ASI1();
});
