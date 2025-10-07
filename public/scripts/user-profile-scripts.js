document.addEventListener('DOMContentLoaded', function() {
    // Get username from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    
    if (username) {
        loadUserProfile(username);
    } else {
        // Redirect back to desktop if no username provided
        window.location.href = 'desktop.html';
    }
    // Search functionality
    setupSearch();
});

async function loadUserProfile(username) {
    try {
        const response = await fetch(`/users/${encodeURIComponent(username)}`);
        
        if (!response.ok) {
            throw new Error('User not found');
        }
        
        const userData = await response.json();
        
        displayUserProfile(userData);
        
    } catch (error) {
        console.error('Error loading user profile:', error);
        displayError('User not found');
    }
}

async function displayUserProfile(userData) {
    // Update page title
    document.title = `${userData.username} - Profile`;
    
    // Update user background section
    const userBackground = document.querySelector('#user_background');
    const backArrow = userBackground.querySelector('#user_back_arrow');
    const userIcon = userBackground.querySelector('.bx.bxs-user-circle');
    const userName = userBackground.querySelector('h1');
    const followBtn = userBackground.querySelector('#follow_user_btn');

    followBtn.addEventListener('click', async () => {
        try {
            let current_user = sessionStorage.currentUser;
            const response = await fetch(`/api/follow_user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id_user: current_user, 
                    id_user_to_follow: userData.username
                })
            });

            const result = await response.json();

            if(response.ok) {
                window.location.reload();
            }
        } catch (err) {
            console.error(err);
        }
    });
    
    // Update user name
    if (userName) {
        userName.textContent = userData.username;
    }
    
    // Update profile picture if available
    if (userData.profilePicture && userIcon) {
        userIcon.style.display = 'none';
        const profileImg = document.createElement('img');
        profileImg.src = `/users/${encodeURIComponent(userData.username)}/profile-picture`;
        profileImg.alt = userData.username;
        profileImg.style.width = '150px';
        profileImg.style.height = '150px';
        profileImg.style.borderRadius = '50%';
        userIcon.parentNode.insertBefore(profileImg, userIcon);
    }

    let followers_response, followers_result;

    try {
        followers_response = await fetch(`/api/get_who_I_follow/?id_user=${sessionStorage.currentUser}`, {method: 'GET',});
        followers_result = await followers_response.json();
    } catch (err) {
        console.errro(err)
    }
    
    // Hide follow button for now (will be implemented later)
    if (sessionStorage.currentUser === userData.username || followers_result.followed.includes(userData.username)) {
        followBtn.style.display = 'none';
    }

    // ADD THIS LINE - Setup the message button functionality
    setupMessageButton(userData);
    
    // Update user summary
    updateUserSummary(userData);
    
    // Load user repositories
    loadUserRepositories(userData.username);
}

function updateUserSummary(userData) {
    const userSummary = document.querySelector('#user_summary');
    if (!userSummary) return;
    
    userSummary.innerHTML = `
        <ul>
            <li>
                <h1>First Name: </h1>
                <p>${escapeHtml(userData.firstName || 'Not specified')}</p>
            </li>
            <li>
                <h1>Last Name: </h1>
                <p>${escapeHtml(userData.lastName || 'Not specified')}</p>
            </li>
            <li>
                <h1>Birth Date: </h1>
                <p>${escapeHtml(userData.birthDate || 'Not specified')}</p>
            </li>
            <li>
                <h1>Joined: </h1>
                <p>${userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Not specified'}</p>
            </li>
        </ul>
    `;
}

async function loadUserRepositories(username) {
    try {
        const response = await fetch(`/users/${encodeURIComponent(username)}/repositories`);
        
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
    const repoList = document.querySelector('#user_repository_list ul');
    if (!repoList) return;
    
    if (!repositories || repositories.length === 0) {
        displayNoRepositories();
        return;
    }
    
    repoList.innerHTML = repositories.map(repo => `
        <li>
            <a href="repository_info.html?id=${repo.id}" style="text-decoration: none; color: inherit;">
                ${escapeHtml(repo.name)}
            </a>
        </li>
    `).join('');
}

function displayNoRepositories() {
    const repoList = document.querySelector('#user_repository_list ul');
    if (repoList) {
        repoList.innerHTML = '<li>No repositories found</li>';
    }
}

function displayError(message) {
    const mainContent = document.querySelector('.main_profile');
    if (mainContent) {
        mainContent.innerHTML = `
            <div style="text-align: center; padding: 2em; width: 100%;">
                <h2>${message}</h2>
                <a href="desktop.html" style="color: var(--light-purple);">Return to Desktop</a>
            </div>
        `;
    }
}

function setupSearch() {
    const searchBar = document.getElementById('search_bar');
    const searchSection = document.getElementById('search_bar_section');
    
    if (!searchBar || !searchSection) return;
    
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
                // Redirect to this user's profile
                window.location.href = `user-profile.html?username=${encodeURIComponent(user.username)}`;
            });
            
            searchResults.appendChild(resultItem);
        });
        
        searchResults.style.display = 'block';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setupMessageButton(userData) {
    const messageBtn = document.getElementById('message_user_btn');
    
    if (!messageBtn) return;
    
    // Hide message button if user is viewing their own profile
    if (sessionStorage.currentUser === userData.username) {
        messageBtn.style.display = 'none';
        return;
    }
    
    messageBtn.addEventListener('click', async function() {
        await startConversationWithUser(userData);
    });
}

async function startConversationWithUser(userData) {
    try {
        // Get current user from session storage
        const currentUser = sessionStorage.getItem('currentUser');
        
        if (!currentUser) {
            alert('Please log in to send messages');
            window.location.href = 'login.html';
            return;
        }
        
        // Prevent messaging yourself
        if (currentUser === userData.username) {
            alert('You cannot message yourself');
            return;
        }
        
        console.log(`Starting conversation between ${currentUser} and ${userData.username}`);
        
        // Show loading state
        const messageBtn = document.getElementById('message_user_btn');
        const originalText = messageBtn.textContent;
        messageBtn.textContent = 'Starting conversation...';
        messageBtn.disabled = true;
        
        // Start conversation using the function from general-scripts.js
        const conversationId = await startNewConversation(userData.username, userData.username);
        
        if (conversationId) {
            console.log('Conversation created with ID:', conversationId);
            
            // Redirect to chat space
            const chatUrl = `../chat_space.html?conversation=${conversationId}&user=${encodeURIComponent(userData.username)}&userId=${encodeURIComponent(userData.username)}`;
            window.location.href = chatUrl;
            
        } else {
            // Check if conversation already exists
            const existingConversation = await findExistingConversation(currentUser, userData.username);
            
            if (existingConversation) {
                console.log('Existing conversation found:', existingConversation);
                // Redirect to existing conversation
                const chatUrl = `../chat_space.html?conversation=${existingConversation}&user=${encodeURIComponent(userData.username)}&userId=${encodeURIComponent(userData.username)}`;
                window.location.href = chatUrl;
            } else {
                alert('Failed to start conversation. Please try again.');
            }
        }
        
    } catch (error) {
        console.error('Error starting conversation:', error);
        alert('Error starting conversation: ' + error.message);
    } finally {
        // Reset button state
        const messageBtn = document.getElementById('message_user_btn');
        if (messageBtn) {
            messageBtn.textContent = 'Message';
            messageBtn.disabled = false;
        }
    }
}

async function findExistingConversation(currentUser, otherUser) {
    try {
        const response = await fetch(`/api/get_user_conversations?id_user=${currentUser}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch conversations');
        }
        
        const conversations = await response.json();
        
        // Find conversation with the other user
        const existingConversation = conversations.find(conv => 
            (conv.id_user_one === currentUser && conv.id_user_two === otherUser) ||
            (conv.id_user_one === otherUser && conv.id_user_two === currentUser)
        );
        
        return existingConversation ? existingConversation.id_conversation : null;
        
    } catch (error) {
        console.error('Error finding existing conversation:', error);
        return null;
    }
}