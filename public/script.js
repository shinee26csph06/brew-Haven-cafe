async function sendRequest(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  const text = await response.text();

  console.log("Request URL:", url);
  console.log("Status:", response.status);
  console.log("Server response:", text);

  let result;

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(
      "Server returned HTML instead of JSON. Check that server.js has the correct route."
    );
  }

  if (!response.ok) {
    throw new Error(result.message || "Something went wrong.");
  }

  return result;
}

// Registration
const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = document.getElementById("registerMessage");
    message.textContent = "Creating your account...";

    try {
      const result = await sendRequest("/api/register", {
        name: document.getElementById("name").value,
        email: document.getElementById("registerEmail").value,
        password: document.getElementById("registerPassword").value
      });

      message.textContent = result.message;
      registerForm.reset();

      setTimeout(() => {
        window.location.href = "/login.html";
      }, 1200);
    } catch (error) {
      message.textContent = error.message;
    }
  });
}

// Login
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = document.getElementById("loginMessage");
    message.textContent = "Logging in...";

    try {
      await sendRequest("/api/login", {
        email: document.getElementById("loginEmail").value,
        password: document.getElementById("loginPassword").value
      });

      window.location.href = "/dashboard.html";
    } catch (error) {
      message.textContent = error.message;
    }
  });
}

// Load dashboard
if (window.location.pathname === "/dashboard.html") {
  fetch("/api/me")
    .then(async (response) => {
      if (!response.ok) {
        window.location.replace("/login.html");
        return null;
      }

      return response.json();
    })
    .then((user) => {
      if (!user) return;

      document.getElementById("welcomeName").textContent =
        `Welcome, ${user.name}!`;

      document.getElementById("userEmail").textContent = user.email;
    })
    .catch(() => {
      window.location.replace("/login.html");
    });
}

// Logout
const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
      await sendRequest("/api/logout", {});
      window.location.replace("/login.html");
    } catch (error) {
      logoutButton.disabled = false;
      alert(error.message);
    }
  });
}