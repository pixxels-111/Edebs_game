"use strict";

const KEY = {
    name: "playerUsername",
    progress: "currentPuzzle",
    sound: "puzzleSound"
};

const state = {
    tiles: [],
    empty: 8,
    moves: 0,
    seconds: 0,
    timer: null,
    locked: false,
    audio: null
};

const escapeHtml = value =>
    String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));

const name = () =>
    escapeHtml(
        String(localStorage.getItem(KEY.name) || "FRIEND")
            .trim()
            .toUpperCase()
    );

function getProgress() {
    const value = Number(localStorage.getItem(KEY.progress));

    return Number.isInteger(value) &&
        value >= 1 &&
        value <= 5
        ? value
        : 1;
}

function saveProgress(value) {
    localStorage.setItem(KEY.progress, String(value));
}

function setScreen(markup) {
    clearInterval(state.timer);
    state.timer = null;
    document.body.innerHTML = markup;
}

function soundEnabled() {
    return localStorage.getItem(KEY.sound) !== "off";
}

function playTone(kind = "soft") {
    if (!soundEnabled()) return;

    try {
        state.audio ||= new (
            window.AudioContext ||
            window.webkitAudioContext
        )();

        const ctx = state.audio;

        if (ctx.state === "suspended") {
            ctx.resume();
        }

        const frequencies = {
            soft: [523.25],
            click: [659.25],
            success: [523.25, 659.25, 783.99],
            sparkle: [783.99, 1046.5]
        };

        const notes =
            frequencies[kind] || frequencies.soft;

        notes.forEach((frequency, index) => {
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();

            oscillator.type = "sine";
            oscillator.frequency.value = frequency;

            gain.gain.setValueAtTime(
                0.0001,
                ctx.currentTime
            );

            gain.gain.exponentialRampToValueAtTime(
                0.055,
                ctx.currentTime +
                0.015 +
                index * 0.06
            );

            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                ctx.currentTime +
                0.22 +
                index * 0.08
            );

            oscillator.connect(gain);
            gain.connect(ctx.destination);

            oscillator.start(
                ctx.currentTime + index * 0.06
            );

            oscillator.stop(
                ctx.currentTime +
                0.3 +
                index * 0.08
            );
        });

    } catch (_) {
        // Sound is optional.
    }
}

function bindSoundButton() {
    const button =
        document.getElementById("soundToggle");

    if (!button) return;

    button.addEventListener("click", () => {
        const enabled = soundEnabled();

        localStorage.setItem(
            KEY.sound,
            enabled ? "off" : "on"
        );

        button.textContent =
            enabled ? "🔇" : "🔊";

        if (!enabled) {
            playTone("soft");
        }
    });
}

function header(puzzle) {
    return `
        <header class="game-header">
            <span>🌸 THE LAST PUZZLE</span>

            <span>
                PUZZLE ${puzzle} / 4
            </span>

            <button
                class="sound-button"
                id="soundToggle"
                type="button"
                aria-label="Toggle sound"
            >
                ${soundEnabled() ? "🔊" : "🔇"}
            </button>
        </header>
    `;
}

function setResult(id, text, type) {
    const result =
        document.getElementById(id);

    if (!result) return;

    result.textContent = text;
    result.className =
        `result ${type}`;
}
function bindLogin() {
    const form =
        document.getElementById("loginForm");

    if (!form) return;

    form.addEventListener("submit", event => {
        event.preventDefault();

        const username =
            document.getElementById("username")
                .value
                .trim();

        const password =
            document.getElementById("password")
                .value;

        const message =
            document.getElementById("loginMessage");

        if (!username || !password) {
            message.textContent =
                "ACCESS DENIED — COMPLETE ALL FIELDS.";

            message.className =
                "status-message wrong";

            playTone("soft");
            return;
        }

        localStorage.setItem(
            KEY.name,
            username
        );

        message.textContent =
            "ACCESS GRANTED. WELCOME IN.";

        message.className =
            "status-message correct";

        playTone("success");

        setTimeout(
            renderWelcome,
            650
        );
    });
}

