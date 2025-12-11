
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

  let currentSession = null;
  let verifyMode = false;

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 2500);
  }

  // Decode either a plain barcode or a GS1-style QR string
  function decodeBarcodeOrQR(raw) {
    if (!raw) return { barcode: "", batch: "" };
    let value = raw.trim();
    if (!value) return { barcode: "", batch: "" };

    // Remove trailing .0 from Excel-style numbers
    if (value.endsWith(".0")) {
      value = value.slice(0, -2);
    }

    // If it's just digits, use as-is
    if (/^\d+$/.test(value)) {
      return { barcode: value, batch: "" };
    }

    // Try to parse GS1 style like:
    // 0106297000859002211ACH0W6N3C 1015DX1A 17270228
    const compact = value.replace(/\s+/g, "");
    let barcode = "";
    let batch = "";

    // Application Identifier 01 = GTIN (14 digits)
    const m01 = compact.match(/01(\d{14})/);
    if (m01) {
      barcode = m01[1];
      // Many times GTIN in GCC is 13 digits – remove leading 0 if present
      if (barcode.length === 14 && barcode[0] === "0") {
        barcode = barcode.slice(1);
      }
    }

    // Application Identifier 10 = batch/lot (variable length, here we take up to first space)
    const m10 = value.match(/10([^\s]+)/);
    if (m10) {
      batch = m10[1];
    }

    // Fallback – if we didn't decode anything, return original
    if (!barcode) {
      barcode = value;
    }

    return { barcode, batch };
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

  startSessionBtn.addEventListener("click", () => {
    const deviceId = deviceIdInput.value.trim();
    const warehouse = warehouseInput.value;
    const zone = zoneInput.value.trim();
    const storageBin = storageBinInput.value.trim();

    if (!deviceId || !warehouse || !zone || !storageBin) {
      showToast("Please fill Device, Warehouse, Zone and Storage Bin first.");
      return;
    }

    currentSession = {
      deviceId,
      warehouse,
      zone,
      storageBin,
    };
    updateSessionBadge();
    sessionCard.style.display = "none";
    scanCard.style.display = "block";
    barcodeInput.focus();
  });

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

    const master = getMasterMap(currentSession.warehouse);
    const found = master[barcode];

    confirmedBarcodeInput.value = barcode;

    // If QR contained batch and user hasn't typed any batch yet, pre-fill it
    if (batchFromQR && !batchInput.value.trim()) {
      batchInput.value = batchFromQR;
    }

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

  verifyBtn.addEventListener("click", () => {
    if (!currentSession) {
      showToast("Start a session first.");
      return;
    }
    verifyMode = true;
    materialCodeInput.readOnly = true;
    materialDescInput.readOnly = true;
    batchInput.readOnly = true;
    qtyInput.readOnly = true;
    showToast("Verify mode: values locked. Tap Edit to adjust.");
  });

  editBtn.addEventListener("click", () => {
    verifyMode = false;
    if (materialCodeInput.value) materialCodeInput.readOnly = false;
    if (materialDescInput.value) materialDescInput.readOnly = false;
    batchInput.readOnly = false;
    qtyInput.readOnly = false;
    showToast("Fields unlocked for editing.");
  });

  saveBtn.addEventListener("click", async () => {
    if (!currentSession) {
      showToast("Start a session first.");
      return;
    }
    const materialCode = materialCodeInput.value.trim();
    const materialDesc = materialDescInput.value.trim();
    const barcode = confirmedBarcodeInput.value.trim();
    const batch = batchInput.value.trim();
    const qtyStr = qtyInput.value.trim();
    const qty = qtyStr ? Number(qtyStr) : 0;

    if (!barcode) {
      showToast("Scan barcode / QR before saving.");
      return;
    }
    if (!materialCode || !materialDesc) {
      showToast("Material code & description are required.");
      return;
    }
    if (!batch) {
      showToast("Batch is required.");
      return;
    }
    if (!qty || Number.isNaN(qty) || qty <= 0) {
      showToast("Quantity must be a positive number.");
      return;
    }

    const sessionKey =
      currentSession.deviceId +
      "|" +
      currentSession.warehouse +
      "|" +
      currentSession.zone +
      "|" +
      currentSession.storageBin;

    try {
      await db.collection("inventory_entries").add({
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
      });
      showToast("Line saved to cloud.");
      barcodeInput.value = "";
      confirmedBarcodeInput.value = "";
      // Keep batch from QR? For safety, we clear to force confirmation each line
      // but if you prefer to repeat same batch, comment next line
      batchInput.value = "";
      qtyInput.value = "";
      materialCodeInput.value = "";
      materialDescInput.value = "";
      materialCodeInput.readOnly = false;
      materialDescInput.readOnly = false;
      barcodeInput.focus();
    } catch (err) {
      console.error(err);
      showToast("Error saving line. Check Firebase config / rules.");
    }
  });
})();
