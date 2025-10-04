const API_BASE_URL = 'http://localhost:3000';

const edit_user_name = document.querySelector('#edit_user_name');
const user_name = document.querySelector('#user_name');
const user_pfp = document.querySelector('#user_pfp');

const user_firstname = document.querySelector('#user_firstname');
const user_lastname = document.querySelector('#user_lastname');
const user_birthdate = document.querySelector('#user_birthdate');

const save_changes_btn = document.querySelector('#save_changes_btn');

edit_user_name.addEventListener('click', () => {
    user_name.disabled = false;
});

user_name.value = sessionStorage.currentUser;
user_pfp.src = JSON.parse(sessionStorage.userData).profilePicture;

user_firstname.value = JSON.parse(sessionStorage.userData).firstName;
user_lastname.value = JSON.parse(sessionStorage.userData).lastName;
user_birthdate.value = JSON.parse(sessionStorage.userData).birthDate;

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
            window.location.reload();
        } else {
            console.log('Issues en el guardado');
        }
    } catch (error) {
        console.error('Error: ', error);
    }
});