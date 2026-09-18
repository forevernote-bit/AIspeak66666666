document.addEventListener("DOMContentLoaded", () => {

    // ---------- Topic bank (loaded from topics_data.js -> TOPICS_DATA) ----------
    // TOPICS_DATA = { part1: [{topic, questions}], part2: [{num, topic, cue, bullets}], part3: [{num, topic, questions}] }

    const PART_LABELS = {
        part1: "🗣️ Short questions",
        part2: "🗂️ Cue card",
        part3: "💬 Discussion"
    };

    let currentPart = "part1";
    let currentIndex = 0;
    let filteredIndexes = [];
    let highlightPos = -1;

    const partTabs = document.querySelectorAll(".part-tab");
    const partLabel = document.getElementById("partLabel");
    const topicText = document.getElementById("topicText");
    const shuffleBtn = document.getElementById("shuffleBtn");

    const topicSearch = document.getElementById("topicSearch");
    const topicDropdown = document.getElementById("topicDropdown");
    const topicClearBtn = document.getElementById("topicClearBtn");
    const topicCombobox = document.getElementById("topicCombobox");

    function currentList() {
        return TOPICS_DATA[currentPart];
    }

    function escapeHtmlAttr(str) {
        return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function highlightMatch(text, query) {
        if (!query) return escapeHtmlAttr(text);
        const escaped = escapeHtmlAttr(text);
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`(${escapedQuery})`, "ig");
        return escaped.replace(re, "<mark>$1</mark>");
    }

    function buildDropdown(query) {
        const list = currentList();
        const q = (query || "").trim().toLowerCase();

        filteredIndexes = [];
        list.forEach((item, i) => {
            if (!q || item.topic.toLowerCase().includes(q)) {
                filteredIndexes.push(i);
            }
        });

        topicDropdown.innerHTML = "";

        if (filteredIndexes.length === 0) {
            const li = document.createElement("li");
            li.className = "topic-empty";
            li.textContent = "Mavzu topilmadi";
            topicDropdown.appendChild(li);
            highlightPos = -1;
            return;
        }

        filteredIndexes.forEach((i, pos) => {
            const item = list[i];
            const num = item.num !== undefined ? item.num : i + 1;
            const li = document.createElement("li");
            li.dataset.index = i;
            li.innerHTML = `<span class="topic-num">${num}.</span><span>${highlightMatch(item.topic, q)}</span>`;
            if (i === currentIndex) li.classList.add("active");
            li.addEventListener("click", () => {
                selectTopic(i);
                closeDropdown();
            });
            topicDropdown.appendChild(li);
        });

        highlightPos = filteredIndexes.indexOf(currentIndex);
    }

    function openDropdown() {
        buildDropdown(topicSearch.value);
        topicDropdown.classList.add("show");
    }

    function closeDropdown() {
        topicDropdown.classList.remove("show");
    }

    function setSearchLabel() {
        const item = currentList()[currentIndex];
        const num = item.num !== undefined ? item.num : currentIndex + 1;
        topicSearch.value = `${num}. ${item.topic}`;
        topicClearBtn.classList.toggle("show", topicSearch.value.length > 0);
    }

    topicSearch.addEventListener("focus", () => {
        topicSearch.select();
        openDropdown();
    });

    topicSearch.addEventListener("input", () => {
        topicClearBtn.classList.toggle("show", topicSearch.value.length > 0);
        openDropdown();
    });

    topicSearch.addEventListener("keydown", (e) => {
        if (!topicDropdown.classList.contains("show")) {
            if (e.key === "ArrowDown" || e.key === "Enter") openDropdown();
            return;
        }
        const items = topicDropdown.querySelectorAll("li:not(.topic-empty)");
        if (e.key === "ArrowDown") {
            e.preventDefault();
            highlightPos = Math.min(highlightPos + 1, items.length - 1);
            highlightActive(items);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            highlightPos = Math.max(highlightPos - 1, 0);
            highlightActive(items);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (highlightPos >= 0 && filteredIndexes[highlightPos] !== undefined) {
                selectTopic(filteredIndexes[highlightPos]);
                closeDropdown();
            }
        } else if (e.key === "Escape") {
            closeDropdown();
            setSearchLabel();
        }
    });

    function highlightActive(items) {
        items.forEach(li => li.classList.remove("active"));
        if (items[highlightPos]) {
            items[highlightPos].classList.add("active");
            items[highlightPos].scrollIntoView({ block: "nearest" });
        }
    }

    topicClearBtn.addEventListener("click", () => {
        topicSearch.value = "";
        topicClearBtn.classList.remove("show");
        topicSearch.focus();
        openDropdown();
    });

    document.addEventListener("click", (e) => {
        if (!topicCombobox.contains(e.target)) {
            closeDropdown();
            setSearchLabel();
        }
    });

    function renderTopic() {
        partLabel.textContent = PART_LABELS[currentPart];
        const item = currentList()[currentIndex];

        if (currentPart === "part1") {
            const items = item.questions.map(q => `<li>${escapeHtml(q)}</li>`).join("");
            topicText.innerHTML = `<div class="cue-text">${escapeHtml(item.topic)}</div><ol>${items}</ol>`;
        } else if (currentPart === "part2") {
            const bullets = item.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join("");
            const p3 = TOPICS_DATA.part3.find(p => p.num === item.num);
            let p3Html = "";
            if (p3 && p3.questions.length) {
                const p3items = p3.questions.map(q => `<li>${escapeHtml(q)}</li>`).join("");
                p3Html = `
                    <button class="p3-toggle" id="p3ToggleBtn">💬 Part 3 savollarini ko'rish</button>
                    <ol class="p3-questions" id="p3Questions">${p3items}</ol>
                `;
            }
            topicText.innerHTML = `
                <p class="cue-text">⭐ ${escapeHtml(item.cue)}</p>
                <p style="margin:0 0 4px; color: var(--muted); font-size: 13px;">You should say:</p>
                <ul class="cue-bullets">${bullets}</ul>
                ${p3Html}
            `;
            const toggleBtn = document.getElementById("p3ToggleBtn");
            if (toggleBtn) {
                toggleBtn.addEventListener("click", () => {
                    document.getElementById("p3Questions").classList.toggle("show");
                });
            }
        } else if (currentPart === "part3") {
            const items = item.questions.length
                ? item.questions.map(q => `<li>${escapeHtml(q)}</li>`).join("")
                : "<li><em>Savollar tez orada qo'shiladi...</em></li>";
            topicText.innerHTML = `<div class="cue-text">${escapeHtml(item.topic)}</div><ol>${items}</ol>`;
        }
    }

    function escapeHtml(str) {
        return String(str)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
    }

    function selectTopic(index) {
        currentIndex = index;
        setSearchLabel();
        renderTopic();
    }

    function pickRandomTopic() {
        const list = currentList();
        let index = Math.floor(Math.random() * list.length);
        if (list.length > 1) {
            while (index === currentIndex) {
                index = Math.floor(Math.random() * list.length);
            }
        }
        selectTopic(index);
    }

    partTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            partTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            currentPart = tab.dataset.part;
            currentIndex = 0;
            setSearchLabel();
            closeDropdown();
            renderTopic();
        });
    });

    shuffleBtn.addEventListener("click", () => {
        shuffleBtn.classList.remove("spin");
        void shuffleBtn.offsetWidth; // restart animation
        shuffleBtn.classList.add("spin");
        pickRandomTopic();
    });

    // Init
    setSearchLabel();
    renderTopic();

    // ---------- Timer ----------
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");
    const timerDisplay = document.getElementById("timer");
    const status = document.getElementById("status");
    const result = document.getElementById("result");
    const timeButtons = document.querySelectorAll(".time-btn");
    const recordingIndicator = document.getElementById("recordingIndicator");
    const ringProgress = document.getElementById("ringProgress");

    const RING_CIRCUMFERENCE = 2 * Math.PI * 62; // matches r=62 in the SVG

    let mediaRecorder;
    let audioChunks = [];
    let timerInterval;
    let totalTime = 60;
    let timeLeft = 60;

    timeButtons.forEach(button => {
        button.addEventListener("click", () => {
            timeButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            totalTime = Number(button.dataset.time);
            timeLeft = totalTime;
            updateTimer();
        });
    });

    function updateTimer() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;

        timerDisplay.textContent =
            `${minutes}:${seconds.toString().padStart(2, "0")}`;

        const ratio = Math.max(timeLeft / totalTime, 0);
        const offset = RING_CIRCUMFERENCE * (1 - ratio);
        ringProgress.style.strokeDashoffset = offset;

        if (ratio <= 0.2) {
            ringProgress.style.stroke = "#ef4444";
        } else if (ratio <= 0.5) {
            ringProgress.style.stroke = "#f59e0b";
        } else {
            ringProgress.style.stroke = "#5b5bf5";
        }
    }

    startBtn.addEventListener("click", async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });

            audioChunks = [];

            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                recordingIndicator.classList.add("hidden");

                const audioBlob = new Blob(audioChunks, {
                    type: mediaRecorder.mimeType || "audio/webm"
                });

                status.textContent = "⏳ Analyzing...";

                const formData = new FormData();
                formData.append("audio", audioBlob, "speaking.webm");

                try {
                    const response = await fetch("/analyze", {
                        method: "POST",
                        body: formData
                    });

                    const data = await response.json();

                    if (data.error) {
                        result.innerHTML = `<div class="error">❌ ${data.error}</div>`;
                        status.textContent = "Error";
                        return;
                    }

                    const a = data.analysis;
                    const bandValue = parseFloat(a.band) || 0;
                    const pct = Math.min(Math.max(bandValue / 9, 0), 1) * 100;
                    const bandColor = getBandColor(bandValue);

                    result.innerHTML = `
                        <div class="band-card">
                            <div class="band-gauge" style="--pct: ${pct}%; --color: ${bandColor};">
                                <div class="band-gauge-inner">
                                    <strong>${a.band}</strong>
                                    <span>Est. Band</span>
                                </div>
                            </div>
                        </div>

                        <div class="result-card">
                            <h3>📝 Your Answer</h3>
                            <p>${data.transcript}</p>
                        </div>

                        <div class="result-card">
                            <h3>❌ Grammar</h3>
                            ${a.grammar.map(x => `
                                <div class="grammar-item">
                                    <b>${x.mistake}</b> → <strong>${x.correction}</strong>
                                    <small>${x.explanation}</small>
                                </div>
                            `).join("")}
                        </div>

                        <div class="result-card">
                            <h3>📚 Vocabulary</h3>
                            ${a.vocabulary.map(x => `
                                <div class="vocab-item">
                                    <strong>${x.word}</strong>
                                    <span>${x.meaning}</span>
                                </div>
                            `).join("")}
                        </div>

                        <div class="result-card">
                            <h3>🗣️ Fluency</h3>
                            <p>${a.fluency}</p>
                        </div>

                        <div class="result-card">
                            <h3>🧩 Sentence Structure</h3>
                            <p>${a.sentence_structure}</p>
                        </div>

                        <div class="result-card">
                            <h3>✨ Better Answer</h3>
                            <p>${a.better_answer}</p>
                        </div>

                        <div class="result-card">
                            <h3>💡 Tips</h3>
                            <ul>
                                ${a.tips.map(t => `<li>${t}</li>`).join("")}
                            </ul>
                        </div>
                    `;

                    status.textContent = "✅ Finished";

                } catch (error) {
                    result.innerHTML = `<div class="error">❌ ${error.message}</div>`;
                    status.textContent = "Error";
                }
            };

            mediaRecorder.start();

            startBtn.disabled = true;
            stopBtn.disabled = false;
            status.textContent = "";
            recordingIndicator.classList.remove("hidden");

            timerInterval = setInterval(() => {
                timeLeft--;
                updateTimer();

                if (timeLeft <= 0) {
                    stopRecording();
                }
            }, 1000);

        } catch (error) {
            status.textContent = "❌ Microphone permission denied";
            console.error(error);
        }
    });

    stopBtn.addEventListener("click", stopRecording);

    function stopRecording() {
        clearInterval(timerInterval);

        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }

        startBtn.disabled = false;
        stopBtn.disabled = true;
    }

    function getBandColor(band) {
        if (band < 4) return "#ef4444";
        if (band < 5.5) return "#f59e0b";
        if (band < 6.5) return "#eab308";
        if (band < 7.5) return "#84cc16";
        return "#22c55e";
    }

    updateTimer();
});
