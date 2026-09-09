const API = "http://127.0.0.1:5001";

document
    .getElementById("loginForm")
    .addEventListener("submit", login);

async function login(event) {

    event.preventDefault();

    const username =
        document.getElementById("username").value.trim();

    const password =
        document.getElementById("password").value;

    const message =
        document.getElementById("loginMessage");

    message.textContent = "Logging in...";
    message.style.color = "#555";

    try {

        const response = await fetch(`${API}/login`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            credentials: "include",

            body: JSON.stringify({
                username: username,
                password: password
            })

        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Login failed"
            );
        }

        message.textContent =
            "Login successful!";

        message.style.color = "green";

        setTimeout(() => {

            window.location.href =
                "index.html";

        }, 500);

    } catch (error) {

        console.error("Login error:", error);

        message.textContent =
            error.message;

        message.style.color = "red";
    }
}