function renderWelcome() {
    const saved = getProgress();

    const button =
        saved === 1
            ? "LET'S BEGIN ✨"
            : saved === 5
                ? "PLAY AGAIN 💗"
                : "CONTINUE ADVENTURE 🌸";

    const message =
        saved === 1
            ? "There are puzzles to solve, secrets to discover, and surprises along the way."
            : saved === 2
                ? "You opened the first door. Puzzle 02 is waiting for you."
                : saved === 3
                    ? "You're getting closer. The sweet little mystery continues."
                    : saved === 4
                        ? "You're almost there. One final secret remains."
                        : "You completed the adventure. Ready to experience it again?";

    setScreen(`
        <main class="welcome-screen">

            <div
                class="welcome-sparkles"
                aria-hidden="true"
            >
                ✦ ♡ ✦
            </div>

            <section class="welcome-card card">

                <p class="eyebrow">
                    ✨ YOU'RE HERE ✨
                </p>

                <h1>
                    WELCOME,<br>
                    ${name()}! 💗
                </h1>

                <p class="subtitle">
                    A little adventure awaits you...
                </p>

                <div class="message">
                    <p>${message}</p>

                    <span>
                        🌷 Take your time.
                        Enjoy the journey. 🌷
                    </span>
                </div>

                <button id="continueGame">
                    ${button}
                </button>

                ${
                    saved > 1
                    ? `
                        <button
                            id="resetProgress"
                            class="text-button"
                        >
                            Start from the beginning
                        </button>
                    `
                    : ""
                }

                <button
                    id="logout"
                    class="text-button"
                >
                    Use another name
                </button>

            </section>
        </main>
    `);

    document
        .getElementById("continueGame")
        .addEventListener("click", () => {
            playTone("click");
            continueGame();
        });

    document
        .getElementById("resetProgress")
        ?.addEventListener("click", () => {
            playTone("click");

            saveProgress(1);

            renderPuzzleOne();
        });

    document
        .getElementById("logout")
        .addEventListener("click", () => {
            localStorage.removeItem(KEY.name);
            renderLogin();
        });
}

function continueGame() {

    const routes = {
        1: renderPuzzleOne,
        2: renderPuzzleTwo,
        3: renderPuzzleThree,
        4: renderPuzzleFour,
        5: renderEnding
    };

    routes[getProgress()]();
}

function restart() {
    saveProgress(1);
    renderPuzzleOne();
}

function transitionToPuzzle(next) {

    const transition =
        document.createElement("div");

    transition.className =
        "puzzle-transition";

    transition.innerHTML = `
        <div class="transition-content">

            <div class="transition-sparkles">
                ✨ 🌸 ✨
            </div>

            <p>
                ${next.message}
            </p>

            <div class="transition-hearts">
                ♡ 💗 ♡
            </div>

        </div>
    `;

    document.body.appendChild(
        transition
    );

    requestAnimationFrame(() => {
        transition.classList.add("show");
    });

    setTimeout(() => {

        transition.classList.add("hide");

        setTimeout(
            next.action,
            450
        );

    }, 1450);
}

function completion(
    label,
    title,
    message,
    button,
    next
) {

    setScreen(`
        <main class="complete-screen">

            <section class="complete-box card">

                <p class="eyebrow">
                    ${label}
                </p>

                <div class="celebration">
                    🌸 ✨ 💗 ✨ 🌸
                </div>

                <h1>
                    ${title}
                </h1>

                <p>
                    ${message}
                </p>

                <button id="continueButton">
                    ${button}
                </button>

            </section>

        </main>
    `);

    playTone("success");

    document
        .getElementById("continueButton")
        .addEventListener("click", () => {

            playTone("click");

            transitionToPuzzle(next);
        });
}

