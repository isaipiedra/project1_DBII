document.addEventListener('DOMContentLoaded', function() {
    // Check if we're already on login page
    if (window.location.pathname === '/login.html') return;
    
    // Check session only once
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    
    if (!isLoggedIn) {
        window.location.href = 'login.html';
    }

    loadUserRepositories(sessionStorage.currentUser);
    
    async function loadUserRepositories(username) {
    try {
        const response = await fetch(`/users/${username}/repositories`);
        
        if (response.ok) {
            const repositories = await response.json();
            displayUserRepositories(repositories);
        } else {
            displayNoRepositories();
        }
    } catch (error) {
        console.error('Error loading repositories:', error);
        displayNoRepositories();
    }
}

function displayUserRepositories(repositories) {
    const repoList = document.querySelector('#repository_list ul');
    if (!repoList) return;
    
    if (!repositories || repositories.length === 0) {
        displayNoRepositories();
        return;
    }
    
    repoList.innerHTML = repositories.map(repo => `
            <li class="repository_item">
                <a href="repository_info.html?id=${repo.id}" style="text-decoration: none; color: inherit;">
                    ${escapeHtml(repo.name)}
                </a>
            </li>
        `).join('');
    }

    function displayNoRepositories() {
        const repoList = document.querySelector('#repository_list ul');
        if (repoList) {
            repoList.innerHTML = '<li>No repositories found</li>';
        }
    }

    const searchBar = document.getElementById('search_bar');
    const searchSection = document.getElementById('search_bar_section');
    const main_post_feed = document.querySelector('#main_post_feed');
    
    // Create search results container
    const searchResults = document.createElement('div');
    searchResults.id = 'search_results';
    searchSection.appendChild(searchResults);

    // Debounce function to limit API calls
    let searchTimeout;
    searchBar.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        searchTimeout = setTimeout(() => {
            searchUsers(query);
        }, 300);
    });

    // Close search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchSection.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });

    // Search users function
    async function searchUsers(query) {
        try {
            const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`);
            
            if (!response.ok) {
                throw new Error('Search failed');
            }
            
            const users = await response.json();
            displaySearchResults(users);
            
        } catch (error) {
            console.error('Search error:', error);
            searchResults.innerHTML = '<div class="search-error">Error searching users</div>';
            searchResults.style.display = 'block';
        }
    }

    // Display search results
    function displaySearchResults(users) {
        if (users.length === 0) {
            searchResults.innerHTML = '<div class="search-no-results">No users found</div>';
            searchResults.style.display = 'block';
            return;
        }

        searchResults.innerHTML = '';
        
        users.forEach(user => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            
            // User profile picture or default icon
            const profilePicture = user.profilePicture ? 
                `<img src="/users/${encodeURIComponent(user.username)}/profile-picture" 
                        alt="${user.username}">` :
                `<i class='bx bxs-user-circle'></i>`;
            
            resultItem.innerHTML = `
                <div class="search-result-profile-pic">
                    ${profilePicture}
                </div>
                <span class="search-result-username">${escapeHtml(user.username)}</span>
            `;
            
            resultItem.addEventListener('click', function() {
                // FIXED: Use the correct path to user-profile.html
                window.location.href = `../user_profile.html?username=${encodeURIComponent(user.username)}`;
            });
            
            searchResults.appendChild(resultItem);
        });
        
        searchResults.style.display = 'block';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});

/* ---------- MESSAGE BEHAVIORS ---------- */
const message_container = document.querySelector('.message_container');
const close_message_btn = document.querySelector('#close_message_btn');

close_message_btn.addEventListener('click', () => {
    message_container.style = 'display:none;';
});

// ==================== INBOX MESSAGING SYSTEM (FIXED) ====================

// Global variables for inbox
let currentUserId = null;
let conversations = [];

// Fixed function to set current user from session storage
function setCurrentUserFromStorage() {
    // Use the same method as your login system
    const currentUser = sessionStorage.getItem('currentUser');
    const userData = sessionStorage.getItem('userData');
    
    if (currentUser) {
        // Use username as user ID (since your Cassandra methods use username)
        currentUserId = currentUser;
        console.log('Current user set:', currentUserId);
        return true;
    }
    return false;
}

// Initialize inbox when message button is clicked or page loads
function initializeInbox() {
    if (!setCurrentUserFromStorage()) {
        console.error('No user logged in');
        showLoginPrompt();
        return;
    }
    
    loadUserConversations();
    
    // Set up periodic refresh (optional)
    setInterval(loadUserConversations, 30000);
}

// Load user conversations
async function loadUserConversations() {
    try {
        if (!currentUserId) {
            if (!setCurrentUserFromStorage()) {
                showLoginPrompt();
                return;
            }
        }

        const inboxList = document.getElementById('inbox_list');
        if (inboxList) {
            inboxList.innerHTML = '<div class="loading-message">Loading conversations...</div>';
        }

        const response = await fetch(`/api/get_user_conversations?id_user=${currentUserId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch conversations');
        }

        conversations = await response.json();
        displayConversations(conversations);
        
    } catch (error) {
        console.error('Error loading conversations:', error);
        const inboxList = document.getElementById('inbox_list');
        if (inboxList) {
            inboxList.innerHTML = '<div class="error-message">Failed to load conversations</div>';
        }
    }
}

