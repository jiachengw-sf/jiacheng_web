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
})();