function renderLogin() {

    document.body.innerHTML = `

        <main class="login-screen">

            <div
                class="login-decorations"
                aria-hidden="true"
            >
                <span class="float-item item-1">🍓</span>
                <span class="float-item item-2">🌸</span>
                <span class="float-item item-3">💗</span>
                <span class="float-item item-4">✨</span>
                <span class="float-item item-5">🌷</span>
                <span class="float-item item-6">🍓</span>
                <span class="float-item item-7">♡</span>
                <span class="float-item item-8">✨</span>
                <span class="float-item item-9">🌼</span>
                <span class="float-item item-10">💞</span>
            </div>

            <section class="login-box">

                <p class="system-status">
                    ♡ PUZZLE WORLD ONLINE ♡
                </p>

                <h1>
                    LOVE PUZZLE
                </h1>

                <p class="subtitle">
                    Some secrets are meant to stay hidden.
                </p>

                <div class="message">
                    <p>
                        “Somewhere in this game,
                        a secret is waiting for you.”
                    </p>

                    <span>
                        — IDIBWIL
                    </span>
                </div>

                <form id="loginForm">

                    <label for="username">
                        IDENTITY
                    </label>

                    <input
                        id="username"
                        type="text"
                        placeholder="Enter your username"
                        maxlength="24"
                        required
                    >

                    <label for="password">
                        ACCESS CODE
                    </label>

                    <input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        maxlength="32"
                        required
                    >

                    <button type="submit">
                        ENTER THE SYSTEM ✨
                    </button>

                </form>

                <p
                    id="loginMessage"
                    class="status-message"
                ></p>

            </section>

        </main>
    `;

    bindLogin();
}
function adjacent(index) {

    const row =
        Math.floor(index / 3);

    const column =
        index % 3;

    return [

        row > 0
            ? index - 3
            : null,

        row < 2
            ? index + 3
            : null,

        column > 0
            ? index - 1
            : null,

        column < 2
            ? index + 1
            : null

    ].filter(Number.isInteger);
}

function initialiseBoard() {

    Object.assign(state, {

        tiles: [
            0, 1, 2,
            3, 4, 5,
            6, 7, 8
        ],

        empty: 8,
        moves: 0,
        seconds: 0,
        locked: false

    });

    let previous = -1;

    for (
        let turn = 0;
        turn < 200;
        turn++
    ) {

        const choices =
            adjacent(state.empty)
                .filter(
                    index => index !== previous
                );

        const selected =
            choices[
                Math.floor(
                    Math.random() *
                    choices.length
                )
            ];

        previous = state.empty;

        [
            state.tiles[state.empty],
            state.tiles[selected]
        ] = [
            state.tiles[selected],
            state.tiles[state.empty]
        ];

        state.empty = selected;
    }

    if (
        state.tiles.every(
            (tile, index) =>
                tile === index
        )
    ) {
        initialiseBoard();
    }
}

function renderPuzzleOne() {

    initialiseBoard();

    setScreen(`

        <main class="puzzle-screen">

            ${header(1)}

            <section class="puzzle-card card">

                <p class="eyebrow">
                    🌷 PUZZLE 1 — THE BEGINNING 🌷
                </p>

                <h1>
                    THE FIRST PUZZLE 🌸
                </h1>

                <p class="question">
                    Move the tiles until
                    the numbers are in order,
                    from 1 to 8.
                </p>

                <div class="puzzle-stats">

                    <div>
                        MOVES
                        <strong id="moveCounter">
                            0
                        </strong>
                    </div>

                    <div>
                        TIME
                        <strong id="timer">
                            00:00
                        </strong>
                    </div>

                </div>

                <div
                    id="puzzleBoard"
                    class="puzzle-board"
                    aria-label="Sliding tile puzzle"
                ></div>

                <p
                    id="puzzleResult"
                    class="result"
                    aria-live="polite"
                ></p>

                <button
                    id="resetPuzzle"
                    class="secondary-button"
                >
                    RESET PUZZLE
                </button>

            </section>

        </main>
    `);

    bindSoundButton();

    drawBoard();

    document
        .getElementById("resetPuzzle")
        .addEventListener(
            "click",
            () => {
                playTone("click");
                renderPuzzleOne();
            }
        );

    state.timer =
        setInterval(
            updateTimer,
            1000
        );
}