// Display conversations in the inbox
function displayConversations(conversations) {
    const inboxList = document.getElementById('inbox_list');
    if (!inboxList) return;
    
    const ul = document.createElement('ul');
    
    if (conversations.length === 0) {
        ul.innerHTML = '<li class="no-conversations">No conversations yet</li>';
        inboxList.innerHTML = '';
        inboxList.appendChild(ul);
        return;
    }

    // Create list items for each conversation
    conversations.forEach(conversation => {
        const listItem = createConversationListItem(conversation);
        ul.appendChild(listItem);
    });

    inboxList.innerHTML = '';
    inboxList.appendChild(ul);
}

// Create a conversation list item
function createConversationListItem(conversation) {
    const li = document.createElement('li');
    li.className = 'inbox_notification conversation-item';
    li.setAttribute('data-conversation-id', conversation.id_conversation);
    
    // Determine the other user's info
    const otherUser = conversation.id_user_one === currentUserId ? 
        { id: conversation.id_user_two, name: conversation.user_two_name } : 
        { id: conversation.id_user_one, name: conversation.user_one_name };
    
    // Create the HTML structure
    li.innerHTML = `
        <i class='bx bxs-user-circle' style='color:#ffffff; font-size: 50px;'></i>
        <div id="inbox_iteminfo">
            <div id="inbox_item_header">
                <h5>${escapeHtml(otherUser.name)}</h5>
            </div>                        
            <p class="last-message">Loading last message...</p>
        </div>
    `;
    
    // Load the last message for this conversation
    loadLastMessage(conversation.id_conversation, li);
    
    // Add click event to open conversation
    li.addEventListener('click', () => openConversation(conversation.id_conversation, otherUser));
    
    return li;
}

