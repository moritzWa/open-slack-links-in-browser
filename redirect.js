// Skip Slack's "Launching <workspace>" page.
// A logged-in /archives/ link renders that page and its "open this link in
// your browser" href is the same URL with /archives/ swapped for /messages/.
// /messages/ then opens the web client. Do that swap before Slack's script
// can hand the tab to slack://.
(function () {
  "use strict";

  if (location.hostname === "app.slack.com") return;

  var path = location.pathname;
  var archivesAt = path.indexOf("/archives/");
  if (archivesAt !== -1) {
    var next =
      path.slice(0, archivesAt) +
      "/messages/" +
      path.slice(archivesAt + "/archives/".length) +
      location.search +
      location.hash;
    if (next !== path + location.search + location.hash) {
      location.replace(location.protocol + "//" + location.host + next);
      return;
    }
  }

  var interstitial =
    path.indexOf("/ssb/") === 0 || path.indexOf("/team/") === 0;
  if (!interstitial) return;

  var done = false;
  var styleEl = null;

  function hide() {
    if (styleEl || !document.documentElement) return;
    styleEl = document.createElement("style");
    styleEl.textContent = "html{visibility:hidden !important}";
    document.documentElement.appendChild(styleEl);
  }

  function show() {
    if (styleEl) styleEl.remove();
    styleEl = null;
  }

  function bad(url) {
    if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return true;
    try {
      var u = new URL(url, location.href);
      if (u.protocol === "slack:") return true;
      if (u.pathname.indexOf("/ssb/") === 0) return true;
      if (u.pathname.indexOf("/archives/") !== -1) return true;
      return false;
    } catch (e) {
      return true;
    }
  }

  function go(url) {
    if (done || bad(url)) return false;
    done = true;
    location.replace(url);
    return true;
  }

  function fromProps() {
    var node = document.getElementById("props_node");
    if (!node) return false;
    var raw = node.getAttribute("data-props");
    if (!raw) return false;
    var props = null;
    try {
      props = JSON.parse(raw);
    } catch (e) {
      var area = document.createElement("textarea");
      area.innerHTML = raw;
      try {
        props = JSON.parse(area.value);
      } catch (e2) {
        return false;
      }
    }
    var keys = ["webUrl", "teamUrl", "browserUrl"];
    for (var i = 0; i < keys.length; i++) {
      if (go(props[keys[i]])) return true;
    }
    return false;
  }

  var phrases = [
    "open this link in your browser",
    "use slack in your browser",
    "open in your browser",
    "continue in browser",
  ];

  function fromLink() {
    var qa = document.querySelector('a[data-qa="ssb_redirect_open_in_browser"]');
    if (qa && go(qa.href)) return true;
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var text = (links[i].textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (!text) continue;
      for (var j = 0; j < phrases.length; j++) {
        if (text.indexOf(phrases[j]) !== -1 && go(links[i].href)) return true;
      }
    }
    return false;
  }

  function blockSlackProtocol() {
    function slackish(value) {
      return typeof value === "string" && /^slack:/i.test(value.trim());
    }
    try {
      var origOpen = window.open;
      window.open = function (url) {
        if (slackish(url)) return null;
        return origOpen.apply(window, arguments);
      };
    } catch (e) {}
    document.addEventListener(
      "click",
      function (event) {
        var node = event.target && event.target.closest && event.target.closest("a");
        if (node && slackish(node.getAttribute("href"))) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true
    );
  }

  function attempt() {
    return fromProps() || fromLink();
  }

  blockSlackProtocol();
  hide();
  if (attempt()) return;

  var observer = new MutationObserver(function () {
    if (attempt()) observer.disconnect();
  });
  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-props", "href"],
    });
  }
  setTimeout(function () {
    observer.disconnect();
    if (!done) show();
  }, 2500);
})();