function drawBoard() {

    const board =
        document.getElementById(
            "puzzleBoard"
        );

    if (!board) return;

    board.innerHTML = "";

    state.tiles.forEach(
        (tile, index) => {

            const button =
                document.createElement(
                    "button"
                );

            button.className =
                tile === 8
                    ? "tile empty"
                    : "tile";

            button.textContent =
                tile === 8
                    ? ""
                    : String(tile + 1);

            button.disabled =
                tile === 8 ||
                state.locked;

            button.addEventListener(
                "click",
                () => moveTile(index)
            );

            board.appendChild(
                button
            );
        }
    );
}

function updateTimer() {

    state.seconds++;

    const timer =
        document.getElementById(
            "timer"
        );

    if (!timer) {

        clearInterval(
            state.timer
        );

        return;
    }

    timer.textContent =
        `${String(
            Math.floor(
                state.seconds / 60
            )
        ).padStart(2, "0")}:${String(
            state.seconds % 60
        ).padStart(2, "0")}`;
}

function moveTile(index) {

    if (
        state.locked ||
        !adjacent(
            state.empty
        ).includes(index)
    ) {
        return;
    }

    [
        state.tiles[state.empty],
        state.tiles[index]
    ] = [
        state.tiles[index],
        state.tiles[state.empty]
    ];

    state.empty = index;

    state.moves++;

    document
        .getElementById("moveCounter")
        .textContent =
        state.moves;

    playTone("click");

    drawBoard();

    const solved =
        state.tiles.every(
            (tile, tileIndex) =>
                tile === tileIndex
        );

    if (solved) {

        state.locked = true;

        clearInterval(
            state.timer
        );

        setResult(
            "puzzleResult",
            "🌸 Puzzle solved! The first door is open! 💗",
            "correct"
        );

        playTone("success");

        setTimeout(
            showPuzzleOneComplete,
            900
        );
    }
}

function showPuzzleOneComplete() {

    saveProgress(2);

    completion(
        "✨ PUZZLE 01 COMPLETE ✨",
        "YOU DID IT! 🎉",
        "The first door is open. Another little secret is waiting.",
        "CONTINUE TO PUZZLE 2 ✨",
        {
            message:
                "A new little secret awaits... 💌",

            action:
                renderPuzzleTwo
        }
    );
}

function renderPuzzleTwo() {

    setScreen(`

        <main class="puzzle-screen">

            ${header(2)}

            <section class="puzzle-card card">

                <p class="eyebrow">
                    💌 PUZZLE 2 — THE HIDDEN MESSAGE 💌
                </p>

                <h1>
                    CAN YOU FIND LOVE? 🔎
                </h1>

                <p class="question">
                    ${name()},
                    read every third letter
                    in the message.
                </p>

                <div
                    class="letter-card"
                    aria-label="Hidden letter message"
                >
                    <span>L</span>
                    <span>q</span>
                    <span>w</span>

                    <span>O</span>
                    <span>x</span>
                    <span>y</span>

                    <span>V</span>
                    <span>a</span>
                    <span>b</span>

                    <span>E</span>
                </div>

                <label
                    class="sr-only"
                    for="hiddenAnswer"
                >
                    Your answer
                </label>

                <input
                    id="hiddenAnswer"
                    type="text"
                    placeholder="ANSWER HERE ♡"
                    maxlength="20"
                >

                <button
                    id="submitHiddenAnswer"
                >
                    FIND THE SECRET ✨
                </button>

                <p
                    id="hiddenResult"
                    class="result"
                    aria-live="polite"
                ></p>

            </section>

        </main>
    `);

    bindSoundButton();

    const input =
        document.getElementById(
            "hiddenAnswer"
        );

    document
        .getElementById(
            "submitHiddenAnswer"
        )
        .addEventListener(
            "click",
            checkPuzzleTwo
        );

    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {
                checkPuzzleTwo();
            }

        }
    );

    input.focus();
}

