const edit_user_name = document.querySelector('#edit_user_name');
const user_name = document.querySelector('#user_name');

edit_user_name.addEventListener('click', () => {
    user_name.disabled = false;
});