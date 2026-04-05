(function(){
  const $ = id => document.getElementById(id);
  const profileSelect = $("profileSelect");
  const resultCard = $("resultCard");
  const resultContent = $("resultContent");
  const itemsList = $("itemsList");
  const emptyState = $("emptyState");

  let currentResult = null;
  let items = JSON.parse(localStorage.getItem("ecs_items") || "[]");

  function renderProfiles(){
    const profiles = window.APP_DATA.profiles;
    profileSelect.innerHTML = Object.keys(profiles)
      .map(name => `<option value="${name}">${name}</option>`)
      .join("");
    profileSelect.value = localStorage.getItem("ecs_profile") || "DEWA Standard";
    profileSelect.addEventListener("change", () => {
      localStorage.setItem("ecs_profile", profileSelect.value);
      if (currentResult) renderResult(currentResult);
    });
  }

  function getProfileMeta(){
    const selected = profileSelect.value;
    return window.APP_DATA.profiles[selected];
  }

  function renderResult(result){
    const p = getProfileMeta();
    currentResult = result;
    resultCard.hidden = false;
    resultContent.innerHTML = `
      <div class="result-grid">
        <div class="result-box"><div class="k">Equipment</div><div class="v">${result.equipmentName}</div></div>
        <div class="result-box"><div class="k">Load / Distance</div><div class="v">${result.loadCurrent} A / ${result.distance} m</div></div>
        <div class="result-box"><div class="k">Cable</div><div class="v">${result.cableTypeLabel} - ${result.cableSize}</div></div>
        <div class="result-box"><div class="k">Earth Cable</div><div class="v">${result.earthCable}</div></div>
        <div class="result-box"><div class="k">Breaker</div><div class="v">${result.breaker}</div></div>
        <div class="result-box"><div class="k">ELCB</div><div class="v">${result.elcb}</div></div>
        <div class="result-box"><div class="k">Isolator</div><div class="v">${result.isolator}</div></div>
        <div class="result-box"><div class="k">Glands / Lugs</div><div class="v">${p.glandFinish}, ${result.glands}<br>${p.lugType}, ${result.lugs}</div></div>
      </div>
      <div class="note">${result.note}<br>${p.note}</div>
    `;
  }

  function renderItems(){
    emptyState.style.display = items.length ? "none" : "block";
    itemsList.innerHTML = items.map((item, i) => `
      <div class="item">
        <div class="item-head">
          <div class="item-title">${item.equipmentName}</div>
          <div class="badge">${item.loadCurrent} A</div>
        </div>
        <div class="item-grid">
          <div><strong>Distance</strong>${item.distance} m</div>
          <div><strong>System</strong>${item.systemType}</div>
          <div><strong>Cable</strong>${item.cableSize}</div>
          <div><strong>Earth Cable</strong>${item.earthCable}</div>
          <div><strong>Breaker</strong>${item.breaker}</div>
          <div><strong>ELCB</strong>${item.elcb}</div>
          <div><strong>Isolator</strong>${item.isolator}</div>
          <div><strong>Glands / Lugs</strong>${item.glands} / ${item.lugs}</div>
        </div>
        <div class="item-actions">
          <button class="ghost" data-remove="${i}">Remove</button>
        </div>
      </div>
    `).join("");
    document.querySelectorAll("[data-remove]").forEach(btn => {
      btn.addEventListener("click", () => {
        items.splice(Number(btn.dataset.remove), 1);
        saveItems();
        renderItems();
      });
    });
  }

  function saveItems(){
    localStorage.setItem("ecs_items", JSON.stringify(items));
  }

  $("calculateBtn").addEventListener("click", () => {
    const loadCurrent = parseFloat($("loadCurrent").value);
    const distance = parseFloat($("distance").value);
    const equipmentName = $("equipmentName").value.trim() || "Equipment";
    const cableType = $("cableType").value;
    const systemType = $("systemType").value;

    if (!loadCurrent || loadCurrent <= 0) {
      alert("Enter the electrical load in amps.");
      return;
    }
    if (distance < 0 || Number.isNaN(distance)) {
      alert("Enter a valid distance.");
      return;
    }

    const result = window.computeSelection({equipmentName, loadCurrent, distance, cableType, systemType});
    renderResult(result);
    resultCard.scrollIntoView({behavior:"smooth", block:"start"});
  });

  $("addBtn").addEventListener("click", () => {
    if (!currentResult) return;
    items.unshift(currentResult);
    saveItems();
    renderItems();
  });

  $("clearBtn").addEventListener("click", () => {
    currentResult = null;
    resultCard.hidden = true;
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(() => {}));
  }

  renderProfiles();
  renderItems();
})();