function checkPuzzleTwo() {

    const answer =
        document
            .getElementById(
                "hiddenAnswer"
            )
            .value
            .trim()
            .toLowerCase();

    if (answer === "love") {

        document
            .getElementById(
                "submitHiddenAnswer"
            )
            .disabled = true;

        setResult(
            "hiddenResult",
            "🌸 Correct! You found the secret! 💗",
            "correct"
        );

        playTone("success");

        setTimeout(
            showPuzzleTwoComplete,
            800
        );

    } else {

        setResult(
            "hiddenResult",
            "Not quite — take every third letter.",
            "wrong"
        );

        playTone("soft");
    }
}

function showPuzzleTwoComplete() {

    saveProgress(3);

    completion(
        "💌 PUZZLE 02 COMPLETE 💌",
        "YOU FOUND IT! 💗",
        "You spotted the little secret hiding in the message.",
        "NEXT PUZZLE ✨",
        {
            message:
                "Something sweet is waiting... 🍬",

            action:
                renderPuzzleThree
        }
    );
}
function choiceMarkup(id, options) {

    return `
        <div
            class="choice-grid"
            id="${id}"
        >

            ${options.map(
                ([answer, emoji, label, detail]) => `

                <button
                    data-answer="${answer}"
                    type="button"
                >

                    <span class="choice-emoji">
                        ${emoji}
                    </span>

                    <strong>
                        ${label}
                    </strong>

                    ${
                        detail
                            ? `<small>${detail}</small>`
                            : ""
                    }

                </button>

            `
            ).join("")}

        </div>
    `;
}

function renderPuzzleThree() {

    setScreen(`

        <main class="puzzle-screen">

            ${header(3)}

            <section class="puzzle-card card">

                <p class="eyebrow">
                    🍬 PUZZLE 3 — THE CANDY BOX 🍬
                </p>

                <h1>
                    WHICH ONE IS SWEETEST? 💗
                </h1>

                <div class="clue-card">

                    <strong>
                        💡 Little clue:
                    </strong>

                    <p>
                        I am not red.
                        I am not yellow.
                        I am sweet, soft, and fuzzy.
                    </p>

                </div>

                ${choiceMarkup(
                    "candyOptions",
                    [
                        [
                            "strawberry",
                            "🍓",
                            "Strawberry"
                        ],
                        [
                            "lemon",
                            "🍋",
                            "Lemon"
                        ],
                        [
                            "grape",
                            "🍇",
                            "Grape"
                        ],
                        [
                            "peach",
                            "🍑",
                            "Peach"
                        ]
                    ]
                )}

                <p
                    id="candyResult"
                    class="result"
                    aria-live="polite"
                ></p>

            </section>

        </main>
    `);

    bindSoundButton();

    document
        .querySelectorAll(
            "#candyOptions button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    checkPuzzleThree(
                        button.dataset.answer
                    )
            );

        });
}

function checkPuzzleThree(answer) {

    if (answer === "peach") {

        document
            .querySelectorAll(
                "#candyOptions button"
            )
            .forEach(button => {
                button.disabled = true;
            });

        setResult(
            "candyResult",
            "🍑 Correct! You found the sweetest one! 💗",
            "correct"
        );

        playTone("success");

        setTimeout(
            showPuzzleThreeComplete,
            800
        );

    } else {

        setResult(
            "candyResult",
            "Not this one — read the last clue closely.",
            "wrong"
        );

        playTone("soft");
    }
}

function showPuzzleThreeComplete() {

    saveProgress(4);

    completion(
        "🍬 PUZZLE 03 COMPLETE 🍬",
        "SO SWEET! 🎉",
        "Only one little mystery remains.",
        "FINAL PUZZLE 🌷",
        {
            message:
                "One final secret remains... 🌷",

            action:
                renderPuzzleFour
        }
    );
}

