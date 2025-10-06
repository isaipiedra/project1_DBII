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