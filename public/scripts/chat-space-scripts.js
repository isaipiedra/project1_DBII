class ChatSpace {
    constructor() {
        this.currentConversationId = null;
        this.otherUser = null;
        this.currentUser = null;
        this.messages = [];
        this.shouldScrollToBottom = true;
        this.isUserAtBottom = true; // Track if user is at bottom
        
        this.initializeChat();
    }

    initializeChat() {
        this.getUrlParameters();
        this.setCurrentUser();
        this.loadUIElements();
        this.setupEventListeners();
        this.loadConversationMessages();
        this.setupAutoRefresh();
    }

    getUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        this.currentConversationId = urlParams.get('conversation');
        this.otherUser = {
            name: decodeURIComponent(urlParams.get('user') || ''),
            id: decodeURIComponent(urlParams.get('userId') || '')
        };

        if (!this.currentConversationId) {
            console.error('No conversation ID provided');
            this.showError('No conversation selected');
            return;
        }
    }

    setCurrentUser() {
        this.currentUser = sessionStorage.getItem('currentUser');
        if (!this.currentUser) {
            this.showError('User not logged in');
            return;
        }

        // Update UI with user info
        this.updateUserInfo();
    }

    async updateUserInfo() {
        // Update the user background section
        const userBackground = document.getElementById('user_background');
        if (userBackground) {
            const userIcon = userBackground.querySelector('#user_pfp');
            const userName = userBackground.querySelector('h1');
            
            if (userName) userName.textContent = this.otherUser.name;

            let follower_pfp;
            try {
                const user_follower = await fetch(`http://localhost:3000/users/${this.otherUser.name}`, {method:'GET'}); 
                const follow = await user_follower.json();

                follower_pfp = follow.profilePicture;
            } catch (err) {
                console.error(err);
            }

            userIcon.src = follower_pfp;
        }
    }

    loadUIElements() {
        this.messageContainer = document.querySelector('.user_chats');
        this.messageInput = document.getElementById('new_message_input');
        this.sendButton = document.querySelector('.user_message_box .bxs-send');
        this.backButton = document.getElementById('user_back_arrow');
    }

    setupEventListeners() {
        // Send message on button click
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => this.sendMessage());
        }

        // Send message on Enter key
        if (this.messageInput) {
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }

        // Back button - redirigir a la página anterior
        if (this.backButton) {
            this.backButton.addEventListener('click', (e) => {
                e.preventDefault();
                // Redirigir a desktop.html o la página anterior
                window.location.href = 'desktop.html';
            });
        }

        // Menu opener for sidebar
        const menuOpener = document.getElementById('menu_opener');
        if (menuOpener) {
            menuOpener.addEventListener('click', this.toggleSidebar);
        }

        // Inbox menu
        const inboxMenu = document.getElementById('user_inbox_menu');
        if (inboxMenu) {
            inboxMenu.addEventListener('click', this.toggleInbox);
        }

        // Track user scroll position
        if (this.messageContainer) {
            this.messageContainer.addEventListener('scroll', () => {
                this.handleUserScroll();
            });
        }
    }

    handleUserScroll() {
        if (!this.messageContainer) return;

        // Check if user is at the bottom
        this.isUserAtBottom = this.isAtBottom();
    }

    isAtBottom() {
        if (!this.messageContainer) return true;
        
        const tolerance = 50; // pixels tolerance for "close enough" to bottom
        return this.messageContainer.scrollHeight - this.messageContainer.scrollTop - this.messageContainer.clientHeight <= tolerance;
    }

    async loadConversationMessages() {
        try {
            if (!this.currentConversationId) return;

            console.log(this.currentConversationId);
            const response = await fetch(`/api/get_conversation_messages?id_conversation=${this.currentConversationId}`);
            
            if (!response.ok) {
                throw new Error('Failed to load messages');
            }

            this.messages = await response.json();
            
            // CORRECCIÓN: Ordenar mensajes por timestamp (más recientes primero)
            this.messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            this.displayMessages();
            
        } catch (error) {
            console.error('Error loading messages:', error);
            this.showError('Failed to load messages');
        }
    }

    displayMessages() {
        if (!this.messageContainer) return;

        // Store scroll position before updating messages
        const previousScrollHeight = this.messageContainer.scrollHeight;
        const previousScrollTop = this.messageContainer.scrollTop;

        this.messageContainer.innerHTML = '';

        if (this.messages.length === 0) {
            this.messageContainer.innerHTML = '<div class="no-messages">No messages yet. Start the conversation!</div>';
            return;
        }

        // CORRECCIÓN: Mostrar mensajes en orden inverso (más antiguos arriba, más recientes abajo)
        for (let i = this.messages.length - 1; i >= 0; i--) {
            const messageElement = this.createMessageElement(this.messages[i]);
            this.messageContainer.appendChild(messageElement);
        }

        // Only scroll to bottom if we're supposed to OR if user was already at bottom
        if (this.shouldScrollToBottom || this.isUserAtBottom) {
            this.scrollToBottom();
        } else {
            // Maintain scroll position relative to content
            const newScrollHeight = this.messageContainer.scrollHeight;
            const heightDifference = newScrollHeight - previousScrollHeight;
            this.messageContainer.scrollTop = previousScrollTop + heightDifference;
        }
        
        this.shouldScrollToBottom = false; // Reset the flag
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.id_user === this.currentUser ? 'own-message' : 'other-message'}`;
        
        const messageContent = document.createElement('p');
        messageContent.textContent = message.message;
        
        const messageTime = document.createElement('span');
        messageTime.className = 'message-time';
        messageTime.textContent = this.formatMessageTime(message.timestamp);
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        
        return messageDiv;
    }

    formatMessageTime(timestamp) {
        if (!timestamp) return '';
        
        const messageTime = new Date(timestamp);
        const now = new Date();
        
        // Si es hoy, mostrar solo la hora
        if (messageTime.toDateString() === now.toDateString()) {
            return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // Si es este año, mostrar fecha y hora
        if (messageTime.getFullYear() === now.getFullYear()) {
            return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
                   messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // De lo contrario mostrar fecha completa
        return messageTime.toLocaleDateString();
    }

    async sendMessage() {
        if (!this.messageInput || !this.messageInput.value.trim()) return;

        const messageText = this.messageInput.value.trim();
        console.log(this.currentConversationId);
        try {
            const response = await fetch('/api/send_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id_conversation: this.currentConversationId,
                    id_user: this.currentUser,
                    message: messageText
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            // Clear input
            this.messageInput.value = '';
            
            // Set flag to scroll to bottom after sending new message
            this.shouldScrollToBottom = true;
            
            // Recargar mensajes para mostrar el nuevo
            await this.loadConversationMessages();
            
            window.location.reload();
        } catch (error) {
            console.error('Error sending message:', error);
            this.showError('Failed to send message');
        }
    }

    scrollToBottom() {
        if (this.messageContainer) {
            this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
            this.isUserAtBottom = true; // User is now at bottom after auto-scroll
        }
    }

    setupAutoRefresh() {
        // Refrescar mensajes cada 5 segundos solo si el usuario está al final del scroll
        setInterval(async () => {
            // Only refresh if user is at the bottom
            if (this.isUserAtBottom) {
                await this.loadConversationMessages();
            }
        }, 5000);
    }

    showError(message) {
        console.error('Chat Error:', message);
        // Puedes implementar un sistema de notificación mejor
        alert(message);
    }

    toggleSidebar() {
        const sidebar = document.getElementById('user_info');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
        }
    }

    toggleInbox() {
        const inbox = document.getElementById('side_inbox');
        if (inbox) {
            inbox.classList.toggle('open');
        }
    }
}

// Inicializar chat cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    window.chatSpace = new ChatSpace();
});