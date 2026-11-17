/* 失物招领 v2 —— 一部旧手机
 * 纯前端，无后端。进度存在 localStorage。
 */
(function () {
  "use strict";

  var K = {
    unlocked: "lp_unlocked",
    identity: "lp_identity",
    note2: "lp_note2",
    voicemail: "lp_voicemail",
    reflection: "lp_reflection",
    forum: "lp_forum",
    hidden: "lp_hidden_photo",
    photoVisits: "lp_photo_visits",
    ending: "lp_ending",
    notesOpen: "lp_notes_open"
  };

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function del(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function clues() {
    var n = 0;
    if (get(K.unlocked)) n++;
    if (get(K.identity)) n++;
    if (get(K.note2)) n++;
    if (get(K.voicemail)) n++;
    if (get(K.reflection)) n++;
    if (get(K.forum)) n++;
    return n;
  }

  function paintBadge() {
    var el = document.getElementById("clueBadge");
    if (el) el.textContent = "线索 " + clues() + "/6";
  }

  function page() { return document.body.getAttribute("data-page") || ""; }

  function norm(s) {
    return String(s || "")
      .replace(/\s+/g, "")
      .replace(/[，,。.、:：\-—_]/g, "")
      .toLowerCase();
  }

  /* ---------------- 锁屏 ---------------- */
  function initLock() {
    var pin = "";
    var dots = Array.prototype.slice.call(document.querySelectorAll("#dots .dot"));
    var errorEl = document.getElementById("pinError");
    var keypad = document.getElementById("keypad");
    if (!keypad) return;

    function paint() { dots.forEach(function (d, i) { d.classList.toggle("on", i < pin.length); }); }

    function wrong() {
      var lock = document.getElementById("lockscreen");
      lock.classList.add("shake");
      if (errorEl) errorEl.classList.add("show");
      setTimeout(function () { lock.classList.remove("shake"); }, 420);
      setTimeout(function () { if (errorEl) errorEl.classList.remove("show"); }, 1400);
      pin = ""; paint();
    }

    keypad.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-k]");
      if (!btn) return;
      var k = btn.getAttribute("data-k");
      if (k === "del") { pin = pin.slice(0, -1); paint(); return; }
      if (pin.length >= 4) return;
      pin += k; paint();
      if (pin.length === 4) {
        if (pin === "0317") { set(K.unlocked, "1"); setTimeout(function () { location.href = "home.html"; }, 240); }
        else setTimeout(wrong, 160);
      }
    });

    document.addEventListener("keydown", function (e) {
      if (/^[0-9]$/.test(e.key)) {
        var btn = keypad.querySelector('[data-k="' + e.key + '"]');
        if (btn) btn.click();
      } else if (e.key === "Backspace") { pin = pin.slice(0, -1); paint(); }
      else if (e.key === "Enter" && pin.length === 4) {
        if (pin === "0317") { set(K.unlocked, "1"); location.href = "home.html"; } else wrong();
      }
    });
  }

  /* ---------------- 备忘录 ---------------- */
  function initNotes() {
    var opened = {};
    try { opened = JSON.parse(get(K.notesOpen) || "{}"); } catch (e) {}

    document.querySelectorAll(".note").forEach(function (note) {
      if (note.hasAttribute("hidden")) return;
      var id = note.getAttribute("data-note");
      if (opened[id]) note.classList.add("open");
      var head = note.querySelector(".note-head");
      if (!head) return;
      head.addEventListener("click", function () {
        note.classList.toggle("open");
        if (note.classList.contains("open")) { opened[id] = 1; set(K.notesOpen, JSON.stringify(opened)); }
      });
    });

    var locked = document.getElementById("lockedNote");
    var unlocked = document.getElementById("unlockedNote");
    var pw = document.getElementById("notePw");
    var btn = document.getElementById("noteUnlock");
    var err = document.getElementById("noteErr");

    function showUnlocked() {
      if (locked) { locked.hidden = true; locked.style.display = "none"; }
      if (unlocked) { unlocked.hidden = false; unlocked.classList.add("open"); }
      set(K.note2, "1");
      paintBadge();
    }

    if (get(K.note2)) showUnlocked();

    if (btn) btn.addEventListener("click", function () {
      var v = norm(pw ? pw.value : "");
      if (v === "0912" || v === "9月12日" || v === "912") showUnlocked();
      else if (err) { err.classList.add("show"); setTimeout(function () { err.classList.remove("show"); }, 1600); }
    });
    if (pw) pw.addEventListener("keydown", function (e) { if (e.key === "Enter" && btn) btn.click(); });

    // 加密笔记要先展开才看到输入框
    if (locked) {
      var lhead = locked.querySelector(".note-head");
      if (lhead) lhead.addEventListener("click", function () { locked.classList.add("open"); });
    }
  }

  /* ---------------- 聊天 ---------------- */
  function initChat() {
    var list = document.getElementById("chatList");
    var title = document.getElementById("chatTitle");
    var sub = document.getElementById("chatSub");
    var back = document.querySelector(".screen-head .back");
    var hint = document.getElementById("chatHint");
    if (!list) return;

    var names = { mom: "妈妈", boss: "周店长", friend: "小满", unknown: "未知号码" };
    var ids = ["mom", "boss", "friend", "unknown"];

    function openThread(id) {
      list.hidden = true;
      ids.forEach(function (x) {
        var t = document.getElementById("thread-" + x);
        if (t) t.hidden = (x !== id);
      });
      if (title) title.textContent = names[id] || "聊天";
      if (sub) sub.textContent = "在线";
      if (hint) hint.style.display = "none";
      if (back) {
        back.textContent = "←";
        back.onclick = function (e) { e.preventDefault(); closeThread(); };
      }
      if (id === "mom") { set(K.identity, "林知夏"); paintBadge(); }
    }

    function closeThread() {
      list.hidden = false;
      ids.forEach(function (x) {
        var t = document.getElementById("thread-" + x);
        if (t) t.hidden = true;
      });
      if (title) title.textContent = "聊天";
      if (sub) sub.textContent = "4 个会话";
      if (hint) hint.style.display = "";
      if (back) { back.onclick = null; back.setAttribute("href", "home.html"); }
    }

    list.querySelectorAll("[data-chat]").forEach(function (item) {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        openThread(item.getAttribute("data-chat"));
      });
    });
  }

  /* ---------------- 通话 ---------------- */
  function initCalls() {
    document.querySelectorAll(".call-card").forEach(function (card) {
      var btn = card.querySelector(".call-play");
      var txt = card.querySelector(".call-text");
      if (btn && txt) btn.addEventListener("click", function () {
        txt.hidden = !txt.hidden;
        btn.textContent = txt.hidden ? "播放留言" : "收起文字";
      });
    });

    var input = document.getElementById("placeInput");
    var btn = document.getElementById("placeSubmit");
    var err = document.getElementById("placeErr");
    var ok = document.getElementById("placeOk");

    function showOk() {
      if (ok) ok.classList.add("show");
      if (err) err.classList.remove("show");
      set(K.voicemail, "1");
      paintBadge();
    }
    if (get(K.voicemail) && ok) ok.classList.add("show");

    if (btn) btn.addEventListener("click", function () {
      var v = norm(input ? input.value : "");
      v = v.replace(/十七/g, "17").replace(/一七/g, "17");
      if (v.indexOf("西河路") !== -1 && v.indexOf("17") !== -1) showOk();
      else if (err) { err.classList.add("show"); setTimeout(function () { err.classList.remove("show"); }, 1800); }
    });
    if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter" && btn) btn.click(); });
  }

  /* ---------------- 邮件 ---------------- */
  function initMail() {
    document.querySelectorAll(".mail-card").forEach(function (card) {
      var body = card.querySelector(".mail-body");
      card.addEventListener("click", function () {
        if (!body) return;
        body.hidden = !body.hidden;
        card.classList.toggle("open", !body.hidden);
      });
    });
  }

  /* ---------------- 浏览器 ---------------- */
  function initBrowser() {
    var input = document.getElementById("forumInput");
    var btn = document.getElementById("forumSubmit");
    var err = document.getElementById("forumErr");
    var ok = document.getElementById("forumOk");

    function showOk() {
      if (ok) ok.classList.add("show");
      if (err) err.classList.remove("show");
      set(K.forum, "1");
      paintBadge();
    }
    if (get(K.forum) && ok) ok.classList.add("show");

    if (btn) btn.addEventListener("click", function () {
      var v = norm(input ? input.value : "");
      if (v === "地下二层" || v === "dxec" || v === "地下2层") showOk();
      else if (err) { err.classList.add("show"); setTimeout(function () { err.classList.remove("show"); }, 1800); }
    });
    if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter" && btn) btn.click(); });
  }

  /* ---------------- 相册 ---------------- */
  var PHOTO_DESC = {
    "1": "书店门口。傍晚的光落在招牌上，玻璃里映着一个举手机的人。",
    "2": "窗台上的薄荷。花盆底下压着一张便利贴：隔天浇一次。",
    "3": "书店的猫，趴在收银台旁边。",
    "4": "雨天的玻璃，外面看不清。",
    "5": "一杯没喝完的咖啡。玻璃反光里有一块招牌——灯下读书会 3F。",
    "6": "搬空一半的书架，地上堆着纸箱。",
    "7": "天台。栏杆边放着一盆薄荷，远处的楼群已经亮灯。",
    "8": "旧楼道，声控灯。墙上贴着一张褪色的读书会广告。",
    "9": "西河路 17 号的门牌，边角斑驳。",
    "10": "旧合照。背面写着两个字：9.12。",
    "11": "放大后的反光：招牌上写着「灯下读书会 3F」，下面还有一行小字：侧门上楼。",
    "12": "夜景。写字楼三层，只有一扇窗还亮着。"
  };

  function initPhotos() {
    var visits = parseInt(get(K.photoVisits) || "0", 10) + 1;
    set(K.photoVisits, String(visits));

    var grid = document.getElementById("photoGrid");
    if (!grid) return;

    var syncText = document.getElementById("syncText");
    var syncbar = document.getElementById("syncbar");
    var hint = document.getElementById("photoHint");
    var count = document.getElementById("photoCount");
    var hasHidden = !!grid.querySelector('[data-photo="12"]');

    if (!hasHidden && (visits >= 3 || get(K.hidden) === "1")) addHiddenTile();

    if (syncText) {
      if (grid.querySelector('[data-photo="12"]')) {
        syncText.textContent = "同步完成 · 发现 1 张新照片";
        var sp = syncbar && syncbar.querySelector(".spinner");
        if (sp) sp.style.display = "none";
      } else {
        syncText.textContent = "正在同步相册… " + Math.min(visits, 2) + "/3";
      }
    }
    if (hint) {
      hint.textContent = grid.querySelector('[data-photo="12"]')
        ? "最后一张照片里，只有一扇窗还亮着。"
        : "相册还在同步，再进来看看。";
    }
    if (count) count.textContent = "共 " + grid.querySelectorAll(".tile").length + " 张";

    function addHiddenTile() {
      var tile = document.createElement("div");
      tile.className = "tile t12 new";
      tile.setAttribute("data-photo", "12");
      tile.innerHTML = '<div class="inner"></div><span class="cap">夜景 · 3F</span>';
      grid.appendChild(tile);
      bindTile(tile);
    }

    function bindTile(tile) {
      tile.addEventListener("click", function () {
        var id = tile.getAttribute("data-photo");
        if (id === "5" || id === "11") { set(K.reflection, "1"); paintBadge(); }
        if (id === "12") { set(K.hidden, "1"); paintBadge(); }
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
    if (viewer) viewer.addEventListener("click", function (e) { if (e.target === viewer) viewer.classList.remove("show"); });
  }

  /* ---------------- 结局 ---------------- */
  function initEnding() {
    var title = document.getElementById("endingTitle");
    var text = document.getElementById("endingText");
    var actions = document.getElementById("endingActions");
    var retry = document.getElementById("endingRetry");
    var hidden = get(K.hidden) === "1";
    var allClues = clues() >= 6;

    var E = {
      police: {
        kicker: "结局 · 报警",
        title: "你打了 110",
        body: [
          "接警员问得很细：地址、人数、你从哪里拿到的信息。你把手机里的东西一条一条念给对方听。",
          "凌晨一点，西河路 17 号楼下停了两辆警车。三楼那扇亮着的窗被敲开。",
          "知夏和知遥都在。知遥被反锁在里间，瘦了很多，但还活着。",
          "你在派出所做完笔录，天已经蒙蒙亮。手机被作为证据收走。",
          "第二天早上，你收到一条陌生号码的短信：谢谢你。"
        ]
      },
      self_true: {
        kicker: "结局 · 真结局",
        title: "你走上了三楼",
        body: [
          "你从侧门进去，楼道里只有声控灯。三楼只有一扇窗亮着。",
          "你没有敲门。你想起照片反光里的那行小字，绕到走廊尽头，推开那扇没锁的防火门。",
          "知夏被绑在椅子上，嘴上贴着胶带。里间的门开着，知遥蜷在角落。",
          "你报了警，然后站在门口，直到警笛声从楼下传来。",
          "后来，知夏把手机壳上那张纸条撕下来，重新写了一张，塞给你。上面写着：谢谢你替我找到她。"
        ]
      },
      self_bad: {
        kicker: "结局 · 独自前往",
        title: "你找错了地方",
        body: [
          "你赶到西河路 17 号。正门锁着，三楼那扇窗还亮着，但楼道里没有声音。",
          "你在楼下站了很久，最后绕到后门。一辆白色的车刚从巷子里开出去。",
          "第二天，你在新闻里看到：城郊某处发现两名被非法拘禁的女子，已被救出。",
          "你松了一口气，又觉得哪里空着。手机还在你口袋里，屏幕已经暗了。"
        ]
      },
      mom: {
        kicker: "结局 · 交给妈妈",
        title: "你把手机交给了她",
        body: [
          "你找到通讯录里的「妈妈」，拨了过去。接电话的人声音很哑，像是很久没睡。",
          "你说，手机是我捡到的，里面的东西您应该看看。",
          "她赶到你约定的路口，接过手机，手一直在抖。她翻到那条 9 月 12 日的消息，站在路灯下哭了很久。",
          "她报了警。第二天，知夏被找到。知遥的事还在查。",
          "你离开的时候，她追上来，往你手里塞了一袋还热着的包子。"
        ]
      },
      off: {
        kicker: "结局 · 关机",
        title: "你按灭了屏幕",
        body: [
          "你把手机关机，放进口袋。",
          "一开始只是想着，等有空再想办法。后来是忙，再后来，是不知道怎么开口。",
          "几周后，你在小区门口的公告栏上看到一张寻人启事。照片上的人，和手机相册里的是同一个。",
          "你站在那张纸前面看了很久，手插在口袋里，指尖碰到了那部手机冰凉的边框。",
          "你最终没有再打开它。"
        ]
      }
    };

    function render(key) {
      var e = E[key];
      if (!e) return;
      set(K.ending, key);
      var kicker = document.querySelector(".ending-kicker");
      if (kicker) kicker.textContent = e.kicker;
      if (title) title.textContent = e.title;
      if (text) text.innerHTML = e.body.map(function (p) { return "<p>" + p + "</p>"; }).join("");
      if (actions) actions.style.display = "none";
      if (retry) retry.style.display = "grid";
    }

    var saved = get(K.ending);
    if (saved && E[saved]) render(saved);

    function bind(id, fn) { var b = document.getElementById(id); if (b) b.addEventListener("click", fn); }
    bind("btnPolice", function () { render("police"); });
    bind("btnSelf", function () { render(allClues && hidden ? "self_true" : "self_bad"); });
    bind("btnMom", function () { render("mom"); });
    bind("btnOff", function () { render("off"); });
    bind("btnRestart", function () {
      [K.unlocked, K.identity, K.note2, K.voicemail, K.reflection, K.forum,
       K.hidden, K.photoVisits, K.ending, K.notesOpen].forEach(del);
      location.href = "index.html";
    });
  }

  /* ---------------- 入口 ---------------- */
  var p = page();
  if (p !== "lock" && !get(K.unlocked)) { location.replace("index.html"); return; }

  if (p === "lock") initLock();
  if (p === "notes") initNotes();
  if (p === "chat") initChat();
  if (p === "calls") initCalls();
  if (p === "mail") initMail();
  if (p === "browser") initBrowser();
  if (p === "photos") initPhotos();
  if (p === "ending") initEnding();

  paintBadge();
})();
