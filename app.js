// app.js (Frontend logika - koristi firebaseService.js za rad s bazom)
import {
  saveTaskToDB,
  deleteTaskFromDB,
  getTasksForUser,
  getShortDescriptionTasks,
  submitUserReview,
  getTopUserRatings,
  updateTaskInDB,
  getTaskStats,
} from "./backend/firebaseService.js";

// Inicijalizacija DOM elemenata
const content = document.getElementById("content");
const navHome = document.getElementById("nav-home");
const navTasks = document.getElementById("nav-tasks");
const navAddTask = document.getElementById("nav-add-task");
const navLogin = document.getElementById("nav-login");
const navRegister = document.getElementById("nav-register");
const navLogout = document.getElementById("nav-logout");

let currentUser = null;
let selectedRating = 0;
let minutes = 25;
let seconds = 0;
let timerRunning = false;

// ---------- UI FUNKCIJE ----------

function showHome() {
  content.innerHTML = `
    <h1>Dobrodošli u Student Task Tracker!</h1>
    <p id="intro-text">Pratite svoje zadatke i napredak kroz semestar. Kliknite na "Moji Zadaci" za pregled ili "Dodaj Zadatak" za unos novog zadatka.</p>

    <div id="quote-container">
      <h3>Motivacijski citat dana:</h3>
      <p id="quote-text">Učitavanje citata...</p>
    </div>

    <div id="task-stats">
      <h3>Vaša statistika</h3>
      <p>Ukupan broj zadataka: <span id="total-tasks">...</span></p>
      <p>Broj dovršenih zadataka: <span id="completed-tasks">...</span></p>
    </div>

    <div id="user-review">
      <h3>Ocijenite aplikaciju!</h3>
      <p>Ostavite svoju ocjenu u rasponu od 1 do 5 zvjezdica:</p>
      <div id="stars" class="star-container">
        ${[1, 2, 3, 4, 5]
          .map((i) => `<span class="star" data-value="${i}">☆</span>`)
          .join("")}
      </div>
      <button id="submit-review">Pošalji ocjenu</button>
      <p id="review-message"></p>
    </div>

    <div id="daily-tip">
      <h3>Dnevni savjet</h3>
      <p id="tip-text">Učitavanje savjeta...</p>
    </div>

    <div class="scroll-container">
      <img src="./images/bamboo.jpg" alt="Bamboo">
      <img src="./images/lake.jpg" alt="Lake">
      <img src="./images/monkey.jpg" alt="Monkey">
      <img src="./images/nature.jpeg" alt="Nature">
    </div>

    <div id="focus-widget">
      <div class="focus-card">
        <h3>Fokus izazov dana 🎯</h3>
        <p id="focus-text">Učitavanje izazova...</p>
        <button onclick="generateChallenge()">Novi izazov</button>
        <button id="theme-toggle">Prebaci temu</button>
      </div>
    </div>
  `;
  content.className = "";

  fetchQuote();
  setupStarRating();
  fetchTaskStats();
  fetchTopUsers();
  fetchDailyTip();

  document.getElementById("theme-toggle").addEventListener("click", () => {
    const isDarkMode = document.body.classList.toggle("dark-mode");

    document.querySelector(".navbar").classList.toggle("dark-mode");
    document.querySelector(".pomodoro-card").classList.toggle("dark-mode");
    document.querySelector(".focus-card").classList.toggle("dark-mode");
    document.querySelector("#quote-container").classList.toggle("dark-mode");
    document.querySelector("#task-stats").classList.toggle("dark-mode");
    document.querySelector("#user-review").classList.toggle("dark-mode");
    document.querySelector("#daily-tip").classList.toggle("dark-mode");
    document
      .querySelectorAll("button")
      .forEach((btn) => btn.classList.toggle("dark-mode"));

    // Spremi postavku u localStorage
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  });

  // Automatsko učitavanje teme pri pokretanju stranice
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    document.querySelector(".navbar").classList.add("dark-mode");
    document.querySelector(".pomodoro-card").classList.add("dark-mode");
    document.querySelector(".focus-card").classList.add("dark-mode");
    document.querySelector("#quote-container").classList.add("dark-mode");
    document.querySelector("#task-stats").classList.add("dark-mode");
    document.querySelector("#user-review").classList.add("dark-mode");
    document.querySelector("#daily-tip").classList.add("dark-mode");
    document
      .querySelectorAll("button")
      .forEach((btn) => btn.classList.add("dark-mode"));
  }

  document
    .getElementById("submit-review")
    .addEventListener("click", async () => {
      if (!selectedRating || !currentUser) {
        document.getElementById("review-message").innerText =
          "Molimo prijavite se i odaberite ocjenu.";
        return;
      }
      await submitUserReview(currentUser.uid, selectedRating);
      document.getElementById("review-message").innerText =
        "Hvala na vašoj ocjeni!";
      selectedRating = 0;
    });
}

