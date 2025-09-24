/* --------- DESKTOP BEHAVIOURS --------- */

/* Constants */
const tooltip_left = document.querySelector('#tooltip_left');
const tooltip_right = document.querySelector('#tooltip_right');
const tooltip_right_notification = document.querySelector('#tooltip_right_notification');

const user_info_menu = document.querySelector('#user_info_menu');
const menu_opener = document.querySelector('#menu_opener');
const notification_opener = document.querySelector('#notification_opener');
const user_inbox_menu = document.querySelector('#user_inbox_menu');

const user_info = document.querySelector('#user_info');
const user_notification = document.querySelector('#user_notifications');
const side_inbox = document.querySelector('#side_inbox');

/* Events for the icons to show and hide the content */
tooltip_left.addEventListener('click', () => {
    side_inbox.style = 'display:none; transition:ease 0.2s';
    user_inbox_menu.style = 'visibility:visible';
});

user_inbox_menu.addEventListener('click', () => {
    side_inbox.style = 'display:flex';
    user_inbox_menu.style = 'visibility:hidden';
});

tooltip_right.addEventListener('click', () => {
    user_info.style = 'display:none; transition:ease 0.2s';
    user_info_menu.style = 'visibility:visible';
});

menu_opener.addEventListener('click', () => {
    user_info.style = 'display:flex';
    user_info_menu.style = 'visibility:hidden';
});

tooltip_right_notification.addEventListener('click', () => {
    user_notification.style = 'display:none';
    user_info_menu.style = 'visibility:visible';
});

notification_opener.addEventListener('click', () => {
    user_notification.style = 'display:flex';
    user_info_menu.style = 'visibility:hidden';
});