function renderPuzzleFour() {

    setScreen(`

        <main class="puzzle-screen">

            ${header(4)}

            <section class="puzzle-card card">

                <p class="eyebrow">
                    💗 PUZZLE 4 — THE FINAL SECRET 💗
                </p>

                <h1>
                    ONE LAST QUESTION...
                </h1>

                <p class="question">
                    You've solved every little puzzle.
                    What makes the journey special?
                </p>

                ${choiceMarkup(
                    "finalOptions",
                    [
                        [
                            "journey",
                            "🌷",
                            "The Journey",
                            "Every step matters."
                        ],
                        [
                            "memories",
                            "📸",
                            "The Memories",
                            "Every moment matters."
                        ],
                        [
                            "love",
                            "💗",
                            "Love",
                            "Every heart matters."
                        ]
                    ]
                )}

                <p
                    id="finalResult"
                    class="result"
                    aria-live="polite"
                ></p>

            </section>

        </main>
    `);

    bindSoundButton();

    document
        .querySelectorAll(
            "#finalOptions button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    checkPuzzleFour(
                        button.dataset.answer
                    )
            );

        });
}

function checkPuzzleFour(answer) {

    showChoicePopup(answer);
}

function showChoicePopup(answer) {

    const messages = {

        journey: {
            title: "🌷 THE JOURNEY",
            text:
                "Every little step brought you here. Sometimes the journey itself is the sweetest part. 💕",
            icon: "🌷",
            correct: false
        },

        memories: {
            title: "📸 THE MEMORIES",
            text:
                "Every puzzle becomes a memory once you've solved it. Keep the little moments close to your heart. 🌸",
            icon: "🌸",
            correct: false
        },

        love: {
            title: "💗 LOVE",
            text:
                "You found the sweetest answer. Maybe love was hiding in every puzzle all along. ✨",
            icon: "💗",
            correct: true
        }

    };

    const choice =
        messages[answer];

    if (!choice) return;

    document
        .querySelectorAll(
            "#finalOptions button"
        )
        .forEach(button => {
            button.disabled = true;
        });

    const popup =
        document.createElement("div");

    popup.className =
        "choice-popup";

    popup.innerHTML = `

        <div class="popup-overlay">

            <section
                class="popup-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="popupTitle"
            >

                <div class="popup-decoration">
                    ✨ 🌸 ✨
                </div>

                <h2 id="popupTitle">
                    ${choice.title}
                </h2>

                <p>
                    ${choice.text}
                </p>

                <div class="popup-heart">
                    ${choice.icon}
                </div>

                <button id="closeChoicePopup">

                    ${
                        choice.correct
                            ? "CONTINUE ✨"
                            : "TRY ANOTHER 💕"
                    }

                </button>

            </section>

        </div>
    `;

    document.body.appendChild(
        popup
    );

    playTone(
        choice.correct
            ? "success"
            : "soft"
    );

    document
        .getElementById(
            "closeChoicePopup"
        )
        .addEventListener(
            "click",
            () => {

                popup.remove();

                if (choice.correct) {

                    saveProgress(5);

                    createHeartExplosion();

                    setTimeout(
                        renderEnding,
                        1400
                    );

                } else {

                    document
                        .querySelectorAll(
                            "#finalOptions button"
                        )
                        .forEach(button => {
                            button.disabled = false;
                        });
                }
            }
        );
}

function createHeartExplosion() {

    const layer =
        document.createElement(
            "div"
        );

    layer.className =
        "heart-explosion";

    layer.setAttribute(
        "aria-hidden",
        "true"
    );

    const hearts = [
        "💗",
        "♡",
        "🌸",
        "✨",
        "💞",
        "🌷"
    ];

    for (
        let i = 0;
        i < 28;
        i++
    ) {

        const heart =
            document.createElement(
                "span"
            );

        heart.textContent =
            hearts[
                i % hearts.length
            ];

        heart.style.setProperty(
            "--x",
            `${Math.random() * 100}vw`
        );

        heart.style.setProperty(
            "--y",
            `${Math.random() * 100}vh`
        );

        heart.style.setProperty(
            "--delay",
            `${Math.random() * 0.5}s`
        );

        heart.style.setProperty(
            "--rotate",
            `${Math.random() * 80 - 40}deg`
        );

        layer.appendChild(
            heart
        );
    }

    document.body.appendChild(
        layer
    );

    playTone("sparkle");

    setTimeout(
        () => layer.remove(),
        2200
    );
}

