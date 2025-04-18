import $ from 'jquery';
import 'jquery';

const usernameInput = document.querySelector('#username-input') as HTMLInputElement;

window.addEventListener('DOMContentLoaded', async () => {
    $(function(){

        const loginButtonElement = document.getElementById("login-button");

        loginButtonElement?.addEventListener("click", () => {

            localStorage.setItem('username', usernameInput.value);
            window.location.href = "/pages/browse.html"
        });

        localStorage.setItem('username', 'User123');
    });
});