/* 失物招领 —— 一部旧手机
 * 纯前端，无后端。进度存在 localStorage。
 */
(function () {
  "use strict";

  var K = {
    unlocked: "lp_unlocked",
    readChats: "lp_read_chats",
    hidden: "lp_hidden_photo",
    photoVisits: "lp_photo_visits",
    ending: "lp_ending",
    notesOpen: "lp_notes_open"
  };

  function get(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function set(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }
  function del(k) {
    try { localStorage.removeItem(k); } catch (e) {}
  }

  function clues() {
    // 三个线索：解锁、读到妈妈的消息、发现隐藏照片
    var n = 0;
    if (get(K.unlocked)) n++;
    if (get(K.readChats)) n++;
    if (get(K.hidden)) n++;
    return n;
  }

  function paintBadge() {
    var el = document.getElementById("clueBadge");
    if (!el) return;
    el.textContent = "线索 " + clues() + "/3";
  }

  function page() {
    return document.body.getAttribute("data-page") || "";
  }

  /* ---------------- 锁屏 ---------------- */
  function initLock() {
    var pin = "";
    var dots = Array.prototype.slice.call(document.querySelectorAll("#dots .dot"));
    var errorEl = document.getElementById("pinError");
    var keypad = document.getElementById("keypad");
    if (!keypad) return;

    function paint() {
      dots.forEach(function (d, i) {
        d.classList.toggle("on", i < pin.length);
      });
    }

    function wrong() {
      var lock = document.getElementById("lockscreen");
      lock.classList.add("shake");
      errorEl.classList.add("show");
      setTimeout(function () { lock.classList.remove("shake"); }, 420);
      setTimeout(function () { errorEl.classList.remove("show"); }, 1400);
      pin = "";
      paint();
    }

    keypad.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-k]");
      if (!btn) return;
      var k = btn.getAttribute("data-k");
      if (k === "del") {
        pin = pin.slice(0, -1);
        paint();
        return;
      }
      if (pin.length >= 4) return;
      pin += k;
      paint();
      if (pin.length === 4) {
        if (pin === "0317") {
          set(K.unlocked, "1");
          setTimeout(function () { location.href = "home.html"; }, 260);
        } else {
          setTimeout(wrong, 180);
        }
      }
    });

    // 键盘也能用
    document.addEventListener("keydown", function (e) {
      if (/^[0-9]$/.test(e.key)) {
        var btn = keypad.querySelector('[data-k="' + e.key + '"]');
        if (btn) btn.click();
      } else if (e.key === "Backspace") {
        pin = pin.slice(0, -1); paint();
      } else if (e.key === "Enter" && pin.length === 4) {
        if (pin === "0317") { set(K.unlocked, "1"); location.href = "home.html"; }
        else wrong();
      }
    });
  }

  /* ---------------- 通用：线索条 ---------------- */
  function initBadge() {
    paintBadge();
  }

  /* ---------------- 备忘录 ---------------- */
  function initNotes() {
    var opened = {};
    try { opened = JSON.parse(get(K.notesOpen) || "{}"); } catch (e) {}

    document.querySelectorAll(".note").forEach(function (note) {
      var id = note.getAttribute("data-note");
      if (opened[id]) note.classList.add("open");
      var head = note.querySelector(".note-head");
      if (!head) return;
      head.addEventListener("click", function () {
        note.classList.toggle("open");
        if (note.classList.contains("open")) {
          opened[id] = 1;
          set(K.notesOpen, JSON.stringify(opened));
        }
      });
    });
  }

  /* ---------------- 聊天 ---------------- */
  function initChat() {
    var list = document.getElementById("chatList");
    var title = document.getElementById("chatTitle");
    var sub = document.getElementById("chatSub");
    var back = document.querySelector(".screen-head .back");
    var hint = document.getElementById("chatHint");
    if (!list) return;

    var names = { mom: "妈妈", boss: "周店长", land: "房东王姐" };

    function openThread(id) {
      list.hidden = true;
      ["mom", "boss", "land"].forEach(function (x) {
        var t = document.getElementById("thread-" + x);
        if (t) t.hidden = (x !== id);
      });
      title.textContent = names[id] || "聊天";
      sub.textContent = "在线";
      if (hint) hint.style.display = "none";
      if (back) {
        back.textContent = "←";
        back.onclick = function (e) {
          e.preventDefault();
          closeThread();
        };
      }
      if (id === "mom") {
        set(K.readChats, "1");
        paintBadge();
      }
    }

    function closeThread() {
      list.hidden = false;
      ["mom", "boss", "land"].forEach(function (x) {
        var t = document.getElementById("thread-" + x);
        if (t) t.hidden = true;
      });
      title.textContent = "聊天";
      sub.textContent = "3 个会话";
      if (hint) hint.style.display = "";
      if (back) {
        back.onclick = null;
        back.setAttribute("href", "home.html");
      }
    }

    list.querySelectorAll("[data-chat]").forEach(function (item) {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        openThread(item.getAttribute("data-chat"));
      });
    });
  }

  /* ---------------- 相册 ---------------- */
  var PHOTO_DESC = {
    "1": "书店门口。傍晚的光落在招牌上，玻璃里映着一个举手机的人。",
    "2": "窗台上的薄荷。花盆底下压着一张便利贴：隔天浇一次。",
    "3": "书店的猫，趴在收银台旁边。",
    "4": "雨天的玻璃，外面看不清。",
    "5": "一杯没喝完的咖啡，杯身写着：今天也要早点回家。",
    "6": "搬空一半的书架，地上堆着纸箱。",
    "7": "拾光书店的天台。拍摄时间 3月16日 18:40。\n照片角落有一行手写的小字：最后看一眼吧。"
  };

  function initPhotos() {
    var visits = parseInt(get(K.photoVisits) || "0", 10) + 1;
    set(K.photoVisits, String(visits));

    var grid = document.getElementById("photoGrid");
    var syncText = document.getElementById("syncText");
    var syncbar = document.getElementById("syncbar");
    var hint = document.getElementById("photoHint");
    var count = document.getElementById("photoCount");
    if (!grid) return;

    var hiddenExists = !!grid.querySelector('[data-photo="7"]');
    // 用真实状态判断，避免重复出现
    if (get(K.hidden) === "1" && !grid.querySelector('[data-photo="7"]')) {
      addHiddenTile();
    }

    if (visits >= 3 && !hiddenExists && !grid.querySelector('[data-photo="7"]')) {
      addHiddenTile();
    }

    if (syncText) {
      if (visits >= 3 && grid.querySelector('[data-photo="7"]')) {
        syncText.textContent = "同步完成 · 发现 1 张新照片";
        var sp = syncbar && syncbar.querySelector(".spinner");
        if (sp) sp.style.display = "none";
      } else {
        syncText.textContent = "正在同步相册… " + Math.min(visits, 2) + "/3";
      }
    }
    if (hint) {
      hint.textContent = grid.querySelector('[data-photo="7"]')
        ? "照片里好像有东西，点开看看。"
        : "相册还在同步，再进来看看。";
    }
    if (count) {
      count.textContent = "共 " + grid.querySelectorAll(".tile").length + " 张";
    }

    function addHiddenTile() {
      var tile = document.createElement("div");
      tile.className = "tile t7 new";
      tile.setAttribute("data-photo", "7");
      tile.innerHTML = '<div class="inner"></div><span class="cap">天台 · 18:40</span>';
      grid.appendChild(tile);
      bindTile(tile);
    }

    function bindTile(tile) {
      tile.addEventListener("click", function () {
        var id = tile.getAttribute("data-photo");
        if (id === "7") {
          set(K.hidden, "1");
          paintBadge();
        }
        showViewer(id);
      });
    }

    grid.querySelectorAll(".tile").forEach(bindTile);

    var viewer = document.getElementById("viewer");
    var viewerImg = document.getElementById("viewerImg");
    var viewerDesc = document.getElementById("viewerDesc");

    function showViewer(id) {
      if (!viewer) return;
      viewerImg.className = "big t" + id;
      viewerDesc.textContent = PHOTO_DESC[id] || "";
      viewer.classList.add("show");
    }

    var closeBtn = document.getElementById("viewerClose");
    if (closeBtn) closeBtn.addEventListener("click", function () { viewer.classList.remove("show"); });
    if (viewer) viewer.addEventListener("click", function (e) {
      if (e.target === viewer) viewer.classList.remove("show");
    });
  }

  /* ---------------- 结局 ---------------- */
  function initEnding() {
    var title = document.getElementById("endingTitle");
    var text = document.getElementById("endingText");
    var actions = document.getElementById("endingActions");
    var retry = document.getElementById("endingRetry");
    var hidden = get(K.hidden) === "1";

    var ENDINGS = {
      "return": {
        kicker: "结局 · 归还",
        title: hidden ? "有人在天台上等她" : "第二天，她回了家",
        body: hidden
          ? [
              "你拨通了置顶的号码。响了两声，一个很急的声音接起来。",
              "你说，手机在出租车上捡到的；你把照片里的地点也告诉了她：拾光书店，天台。",
              "电话那头安静了一秒，然后是椅子挪动的声音。",
              "那天晚上十一点，妈妈在天台上找到了知夏。她坐在栏杆边，脚边放着一盆薄荷。",
              "第二天的生日面，是两个人一起吃的。",
              "你没有留下姓名。手机壳上的小纸条，被你重新贴了回去。"
            ]
          : [
              "你拨通了置顶的号码。响了两声，一个很急的声音接起来。",
              "你说，手机在出租车上捡到的，可以约个地方还给她。",
              "电话那头连声道谢。第二天，妈妈在派出所陪着知夏办完手续，把她接回了家。",
              "你听说，她只是一个人躲了几天，想清一些事情。",
              "手机壳上的小纸条，被你重新贴了回去。"
            ]
      },
      "keep": {
        kicker: "结局 · 留下",
        title: "手机安静了下来",
        body: [
          "你按灭屏幕，把它塞进了口袋里。",
          "一开始只是想着，等有空再想办法联系。后来是忙，再后来，是不知道怎么开口。",
          "一周后，你在小区门口的公告栏上看到一张寻人启事。照片上的人，和手机相册里的是同一个。",
          "你站在那张纸前面看了很久，手插在口袋里，指尖碰到了那部手机冰凉的边框。",
          "你最终没有拨出那个号码。"
        ]
      }
    };

    function render(key) {
      var e = ENDINGS[key];
      if (!e) return;
      set(K.ending, key);
      var kicker = document.querySelector(".ending-kicker");
      if (kicker) kicker.textContent = e.kicker;
      title.textContent = e.title;
      text.innerHTML = e.body.map(function (p) { return "<p>" + p + "</p>"; }).join("");
      if (actions) actions.style.display = "none";
      if (retry) retry.style.display = "grid";
    }

    var saved = get(K.ending);
    if (saved && ENDINGS[saved]) {
      render(saved);
    }

    var btnReturn = document.getElementById("btnReturn");
    var btnKeep = document.getElementById("btnKeep");
    if (btnReturn) btnReturn.addEventListener("click", function () { render("return"); });
    if (btnKeep) btnKeep.addEventListener("click", function () { render("keep"); });

    var btnRestart = document.getElementById("btnRestart");
    if (btnRestart) btnRestart.addEventListener("click", function () {
      [K.unlocked, K.readChats, K.hidden, K.photoVisits, K.ending, K.notesOpen].forEach(del);
      location.href = "index.html";
    });
  }

  /* ---------------- 入口 ---------------- */
  var p = page();

  if (p !== "lock" && !get(K.unlocked)) {
    // 没解锁就回锁屏，避免直接输 URL 跳过谜题
    location.replace("index.html");
    return;
  }

  if (p === "lock") initLock();
  if (p === "notes") initNotes();
  if (p === "chat") initChat();
  if (p === "photos") initPhotos();
  if (p === "ending") initEnding();

  initBadge();
})();
