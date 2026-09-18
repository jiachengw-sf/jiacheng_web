(function () {
  "use strict";

  var buttons = document.querySelectorAll("[data-file]");
  var sections = document.querySelectorAll("section.file");
  var tabLabel = document.getElementById("tabLabel");
  var pathLabel = document.getElementById("pathLabel");
  var navButtons = document.querySelectorAll("#navLinks button");
  var main = document.getElementById("main");

  var MOBILE_BREAKPOINT = 820;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function openFile(name, fromUserClick) {
    sections.forEach(function (s) {
      s.hidden = s.dataset.file !== name;
    });
    navButtons.forEach(function (b) {
      var isActive = b.dataset.file === name;
      b.classList.toggle("active", isActive);
      if (isActive) {
        b.setAttribute("aria-current", "page");
      } else {
        b.removeAttribute("aria-current");
      }
    });
    tabLabel.textContent = name + ".md";
    pathLabel.textContent = "~/jiacheng-wen/portfolio/" + name + ".md";
    main.scrollTop = 0;

    // Below the sidebar breakpoint the file tree sits above the content in
    // normal document flow, so jumping to the page top after a tap leaves the
    // reader staring at the nav again instead of the file they just opened.
    if (fromUserClick && window.innerWidth <= MOBILE_BREAKPOINT) {
      main.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
    } else {
      window.scrollTo(0, 0);
    }

    if (history.replaceState) {
      history.replaceState(null, "", "#" + name);
    }
  }

  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      openFile(b.dataset.file, true);
    });
  });

  var initial = window.location.hash ? window.location.hash.slice(1) : "about";
  var validNames = Array.prototype.map.call(sections, function (s) { return s.dataset.file; });
  if (validNames.indexOf(initial) === -1) {
    initial = "about";
  }
  openFile(initial);

  if (initial === "github") {
    loadRepos();
  }

  // ---- theme toggle ----
  var themeToggle = document.getElementById("themeToggle");
  var themeToggleLabel = document.getElementById("themeToggleLabel");

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }
  function setTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    themeToggleLabel.textContent = theme;
    themeToggle.setAttribute("aria-label", "Switch to " + (theme === "dark" ? "light" : "dark") + " theme");
    try { localStorage.setItem("theme", theme); } catch (e) {}
  }
  setTheme(currentTheme());
  themeToggle.addEventListener("click", function () {
    setTheme(currentTheme() === "dark" ? "light" : "dark");
  });

  // ---- github.md: live repo feed ----
  var LANG_COLORS = {
    "JavaScript": "#f1e05a", "TypeScript": "#3178c6", "Python": "#3572A5",
    "Svelte": "#ff3e00", "HTML": "#e34c26", "CSS": "#563d7c",
    "Jupyter Notebook": "#DA5B0B", "Java": "#b07219", "Shell": "#89e051",
    "PLpgSQL": "#336790", "Rust": "#dea584", "Go": "#00ADD8"
  };
  var reposLoaded = false;

  function timeAgo(iso) {
    var diffMs = Date.now() - new Date(iso).getTime();
    var days = Math.floor(diffMs / 86400000);
    if (days < 1) return "today";
    if (days === 1) return "1 day ago";
    if (days < 30) return days + " days ago";
    var months = Math.floor(days / 30);
    if (months < 12) return months + (months === 1 ? " month ago" : " months ago");
    var years = Math.floor(months / 12);
    return years + (years === 1 ? " year ago" : " years ago");
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  function renderRepoCard(repo) {
    var color = LANG_COLORS[repo.language] || "#8b8570";
    var card = document.createElement("div");
    card.className = "repo-card";
    card.innerHTML =
      '<div class="repo-card-top">' +
        '<h3><a href="' + repo.html_url + '" target="_blank" rel="noopener">' + escapeHtml(repo.name) + "</a></h3>" +
        '<span class="updated">pushed ' + timeAgo(repo.pushed_at) + "</span>" +
      "</div>" +
      (repo.description ? "<p>" + escapeHtml(repo.description) + "</p>" : "") +
      '<div class="stats">' +
        (repo.language
          ? '<span class="lang"><span class="lang-dot" style="background:' + color + '"></span>' + repo.language + "</span>"
          : "") +
        (repo.stargazers_count ? "<span>★ " + repo.stargazers_count + "</span>" : "") +
        (repo.fork ? '<span class="fork-tag">fork</span>' : "") +
      "</div>";
    return card;
  }

  function loadRepos() {
    if (reposLoaded) return;
    reposLoaded = true;
    var grid = document.getElementById("repoGrid");
    fetch("https://api.github.com/users/jiachengw-sf/repos?sort=pushed&per_page=12")
      .then(function (res) {
        if (!res.ok) throw new Error("status " + res.status);
        return res.json();
      })
      .then(function (repos) {
        grid.innerHTML = "";
        if (!repos.length) {
          grid.innerHTML = '<div class="repo-feed-error">No public repos found.</div>';
          return;
        }
        repos.forEach(function (repo) {
          grid.appendChild(renderRepoCard(repo));
        });
      })
      .catch(function () {
        grid.innerHTML =
          '<div class="repo-feed-error"><b>Couldn\'t load live data</b> — GitHub\'s public API is rate-limited ' +
          "per IP, so this can happen with heavy traffic. Browse the repos directly at " +
          '<a href="https://github.com/jiachengw-sf" class="link">github.com/jiachengw-sf</a> instead.</div>';
        reposLoaded = false;
      });
  }

  document.querySelectorAll('[data-file="github"]').forEach(function (b) {
    b.addEventListener("click", function () { loadRepos(); });
  });

  // ---- pad-grid: hover-reactive glowing grid on about.md ----
  (function () {
    var gridEl = document.getElementById("padGrid");
    if (!gridEl) return;

    var CELL_SIZE = 9, CELL_GAP = 3, ROWS = 14;
    var COLS = 60; // placeholder; computeCols() sets the real value before first render

    // Tiny 5x7 dot-matrix font, just the letters needed for the marquee text.
    // Each row is doubled (7 -> 14) so the letters actually fill the taller
    // grid instead of being a small shape lost in a lot of empty rows.
    var FONT_SRC = {
      A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
      C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
      E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
      G: ["01111", "10000", "10000", "10011", "10001", "10001", "01111"],
      H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
      I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
      J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
      N: ["10001", "11001", "10101", "10101", "10011", "10001", "10001"],
      W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
      " ": ["000", "000", "000", "000", "000", "000", "000"]
    };
    var FONT_ROWS = 14;
    var FONT = {};
    Object.keys(FONT_SRC).forEach(function (k) {
      var tall = [];
      FONT_SRC[k].forEach(function (row) { tall.push(row); tall.push(row); });
      FONT[k] = tall;
    });

    var MARQUEE_TEXT = "JIACHENG WEN    ";
    var stripRows = [];
    for (var sr = 0; sr < FONT_ROWS; sr++) stripRows.push("");
    for (var mc = 0; mc < MARQUEE_TEXT.length; mc++) {
      var glyph = FONT[MARQUEE_TEXT[mc]] || FONT[" "];
      for (var gr = 0; gr < FONT_ROWS; gr++) {
        stripRows[gr] += glyph[gr] + "0"; // 1-column gap after each character
      }
    }
    var STRIP_WIDTH = stripRows[0].length;
    var MARQUEE_ROW_OFFSET = Math.floor((ROWS - FONT_ROWS) / 2); // vertically centers the name in the grid
    var MARQUEE_SPEED = 1.3; // columns per second — gentle, not "crazy"

    var cells = [];

    // The CSS used to let grid-template-columns auto-fill based on
    // container width, but that meant the browser's real column count and
    // this script's row/col math for the marquee text could disagree —
    // which is exactly what garbled the letters and left a half-cut-off
    // row at the bottom. Instead we measure the container once, decide the
    // column count ourselves, and pin it with an explicit inline
    // grid-template-columns so CSS and JS always agree.
    function computeCols() {
      var w = gridEl.getBoundingClientRect().width || gridEl.parentElement.clientWidth || 300;
      var n = Math.floor((w + CELL_GAP) / (CELL_SIZE + CELL_GAP));
      return Math.max(20, n);
    }

    function buildGrid() {
      COLS = computeCols();
      gridEl.style.gridTemplateColumns = "repeat(" + COLS + ", " + CELL_SIZE + "px)";
      gridEl.innerHTML = "";
      cells = [];
      var frag = document.createDocumentFragment();
      for (var i = 0; i < COLS * ROWS; i++) {
        var cell = document.createElement("span");
        cell.className = "pad-cell";
        frag.appendChild(cell);
        cells.push({
          el: cell, x: 0, y: 0, v: 0, hoverV: 0,
          lastV: NaN, lastLift: NaN, lastGlow: NaN,
          bobPhase: Math.random() * Math.PI * 2,
          bobFreq: 2.2 + Math.random() * 1.6
        });
      }
      gridEl.appendChild(frag);
      measure();
    }

    var padReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var pointerX = null, pointerY = null;
    var RADIUS = 85;

    function measure() {
      var rect = gridEl.getBoundingClientRect();
      cells.forEach(function (c) {
        var r = c.el.getBoundingClientRect();
        c.x = r.left + r.width / 2 - rect.left;
        c.y = r.top + r.height / 2 - rect.top;
      });
    }

    function setPointer(clientX, clientY) {
      var rect = gridEl.getBoundingClientRect();
      pointerX = clientX - rect.left;
      pointerY = clientY - rect.top;
    }
    function clearPointer() { pointerX = null; pointerY = null; }

    gridEl.addEventListener("mousemove", function (e) { setPointer(e.clientX, e.clientY); });
    gridEl.addEventListener("mouseleave", clearPointer);
    gridEl.addEventListener("touchmove", function (e) {
      if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    gridEl.addEventListener("touchend", clearPointer);

    buildGrid();

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (computeCols() !== COLS) {
          buildGrid();
        } else {
          measure();
        }
      }, 200);
    });

    // If the site loads on a different file (e.g. a #projects deep link), the
    // grid starts hidden and computeCols() sees a collapsed 0-width box.
    // Rebuild once "about" is actually opened so the column count (and
    // hover targeting) reflects its real, visible width.
    document.querySelectorAll('[data-file="about"]').forEach(function (b) {
      b.addEventListener("click", function () { setTimeout(buildGrid, 0); });
    });

    var t0 = Date.now();
    var lastFrame = t0;
    // Smoothing factors below were tuned per-60ms-tick (0.3 and 0.25). Redone
    // as a time constant so the same easing feel holds at any frame rate —
    // requestAnimationFrame runs at the display's real refresh rate (usually
    // 60fps+), which is what makes the scroll read as continuous instead of
    // visibly stepping every ~60ms.
    var V_TAU = 0.17, HOVER_TAU = 0.21;

    function frame() {
      requestAnimationFrame(frame);
      if (gridEl.offsetParent === null || document.hidden) return; // not visible, skip work
      var now = Date.now();
      var dt = Math.min(0.1, (now - lastFrame) / 1000); // clamp so a tab-switch pause can't jump the animation
      lastFrame = now;
      var vLerp = 1 - Math.exp(-dt / V_TAU);
      var hoverLerp = 1 - Math.exp(-dt / HOVER_TAU);
      var time = (now - t0) / 1000;
      var scrollCol = time * MARQUEE_SPEED;
      cells.forEach(function (c, i) {
        var target = 0;
        var hoverTarget = 0;
        if (pointerX !== null) {
          // Hovering: identical to the plain hover-ripple behavior from
          // before the marquee was added.
          var dx = c.x - pointerX, dy = c.y - pointerY;
          var dist = Math.sqrt(dx * dx + dy * dy);
          hoverTarget = Math.max(0, 1 - dist / RADIUS);
          hoverTarget = hoverTarget * hoverTarget;
          target = hoverTarget;
        } else if (!padReduceMotion) {
          // Idle: scroll the name across the grid like an LED marquee
          // (跑马灯) instead of random shimmer.
          var row = Math.floor(i / COLS);
          var col = i % COLS;
          var fontRow = row - MARQUEE_ROW_OFFSET;
          if (fontRow >= 0 && fontRow < FONT_ROWS) {
            var stripCol = Math.floor(col + scrollCol) % STRIP_WIDTH;
            if (stripCol < 0) stripCol += STRIP_WIDTH;
            target = stripRows[fontRow][stripCol] === "1" ? 0.6 : 0;
          }
        }
        c.v += (target - c.v) * vLerp;
        c.hoverV += (hoverTarget - c.hoverV) * hoverLerp;
        // Snap tiny residuals to exactly 0 so settled cells stop being
        // rewritten (and stop retriggering CSS transitions) every tick.
        if (target === 0 && c.v < 0.004) c.v = 0;
        if (hoverTarget === 0 && c.hoverV < 0.004) c.hoverV = 0;

        // Cells the cursor is actually near bob a little on top of the lift —
        // same as before the marquee was added. Idle/marquee cells don't bob.
        var hoverBob = padReduceMotion ? 0 : Math.sin(time * c.bobFreq + c.bobPhase) * 5 * c.hoverV;
        var lift = -8 * c.v + hoverBob;

        // The glow shadow is expensive to paint on many elements at once, so
        // it's only ever driven by hoverV (a handful of cells under the
        // cursor) — the marquee can light up a whole row of cells without
        // ever paying for it.
        var vR = Math.round(c.v * 200) / 200;
        var liftR = Math.round(lift * 5) / 5;
        var glowR = Math.round(c.hoverV * 200) / 200;
        if (vR !== c.lastV) { c.el.style.setProperty("--v", vR); c.lastV = vR; }
        if (liftR !== c.lastLift) { c.el.style.setProperty("--lift", liftR + "px"); c.lastLift = liftR; }
        if (glowR !== c.lastGlow) { c.el.style.setProperty("--glow", glowR); c.lastGlow = glowR; }
      });
    }
    requestAnimationFrame(frame);
  })();
})();