function renderEnding() {

    const displayName =
        name();

    setScreen(`

        <main class="sweet-ending">

            <section class="ending-intro">

                <div class="ending-sparkles">
                    ✨ 🌸 ✨
                </div>

                <p class="ending-lead">
                    You found every little secret...
                </p>

                <p>
                    But there's one last thing
                    waiting for you.
                </p>

                <div class="envelope-container">

                    <button
                        class="envelope"
                        id="secretEnvelope"
                        aria-label="Open the secret letter"
                    >

                        <span class="envelope-back"></span>

                        <span class="envelope-letter">
                            💌
                        </span>

                        <span class="envelope-flap"></span>

                        <span class="envelope-front"></span>

                        <span class="envelope-heart">
                            💗
                        </span>

                    </button>

                </div>

                <p class="envelope-hint">
                    💌 Click the envelope
                </p>

            </section>

            <section
                class="final-letter"
                id="finalLetter"
                aria-live="polite"
            >

                <div class="letter-decoration">
                    🌸 ✦ ♡ ✦ 🌸
                </div>

                <div class="letter-label">
                    A LITTLE MESSAGE FOR YOU
                </div>

                <h1>
                    Dear ${displayName},
                </h1>

                <p
                    id="typedMessage"
                    class="typed-message"
                ></p>

                <div
                    id="letterFooter"
                    class="letter-footer"
                >
                    ♡ ✦ ♡ ✦ ♡
                </div>

                <button
                    id="playAgain"
                    class="play-again"
                >
                    PLAY AGAIN 🌷
                </button>

            </section>

        </main>
    `);

    document
        .getElementById(
            "secretEnvelope"
        )
        .addEventListener(
            "click",
            openSecretLetter
        );
}

function openSecretLetter() {

    const envelope =
        document.getElementById(
            "secretEnvelope"
        );

    const endingIntro =
        document.querySelector(
            ".ending-intro"
        );

    const letter =
        document.getElementById(
            "finalLetter"
        );

    envelope.classList.add(
        "open"
    );

    createHeartExplosion();

    setTimeout(() => {

        endingIntro.classList.add(
            "hide"
        );

        letter.classList.add(
            "show"
        );

        typeFinalMessage();

    }, 850);
}

function typeFinalMessage() {

    const message = `
Maybe the answer was never hidden
inside the puzzles.

Maybe it was hiding in the little
moments between them.

The choices.

The curiosity.

The smiles.

And maybe...

the sweetest part was simply
being here. 🌷

Thank you for playing this little
adventure with me.

I hope it made you smile. 💗

Until the next adventure...
`;

    const element =
        document.getElementById(
            "typedMessage"
        );

    element.textContent = "";

    let index = 0;

    function typeCharacter() {

        if (
            index < message.length
        ) {

            element.textContent +=
                message[index];

            index++;

            setTimeout(
                typeCharacter,
                message[
                    index - 1
                ] === "\n"
                    ? 120
                    : 28
            );

        } else {

            document
                .getElementById(
                    "letterFooter"
                )
                .classList.add(
                    "show"
                );

            document
                .getElementById(
                    "playAgain"
                )
                .classList.add(
                    "show"
                );

            document
                .getElementById(
                    "playAgain"
                )
                .addEventListener(
                    "click",
                    () => {

                        playTone(
                            "success"
                        );

                        restart();
                    }
                );
        }
    }

    typeCharacter();
}

/* START GAME */

bindLogin();