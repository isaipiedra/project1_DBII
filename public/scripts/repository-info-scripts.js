/* --------- REPOSITORY INFO BEHAVIOURS --------- */

/* Menu behaviors */
const tooltip_right = document.querySelector('#tooltip_right');

const user_info_menu = document.querySelector('#user_info_menu');
const menu_opener = document.querySelector('#menu_opener');
const user_info = document.querySelector('#user_info');

const user_chat_menu = document.querySelector('#user_chat_menu');
const chat_opener = document.querySelector('#chat_opener');
const repository_discussion_right = document.querySelector('#repository_discussion_right');

let chat_space_active = false;

tooltip_right.addEventListener('click', () => {
    user_info.style = 'display:none; transition:ease 0.2s';
    user_info_menu.style = 'visibility:visible';
});

menu_opener.addEventListener('click', () => {
    user_info.style = 'display:flex';
    user_info_menu.style = 'visibility:hidden';
});

chat_opener.addEventListener('click', () => {
    if (chat_space_active) {
        repository_discussion_right.style = 'display:none';
        chat_space_active = false;
    } else {
        repository_discussion_right.style = 'display:block';
        chat_space_active = true;
    }
});


/* Rating stars behaviors */
const stars_count = document.querySelector('#stars_count');
const stars = stars_count.children;

let starIsLocked = false;

function cleanStars () {
    for (let j = 0; j < stars.length; j++) {
        stars[j].style = 'color: var(--white)';
    }
}

function starsHover (i) {
    if (starIsLocked) return;
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

    stars[i].addEventListener('click', () => {
        stars_count.removeEventListener('mouseleave', cleanStars);
        starIsLocked = true;
        for (let j = 0; j < i+1; j++) {            
            stars[j].style = 'color: var(--yellow)';
        }
        for (let k = stars.length-1; k > i; k--) {
            stars[k].style = 'color: var(--white)';
        }
    });
}