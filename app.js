(function () {
  const sourceBlocks = Array.isArray(window.CHECKLIST_BLOCKS)
    ? window.CHECKLIST_BLOCKS
    : (Array.isArray(window.CHECKLIST_ITEMS) ? window.CHECKLIST_ITEMS.map((text) => ({ text, images: [] })) : []);

  const doneKey = "route-checklist-done-v2";
  const notesKey = "route-checklist-notes-v1";
  const guideNotesKey = "route-checklist-guide-notes-v1";
  const dangerKey = "route-checklist-danger-v1";
  const editsKey = "route-checklist-section-edits-v1";
  const done = new Set(JSON.parse(localStorage.getItem(doneKey) || "[]"));
  const notes = JSON.parse(localStorage.getItem(notesKey) || "{}");
  const dangerSections = new Set(JSON.parse(localStorage.getItem(dangerKey) || "[]"));
  const sectionEdits = JSON.parse(localStorage.getItem(editsKey) || "{}");
  const editingSections = new Set();

  const checklist = document.getElementById("checklist");
  const sectionNav = document.getElementById("sectionNav");
  const searchInput = document.getElementById("searchInput");
  const hideDone = document.getElementById("hideDone");
  const resetAll = document.getElementById("resetAll");
  const clearNotes = document.getElementById("clearNotes");
  const guideNotes = document.getElementById("guideNotes");
  const doneCount = document.getElementById("doneCount");
  const totalCount = document.getElementById("totalCount");
  const progressLabel = document.getElementById("progressLabel");
  const visibleLabel = document.getElementById("visibleLabel");

  const sections = buildSections(sourceBlocks);
  applySavedEdits();
  const episodeVideos = {
    "Episode 1 - Banks 1 through 24": ["https://www.youtube-nocookie.com/embed/r3IV6Ix3T_o"],
    "Episode 2 - Banks 24 through 75": ["https://www.youtube-nocookie.com/embed/iLY7W5JWedY"],
    "Episode 3 - Banks 76 through 104B": ["https://www.youtube-nocookie.com/embed/EjnSfrlrxP8"],
    "Episode 4 - Banks 105 through 150": ["https://www.youtube-nocookie.com/embed/vuQnJwur8oI"],
    "Episode 5 - Banks 151 through 175": ["https://www.youtube-nocookie.com/embed/sNOW5EAY2e4"],
    "Episode 6 - Bank 176 through Combat Achievements": ["https://www.youtube-nocookie.com/embed/TNZuNhFbmyM"],
    "Episode 7 - Further Combat Training/Questing through Barrows": ["https://www.youtube-nocookie.com/embed/FpiphrAyaIU"],
    "Episode 8 - Herblore through Perilous Moons": [
      "https://www.youtube-nocookie.com/embed/hvmm5TXgupw",
      "https://www.youtube-nocookie.com/embed/XRZVxU-umX8"
    ],
    "Episode 9 - Bank 177 through 179": ["https://www.youtube-nocookie.com/embed/CpqW6ulr3TY"],
    "Episode 10 - Bank 180 through Inferno": ["https://www.youtube-nocookie.com/embed/H70ehkKDMvs"],
    "Episode 11 - Bank 196 through Slayer Grind": ["https://www.youtube-nocookie.com/embed/MIODERxtBzg"],
    "Episode 12 - Bank 204 through Zulrah": ["https://www.youtube-nocookie.com/embed/8nfQ_ApVrC0"],
    "Episode 13 - Off Track with the guide as I went for avernic": ["https://www.youtube-nocookie.com/embed/J_heP_4_wXs"],
    "Episode 14 - Doom and ToB": ["https://www.youtube-nocookie.com/embed/n2UcmFYwasg"],
    "Episode 15 - Yama": ["https://www.youtube-nocookie.com/embed/sw7CsAVaMSQ"],
    "Episode 16 - ToB and Misc.": ["https://www.youtube-nocookie.com/embed/eGZqQUCbsUY"],
    "Episode 17 - ToA for Fang": ["https://www.youtube-nocookie.com/embed/w6i6bDJj05k"],
    "Episode 18 - CoX for Prayers": ["https://www.youtube-nocookie.com/embed/4_DZ9fMav40"],
    "Episode 19 - The Fortis Colloseum": ["https://www.youtube-nocookie.com/embed/LebOC6daoYk"]
  };
  const episodes = buildEpisodes(sections);

  totalCount.textContent = getAllTasks().length;
  if (guideNotes) guideNotes.value = localStorage.getItem(guideNotesKey) || "";
  renderNav();
  render();

  searchInput.addEventListener("input", render);
  hideDone.addEventListener("change", render);
  guideNotes?.addEventListener("input", () => {
    localStorage.setItem(guideNotesKey, guideNotes.value);
  });
  resetAll.addEventListener("click", () => {
    if (!confirm("Reset every checked task?")) return;
    done.clear();
    saveDone();
    render();
  });
  clearNotes.addEventListener("click", () => {
    if (!confirm("Clear all section notes?")) return;
    Object.keys(notes).forEach((key) => delete notes[key]);
    if (guideNotes) guideNotes.value = "";
    localStorage.removeItem(guideNotesKey);
    saveNotes();
    render();
  });

  function buildSections(blocks) {
    const result = [];
    let current = null;
    let pendingImages = [];
    let taskIndex = 0;

    blocks.forEach((block, blockIndex) => {
      const text = (typeof block === "string" ? block : block.text || "").trim();
      const images = Array.isArray(block.images) ? block.images : [];
      const isBold = typeof block === "object" && block.bold === true;

      if (!text && images.length) {
        pendingImages.push(...images);
        return;
      }

      if (text && isSectionTitle(text, blockIndex, isBold)) {
        current = { id: slug(text, result.length), title: text, items: [], images: [], videos: [] };
        result.push(current);
        if (pendingImages.length) {
          current.images.push(...pendingImages);
          pendingImages = [];
        }
        if (images.length) current.images.push(...images);
        return;
      }

      if (!current) {
        current = { id: "starting-out-0", title: "Starting out", items: [], images: [], videos: [] };
        result.push(current);
      }

      if (pendingImages.length) {
        current.images.push(...pendingImages);
        pendingImages = [];
      }

      if (images.length) {
        current.images.push(...images);
      }

      if (!text) return;
      if (!current.items.length && text.toLowerCase() === current.title.toLowerCase()) return;

      extractVideoEmbeds(text).forEach((src) => {
        if (!current.videos.includes(src)) current.videos.push(src);
      });

      current.items.push({
        id: `task-${taskIndex++}`,
        text: text.toLowerCase() === "[uncheck all]" ? "Checkpoint: uncheck temporary items before continuing" : text,
        originalText: text.toLowerCase() === "[uncheck all]" ? "Checkpoint: uncheck temporary items before continuing" : text
      });
    });

    return result.filter((section) => section.items.length || section.images.length);
  }

  function applySavedEdits() {
    sections.forEach((section) => {
      section.originalItems = section.items.map((item, index) => ({
        id: item.id,
        text: item.originalText || item.text,
        originalText: item.originalText || item.text
      }));

      if (Array.isArray(sectionEdits[section.id])) {
        section.items = sectionEdits[section.id].map((text, index) => ({
          id: section.originalItems[index]?.id || `${section.id}-custom-${index}`,
          text,
          originalText: section.originalItems[index]?.originalText || text
        }));
      }
    });
  }

  function getAllTasks() {
    return sections.flatMap((section) => section.items);
  }

  function extractVideoEmbeds(text) {
    const urls = text.match(/https?:\/\/[^\s)]+/g) || [];
    return urls
      .map((url) => youtubeEmbedUrl(url))
      .filter(Boolean);
  }

  function youtubeEmbedUrl(url) {
    try {
      const parsed = new URL(url.replace(/&amp;/g, "&"));
      let id = "";
      if (parsed.hostname.includes("youtu.be")) {
        id = parsed.pathname.replace("/", "");
      } else if (parsed.hostname.includes("youtube.com")) {
        id = parsed.searchParams.get("v") || parsed.pathname.split("/embed/")[1] || "";
      }
      id = id.split(/[?&/]/)[0];
      if (!id) return "";
      const start = parsed.searchParams.get("t") || parsed.searchParams.get("start") || "";
      const seconds = parseTimestamp(start);
      return `https://www.youtube-nocookie.com/embed/${id}${seconds ? `?start=${seconds}` : ""}`;
    } catch {
      return "";
    }
  }

  function parseTimestamp(value) {
    if (!value) return 0;
    if (/^\d+$/.test(value)) return Number(value);
    const match = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?/.exec(value);
    if (!match) return 0;
    return (Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0);
  }

  function isSectionTitle(text, index, isBold) {
    if (index === 0) return true;
    if (/^Bank\s+\d+[a-z]?$/i.test(text)) return true;
    if (/^(Inferno|Slayer Grind|Zulrah|Dragon Warhammer|Doom of Mokhaiotl|Yama|Theatre of Blood)$/i.test(text)) return true;
    return isBold && text.toLowerCase() !== "[uncheck all]" && text.length <= 90;
  }

  function slug(text, index) {
    const base = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return `${base || "section"}-${index}`;
  }

  function renderNav() {
    sectionNav.innerHTML = "<h2>Contents</h2>";
    const list = document.createElement("ol");
    episodes.forEach((episode) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.className = "episode-link";
      link.href = `#${episode.id}`;
      link.textContent = episode.title;
      li.appendChild(link);
      list.appendChild(li);
    });
    sectionNav.appendChild(list);
  }

  function render() {
    const query = searchInput.value.trim().toLowerCase();
    const shouldHideDone = hideDone.checked;
    let visibleTasks = 0;

    checklist.innerHTML = "";
    updateTotals();

    episodes.forEach((episode) => {
      const hasVideosOnly = !episode.sections.length && !query && !shouldHideDone && (episodeVideos[episode.title] || []).length;
      let episodeHasVisibleContent = hasVideosOnly;
      const fragment = document.createDocumentFragment();

      episode.sections.forEach((section) => {
      const visibleItems = section.items.filter((item) => {
        const isDone = done.has(item.id);
        const matchesSearch = !query || item.text.toLowerCase().includes(query) || section.title.toLowerCase().includes(query);
        return matchesSearch && (!shouldHideDone || !isDone);
      });

      const sectionMatches = !query || section.title.toLowerCase().includes(query);
      if (!visibleItems.length && !sectionMatches) return;
        episodeHasVisibleContent = true;
      visibleTasks += visibleItems.length;
        fragment.appendChild(renderSection(section, visibleItems));
      });

      if (episodeHasVisibleContent) {
        checklist.appendChild(renderEpisodeTitle(episode));
        checklist.appendChild(renderEpisodeVideos(episode));
        checklist.appendChild(fragment);
      }
    });

    visibleLabel.textContent = query || shouldHideDone
      ? `Showing ${visibleTasks} matching tasks`
      : "Showing all tasks";

    if (!checklist.children.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "No checklist items match that view.";
      checklist.appendChild(empty);
    }
  }

  function buildEpisodes(sectionList) {
    const episodeDefs = [
      { id: "episode-1", title: "Episode 1 - Banks 1 through 24", start: (s) => s.title === "Starting out" || bankNumber(s.title) <= 24 },
      { id: "episode-2", title: "Episode 2 - Banks 24 through 75", start: (s) => betweenBank(s.title, 25, 75) },
      { id: "episode-3", title: "Episode 3 - Banks 76 through 104B", start: (s) => betweenBank(s.title, 76, 104) },
      { id: "episode-4", title: "Episode 4 - Banks 105 through 150", start: (s) => betweenBank(s.title, 105, 150) },
      { id: "episode-5", title: "Episode 5 - Banks 151 through 175", start: (s) => betweenBank(s.title, 151, 175) },
      { id: "episode-6", title: "Episode 6 - Bank 176 through Combat Achievements", start: (s) => s.title === "Bank 176" || ["Complete these skills whenever you want", "Training melee combat & slayer", "Combat Achievements"].includes(s.title) },
      { id: "episode-7", title: "Episode 7 - Further Combat Training/Questing through Barrows", start: (s) => ["Further Combat training/Questing", "Zombie Axe", "Barrows"].includes(s.title) },
      { id: "episode-8", title: "Episode 8 - Herblore through Perilous Moons", start: (s) => ["Herblore", "Song of the Elves", "Perilous Moons"].includes(s.title) },
      { id: "episode-9", title: "Episode 9 - Bank 177 through 179", start: (s) => betweenBank(s.title, 177, 179) },
      { id: "episode-10", title: "Episode 10 - Bank 180 through Inferno", start: (s) => betweenBank(s.title, 180, 195) || s.title === "Inferno" },
      { id: "episode-11", title: "Episode 11 - Bank 196 through Slayer Grind", start: (s) => betweenBank(s.title, 196, 203) || s.title === "Slayer Grind" },
      { id: "episode-12", title: "Episode 12 - Bank 204 through Zulrah", start: (s) => bankNumber(s.title) >= 204 || s.title === "Zulrah" },
      { id: "episode-13", title: "Episode 13 - Off Track with the guide as I went for avernic", start: (s) => s.title === "Dragon Warhammer" },
      { id: "episode-14", title: "Episode 14 - Doom and ToB", start: (s) => ["Doom of Mokhaiotl", "Theatre of Blood"].includes(s.title) },
      { id: "episode-15", title: "Episode 15 - Yama", start: (s) => s.title === "Yama" },
      { id: "episode-16", title: "Episode 16 - ToB and Misc.", start: (s) => false },
      { id: "episode-17", title: "Episode 17 - ToA for Fang", start: (s) => false },
      { id: "episode-18", title: "Episode 18 - CoX for Prayers", start: (s) => false },
      { id: "episode-19", title: "Episode 19 - The Fortis Colloseum", start: (s) => false }
    ];

    const grouped = episodeDefs.map((episode) => ({ ...episode, sections: [] }));
    sectionList.forEach((section) => {
      const match = grouped.find((episode) => episode.start(section)) || grouped.find((episode) => episode.id === "episode-12");
      match.sections.push(section);
    });
    return grouped.filter((episode) => episode.sections.length || (episodeVideos[episode.title] || []).length);
  }

  function renderEpisodeTitle(episode) {
    const title = document.createElement("h3");
    title.className = "episode-title";
    title.id = episode.id;
    title.textContent = episode.title;
    return title;
  }

  function renderEpisodeVideos(episode) {
    const videos = episodeVideos[episode.title] || [];
    const wrap = document.createElement("div");
    wrap.className = "episode-videos";
    if (!videos.length) return wrap;

    videos.forEach((src, index) => {
      wrap.appendChild(renderVideoCard(src, `${episode.title} video ${index + 1}`));
    });

    return wrap;
  }

  function renderVideoCard(src, title) {
    const details = videoDetails(src);
    const card = document.createElement("div");
    card.className = "video-card";

    const button = document.createElement("a");
    button.href = details.watch;
    button.target = "_blank";
    button.rel = "noreferrer";
    button.className = "video-thumb";
    button.setAttribute("aria-label", `Open ${title} on YouTube`);

    const image = document.createElement("img");
    image.src = details.thumbnail;
    image.alt = title;
    image.loading = "lazy";
    button.appendChild(image);

    const play = document.createElement("span");
    play.className = "play-icon";
    play.textContent = "Play";
    button.appendChild(play);

    const link = document.createElement("a");
    link.href = details.watch;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Open on YouTube";

    const playerButton = document.createElement("button");
    playerButton.type = "button";
    playerButton.className = "try-player";
    playerButton.textContent = "Try in-page player";
    playerButton.addEventListener("click", () => {
      card.replaceChildren(renderPlayerFrame(details.embed, title), link);
    });

    card.append(button, playerButton, link);
    return card;
  }

  function videoDetails(src) {
    const parsed = new URL(src);
    const id = parsed.pathname.split("/").filter(Boolean).pop();
    const start = parsed.searchParams.get("start");
    const query = start ? `?start=${start}` : "";
    return {
      embed: `https://www.youtube-nocookie.com/embed/${id}${query}`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      watch: `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ""}`
    };
  }

  function renderPlayerFrame(src, title) {
    const frame = document.createElement("iframe");
    frame.src = embedSrcWithOrigin(src);
    frame.title = title;
    frame.loading = "eager";
    frame.referrerPolicy = "origin";
    frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    frame.allowFullscreen = true;
    return frame;
  }

  function embedSrcWithOrigin(src) {
    const parsed = new URL(src);
    parsed.searchParams.set("origin", window.location.origin);
    parsed.searchParams.set("playsinline", "1");
    return parsed.toString();
  }

  function bankNumber(title) {
    const match = /^Bank\s+(\d+)/i.exec(title);
    return match ? Number(match[1]) : NaN;
  }

  function betweenBank(title, min, max) {
    const number = bankNumber(title);
    return Number.isFinite(number) && number >= min && number <= max;
  }

  function renderSection(section, visibleItems) {
    const article = document.createElement("article");
    article.className = "section";
    article.id = section.id;
    if (dangerSections.has(section.id)) article.classList.add("danger-section");

    const header = document.createElement("div");
    header.className = "section-header";

    const title = document.createElement("h2");
    title.textContent = section.title;
    header.appendChild(title);

    if (/^Bank\s+\d+[a-z]?$/i.test(section.title)) {
      const dangerLabel = document.createElement("label");
      dangerLabel.className = "danger-toggle";

      const dangerCheck = document.createElement("input");
      dangerCheck.type = "checkbox";
      dangerCheck.checked = dangerSections.has(section.id);
      dangerCheck.addEventListener("change", () => {
        if (dangerCheck.checked) dangerSections.add(section.id);
        else dangerSections.delete(section.id);
        saveDanger();
        render();
      });

      const dangerText = document.createElement("span");
      dangerText.textContent = "Danger";
      dangerLabel.append(dangerCheck, dangerText);
      header.appendChild(dangerLabel);
    }

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-section";
    editButton.textContent = editingSections.has(section.id) ? "Cancel edit" : "Edit";
    editButton.addEventListener("click", () => {
      if (editingSections.has(section.id)) editingSections.delete(section.id);
      else editingSections.add(section.id);
      render();
    });
    header.appendChild(editButton);

    article.appendChild(header);

    if (dangerSections.has(section.id)) {
      const warning = document.createElement("div");
      warning.className = "danger-warning";
      warning.textContent = "Danger: HCIM death risk marked for this bank.";
      article.appendChild(warning);
    }

    const body = document.createElement("div");
    body.className = "section-body";
    if (section.videos.length) body.classList.add("has-videos");

    const items = document.createElement("div");
    items.className = "items";
    if (editingSections.has(section.id)) {
      items.appendChild(renderSectionEditor(section));
    } else {
      visibleItems.forEach((item) => items.appendChild(renderItem(item)));
    }
    body.appendChild(items);

    const noteWrap = document.createElement("aside");
    noteWrap.className = "notes";
    noteWrap.innerHTML = "<h3>Notes</h3>";
    const textarea = document.createElement("textarea");
    textarea.placeholder = "Add your notes here...";
    textarea.value = notes[section.id] || "";
    textarea.addEventListener("input", () => {
      notes[section.id] = textarea.value;
      saveNotes();
    });
    noteWrap.appendChild(textarea);
    body.appendChild(noteWrap);

    const pictureWrap = document.createElement("aside");
    pictureWrap.className = "picture";
    pictureWrap.innerHTML = "<h3>Picture</h3>";
    if (section.images.length) {
      const list = document.createElement("div");
      list.className = "picture-list";
      section.images.forEach((src, index) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = `${section.title} reference ${index + 1}`;
        img.loading = "lazy";
        list.appendChild(img);
      });
      pictureWrap.appendChild(list);
    } else {
      const empty = document.createElement("div");
      empty.className = "picture-empty";
      pictureWrap.appendChild(empty);
    }
    body.appendChild(pictureWrap);

    if (section.videos.length) {
      const videoWrap = document.createElement("aside");
      videoWrap.className = "tutorial-videos";
      videoWrap.innerHTML = "<h3>Video</h3>";
      section.videos.forEach((src, index) => {
        videoWrap.appendChild(renderVideoCard(src, `${section.title} tutorial video ${index + 1}`));
      });
      body.appendChild(videoWrap);
    }

    article.appendChild(body);
    return article;
  }

  function renderSectionEditor(section) {
    const editor = document.createElement("div");
    editor.className = "section-editor";

    const label = document.createElement("div");
    label.className = "editor-label";
    label.textContent = "Edit checklist steps";

    const rows = document.createElement("div");
    rows.className = "editor-rows";
    section.items.forEach((item) => rows.appendChild(renderEditorRow(item.text)));

    const actions = document.createElement("div");
    actions.className = "editor-actions";

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.textContent = "Add step";
    addButton.addEventListener("click", () => {
      rows.appendChild(renderEditorRow(""));
    });

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Save";
    saveButton.addEventListener("click", () => {
      const lines = Array.from(rows.querySelectorAll(".editor-row textarea"))
        .map((field) => field.value.trim())
        .filter(Boolean);
      section.items = lines.map((text, index) => ({
        id: section.originalItems[index]?.id || `${section.id}-custom-${index}`,
        text,
        originalText: section.originalItems[index]?.originalText || text
      }));
      sectionEdits[section.id] = lines;
      saveEdits();
      editingSections.delete(section.id);
      render();
    });

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.textContent = "Reset section";
    resetButton.addEventListener("click", () => {
      if (!confirm("Reset this section to the original guide text?")) return;
      section.items = section.originalItems.map((item) => ({ ...item }));
      delete sectionEdits[section.id];
      saveEdits();
      editingSections.delete(section.id);
      render();
    });

    actions.append(addButton, saveButton, resetButton);
    editor.append(label, rows, actions);
    return editor;
  }

  function renderEditorRow(text) {
    const row = document.createElement("div");
    row.className = "editor-row";

    const field = document.createElement("textarea");
    field.value = text;
    field.rows = 2;
    field.placeholder = "Checklist step...";

    const insert = document.createElement("button");
    insert.type = "button";
    insert.textContent = "Insert below";
    insert.addEventListener("click", () => {
      row.after(renderEditorRow(""));
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => row.remove());

    const rowActions = document.createElement("div");
    rowActions.className = "editor-row-actions";
    rowActions.append(insert, remove);

    row.append(field, rowActions);
    return row;
  }

  function renderItem(item) {
    const label = document.createElement("label");
    label.className = `item ${done.has(item.id) ? "done" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = done.has(item.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) done.add(item.id);
      else done.delete(item.id);
      saveDone();
      render();
    });

    const text = document.createElement("span");
    text.textContent = item.text;
    label.append(checkbox, text);
    return label;
  }

  function updateTotals() {
    const allTasks = getAllTasks();
    const completed = allTasks.filter((item) => done.has(item.id)).length;
    const pct = allTasks.length ? Math.round((completed / allTasks.length) * 100) : 0;
    totalCount.textContent = allTasks.length;
    doneCount.textContent = completed;
    progressLabel.textContent = `${pct}%`;
  }

  function saveDone() {
    localStorage.setItem(doneKey, JSON.stringify(Array.from(done)));
  }

  function saveNotes() {
    localStorage.setItem(notesKey, JSON.stringify(notes));
  }

  function saveDanger() {
    localStorage.setItem(dangerKey, JSON.stringify(Array.from(dangerSections)));
  }

  function saveEdits() {
    localStorage.setItem(editsKey, JSON.stringify(sectionEdits));
  }
})();
