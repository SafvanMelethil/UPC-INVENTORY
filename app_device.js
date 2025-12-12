(function () {
  const sessionCard = document.getElementById("session-card");
  const scanCard = document.getElementById("scan-card");
  const startSessionBtn = document.getElementById("startSessionBtn");
  const sessionInfoBadge = document.getElementById("sessionInfoBadge");

  const deviceIdInput = document.getElementById("deviceId");
  const warehouseInput = document.getElementById("warehouse");
  const zoneInput = document.getElementById("zone");
  const storageBinInput = document.getElementById("storageBin");

  const barcodeInput = document.getElementById("barcodeInput");
  const findMaterialBtn = document.getElementById("findMaterialBtn");

  const materialCodeInput = document.getElementById("materialCode");
  const materialDescInput = document.getElementById("materialDesc");
  const confirmedBarcodeInput = document.getElementById("confirmedBarcode");
  const batchInput = document.getElementById("batch");
  const qtyInput = document.getElementById("qty");

  const verifyBtn = document.getElementById("verifyBtn");
  const editBtn = document.getElementById("editBtn");
  const saveBtn = document.getElementById("saveBtn");

  // Popup elements (must exist in device.html)
  const successModal = document.getElementById("successModal");
  const popMaterial = document.getElementById("popMaterial");
  const popDesc = document.getElementById("popDesc");
  const popQty = document.getElementById("popQty");
  const popEditBtn = document.getElementById("popEditBtn");
  const popSaveBtn = document.getElementById("popSaveBtn");

  let currentSession = null;

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // Decode plain barcode OR GS1 QR like:
  // 0106297000859002211ACH0W6N3C 1015DX1A 17270228
  function decodeBarcodeOrQR(raw) {
    if (!raw) return { barcode: "", batch: "" };

    let value = String(raw).trim();
    if (!value) return { barcode: "", batch: "" };

    // Remove trailing .0 (Excel-style)
    if (value.endsWith(".0")) value = value.slice(0, -2);

    // If only digits, treat as normal barcode
    if (/^\d+$/.test(value)) return { barcode: value, batch: "" };

    const compact = value.replace(/\s+/g, "");
    let barcode = "";
    let batch = "";

    // AI 01 = GTIN (14 digits)
    const m01 = compact.match(/01(\d{14})/);
    if (m01) {
      barcode = m01[1];
      // Convert 14-digit GTIN starting with 0 to 13-digit
      if (barcode.length === 14 && barcode[0] === "0") barcode = barcode.slice(1);
    }

    // AI 10 = batch/lot (variable length)
    // Here, your scanner output has spaces, so take until next space
    const m10 = value.match(/10([^\s]+)/);
    if (m10) batch = m10[1];

    // Fallback: if not decoded, return raw value as barcode
    if (!barcode) barcode = value;

    return { barcode, batch };
  }

  function getMasterMap(warehouseCode) {
    switch (warehouseCode) {
      case "M02":
        return typeof MEDICINE_DATA !== "undefined" ? MEDICINE_DATA : {};
      case "C02":
        return typeof COSMETIC_DATA !== "undefined" ? COSMETIC_DATA : {};
      case "D02":
        return typeof DIAPER_DATA !== "undefined" ? DIAPER_DATA : {};
      case "K02":
        return typeof MILK_DATA !== "undefined" ? MILK_DATA : {};
      default:
        return {};
    }
  }

  function updateSessionBadge() {
    if (!currentSession) return;
    sessionInfoBadge.textContent =
      currentSession.deviceId +
      " • " +
      currentSession.warehouse +
      " • " +
      currentSession.zone +
      " • " +
      currentSession.storageBin;
  }

  // ---------- Popup Controls ----------
  function openConfirmPopup() {
    if (!successModal) {
      showToast("Popup not found in device.html");
      return;
    }

    popMaterial.textContent = materialCodeInput.value.trim() || "-";
    popDesc.textContent = materialDescInput.value.trim() || "-";
    popQty.textContent = qtyInput.value.trim() || "-";

    successModal.style.display = "flex";
  }

  function closeConfirmPopup() {
    if (!successModal) return;
    successModal.style.display = "none";
  }

  // Close when clicking backdrop
  if (successModal) {
    successModal.addEventListener("click", (e) => {
      if (e.target === successModal) closeConfirmPopup();
    });
  }

  // ---------- Session Start ----------
  startSessionBtn.addEventListener("click", () => {
    const deviceId = deviceIdInput.value.trim();
    const warehouse = warehouseInput.value;
    const zone = zoneInput.value.trim();
    const storageBin = storageBinInput.value.trim();

    if (!deviceId || !warehouse || !zone || !storageBin) {
      showToast("Please fill Device, Warehouse, Zone and Storage Bin first.");
      return;
    }

    currentSession = { deviceId, warehouse, zone, storageBin };
    updateSessionBadge();

    sessionCard.style.display = "none";
    scanCard.style.display = "block";
    barcodeInput.focus();
  });

  // ---------- Lookup Material ----------
  function lookupMaterial() {
    if (!currentSession) {
      showToast("Start a session first (Device, Warehouse, Zone, Bin).");
      return;
    }

    const raw = barcodeInput.value.trim();
    if (!raw) {
      showToast("Scan or type a barcode / QR first.");
      return;
    }

    const decoded = decodeBarcodeOrQR(raw);
    const barcode = decoded.barcode;
    const batchFromQR = decoded.batch;

    confirmedBarcodeInput.value = barcode;

    // Auto-fill batch from QR if empty
    if (batchFromQR && !batchInput.value.trim()) {
      batchInput.value = batchFromQR;
    }

    const master = getMasterMap(currentSession.warehouse);
    const found = master[barcode];

    if (found) {
      materialCodeInput.value = found.material;
      materialDescInput.value = found.description;
      materialCodeInput.readOnly = true;
      materialDescInput.readOnly = true;
      showToast("Material found – auto filled.");
    } else {
      const proceed = window.confirm(
        "Item not found in database for this warehouse.\nDo you want to enter Material Code & Description manually?"
      );
      if (proceed) {
        materialCodeInput.value = "";
        materialDescInput.value = "";
        materialCodeInput.readOnly = false;
        materialDescInput.readOnly = false;
        materialCodeInput.focus();
      } else {
        materialCodeInput.value = "";
        materialDescInput.value = "";
        confirmedBarcodeInput.value = "";
      }
    }
  }

  findMaterialBtn.addEventListener("click", lookupMaterial);
  barcodeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      lookupMaterial();
    }
  });

  // ---------- Verify / Edit (form) ----------
  verifyBtn.addEventListener("click", () => {
    if (!currentSession) {
      showToast("Start a session first.");
      return;
    }
    materialCodeInput.readOnly = true;
    materialDescInput.readOnly = true;
    batchInput.readOnly = true;
    qtyInput.readOnly = true;
    showToast("Verify mode: values locked. Tap Edit to adjust.");
  });

  editBtn.addEventListener("click", () => {
    materialCodeInput.readOnly = false;
    materialDescInput.readOnly = false;
    batchInput.readOnly = false;
    qtyInput.readOnly = false;
    showToast("Fields unlocked for editing.");
  });

  // ---------- Save Line (opens popup ONLY) ----------
  saveBtn.addEventListener("click", () => {
    if (!currentSession) {
      showToast("Start a session first.");
      return;
    }

    const materialCode = materialCodeInput.value.trim();
    const materialDesc = materialDescInput.value.trim();
    const barcode = confirmedBarcodeInput.value.trim() || barcodeInput.value.trim();
    const batch = batchInput.value.trim();
    const qty = Number(qtyInput.value || 0);

    if (!barcode) return showToast("Scan barcode / QR first.");
    if (!materialCode || !materialDesc) return showToast("Material code & description required.");
    if (!batch) return showToast("Batch is required.");
    if (!qty || Number.isNaN(qty) || qty <= 0) return showToast("Quantity must be a positive number.");

    openConfirmPopup();
  });

  // ---------- Popup EDIT ----------
  if (popEditBtn) {
    popEditBtn.addEventListener("click", () => {
      closeConfirmPopup();

      // Enable editing for SAME entry
      barcodeInput.readOnly = false;
      materialCodeInput.readOnly = false;
      materialDescInput.readOnly = false;
      batchInput.readOnly = false;
      qtyInput.readOnly = false;

      qtyInput.focus();
    });
  }

  // ---------- Popup SAVE (only here we save to Firebase) ----------
  if (popSaveBtn) {
    popSaveBtn.addEventListener("click", async () => {
      if (!currentSession) {
        showToast("Start a session first.");
        return;
      }

      // take latest values after any edits
      const materialCode = materialCodeInput.value.trim();
      const materialDesc = materialDescInput.value.trim();
      const barcode = confirmedBarcodeInput.value.trim() || barcodeInput.value.trim();
      const batch = batchInput.value.trim();
      const qty = Number(qtyInput.value || 0);

      if (!barcode) return showToast("Barcode required.");
      if (!materialCode || !materialDesc) return showToast("Material required.");
      if (!batch) return showToast("Batch required.");
      if (!qty || Number.isNaN(qty) || qty <= 0) return showToast("Invalid quantity.");

      const sessionKey =
        currentSession.deviceId +
        "|" +
        currentSession.warehouse +
        "|" +
        currentSession.zone +
        "|" +
        currentSession.storageBin;

      const payload = {
        deviceId: currentSession.deviceId,
        warehouse: currentSession.warehouse,
        zone: currentSession.zone,
        storageBin: currentSession.storageBin,
        sessionKey,
        materialCode,
        materialDesc,
        barcode,
        batch,
        qty,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      try {
        await db.collection("inventory_entries").add(payload);

        closeConfirmPopup();
        showToast("Saved to admin dashboard.");

        // Clear for next entry
        barcodeInput.value = "";
        confirmedBarcodeInput.value = "";
        batchInput.value = "";
        qtyInput.value = "";
        materialCodeInput.value = "";
        materialDescInput.value = "";

        materialCodeInput.readOnly = false;
        materialDescInput.readOnly = false;
        batchInput.readOnly = false;
        qtyInput.readOnly = false;

        barcodeInput.focus();
      } catch (err) {
        console.error(err);
        showToast("Save failed. Check Firebase rules / internet.");
      }
    });
  }
})();
