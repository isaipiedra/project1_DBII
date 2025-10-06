const API_BASE_URL = 'http://localhost:3000';

const user_name = document.querySelector('#user_name');
const user_pfp = document.querySelector('#user_pfp');

const user_firstname = document.querySelector('#user_firstname');
const user_lastname = document.querySelector('#user_lastname');
const user_birthdate = document.querySelector('#user_birthdate');

const save_changes_btn = document.querySelector('#save_changes_btn');
const change_password_btn = document.querySelector('#change_password_btn');


document.addEventListener('DOMContentLoaded', function() {
    user_name.value = sessionStorage.currentUser;
    user_pfp.src = JSON.parse(sessionStorage.userData).profilePicture;

    user_firstname.value = JSON.parse(sessionStorage.userData).firstName;
    user_lastname.value = JSON.parse(sessionStorage.userData).lastName;
    user_birthdate.value = JSON.parse(sessionStorage.userData).birthDate;

    loadUserRepositories(sessionStorage.currentUser);
    loadUserFollowers(sessionStorage.currentUser);

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

    async function loadUserFollowers(username) {
        try {
            const response = await fetch(`/api/get_followers_by_id/?id_user=${username}`);
            
            if (response.ok) {
                const followers = await response.json();
                displayUserFollowers(followers.followers);
            } else {
                displayNoFollowers();
            }
        } catch (error) {
            console.error('Error loading followers:', error);
            displayNoFollowers();
        }
    }
    
    async function displayUserFollowers(followers) {
        const followersList = document.querySelector('#user_followers_list ul');
        if (!followersList) return;
        
        if (!followers || followers.length === 0) {
            displayNoFollowers();
            return;
        }

        let tagContent = '';
        for (const follower of followers) {
            let follower_pfp;

            try {
                const user_follower = await fetch(`http://localhost:3000/users/${follower}`, {method:'GET'}); 
                const follow = await user_follower.json();

                follower_pfp = follow.profilePicture;
            } catch (err) {
                console.error(err);
            }
            tagContent.join(`
                
                <li>
                    <img src="${follower_pfp}" width="30" style="border-radius:50%"></img>
                    <a href="user_profile.html?username=${follower}" style="text-decoration: none; color: inherit;">
                        ${follower}
                    </a>
                </li>
            `);
        }
        followersList.innerHTML = tagContent;
    }
    
    function displayNoFollowers() {
        const followersList = document.querySelector('#user_followers_list ul');
        if (followersList) {
            followersList.innerHTML = '<li>No followers found</li>';
        }
    }

    save_changes_btn.addEventListener('click', async (e) => {
        try {
            let firstName = user_firstname.value;
            let lastName = user_lastname.value;
            let birthDate = user_birthdate.value;

            const response = await fetch(`${API_BASE_URL}/users/${sessionStorage.currentUser}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: firstName,
                    lastName: lastName,
                    birthDate: birthDate
                })
            });

            const result = await response.json();

            if (response.ok) {
                sessionStorage.setItem('userData', JSON.stringify(result.user));
                
                const message_container = document.querySelector('.message_container');
                const title_message_box = document.querySelector('.title_message_box');
                const content_message_box = document.querySelector('.content_message_box');
                const btns_message_box = document.querySelector('.btns_message_box');

                content_message_box.innerHTML = '';
                btns_message_box.innerHTML = '';

                let new_p = document.createElement('p');

                title_message_box.children[0].innerHTML = 'Success'; 

                new_p.innerHTML = 'Your information has been updated';
                content_message_box.appendChild(new_p);

                message_container.style = 'display:flex;';

                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        } catch (error) {
            console.error('Error: ', error);
        }
    });

    change_password_btn.addEventListener('click', () => {
        const message_container = document.querySelector('.message_container');
        const title_message_box = document.querySelector('.title_message_box');
        const content_message_box = document.querySelector('.content_message_box');
        const btns_message_box = document.querySelector('.btns_message_box');

        content_message_box.innerHTML = '';
        btns_message_box.innerHTML = '';

        let old_psw_label = document.createElement('label');
        let new_psw_label = document.createElement('label');
        let conf_psw_label = document.createElement('label');

        let old_psw_input = document.createElement('input');
        let new_psw_input = document.createElement('input');
        let conf_psw_input = document.createElement('input');

        let chg_psw_btn = document.createElement('button');

        title_message_box.children[0].innerHTML = 'Reset Password'; 

        old_psw_input.setAttribute('name', 'old_psw_input');
        new_psw_input.setAttribute('name', 'new_psw_input');
        conf_psw_input.setAttribute('name', 'conf_psw_input');

        old_psw_input.setAttribute('id', 'old_psw_input');
        new_psw_input.setAttribute('id', 'new_psw_input');
        conf_psw_input.setAttribute('id', 'conf_psw_input');

        old_psw_input.setAttribute('type', 'password');
        new_psw_input.setAttribute('type', 'password');
        conf_psw_input.setAttribute('type', 'password');

        old_psw_label.setAttribute('for', 'old_psw_input');
        new_psw_label.setAttribute('for', 'new_psw_input');
        conf_psw_label.setAttribute('for', 'conf_psw_input');

        old_psw_label.innerHTML = 'Old Password';
        new_psw_label.innerHTML = 'New Password';
        conf_psw_label.innerHTML = 'Confirmation';

        content_message_box.appendChild(old_psw_label);
        content_message_box.appendChild(old_psw_input);
        content_message_box.appendChild(new_psw_label);
        content_message_box.appendChild(new_psw_input);
        content_message_box.appendChild(conf_psw_label);
        content_message_box.appendChild(conf_psw_input);

        chg_psw_btn.innerHTML = 'Change Password';
        chg_psw_btn.setAttribute('id', 'btn_message_primary');

        chg_psw_btn.addEventListener('click', async (e) => {

            try {
                let curr_user_name = sessionStorage.currentUser.trim();
                let old_psw_value = old_psw_input.value;

                if (old_psw_value === '') {
                    if(content_message_box.lastElementChild.nodeName != 'P') {
                        let p_msg = document.createElement('p');
                        p_msg.innerHTML = 'Your old password do not match. Please try again';
                        p_msg.style = 'font-size: 16px; color: red';

                        content_message_box.appendChild(p_msg);
                    } else {
                        content_message_box.lastElementChild.innerHTML = 'Your old password do not match. Please try again';
                    }
                } else if (new_psw_input.value === '' || conf_psw_input.value === '') {
                    if(content_message_box.lastElementChild.nodeName != 'P') {
                        let p_msg = document.createElement('p');
                        p_msg.innerHTML = 'Password or confirmation is empty';
                        p_msg.style = 'font-size: 16px; color: var(--delete-button)';

                        content_message_box.appendChild(p_msg);
                    } else {
                        content_message_box.lastElementChild.innerHTML = 'Password or confirmation is empty';
                    }
                } else if ((new_psw_input.value === conf_psw_input.value) && conf_psw_input.value.lenght < 6) {
                    if(content_message_box.lastElementChild.nodeName != 'P') {
                        let p_msg = document.createElement('p');
                        p_msg.innerHTML = 'The new password does not meet the security policy';
                        p_msg.style = 'font-size: 16px; color: var(--delete-button)';

                        content_message_box.appendChild(p_msg);
                    } else {
                        content_message_box.lastElementChild.innerHTML = 'The new password does not meet the security policy';
                    }
                } else if (new_psw_input.value != conf_psw_input.value) {
                    if(content_message_box.lastElementChild.nodeName != 'P') {
                        let p_msg = document.createElement('p');
                        p_msg.innerHTML = 'Password and confirmation do not match';
                        p_msg.style = 'font-size: 16px; color: var(--delete-button)';

                        content_message_box.appendChild(p_msg);
                    } else {
                        content_message_box.lastElementChild.innerHTML = 'Password and confirmation do not match';
                    }
                } else {
                    const response = await fetch(`${API_BASE_URL}/auth/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            username: curr_user_name,
                            password: old_psw_value
                        })
                    });

                    const result = await response.json();
                    
                    if (response.ok) {
                        try {
                            const response_change = await fetch(`${API_BASE_URL}/users/${sessionStorage.currentUser}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    password: conf_psw_input.value
                                })
                            });

                            if (response_change.ok) {
                                if(content_message_box.lastElementChild.nodeName != 'P') {
                                    let p_msg = document.createElement('p');
                                    p_msg.innerHTML = 'Password changed successfully!';
                                    p_msg.style = 'font-size: 16px; color: #96CC6C';

                                    content_message_box.appendChild(p_msg);
                                } else {
                                    content_message_box.lastElementChild.style = 'color: #96CC6C';
                                    content_message_box.lastElementChild.innerHTML = 'Password changed successfully!';
                                }
                                setTimeout(() => {
                                    window.location.reload();
                                }, 2000);
                            }
                        } catch (error) {
                            console.error('Error: ', error);
                        }
                    } else {
                        if(content_message_box.lastElementChild.nodeName != 'P') {
                            let p_msg = document.createElement('p');
                            p_msg.innerHTML = 'Your old password do not match. Please try again';
                            p_msg.style = 'font-size: 16px; color: red';

                            content_message_box.appendChild(p_msg);
                        } else {
                            content_message_box.lastElementChild.innerHTML = 'Your old password do not match. Please try again';
                        }
                    }
                }
            } catch (error) {
                if (error.message.includes('Credenciales inválidas') || error.message.includes('Invalid credentials') || error.message.includes('Unauthorized')) {
                    if(content_message_box.lastElementChild.nodeName != 'P') {
                        let p_msg = document.createElement('p');
                        p_msg.innerHTML = 'Password and confirmation do not match. Please try again';
                        p_msg.style = 'font-size: 16px; color: red';

                        content_message_box.appendChild(p_msg);
                    } else {
                        content_message_box.lastElementChild.innerHTML = 'Your old password do not match. Please try again';
                    }
                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    console.error('Network error. Please check if the server is running.');
                } 
            }     
        });

        btns_message_box.appendChild(chg_psw_btn);

        message_container.style = 'display:flex;';
    });

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});