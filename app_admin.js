
(function () {
  const loginCard = document.getElementById("login-card");
  const adminDashboardCard = document.getElementById("admin-dashboard-card");
  const sessionDetailCard = document.getElementById("session-detail-card");

  const adminUserInput = document.getElementById("adminUser");
  const adminPassInput = document.getElementById("adminPass");
  const adminLoginBtn = document.getElementById("adminLoginBtn");

  const sessionsTableBody = document.querySelector("#sessionsTable tbody");
  const totalSessionsBadge = document.getElementById("totalSessionsBadge");

  const detailTitle = document.getElementById("detailTitle");
  const closeDetailBtn = document.getElementById("closeDetailBtn");
  const detailTableBody = document.querySelector("#detailTable tbody");
  const exportSessionBtn = document.getElementById("exportSessionBtn");
  const exportAllBtn = document.getElementById("exportAllBtn");

  let allEntries = [];
  let groupedSessions = {};
  let currentSessionKey = null;
  let unsubscribe = null;

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 2500);
  }

  function isLoggedIn() {
    return localStorage.getItem("upc_inventory_admin") === "YES";
  }

  function setLoggedIn() {
    localStorage.setItem("upc_inventory_admin", "YES");
  }

  function renderSessions() {
    groupedSessions = {};
    allEntries.forEach((doc) => {
      const data = doc.data();
      const key = data.sessionKey || [
        data.deviceId,
        data.warehouse,
        data.zone,
        data.storageBin,
      ].join("|");
      if (!groupedSessions[key]) {
        groupedSessions[key] = {
          key,
          deviceId: data.deviceId,
          warehouse: data.warehouse,
          zone: data.zone,
          storageBin: data.storageBin,
          docs: [],
        };
      }
      groupedSessions[key].docs.push(doc);
    });

    const keys = Object.keys(groupedSessions);
    totalSessionsBadge.textContent = keys.length + " session(s)";

    sessionsTableBody.innerHTML = "";
    keys.forEach((key, index) => {
      const group = groupedSessions[key];
      const tr = document.createElement("tr");

      const tdIndex = document.createElement("td");
      tdIndex.textContent = index + 1;

      const tdDevice = document.createElement("td");
      tdDevice.textContent = group.deviceId || "";

      const tdWh = document.createElement("td");
      tdWh.textContent = group.warehouse || "";

      const tdZone = document.createElement("td");
      tdZone.textContent = group.zone || "";

      const tdBin = document.createElement("td");
      tdBin.textContent = group.storageBin || "";

      const tdCount = document.createElement("td");
      tdCount.textContent = group.docs.length;

      const tdActions = document.createElement("td");
      const btnView = document.createElement("button");
      btnView.textContent = "Open";
      btnView.className = "btn-outline btn-small";
      btnView.addEventListener("click", () => {
        openSessionDetail(key);
      });
      tdActions.appendChild(btnView);

      tr.appendChild(tdIndex);
      tr.appendChild(tdDevice);
      tr.appendChild(tdWh);
      tr.appendChild(tdZone);
      tr.appendChild(tdBin);
      tr.appendChild(tdCount);
      tr.appendChild(tdActions);

      sessionsTableBody.appendChild(tr);
    });
  }

  function openSessionDetail(sessionKey) {
    currentSessionKey = sessionKey;
    const group = groupedSessions[sessionKey];
    if (!group) return;

    detailTitle.textContent =
      "Session – " +
      (group.deviceId || "") +
      " • " +
      (group.warehouse || "") +
      " • " +
      (group.zone || "") +
      " • " +
      (group.storageBin || "");

    renderSessionDetail();
    sessionDetailCard.style.display = "block";
  }

  function renderSessionDetail() {
    const group = groupedSessions[currentSessionKey];
    if (!group) return;
    const docs = group.docs;
    detailTableBody.innerHTML = "";

    docs.forEach((doc, index) => {
      const data = doc.data();
      const tr = document.createElement("tr");

      const tdIdx = document.createElement("td");
      tdIdx.textContent = index + 1;

      const tdMat = document.createElement("td");
      tdMat.textContent = data.materialCode || "";

      const tdDesc = document.createElement("td");
      tdDesc.textContent = data.materialDesc || "";

      const tdBarcode = document.createElement("td");
      tdBarcode.textContent = data.barcode || "";

      const tdWh = document.createElement("td");
      tdWh.textContent = data.warehouse || "";

      const tdZone = document.createElement("td");
      tdZone.textContent = data.zone || "";

      const tdBin = document.createElement("td");
      tdBin.textContent = data.storageBin || "";

      const tdBatch = document.createElement("td");
      const batchInput = document.createElement("input");
      batchInput.type = "text";
      batchInput.value = data.batch || "";
      batchInput.style.width = "90px";
      tdBatch.appendChild(batchInput);

      const tdQty = document.createElement("td");
      const qtyInput = document.createElement("input");
      qtyInput.type = "number";
      qtyInput.value = data.qty != null ? data.qty : 0;
      qtyInput.style.width = "70px";
      tdQty.appendChild(qtyInput);

      const tdEdit = document.createElement("td");
      const btnSave = document.createElement("button");
      btnSave.textContent = "Save";
      btnSave.className = "btn-outline btn-small";
      btnSave.addEventListener("click", async () => {
        const newBatch = batchInput.value.trim();
        const newQty = Number(qtyInput.value || 0);
        if (!newBatch || !newQty || Number.isNaN(newQty) || newQty <= 0) {
          showToast("Enter valid Batch & Qty.");
          return;
        }
        try {
          await db.collection("inventory_entries").doc(doc.id).update({
            batch: newBatch,
            qty: newQty,
          });
          showToast("Line updated.");
        } catch (err) {
          console.error(err);
          showToast("Update failed.");
        }
      });
      tdEdit.appendChild(btnSave);

      const tdDelete = document.createElement("td");
      const btnDelete = document.createElement("button");
      btnDelete.textContent = "X";
      btnDelete.className = "btn-danger btn-small";
      btnDelete.addEventListener("click", async () => {
        const ok = window.confirm("Delete this line permanently?");
        if (!ok) return;
        try {
          await db.collection("inventory_entries").doc(doc.id).delete();
          showToast("Line deleted.");
        } catch (err) {
          console.error(err);
          showToast("Delete failed.");
        }
      });
      tdDelete.appendChild(btnDelete);

      tr.appendChild(tdIdx);
      tr.appendChild(tdMat);
      tr.appendChild(tdDesc);
      tr.appendChild(tdBarcode);
      tr.appendChild(tdWh);
      tr.appendChild(tdZone);
      tr.appendChild(tdBin);
      tr.appendChild(tdBatch);
      tr.appendChild(tdQty);
      tr.appendChild(tdEdit);
      tr.appendChild(tdDelete);

      detailTableBody.appendChild(tr);
    });
  }

  closeDetailBtn.addEventListener("click", () => {
    sessionDetailCard.style.display = "none";
    currentSessionKey = null;
  });

  function buildExcelTable(rows) {
    let html = "<table border='1'><thead><tr>";
    rows[0].forEach((header) => {
      html += "<th>" + String(header).replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</th>";
    });
    html += "</tr></thead><tbody>";
    for (let i = 1; i < rows.length; i++) {
      html += "<tr>";
      rows[i].forEach((cell) => {
        html += "<td>" + String(cell).replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</td>";
      });
      html += "</tr>";
    }
    html += "</tbody></table>";
    return html;
  }

  exportSessionBtn.addEventListener("click", () => {
    const group = groupedSessions[currentSessionKey];
    if (!group) {
      showToast("No session selected.");
      return;
    }
    const rows = [];
    rows.push([
      "Device",
      "Warehouse",
      "Zone",
      "StorageBin",
      "MaterialCode",
      "MaterialDescription",
      "Barcode",
      "Batch",
      "Qty",
      "CreatedAt",
    ]);
    group.docs.forEach((doc) => {
      const d = doc.data();
      const createdAt =
        d.createdAt && d.createdAt.toDate
          ? d.createdAt.toDate().toISOString()
          : "";
      rows.push([
        d.deviceId || "",
        d.warehouse || "",
        d.zone || "",
        d.storageBin || "",
        d.materialCode || "",
        d.materialDesc || "",
        d.barcode || "",
        d.batch || "",
        d.qty != null ? d.qty : "",
        createdAt,
      ]);
    });

    const html = buildExcelTable(rows);
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fileName =
      "UPC_Inventory_" +
      (group.deviceId || "DEV") +
      "_" +
      (group.warehouse || "WH") +
      "_" +
      (group.zone || "ZONE") +
      "_" +
      (group.storageBin || "BIN") +
      ".xls";
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  exportAllBtn.addEventListener("click", () => {
    if (!allEntries || allEntries.length === 0) {
      showToast("No data to export.");
      return;
    }
    const rows = [];
    rows.push([
      "Device",
      "Warehouse",
      "Zone",
      "StorageBin",
      "MaterialCode",
      "MaterialDescription",
      "Barcode",
      "Batch",
      "Qty",
      "CreatedAt",
    ]);
    allEntries.forEach((doc) => {
      const d = doc.data();
      const createdAt =
        d.createdAt && d.createdAt.toDate
          ? d.createdAt.toDate().toISOString()
          : "";
      rows.push([
        d.deviceId || "",
        d.warehouse || "",
        d.zone || "",
        d.storageBin || "",
        d.materialCode || "",
        d.materialDesc || "",
        d.barcode || "",
        d.batch || "",
        d.qty != null ? d.qty : "",
        createdAt,
      ]);
    });

    const html = buildExcelTable(rows);
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "UPC_Inventory_ALL.xls";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  adminLoginBtn.addEventListener("click", () => {
    const u = adminUserInput.value.trim();
    const p = adminPassInput.value.trim();
    if (u === "superadmin" && p === "123456") {
      setLoggedIn();
      showToast("Login successful.");
      openDashboard();
    } else {
      showToast("Invalid credentials. Use superadmin / 123456.");
    }
  });

  function openDashboard() {
    loginCard.style.display = "none";
    adminDashboardCard.style.display = "block";
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    unsubscribe = db
      .collection("inventory_entries")
      .orderBy("createdAt", "asc")
      .onSnapshot(
        (snapshot) => {
          allEntries = snapshot.docs;
          renderSessions();
          if (currentSessionKey) {
            renderSessionDetail();
          }
        },
        (err) => {
          console.error(err);
          showToast("Error reading Firestore. Check config / rules.");
        }
      );
  }

  // Auto-login if previously logged in
  if (isLoggedIn()) {
    openDashboard();
  }
})();
