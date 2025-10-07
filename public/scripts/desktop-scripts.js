/* --------- DESKTOP BEHAVIOURS --------- */

/* Constants */
const notification_list = document.querySelector('#notification_list');
const notification_opener = document.querySelector('#notification_opener');
const user_notifications = document.querySelector('#user_notifications');
const user_management_opener = document.querySelector('#user_management_opener');

if(sessionStorage.isAdmin === 'true') {
    user_management_opener.style = 'display:block;';
}

user_management_opener.addEventListener('click', () => {
    window.location.href = 'user-management.html';
});

tooltip_right_notification.addEventListener('click', () => {
    user_notifications.style = 'display:none';
    user_info_menu.style = 'visibility:visible';
    window.location.reload();
});

notification_opener.addEventListener('click', () => {
    user_notifications.style = 'display:flex';
    user_info_menu.style = 'visibility:hidden';
});

notification_opener.addEventListener('click', async () => {
    try {
        let currentUser = sessionStorage.currentUser;

        const response = await fetch(`http://localhost:3000/api/dataset_notification_checked`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({  
                id_user: currentUser
            })
        });

    } catch (err) {
        console.error(err);
    }
});

async function loadUserNotification() {
    try {
        let currentUser = sessionStorage.currentUser;
        const response_notifications = await fetch(`/api/get_new_dataset_notifications?id_user=${currentUser}`, {method: 'GET'});
        
        if(response_notifications.ok) {
            const notifications = await response_notifications.json();
            const list_of_notifications = document.querySelector('#list_of_notifications');

            let li_list = '';

            if(notifications.notifications.length > 0) {
                const notification_circle = document.querySelector('#notification_circle');
                notification_circle.style = 'display: initial';
            }

            for(const notification of notifications.notifications) {
                let user_pfp;
                
                try {
                    const user_response = await fetch(`http://localhost:3000/users/${notification}`, {method: 'GET'}); 
                    const user_data = await user_response.json();
                    user_pfp = user_data.profilePicture;
                } catch (err) {
                    console.error('Error fetching user profile:', err);
                    user_pfp = null;
                }

                li_list += `
                    <li class="notification">
                        <img id="notification_user_pfp" src="${user_pfp}" alt="notification_user_pfp" width="60px" height="60px" style="border-radius: 50%; margin-right: 0.75em;">
                        <div id="notification_iteminfo">
                            <div id="notification_item_header">
                                <h5>${notification}</h5>
                                <div class="circle_notification"></div>
                            </div>                        
                            <p>just created a new post</p>
                        </div>
                    </li>`;
            }

            list_of_notifications.innerHTML = li_list;
        }
    } catch (err) {
        console.error(err);
    }
}

document.addEventListener('DOMContentLoaded', function() {

    const searchBar = document.querySelector('#search_bar');

    searchBar.addEventListener('input', async () => {
        let search_param = searchBar.value;
        if(search_param === '') {
            fillPostSection(null);
        } else {
            fillPostSection(search_param);
            console.log();
        }
    });

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
        userIcon.setAttribute('height','40');
        
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
    async function fillPostSection(search_param) {
        try {
            const response = await fetch('http://localhost:3000/api/datasets/approved', {method:'GET'});

            let result = await response.json();
            
            if(sessionStorage.isAdmin === 'true') {
                const response_pending = await fetch('http://localhost:3000/api/datasets/pending', {method:'GET'});
                const result_pending = await response_pending.json();

                const response_deleted = await fetch('http://localhost:3000/api/datasets/deleted', {method:'GET'});
                const result_deleted = await response_deleted.json();

                result = result.concat(result_pending, result_deleted); 
            } 

            let new_post;
            const main_post_feed = document.querySelector('#main_post_feed');

            main_post_feed.innerHTML = '';

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
                
                if (search_param === null) {
                    new_post = createPost(creator_pfp, dataset_id, data_username, data_fileCount, data_date, data_title, data_description);
                    main_post_feed.appendChild(new_post);
                } else {
                    let dataset_coincidence = data_title.toLowerCase().includes(search_param.trim().toLowerCase());
                    let user_name_coincidence = data_username.toLowerCase().includes(search_param.trim().toLowerCase());
                    let desc_coincidence = data_description.toLowerCase().includes(search_param.trim().toLowerCase());

                    if (dataset_coincidence || user_name_coincidence || desc_coincidence) {
                        new_post = createPost(creator_pfp, dataset_id, data_username, data_fileCount, data_date, data_title, data_description);
                        main_post_feed.appendChild(new_post);
                    }
                }                
            }
        } catch (err) {
            console.error(err);
        } 
    }

    fillPostSection(null);
    loadUserNotification();
});