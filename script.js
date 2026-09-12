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
})();