// Provjerava je li korisnik već odabrao temu i primjenjuje je pri učitavanju stranice
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark-mode");
}

window.onload = function () {
  showHome(); // Prikazuje sadržaj na početku

  // Osigurava da se event listener doda nakon što se kreira gumb
  setTimeout(() => {
    const themeButton = document.getElementById("theme-toggle");
    if (themeButton) {
      themeButton.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");

        // Spremi trenutnu postavku u localStorage
        const isDarkMode = document.body.classList.contains("dark-mode");
        localStorage.setItem("theme", isDarkMode ? "dark" : "light");
      });
    }
  }, 100); // Mala odgoda osigurava da je gumb kreiran
};

function startPomodoro() {
  if (timerRunning) return;
  timerRunning = true;
  const timerDisplay = document.getElementById("timer");

  const countdown = setInterval(() => {
    if (seconds === 0) {
      if (minutes === 0) {
        clearInterval(countdown);
        alert("Vrijeme za pauzu!");
        timerRunning = false;
      } else {
        minutes--;
        seconds = 59;
      }
    } else {
      seconds--;
    }
    timerDisplay.textContent = `${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;
  }, 1000);
}

const challenges = [
  "Koliko trokutova vidiš na slici?",
  "Riješi ovaj brzi matematički zadatak: (15 × 2) - 5 = ?",
  "Kako bi sažeo knjigu u samo jednu rečenicu?",
  "Napravite pauzu svakih 45 minuta za maksimalan fokus.",
  "Zapisujte ideje odmah – mozak voli organiziranost!",
  "Promatraj ovaj tekst i zatvori oči – možeš li ga ponoviti?",
];

function generateChallenge() {
  document.getElementById("focus-text").innerText =
    challenges[Math.floor(Math.random() * challenges.length)];
}
//setInterval(generateChallenge, 15000);

function showLoginForm() {
  content.className = "compact-form";
  content.innerHTML = `
    <h2>Prijava</h2>
    <form id="login-form">
      <input type="email" id="login-email" placeholder="Email" required />
      <input type="password" id="login-password" placeholder="Lozinka" required />
      <button type="submit">Prijavi se</button>
    </form>
  `;

  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    firebase
      .auth()
      .signInWithEmailAndPassword(email, password)
      .then((cred) => {
        currentUser = cred.user;
        updateNav();
        showHome();
      })
      .catch((err) => alert(err.message));
  });
}

function showRegisterForm() {
  content.className = "compact-form";
  content.innerHTML = `
    <h2>Registracija</h2>
    <form id="register-form">
      <input type="email" id="register-email" placeholder="Email" required />
      <input type="password" id="register-password" placeholder="Lozinka" required />
      <button type="submit">Registriraj se</button>
    </form>
  `;

  document.getElementById("register-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    firebase
      .auth()
      .createUserWithEmailAndPassword(email, password)
      .then((cred) => {
        currentUser = cred.user;
        updateNav();
        showHome();
      })
      .catch((err) => alert(err.message));
  });
}

function updateNav() {
  const loggedIn = !!currentUser;
  navTasks.style.display = loggedIn ? "inline" : "none";
  navAddTask.style.display = loggedIn ? "inline" : "none";
  navLogin.style.display = loggedIn ? "none" : "inline";
  navRegister.style.display = loggedIn ? "none" : "inline";
  navLogout.style.display = loggedIn ? "inline" : "none";
}

function fetchQuote() {
  const quotes = [
    "Uči danas za bolje sutra.",
    "Pokušaj je bolji od odustajanja.",
    "Napredak je napredak, bez obzira na veličinu.",
  ];
  document.getElementById("quote-text").innerText =
    quotes[Math.floor(Math.random() * quotes.length)];
}

function fetchDailyTip() {
  const tips = [
    "Postavi realne ciljeve za svaki dan.",
    "Koristi tehniku Pomodoro za fokusirano učenje.",
    "Uči pametno – napravi plan prije nego što kreneš!",
    "Ne zaboravi na odmor! Pauza poboljšava produktivnost.",
    "Pokušaj pisati bilješke rukom – poboljšava pamćenje!",
    "Organiziraj svoje vrijeme pomoću to-do liste.",
    "Uči s drugima! Diskusija pomaže u razumijevanju.",
  ];

  const randomIndex = Math.floor(Math.random() * tips.length);
  const tip = tips[randomIndex];

  const tipElement = document.getElementById("tip-text");
  if (tipElement) {
    tipElement.innerText = tip;
  } else {
    console.warn("Element #tip-text nije pronađen.");
  }
}

function setupStarRating() {
  document.querySelectorAll(".star").forEach((star) => {
    star.addEventListener("click", () => {
      selectedRating = parseInt(star.dataset.value);
      document.querySelectorAll(".star").forEach((s, i) => {
        s.innerText = i < selectedRating ? "★" : "☆";
      });
    });
  });
}

async function fetchTopUsers() {
  const users = await getTopUserRatings();
  document.getElementById("top-users-list").innerHTML = users
    .map((u) => `<li>Korisnik ${u.userId}: ⭐ ${u.avgRating.toFixed(1)}</li>`)
    .join("");
}

async function fetchTaskStats() {
  if (!currentUser) return;
  const stats = await getTaskStats(currentUser.uid);
  document.getElementById("total-tasks").innerText = stats.total;
  document.getElementById("completed-tasks").innerText = stats.completed;
}

function showAddTaskForm() {
  content.innerHTML = `
    <form id="task-form">
      <input type="text" id="task-title" placeholder="Naslov">
      <textarea id="task-desc" placeholder="Opis"></textarea>
      <input type="date" id="task-deadline">
      <button type="submit">Dodaj</button>
    </form>
  `;
  content.className = "compact-form";

  document.getElementById("task-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("task-title").value;
    const description = document.getElementById("task-desc").value;
    const deadline = document.getElementById("task-deadline").value;
    await saveTaskToDB(currentUser.uid, { title, description, deadline });
    alert("Zadatak spremljen!");
    showTasks();
  });
}

async function showTasks() {
  content.innerHTML = `
    <h2>Moji zadaci</h2>
    <div id="task-filter">
      <label for="filter-select">Filtriraj po roku:</label>
      <select id="filter-select" onchange="filterTasks()">
        <option value="all">Svi zadaci</option>
        <option value="upcoming">Budući zadaci</option>
        <option value="past">Prošli zadaci</option>
      </select>
    </div>
    <div id="tasks-list"></div>
  `;
  content.className = "";

  const tasks = await getTasksForUser(currentUser.uid);
  displayTasks(tasks);
}

function displayTasks(tasks) {
  document.getElementById("tasks-list").innerHTML = tasks
    .map(
      (task) => `
        <div class="task-card ${task.completed ? "completed" : ""}" id="task-${
        task.id
      }">
          <h4>${task.title}</h4>
          <p>${task.description}</p>
          <p><strong>Rok:</strong> ${task.deadline}</p>
          <p><strong>Status:</strong> ${
            task.completed ? "✅ Dovršeno" : "⏳ U tijeku"
          }</p>
          ${
            !task.completed
              ? `<button onclick="completeTask('${task.id}')">Završi ✅</button>`
              : ""
          }
          <button class="edit-button" onclick="editTask('${
            task.id
          }')">Uredi</button>
          <button class="delete-button" onclick="deleteTask('${
            task.id
          }')">Obriši</button>
        </div>
      `
    )
    .join("");
}

function filterTasks() {
  const filterValue = document.getElementById("filter-select").value;
  const tasks = document.querySelectorAll(".task-card");
  const currentDate = new Date();

  tasks.forEach((task) => {
    const deadlineText = task
      .querySelector("p:nth-child(3)")
      .textContent.replace("Rok:", "")
      .trim();
    const taskDate = new Date(deadlineText);

    if (
      filterValue === "all" ||
      (filterValue === "upcoming" && taskDate > currentDate) ||
      (filterValue === "past" && taskDate < currentDate)
    ) {
      task.style.display = "block";
    } else {
      task.style.display = "none";
    }
  });
}

window.deleteTask = async function (taskId) {
  if (!confirm("Jesi li siguran da želiš obrisati ovaj zadatak?")) return;
  await deleteTaskFromDB(taskId);
  document.getElementById(`task-${taskId}`).remove();
};

window.editTask = async function (taskId) {
  const allTasks = await getTasksForUser(currentUser.uid);
  const task = allTasks.find((t) => t.id === taskId);
  if (!task) return alert("Zadatak nije pronađen.");

  content.innerHTML = `
    <h2>Uredi Zadatak</h2>
    <form id="edit-task-form">
      <input type="text" id="edit-title" value="${task.title}" required />
      <textarea id="edit-desc" required>${task.description}</textarea>
      <input type="date" id="edit-deadline" value="${task.deadline}" required />
      <button type="submit">Spremi</button>
    </form>
  `;

  document
    .getElementById("edit-task-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const updatedData = {
        userId: currentUser.uid,
        title: document.getElementById("edit-title").value,
        description: document.getElementById("edit-desc").value,
        deadline: document.getElementById("edit-deadline").value,
      };
      await updateTaskInDB(taskId, updatedData);
      alert("Zadatak ažuriran!");
      showTasks();
    });
};

window.completeTask = async function (taskId) {
  const allTasks = await getTasksForUser(currentUser.uid);
  const task = allTasks.find((t) => t.id === taskId);
  if (!task || task.completed) return;

  const updatedTask = { ...task, completed: true };
  await updateTaskInDB(taskId, updatedTask);

  alert("Zadatak označen kao dovršen!");
  showTasks();
  fetchTaskStats(); // Osvježi brojke na početnoj stranici
};

// ---------- EVENT INIT ----------
window.onload = function () {
  firebase.auth().onAuthStateChanged((user) => {
    currentUser = user;
    updateNav();
    showHome();
  });

  navHome.addEventListener("click", (e) => {
    e.preventDefault();
    showHome();
  });
  navLogin.addEventListener("click", (e) => {
    e.preventDefault();
    showLoginForm();
  });
  navRegister.addEventListener("click", (e) => {
    e.preventDefault();
    showRegisterForm();
  });
  navAddTask.addEventListener("click", (e) => {
    e.preventDefault();
    showAddTaskForm();
  });
  navTasks.addEventListener("click", (e) => {
    e.preventDefault();
    showTasks();
  });
  navLogout.addEventListener("click", (e) => {
    e.preventDefault();
    firebase
      .auth()
      .signOut()
      .then(() => {
        currentUser = null;
        updateNav();
        showLoginForm();
      });
  });
};

window.startPomodoro = startPomodoro;
window.generateChallenge = generateChallenge;
window.filterTasks = filterTasks;
