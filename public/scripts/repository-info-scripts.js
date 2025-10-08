document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const dataset_id = urlParams.get('id');

    const delete_btn = document.querySelector('#delete_btn');
    const approve_btn = document.querySelector('#approve_btn');
    const play_btn = document.querySelector('#play_btn');
    const close_video_btn = document.querySelector('#close_video_btn');
    const download_btn = document.querySelector('#download_btn');
    const see_downloads = document.querySelector('#see_downloads');

    const send_message = document.querySelector('#send_message');

    const change_reply_main = document.querySelector('#change_reply_main');

    let show_video = false;
    let replying_to = null;
    let id_replying_comment = null;

    /* --------- RATING STARS BEHAVIORS --------- */
    const stars_count = document.querySelector('#stars_count');
    const stars = stars_count.children;

    let starLocked = null;
    let wasVoted = false;
    let voteId = null;

    async function getRating() {
        let current_user = sessionStorage.currentUser;
        try {
           const get_votes = await fetch(`/api/return_given_vote?dataset_id=${dataset_id}&user_id=${current_user}`, {method: 'GET'}); 
            
           if(get_votes.ok) {
                const votes = await get_votes.json();
                if (votes.length != 0) {
                    wasVoted = true;
                    voteId = votes[0].id_vote;
                    let rating = votes[0].calification;
                    starLocked = rating;
                    
                    for(let i = 0; i < stars.length; i++) {
                        for (let j = 0; j < rating; j++) {            
                            stars[j].style = 'color: var(--yellow)';
                        }
                        for (let k = stars.length-1; k > rating; k--) {
                            stars[k].style = 'color: var(--white)';
                        }
                    }
                }
           }
        } catch (err) {
            console.error(err);
        }
    }

    getRating();

    function cleanStars () {
        if (starLocked === null) {
            for (let j = 0; j < stars.length; j++) {
                stars[j].style = 'color: var(--white)';
            }
        } else {
            for(let i = 0; i < stars.length; i++) {
                for (let j = 0; j < starLocked; j++) {            
                    stars[j].style = 'color: var(--yellow)';
                }
                for (let k = starLocked; k < stars.length; k++) {
                    stars[k].style = 'color: var(--white)';
                }
            }
        }        
    }

    function starsHover (i) {
        for (let j = 0; j < i+1; j++) {
            stars[j].style = 'color: var(--yellow)';
        }
        for (let k = stars.length-1; k > i; k--) {
            stars[k].style = 'color: var(--white)';
        }
    }

    stars_count.addEventListener('mouseleave', cleanStars);
    
    for (let i = 0; i < stars.length; i++) {
        stars[i].addEventListener('mouseover', () => starsHover(i) );

        stars[i].addEventListener('click', async () => {
            let rating = i + 1;
            let current_user = sessionStorage.currentUser;

            if(!wasVoted) {
                try {
                    const get_dataset = await fetch(`http://localhost:3000/api/datasets/${dataset_id}`, {method:'GET'});
                    const dataset = await get_dataset.json();

                    let dataset_name = dataset.name;
                    let dataset_description = dataset.description;
                    let user_name = dataset.author;

                    const response = await fetch('/api/add_dataset_vote', {
                        method: 'POST',
                        headers: {
                        'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            dataset_id: dataset_id, 
                            user_id: current_user, 
                            dataset_name: dataset_name, 
                            dataset_description: dataset_description, 
                            user_name: user_name, 
                            calification: rating
                        })
                    });

                    if(response.ok) {
                        window.location.reload();
                    }
                } catch (err) {
                    console.error(err);
                }               
            } else {
                try {
                    const response = await fetch('/api/update_given_vote', {
                        method: 'PUT',
                        headers: {
                        'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            dataset_id: dataset_id,
                            user_id: current_user,
                            new_calification: rating
                        })
                    });
                    
                    if(response.ok) {
                        window.location.reload();
                    }
                } catch (err) {
                    console.error(err);
                }
            }
        });
    }

    play_btn.addEventListener('click', () => {
        const video_container = document.querySelector('.video_container');
        
        if(!show_video) {
            video_container.style = "display:block";
            show_video = true;
        } else {
            video_container.style = "display:none";
            show_video = false;
        }        
    });

    close_video_btn.addEventListener('click', () => {
        const video_container = document.querySelector('.video_container');
        const video_guide = document.querySelector('#video_guide');

        video_container.style = "display:none";  
        video_guide.pause();  
    });

    delete_btn.addEventListener('click', () => {   
        const message_container = document.querySelector('.message_container');
        const title_message_box = document.querySelector('.title_message_box');
        const content_message_box = document.querySelector('.content_message_box');
        const btns_message_box = document.querySelector('.btns_message_box');

        content_message_box.innerHTML = '';
        btns_message_box.innerHTML = '';

        let new_p = document.createElement('p');

        title_message_box.children[0].innerHTML = 'Delete repository'; 

        new_p.innerHTML = 'You are about to delete this dataset, this action is not reversible. Please make sure you want to continue. Consider this action will permantly hide your repository from everyone. If you agree to continue click "Delete".';

        content_message_box.appendChild(new_p);

        message_container.style = 'display:flex;';

        let new_delete_btn = document.createElement('button');
        new_delete_btn.innerHTML = 'Delete';
        new_delete_btn.id = 'btn_message_delete';

        new_delete_btn.addEventListener('click', async () => {
            try {
                const response_mongo = await fetch(`http://localhost:3000/api/datasets/${dataset_id}/delete`, {method:'PATCH'});                
                const result_mongo = await response_mongo.json();

                const response_redis = await fetch(`http://localhost:3000/users/${result_mongo.author}/repositories/${dataset_id}`, {method:'DELETE'});
                const result_redis = await response_redis.json();

                if(response_mongo.ok && response_redis.ok) {
                    setTimeout(() => {
                        window.location.href = 'desktop.html';
                    }, 500);
                }                
            } catch (err) {
                console.error(err);
            }
        });

        btns_message_box.appendChild(new_delete_btn);
    });

    approve_btn.addEventListener('click', async () => {
        try {
            const response_mongo = await fetch(`http://localhost:3000/api/datasets/${dataset_id}/approve`, {method:'PATCH'});
            const result_mongo = await response_mongo.json();

            const response_redis = await fetch(`http://localhost:3000/users/${result_mongo.author}/repositories/${dataset_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    isPublic: true
                })
            });

            const response_neo = await fetch(`http://localhost:3000/api/notify_dataset_upload`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id_user: result_mongo.author
                })
            });

            if (response_mongo.ok && response_redis.ok && response_neo.ok) {
                const message_container = document.querySelector('.message_container');
                const title_message_box = document.querySelector('.title_message_box');
                const content_message_box = document.querySelector('.content_message_box');
                
                content_message_box.innerHTML = '';

                let new_p = document.createElement('p');

                title_message_box.children[0].innerHTML = 'Success'; 

                new_p.innerHTML = 'The dataset is now approved';

                content_message_box.appendChild(new_p);

                message_container.style = 'display:flex;';

                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        } catch (err) {
            console.error(err);
        }        
    });

    see_downloads.addEventListener('click', async () => {
        const message_container = document.querySelector('.message_container');
        const title_message_box = document.querySelector('.title_message_box');
        const content_message_box = document.querySelector('.content_message_box');
        const btns_message_box = document.querySelector('.btns_message_box');

        content_message_box.innerHTML = '';
        btns_message_box.innerHTML = '';

        title_message_box.children[0].innerHTML = 'Downloads'; 

        try {
            const get_dowloads = await fetch(`/api/get_downloads_by_dataset?dataset_id=${dataset_id}`, {method:'GET'});
            const dowloads = await get_dowloads.json();

            if(get_dowloads.ok) {
                let new_ul = document.createElement('ul');   
                for(const download of dowloads) {
                    let user_pfp;

                    try {
                        const user_response = await fetch(`http://localhost:3000/users/${download.user_id}`, {method: 'GET'}); 
                        const user_data = await user_response.json();
                        user_pfp = user_data.profilePicture;
                    } catch (err) {
                        console.error('Error fetching user profile:', err);
                        user_pfp = null;
                    }

                    let new_a = document.createElement('a');
                    let new_li = document.createElement('li');

                    let div_left = document.createElement('div');
                    let user_img = document.createElement('img');
                    let username = document.createElement('p');

                    let div_right = document.createElement('div');

                    new_a.href = `../user_profile.html?username=${encodeURIComponent(download.user_id)}`;

                    user_img.src = user_pfp;
                    user_img.style = 'width:40px; height:40px; border-radius: 50%; margin-right: 1em;';
                    username.innerHTML = download.user_id;
                    div_left.appendChild(user_img);
                    div_left.appendChild(username);

                    div_right.innerHTML = formatTime(download.download_date);

                    new_a.appendChild(div_left);
                    new_a.appendChild(div_right);
                    new_li.appendChild(new_a);

                    new_ul.appendChild(new_li);
                }   
                content_message_box.appendChild(new_ul);
                message_container.style = 'display:flex;';
            }            
        } catch (err) {
            console.error(err);
        }
    });

    download_btn.addEventListener('click', async ()=>{
        try {
            const response = await fetch(`/api/datasets/${dataset_id}/download`);
            if (response.ok) {
                const get_dataset = await fetch(`http://localhost:3000/api/datasets/${dataset_id}`, {method:'GET'});
                const dataset = await get_dataset.json();

                let dataset_name = dataset.name;
                let dataset_description = dataset.description;
                let user_name = dataset.author;
                let current_user = sessionStorage.currentUser;

                try {
                    const save_download = await fetch('/api/record_new_download', {
                        method: 'POST',
                        headers: {
                        'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            dataset_id: dataset_id, 
                            user_id: current_user, 
                            dataset_name: dataset_name, 
                            dataset_description: dataset_description, 
                            user_name: user_name
                        })
                    });

                    if(save_download.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${dataset_id}-files.zip`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    }
                } catch (err) {
                    console.error(err);
                }
            }
        } catch (error) {
            console.error('Error downloading ZIP:', error);
        }
    });

    change_reply_main.addEventListener('click', () => {
        replying_to = null;
        id_replying_comment = null;
        const replying_message = document.querySelector('#replying_message');
        replying_message.innerHTML = `Comment in main thread`;
    });

    send_message.addEventListener('click', async () => {
        const message_input = document.querySelector('#message_input');

        if(message_input.value === '') {
            console.log('vacio');
        } else if (id_replying_comment === null) {
            let comment_content = message_input.value;
            let user_name = sessionStorage.currentUser;
            try {
                const response = await fetch('/api/add_comment', {
                    method: 'POST',
                    headers: {
                    'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id_dataset: dataset_id,
                        user_name: user_name,
                        comment: comment_content,
                        visible: 'true'
                    })
                });

                if(response.ok) {
                    const result = await response.json();
                    window.location.reload();
                }                
            } catch (err) {
                console.error(err);
            }
        } else {
            let comment_content = message_input.value;
            let user_name = sessionStorage.currentUser;
            try {
                const response = await fetch('/api/reply_comment', {
                    method: 'POST',
                    headers: {
                    'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id_comment: id_replying_comment,
                        username: user_name,
                        reply: comment_content,
                        visible: 'true'
                    })
                });

                if(response.ok) {
                    const result = await response.json();
                    window.location.reload();
                }                
            } catch (err) {
                console.error(err);
            }
        }  
    });

    async function loadRepoInfo() {
        const repository_image = document.querySelector('#repository_image');

        const repository_status = document.querySelector('#repository_status');
        const repository_name = document.querySelector('#repository_name');
        const repository_owner = document.querySelector('#repository_owner');
        const repository_file_amount = document.querySelector('#repository_file_amount');
        const repository_creation_date = document.querySelector('#repository_creation_date');
        
        const repository_description = document.querySelector('#repository_description');

        const video_guide = document.querySelector('#video_guide');

        try {
            const response = await fetch(`http://localhost:3000/api/datasets/${dataset_id}`, {method:'GET'});
            const result = await response.json();

            if(response.ok) {
                let was_deleted = false; 

                if (result.status === 'Aprobado') {
                    repository_status.innerHTML = 'Status: Approved'
                } else if (result.status === 'Pendiente') {
                    repository_status.innerHTML = 'Status: Pending'
                } else if (result.status === 'Eliminado') {
                    was_deleted = true;
                    repository_status.innerHTML = 'Status: Deleted'
                }

                if (sessionStorage.isAdmin === 'true') {
                    approve_btn.style = 'display: block';
                }

                if(result.author === sessionStorage.currentUser || sessionStorage.isAdmin === 'true') {
                    delete_btn.style = 'display: block';
                    see_downloads.style = 'display: block';
                }

                if (sessionStorage.isAdmin === 'true' && was_deleted) {
                    delete_btn.style = 'display: none';
                }

                try {
                    repository_image.style.backgroundImage = `url(${asUrl(result.foto_descripcion.file_id)})`;
                } catch(err) {
                    
                }

                repository_name.innerHTML = result.name;
                repository_owner.innerHTML = `Owner: ${result.author}`;
                repository_files = result.archivos;
                repository_file_amount.innerHTML = `Files: ${repository_files.length}`;
                repository_creation_date.innerHTML = formatDate(result.date);

                repository_description.innerHTML = result.description;

                let new_source = document.createElement('source'); 
                new_source.src = asUrl(result.videos[0].file_id);
                new_source.type = 'video/mp4';

                video_guide.appendChild(new_source);   

                const repository_file_list = document.querySelector('#repository_file_list');
                let tagSequence = '';
                for(let i = 0; i < repository_files.length; i++) {
                    let file_name = repository_files[i].nombre;
                    let file_size = formatFileSize(repository_files[i].tamano);

                    tagSequence += `
                        <li class="repository_file_item">
                            <p>${file_name}</p>
                            <div class="file_item_details">
                                <p>${file_size}</p>
                            </div>
                        </li>`;
                }
                repository_file_list.innerHTML = tagSequence;

                try {
                    const get_comments = await fetch(`/api/get_all_comments_by_dataset?id_dataset=${dataset_id}`, {method: 'GET'});
                    
                    if(get_comments.ok) {
                        const comments = await get_comments.json();
                        const discussion_space = document.querySelector('#discussion_space');
                        
                        if(comments.length > 0) {
                            for (const comment of comments) {
                                if(sessionStorage.isAdmin != 'true') {
                                    if (!comment.visible) continue;
                                }
                                                                
                                let user_pfp;

                                try {
                                    const user_response = await fetch(`http://localhost:3000/users/${comment.user_name}`, {method: 'GET'}); 
                                    const user_data = await user_response.json();
                                    user_pfp = user_data.profilePicture;
                                } catch (err) {
                                    console.error('Error fetching user profile:', err);
                                    user_pfp = null;
                                }
                                
                                // Create the main comment container
                                const commentContainer = document.createElement('div');
                                commentContainer.className = 'discussion_thread';
                                
                                // Create the level one discussion (main comment)
                                const levelOneDiscussion = document.createElement('div');
                                levelOneDiscussion.className = 'level_one_discussion';
                                levelOneDiscussion.id = 'discussion_item';
                                
                                const userIconHTML = user_pfp 
                                    ? `<img src="${user_pfp}" alt="Profile" style="width: 30px; height: 30px; border-radius: 50%; margin-right:0.75em">`
                                    : `<i class='bx bxs-user-circle'></i>`;
                                
                                levelOneDiscussion.innerHTML = `
                                    <div id="discussion_item_header">
                                        <div id="discussion_item_header_user">
                                            ${userIconHTML}
                                            <p>${comment.user_name}</p>
                                        </div>
                                        <div>
                                            <i class='bx bx-reply' id="reply_arrow"></i>
                                            <i class='bx bx-minus' id="delete_comment"></i>
                                        </div>                                                            
                                    </div>
                                    <div id="discussion_item_content">
                                        <p>${comment.comment}</p>
                                    </div>
                                    <div id="discussion_item_reply_count">
                                        <!-- Reply count will be updated below -->
                                    </div>
                                `;

                                // Add reply arrow event listener
                                const replyArrow = levelOneDiscussion.querySelector('#reply_arrow');
                                replyArrow.addEventListener('click', () => {
                                    replying_to = comment.user_name;
                                    id_replying_comment = comment.id_comment;
                                    const replying_message = document.querySelector('#replying_message');
                                    replying_message.innerHTML = `Replying to: ${replying_to}`;
                                });

                                const delete_comment = levelOneDiscussion.querySelector('#delete_comment');
                                if (sessionStorage.isAdmin === 'true') {
                                    delete_comment.style = 'display: initial;';
                                }
                                
                                delete_comment.addEventListener('click', async () => {
                                    const message_container = document.querySelector('.message_container');
                                    const title_message_box = document.querySelector('.title_message_box');
                                    const content_message_box = document.querySelector('.content_message_box');
                                    const btns_message_box = document.querySelector('.btns_message_box');

                                    content_message_box.innerHTML = '';
                                    btns_message_box.innerHTML = '';

                                    let new_p = document.createElement('p');

                                    title_message_box.children[0].innerHTML = 'Hide comment'; 

                                    new_p.innerHTML = 'You are about to delete this comment, this action will make the comment invisible to regular users, meaning you will continue to see it but others will not unless they are admin. If you are sure you want to hide this comment click on the button below.';

                                    content_message_box.appendChild(new_p);

                                    message_container.style = 'display:flex;';

                                    let new_delete_btn = document.createElement('button');
                                    new_delete_btn.innerHTML = 'Delete';
                                    new_delete_btn.id = 'btn_message_delete';

                                    new_delete_btn.addEventListener('click', async () => {
                                        try {
                                            const response_delete = await fetch('/api/update_comment_visibility', {
                                                method: 'PUT',
                                                headers: {
                                                'Content-Type': 'application/json',
                                                },
                                                body: JSON.stringify({
                                                    id_dataset: dataset_id,
                                                    id_comment: comment.id_comment,
                                                    visible: false
                                                })
                                            });

                                            if (response_delete.ok) {
                                                setTimeout(() => {
                                                    window.location.reload();
                                                }, 1500);
                                            }             
                                        } catch (err) {
                                            console.error(err);
                                        }
                                    });

                                    btns_message_box.appendChild(new_delete_btn);
                                });
                                
                                commentContainer.appendChild(levelOneDiscussion);
                                
                                // Fetch replies for this comment
                                let replies = [];
                                try {
                                    const get_replies = await fetch(`/api/get_comment_replies?id_comment=${comment.id_comment}`, {method: 'GET'});
                                    
                                    if (get_replies.ok) {
                                        replies = await get_replies.json();
                                        
                                        // Update reply count in the main comment
                                        const replyCountElement = levelOneDiscussion.querySelector('#discussion_item_reply_count');
                                        if (replies.length > 0) {
                                            replyCountElement.innerHTML = `<span style="color: var(--white); font-size: 0.9em;">${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}</span>`;
                                        }
                                        
                                        // Add each reply
                                        for (const reply of replies) {
                                            if (!reply.visible) continue; // Skip invisible replies
                                            
                                            let reply_user_pfp;
                                            try {
                                                const reply_user_response = await fetch(`http://localhost:3000/users/${reply.username}`, {method: 'GET'}); 
                                                const reply_user_data = await reply_user_response.json();
                                                reply_user_pfp = reply_user_data.profilePicture;
                                            } catch (err) {
                                                console.error('Error fetching reply user profile:', err);
                                                reply_user_pfp = null;
                                            }
                                            
                                            const levelTwoDiscussion = document.createElement('div');
                                            levelTwoDiscussion.className = 'level_two_discussion';
                                            levelTwoDiscussion.id = 'discussion_item';
                                            
                                            const replyUserIconHTML = reply_user_pfp 
                                                ? `<img src="${reply_user_pfp}" alt="Profile" style="width: 30px; height: 30px; border-radius: 50%; margin-right:0.75em">`
                                                : `<i class='bx bxs-user-circle'></i>`;
                                            
                                            levelTwoDiscussion.innerHTML = `
                                                <div id="discussion_item_header">
                                                    <div id="discussion_item_header_user">
                                                        ${replyUserIconHTML}
                                                        <p>${reply.username}</p>
                                                    </div>                    
                                                </div>
                                                <div id="discussion_item_content">
                                                    <p>${reply.reply}</p>
                                                </div>
                                                <div id="discussion_item_reply_count">
                                                </div>
                                            `;
                                            
                                            commentContainer.appendChild(levelTwoDiscussion);
                                        }
                                    }
                                } catch (reply_err) {
                                    console.error('Error fetching replies for comment:', comment.id_comment, reply_err);
                                }
                                
                                discussion_space.appendChild(commentContainer);
                            }
                        } else {
                            discussion_space.innerHTML = `<p>No comments on this post yet.</p>`;
                        }                        
                    } else {
                        console.error('Failed to fetch comments:', get_comments.status);
                    }
                } catch (err) {
                    console.error('Error in comments section:', err);
                }
            }
        } catch (err) {
            console.error(err);
        }
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    }

    function formatTime(dateString) {
        const date = new Date(dateString);
        
        // Format time in 12-hour format with AM/PM
        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        // Convert to 12-hour format
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        hours = String(hours).padStart(2, '0');
        
        // Format date
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2); // Get last 2 digits of year
        
        return `${hours}:${minutes} ${ampm} ${day}/${month}/${year}`;
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function asUrl(fileId){
      return `/api/files/${fileId}`;
    }

    loadRepoInfo();
});

