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
const side_username = document.querySelector('#username');
const user_profilepicture = document.querySelector('#user_profilepicture');

const logout_option = document.querySelector('#logout_option');

side_username.innerHTML = sessionStorage.currentUser;
user_profilepicture.src = JSON.parse(sessionStorage.userData).profilePicture;

logout_option.addEventListener('click', () => {
    sessionStorage.setItem('currentUser', '');
    sessionStorage.setItem('isLoggedIn', 'false');
    sessionStorage.setItem('userData', '');
    
    window.location.href = 'index.html';
});

/* --------- COPY REPO ---------- */
const copy_option = document.querySelector('#copy_option');

copy_option.addEventListener('click', async () => {
    const message_container = document.querySelector('.message_container');
    const title_message_box = document.querySelector('.title_message_box');
    const content_message_box = document.querySelector('.content_message_box');
    const btns_message_box = document.querySelector('.btns_message_box');

    content_message_box.innerHTML = '';
    btns_message_box.innerHTML = '';

    title_message_box.children[0].innerHTML = 'Clone repository'; 

    try {
        let username = sessionStorage.currentUser;

        const response_dataset = await fetch(`/users/${username}/repositories`);

        if(response_dataset.ok) {
            const datasets = await response_dataset.json();
            let new_ul = document.createElement('ul');
            let new_h2 = document.createElement('h2');

            new_h2.innerHTML = 'Click on the repository you want to clone.';

            for(const dataset of datasets) {
                let new_li = document.createElement('li');
                let div_left = document.createElement('div');
                let dataset_name = document.createElement('p');

                dataset_name.innerHTML = dataset.name;
                div_left.appendChild(dataset_name);  
                new_li.appendChild(div_left);

                new_li.addEventListener('click', async () => {
                    content_message_box.innerHTML = '';
                    title_message_box.children[0].innerHTML = 'Confirmation'; 

                    let confirmation_msg = document.createElement('p');
                    confirmation_msg.innerHTML = `You are about to clone the repository under the name <b>${dataset.name}</b>. Make sure this information is correct an enter a new name for the repository to clone, the new name cannot be blank.`;

                    let new_name_label = document.createElement('label');
                    let new_name_input = document.createElement('input');

                    new_name_input.setAttribute('name', 'new_dataset_name_input');
                    new_name_input.setAttribute('id', 'new_dataset_name_input');
                    new_name_input.setAttribute('type', 'text');
                    new_name_label.setAttribute('for', 'new_dataset_name_input');
                    new_name_label.innerHTML = 'Provide a new name for the dataset:';

                    content_message_box.appendChild(confirmation_msg);
                    content_message_box.appendChild(new_name_label);
                    content_message_box.appendChild(new_name_input);

                    let msg_div = document.createElement('div');
                    content_message_box.appendChild(msg_div);

                    let clone_btn = document.createElement('button');
                    clone_btn.innerHTML = 'Clone';
                    clone_btn.setAttribute('id', 'btn_message_primary');

                    clone_btn.addEventListener('click', async () => {
                        msg_div.innerHTML = '';
                        if(new_name_input.value.trim() === '') {
                            let p_msg = document.createElement('p');
                            p_msg.innerHTML = 'The new name cannot be empty.';
                            p_msg.style = 'font-size: 16px; color: red';

                            msg_div.appendChild(p_msg);
                        } else if (new_name_input.value.trim() === dataset.name) {
                            let p_msg = document.createElement('p');
                            p_msg.innerHTML = 'The new name cannot be the same as the previous dataset.';
                            p_msg.style = 'font-size: 16px; color: red';

                            msg_div.appendChild(p_msg);
                        } else {
                            try {
                                let newName = new_name_input.value.trim();

                                const clone_response = await fetch(`/api/datasets/${dataset.id}/clone`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        newName: newName
                                    })
                                });

                                const clone_result = await clone_response.json();
                                let clone_id = clone_result._id;

                                const clone_redis = await fetch(`http://localhost:3000/users/${username}/repositories`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        id: clone_id,
                                        name: newName,
                                        description: dataset.description,
                                        language: 'Spanish'
                                    })
                                }); 

                                if(clone_response.ok && clone_redis.ok) {
                                    let p_msg = document.createElement('p');
                                    p_msg.innerHTML = 'The dataset was succesfully cloned!';
                                    p_msg.style = 'font-size: 16px; color: #96CC6C';

                                    msg_div.appendChild(p_msg);

                                    setTimeout(() => {
                                        window.location.reload();
                                    }, 2000);
                                }
                            } catch (err) {
                                console.error(err);
                            }
                        }
                    });

                    btns_message_box.appendChild(clone_btn);
                });

                new_ul.appendChild(new_li);
            }

            content_message_box.appendChild(new_h2);
            content_message_box.appendChild(new_ul);
            message_container.style = 'display:flex;';
        }
        
    } catch (err) {
        console.error(err);
    }
   
});