// Load the last message for a conversation
async function loadLastMessage(conversationId, listItem) {
    try {
        const response = await fetch(`/api/get_latest_message?id_conversation=${conversationId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch last message');
        }
        
        const lastMessage = await response.json();
        const messageElement = listItem.querySelector('.last-message');
        
        if (lastMessage && lastMessage.message) {
            const truncatedMessage = truncateMessage(lastMessage.message, 50);
            messageElement.textContent = truncatedMessage;
            
            if (lastMessage.timestamp) {
                const timeAgo = formatTimeAgo(lastMessage.timestamp);
                messageElement.setAttribute('title', `Last message: ${timeAgo}`);
            }
        } else {
            messageElement.textContent = 'Start a conversation...';
        }
        
    } catch (error) {
        console.error('Error loading last message:', error);
        const messageElement = listItem.querySelector('.last-message');
        if (messageElement) {
            messageElement.textContent = 'Failed to load message';
        }
    }
}

// Open conversation
function openConversation(conversationId, otherUser) {
    // Remove active class from all conversations
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked conversation
    const clickedItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
    if (clickedItem) {
        clickedItem.classList.add('active');
    }
    
    // Here you would load the full conversation
    console.log(`Opening conversation ${conversationId} with ${otherUser.name}`);
    // You can implement loadFullConversation() later
    loadFullConversation(conversationId, otherUser);
}

function loadFullConversation(conversationId, otherUser) {
    console.log(`Opening conversation ${conversationId} with ${otherUser.name}`);
    
    // Redireccionar en la misma ventana en lugar de abrir nueva
    const chatUrl = `../chat_space.html?conversation=${conversationId}&user=${encodeURIComponent(otherUser.name)}&userId=${encodeURIComponent(otherUser.id)}`;
    window.location.href = chatUrl;
}

// Function to show login prompt
function showLoginPrompt() {
    const inboxList = document.getElementById('inbox_list');
    if (inboxList) {
        inboxList.innerHTML = `
            <div class="login-prompt">
                <p>Please log in to view your messages</p>
                <button onclick="redirectToLogin()" class="login-btn">Log In</button>
            </div>
        `;
    }
}

function redirectToLogin() {
    window.location.href = 'login.html';
}

// Utility functions for inbox
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function truncateMessage(message, maxLength) {
    if (!message) return 'No messages';
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown time';
    const messageTime = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
}

// Start conversation with another user
async function startNewConversation(otherUserId, otherUserName) {
    try {
        if (!currentUserId) {
            if (!setCurrentUserFromStorage()) {
                showLoginPrompt();
                return null;
            }
        }

        const response = await fetch('/api/start_conversation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id_user_one: currentUserId,
                id_user_two: otherUserId,
                user_one_name: currentUserId, // Using username as name
                user_two_name: otherUserName
            })
        });

        if (!response.ok) {
            throw new Error('Failed to start conversation');
        }

        const result = await response.json();
        
        // Reload conversations to show the new one
        loadUserConversations();
        
        return result.id_conversation;
        
    } catch (error) {
        console.error('Error starting conversation:', error);
        return null;
    }
}

// Send a message in a conversation
async function sendNewMessage(conversationId, message) {
    try {
        if (!currentUserId) {
            if (!setCurrentUserFromStorage()) {
                showLoginPrompt();
                return false;
            }
        }

        const response = await fetch('/api/send_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id_conversation: conversationId,
                id_user: currentUserId,
                message: message
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send message');
        }

        // Reload to show the new message
        loadUserConversations();
        
        return true;
        
    } catch (error) {
        console.error('Error sending message:', error);
        return false;
    }
}

// ==================== TEST FUNCTIONS (FIXED) ====================

// Test function that doesn't depend on login utilities
async function testMessagingSystem() {
    try {
        console.log('Starting messaging system test...');
        
        // Get current user directly from sessionStorage
        const currentUser = sessionStorage.getItem('currentUser');
        if (!currentUser) {
            console.error('No user logged in. Please log in first.');
            alert('Please log in first to test messaging');
            return;
        }
        
        console.log('Current user:', currentUser);
        
        // Test users
        const testUsers = ['testuser1', 'testuser2', 'testuser3'];
        
        for (const testUser of testUsers) {
            console.log(`Testing with user: ${testUser}`);
            
            // Start conversation
            const conversationId = await startTestConversation(currentUser, testUser);
            
            if (conversationId) {
                console.log(`Conversation started: ${conversationId}`);
                
                // Send test messages
                const messages = [
                    `Hello ${testUser}! This is a test message from ${currentUser}.`,
                    `How are you doing today?`,
                    `This is testing the inbox functionality.`,
                    `Let me know if you received these messages!`
                ];
                
                for (const message of messages) {
                    const success = await sendTestMessage(conversationId, currentUser, message);
                    if (success) {
                        console.log(`Message sent: ${message}`);
                    } else {
                        console.error('Failed to send message');
                    }
                    
                    // Small delay between messages
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } else {
                console.error(`Failed to start conversation with ${testUser}`);
            }
            
            // Delay between conversations
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('Messaging test completed!');
        alert('Test completed! Check your inbox for the test conversations.');
        
        // Refresh inbox to show new conversations
        loadUserConversations();
        
    } catch (error) {
        console.error('Test failed:', error);
        alert('Test failed: ' + error.message);
    }
}

// Start a test conversation
async function startTestConversation(currentUser, otherUser) {
    try {
        const response = await fetch('/api/start_conversation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id_user_one: currentUser,
                id_user_two: otherUser,
                user_one_name: currentUser,
                user_two_name: otherUser
            })
        });

        if (!response.ok) {
            throw new Error('Failed to start conversation');
        }

        const result = await response.json();
        return result.id_conversation || result.conversation_id;
        
    } catch (error) {
        console.error('Error starting conversation:', error);
        return null;
    }
}

// Send a test message
async function sendTestMessage(conversationId, currentUser, message) {
    try {
        const response = await fetch('/api/send_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id_conversation: conversationId,
                id_user: currentUser,
                message: message
            })
        });

        return response.ok;
        
    } catch (error) {
        console.error('Error sending message:', error);
        return false;
    }
}

// Quick test function
async function quickTest() {
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        alert('Please log in first to test messaging');
        return;
    }
    
    const testUser = 'testuser';
    const conversationId = await startTestConversation(currentUser, testUser);
    
    if (conversationId) {
        await sendTestMessage(conversationId, currentUser, `Hello! This is a test message from ${currentUser}`);
        await sendTestMessage(conversationId, currentUser, 'This is testing the inbox functionality');
        alert('Test messages sent! Check your inbox.');
        
        // Refresh inbox
        loadUserConversations();
    }
}

// ==================== EVENT LISTENERS ====================

// Initialize inbox when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for message button if it exists
    const messageButton = document.getElementById('messageButton');
    if (messageButton) {
        messageButton.addEventListener('click', function() {
            if (sessionStorage.getItem('isLoggedIn') === 'true') {
                initializeInbox();
            } else {
                showLoginPrompt();
            }
        });
    }
    
    // Auto-initialize if on a page where inbox is always visible and user is logged in
    if (document.getElementById('side_inbox') && sessionStorage.getItem('isLoggedIn') === 'true') {
        initializeInbox();
    }
    
    // Add refresh button functionality
    const refreshButton = document.getElementById('refresh_conversations');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            loadUserConversations();
        });
    }
});

// ==================== GLOBAL FUNCTIONS FOR CONSOLE ====================

// Make functions available globally for console testing
window.testMessagingSystem = testMessagingSystem;
window.quickTest = quickTest;
window.startTestConversation = startTestConversation;
window.sendTestMessage = sendTestMessage;
window.getCurrentUser = function() { return sessionStorage.getItem('currentUser'); };
window.checkLoginStatus = function() { return sessionStorage.getItem('isLoggedIn') === 'true'; };
window.manualTest = function() {
    console.log('=== Manual Messaging Test ===');
    console.log('Current user:', sessionStorage.getItem('currentUser'));
    console.log('Is logged in:', sessionStorage.getItem('isLoggedIn') === 'true');
    console.log('Available test functions:');
    console.log('- quickTest(): Send a few test messages');
    console.log('- testMessagingSystem(): Comprehensive test with multiple users');
    console.log('- startTestConversation("user1", "user2"): Start a specific conversation');
    console.log('- sendTestMessage("conv_id", "user", "message"): Send specific message');
};

console.log('🔧 Messaging system loaded! Run quickTest() to test.');

/* -------- SIDE BARS BEHAVIORS --------- */

const tooltip_left = document.querySelector('#tooltip_left');
const tooltip_right = document.querySelector('#tooltip_right');
const tooltip_right_notification = document.querySelector('#tooltip_right_notification');

const user_info_menu = document.querySelector('#user_info_menu');
const menu_opener = document.querySelector('#menu_opener');
const user_inbox_menu = document.querySelector('#user_inbox_menu');

const user_info = document.querySelector('#user_info');
const side_inbox = document.querySelector('#side_inbox');

tooltip_left.addEventListener('click', () => {
    side_inbox.style = 'display:none;';
    user_inbox_menu.style = 'visibility:visible';
});

user_inbox_menu.addEventListener('click', () => {
    side_inbox.style = 'display:flex';
    user_inbox_menu.style = 'visibility:hidden';
});

tooltip_right.addEventListener('click', () => {
    user_info.style = 'display:none;';
    user_info_menu.style = 'visibility:visible';
});

menu_opener.addEventListener('click', () => {
    user_info.style = 'display:flex';
    user_info_menu.style = 'visibility:hidden';
});

/* --------- SIDEBAR INFO ---------- */
const username = document.querySelector('#username');
const user_profilepicture = document.querySelector('#user_profilepicture');

const logout_option = document.querySelector('#logout_option');

username.innerHTML = sessionStorage.currentUser;
user_profilepicture.src = JSON.parse(sessionStorage.userData).profilePicture;

logout_option.addEventListener('click', () => {
    sessionStorage.setItem('currentUser', '');
    sessionStorage.setItem('isLoggedIn', 'false');
    sessionStorage.setItem('userData', '');
    
    window.location.href = 'index.html';
});