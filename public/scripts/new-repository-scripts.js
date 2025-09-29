const edit_repo_name = document.querySelector('#edit_repo_name');
const repo_name = document.querySelector('#repo_name');

edit_repo_name.addEventListener('click', () => {
    repo_name.disabled = false;
});