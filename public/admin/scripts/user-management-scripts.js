// User Management Script
document.addEventListener('DOMContentLoaded', function() {
    // API Base URL
    const API_BASE_URL = 'http://localhost:3000'; // Adjust according to your API URL
    
    // State variables
    let currentUser = null;
    let allUsers = [];
    let adminUsers = [];
    let normalUsers = [];

    // DOM Elements
    const tabButtons = document.querySelectorAll('.tab_btn');
    const tabContents = document.querySelectorAll('.user_tab_content');
    const searchBar = document.getElementById('search_bar');
    const adminTab = document.getElementById('admin_tab');
    const normalTab = document.getElementById('normal_tab');

    // Initialize the page
    init();

    async function init() {
        try {
            // Get current user info (you might need to adjust this based on your auth system)
            await getCurrentUser();
            
            // Load all users
            await loadAllUsers();
            
            // Set up event listeners
            setupEventListeners();
            
        } catch (error) {
            console.error('Error initializing user management:', error);
            showMessage('Error loading user data', 'error');
        }
    }

    function setupEventListeners() {
        // Tab navigation
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked button
                button.classList.add('active');
                
                // Show corresponding content
                const tabId = button.getAttribute('data-tab');
                document.getElementById(`${tabId}_tab`).classList.add('active');
                
                // Refresh the displayed list
                refreshUserList(tabId);
            });
        });
        
        // Search functionality
        if (searchBar) {
            searchBar.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                const activeTab = document.querySelector('.tab_btn.active').getAttribute('data-tab');
                filterUsers(activeTab, searchTerm);
            });
        }
    }

    async function getCurrentUser() {
        // This should be implemented based on your authentication system
        // For now, we'll assume the username is stored in localStorage or session
        const username = localStorage.getItem('currentUsername') || sessionStorage.getItem('currentUsername');
        if (username) {
            try {
                const response = await fetch(`${API_BASE_URL}/users/${username}`);
                if (response.ok) {
                    currentUser = await response.json();
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        }
    }

    async function loadAllUsers() {
        try {
            // Fetch all users
            const response = await fetch(`${API_BASE_URL}/users`);
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            
            allUsers = await response.json();
            
            // Separate admin and normal users
            await separateUsersByRole();
            
            // Display initial user lists
            displayUsers('admin', adminUsers);
            displayUsers('normal', normalUsers);
            
        } catch (error) {
            console.error('Error loading users:', error);
            throw error;
        }
    }

    async function separateUsersByRole() {
        adminUsers = [];
        normalUsers = [];
        
        for (const user of allUsers) {
            try {
                const response = await fetch(`${API_BASE_URL}/users/${user.username}/is-admin`);
                if (response.ok) {
                    const adminStatus = await response.json();
                    if (adminStatus.isAdmin) {
                        adminUsers.push(user);
                    } else {
                        normalUsers.push(user);
                    }
                }
            } catch (error) {
                console.error(`Error checking admin status for ${user.username}:`, error);
                // Default to normal user if we can't determine status
                normalUsers.push(user);
            }
        }
        
        // Update user counts
        updateUserCounts();
    }

    function updateUserCounts() {
        const adminCount = document.querySelector('#admin_tab .user_count');
        const normalCount = document.querySelector('#normal_tab .user_count');
        
        if (adminCount) adminCount.textContent = `${adminUsers.length} users`;
        if (normalCount) normalCount.textContent = `${normalUsers.length} users`;
    }

    function displayUsers(type, users) {
        const container = type === 'admin' ? 
            adminTab.querySelector('.user_list') : 
            normalTab.querySelector('.user_list');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        if (users.length === 0) {
            container.innerHTML = '<p class="no-users-message">No users found</p>';
            return;
        }
        
        users.forEach(user => {
            const userCard = createUserCard(user, type);
            container.appendChild(userCard);
        });
    }

    function createUserCard(user, type) {
        const userCard = document.createElement('div');
        userCard.className = `user_card ${type}`;
        
        // Create user info section
        const userInfoMain = document.createElement('div');
        userInfoMain.className = 'user_info_main';
        
        // Profile picture or placeholder
        const profileIcon = document.createElement('i');
        profileIcon.className = 'bx bxs-user-circle';
        
        const userDetails = document.createElement('div');
        userDetails.className = 'user_details';
        
        const userName = document.createElement('h3');
        userName.textContent = user.username;
        
        const userRole = document.createElement('p');
        userRole.textContent = type === 'admin' ? 'Administrator' : (user.role || 'User');
        
        userDetails.appendChild(userName);
        userDetails.appendChild(userRole);
        
        userInfoMain.appendChild(profileIcon);
        userInfoMain.appendChild(userDetails);
        
        // Create actions section
        const userActions = document.createElement('div');
        userActions.className = 'user_actions';
        
        if (type === 'admin') {
            // Don't allow demoting yourself
            if (currentUser && currentUser.username !== user.username) {
                const demoteBtn = createActionButton('demote', 'Demote to normal user');
                demoteBtn.addEventListener('click', () => demoteUser(user.username));
                userActions.appendChild(demoteBtn);
            }
        } else {
            const promoteBtn = createActionButton('promote', 'Promote to admin');
            promoteBtn.addEventListener('click', () => promoteUser(user.username));
            userActions.appendChild(promoteBtn);
        }
        
        // Don't allow deleting yourself
        if (currentUser && currentUser.username !== user.username) {
            const deleteBtn = createActionButton('delete', 'Delete user');
            deleteBtn.addEventListener('click', () => deleteUser(user.username));
            userActions.appendChild(deleteBtn);
        }
        
        userCard.appendChild(userInfoMain);
        userCard.appendChild(userActions);
        
        return userCard;
    }

    function createActionButton(type, title) {
        const button = document.createElement('button');
        button.className = `action_btn ${type}_btn`;
        button.title = title;
        
        const icon = document.createElement('i');
        
        switch (type) {
            case 'promote':
                icon.className = 'bx bx-up-arrow-alt';
                break;
            case 'demote':
                icon.className = 'bx bx-down-arrow-alt';
                break;
            case 'delete':
                icon.className = 'bx bx-trash';
                break;
        }
        
        button.appendChild(icon);
        return button;
    }

    function filterUsers(type, searchTerm) {
        const users = type === 'admin' ? adminUsers : normalUsers;
        const filteredUsers = users.filter(user => 
            user.username.toLowerCase().includes(searchTerm)
        );
        
        displayUsers(type, filteredUsers);
    }

    function refreshUserList(type) {
        const searchTerm = searchBar ? searchBar.value.toLowerCase() : '';
        filterUsers(type, searchTerm);
    }

    // User Management Functions
    async function promoteUser(username) {
        if (!confirm(`Are you sure you want to promote ${username} to administrator?`)) {
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/users/${username}/promote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to promote user');
            }
            
            const result = await response.json();
            showMessage(`Successfully promoted ${username} to administrator`, 'success');
            
            // Reload users to reflect changes
            await loadAllUsers();
            
        } catch (error) {
            console.error('Error promoting user:', error);
            showMessage(`Error promoting user: ${error.message}`, 'error');
        }
    }

    async function demoteUser(username) {
        if (!confirm(`Are you sure you want to demote ${username} from administrator?`)) {
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/users/${username}/demote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to demote user');
            }
            
            const result = await response.json();
            showMessage(`Successfully demoted ${username} from administrator`, 'success');
            
            // Reload users to reflect changes
            await loadAllUsers();
            
        } catch (error) {
            console.error('Error demoting user:', error);
            showMessage(`Error demoting user: ${error.message}`, 'error');
        }
    }

    async function deleteUser(username) {
        if (!confirm(`Are you sure you want to delete user ${username}? This action cannot be undone.`)) {
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/users/${username}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete user');
            }
            
            const result = await response.json();
            showMessage(`Successfully deleted user ${username}`, 'success');
            
            // Reload users to reflect changes
            await loadAllUsers();
            
        } catch (error) {
            console.error('Error deleting user:', error);
            showMessage(`Error deleting user: ${error.message}`, 'error');
        }
    }

    // Utility Functions
    function showMessage(message, type = 'info') {
        // Remove existing message
        const existingMessage = document.querySelector('.user-management-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `user-management-message message-${type}`;
        messageDiv.textContent = message;
        
        // Add styles (you might want to add these to your CSS)
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1em 1.5em;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        if (type === 'success') {
            messageDiv.style.backgroundColor = 'var(--download-button)';
        } else if (type === 'error') {
            messageDiv.style.backgroundColor = 'var(--delete-button)';
        } else {
            messageDiv.style.backgroundColor = 'var(--primary-button)';
        }
        
        document.body.appendChild(messageDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    // Export functions for potential use elsewhere
    window.userManagement = {
        loadAllUsers,
        promoteUser,
        demoteUser,
        deleteUser,
        refreshUserList
    };
});