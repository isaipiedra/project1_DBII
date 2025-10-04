/* --------- DESKTOP BEHAVIOURS --------- */

/* Constants */
const notification_opener = document.querySelector('#notification_opener');
const user_notifications = document.querySelector('#user_notifications');
const user_management_opener = document.querySelector('#user_management_opener');

tooltip_right_notification.addEventListener('click', () => {
    user_notifications.style = 'display:none';
    user_info_menu.style = 'visibility:visible';
});

notification_opener.addEventListener('click', () => {
    user_notifications.style = 'display:flex';
    user_info_menu.style = 'visibility:hidden';
});

user_management_opener.addEventListener('click', () => {
    window.location.href = 'desktop.html';
});

