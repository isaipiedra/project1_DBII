/* --------- DESKTOP BEHAVIOURS --------- */

/* Constants */
const notification_opener = document.querySelector('#notification_opener');
const user_notifications = document.querySelector('#user_notifications');

tooltip_right_notification.addEventListener('click', () => {
    user_notifications.style = 'display:none';
    user_info_menu.style = 'visibility:visible';
});

notification_opener.addEventListener('click', () => {
    user_notifications.style = 'display:flex';
    user_info_menu.style = 'visibility:hidden';
});


document.addEventListener('DOMContentLoaded', function() {
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

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    //Create a new post 
    function createPost(creator_pfp, dataset_id, data_username, data_fileCount, data_date, data_title, data_description) {
        // Create main post container
        const postElement = document.createElement('div');
        postElement.className = 'post';
        
        // Create post header
        const postHeader = document.createElement('div');
        postHeader.className = 'post_header';
        
        // Create user info section
        const userInfo = document.createElement('div');
        userInfo.className = 'post_header_userinfo';
        
        const userIcon = document.createElement('img');
        userIcon.src = creator_pfp;
        userIcon.style = 'border-radius: 50%';
        userIcon.setAttribute('width','40');
        
        const username = document.createElement('p');
        username.textContent = data_username;
        
        userInfo.appendChild(userIcon);
        userInfo.appendChild(username);
        
        // Create post info section
        const postInfo = document.createElement('div');
        postInfo.className = 'post_header_postinfo';
        
        const fileCount = document.createElement('h5');
        fileCount.textContent = `${data_fileCount} files`;
        
        const postDate = document.createElement('p');
        postDate.textContent = data_date;
        
        postInfo.appendChild(fileCount);
        postInfo.appendChild(postDate);
        
        // Assemble header
        postHeader.appendChild(userInfo);
        postHeader.appendChild(postInfo);
        
        // Create description section
        const postDescription = document.createElement('div');
        postDescription.className = 'post_description';
        
        const title = document.createElement('h3');
        title.textContent = data_title;
        
        const description = document.createElement('p');
        description.textContent = data_description;
        
        postDescription.appendChild(title);
        postDescription.appendChild(description);
        
        // Create see more section
        const postSeeMore = document.createElement('div');
        postSeeMore.className = 'post_seemore';
        
        const link = document.createElement('a');
        link.href = `repository_info.html?id=${dataset_id}`;
        
        const button = document.createElement('button');
        button.className = 'seemore_btn';
        button.textContent = 'See more';
        
        link.appendChild(button);
        postSeeMore.appendChild(link);
        
        // Assemble complete post
        postElement.appendChild(postHeader);
        postElement.appendChild(postDescription);
        postElement.appendChild(postSeeMore);
        
        return postElement;
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    }

    //Fill posts section 
    async function fillPostSection() {
        let new_post;
        try {
            const response = await fetch('http://localhost:3000/api/datasets/approved', {method:'GET'});
            const result = await response.json();

            for (const dataset of result) {
                let creator_pfp, data_username;
                try {
                    const user_creator = await fetch(`http://localhost:3000/users/${dataset.author}`, {method:'GET'}); 
                    const creator = await user_creator.json();

                    creator_pfp = creator.profilePicture;
                    data_username = creator.username;
                } catch (err) {
                    console.error(err);
                }

                let dataset_id = dataset._id;
                let data_fileCount = dataset.archivos.length;
                let data_date = formatDate(dataset.date);
                let data_title = dataset.name;
                let data_description = dataset.description;
                
                new_post = createPost(creator_pfp, dataset_id, data_username, data_fileCount, data_date, data_title, data_description);
                main_post_feed.appendChild(new_post);
            }
        } catch (err) {
            console.error(err);
        } 
    }

    fillPostSection();
});