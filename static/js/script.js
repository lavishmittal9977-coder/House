(() => {
  const form = document.getElementById("form");
  const submitBtn = document.getElementById("submit");
  const resetBtn = document.getElementById("reset");
  const placeholder = document.getElementById("placeholder");
  const output = document.getElementById("output");
  const errorBox = document.getElementById("error");
  const $ = (id) => document.getElementById(id);

  const NUMERIC = ["BHK", "Area_sqft", "Bathrooms", "Age_Years", "Parking",
                   "Road_Width_ft", "Distance_Main_Road_km", "Floor"];
  const CATEGORICAL = ["Locality", "Property_Type", "Furnishing"];

  const fillSelect = (id, items) => {
    $(id).innerHTML = items.map((v) => `<option value="${v}">${v}</option>`).join("");
  };

  async function loadOptions() {
    try {
      const res = await fetch("/api/options");
      const data = await res.json();
      fillSelect("Locality", data.localities);
      fillSelect("Property_Type", data.property_types);
      fillSelect("Furnishing", data.furnishings);
      Object.entries(data.limits).forEach(([name, l]) => {
        const el = $(name);
        if (el) { el.min = l.min; el.max = l.max; }
      });
      $("Locality").value = "Vijay Nagar";
      $("Furnishing").value = "Semi-Furnished";
    } catch {
      showError("Could not reach the server. Is Flask running?");
    }
  }

  function clearErrors() {
    errorBox.hidden = true;
    form.querySelectorAll(".field").forEach((f) => {
      f.classList.remove("invalid");
      f.querySelector(".err").textContent = "";
    });
  }

  function setFieldError(name, msg) {
    const field = $(name)?.closest(".field");
    if (!field) return;
    field.classList.add("invalid");
    field.querySelector(".err").textContent = msg;
  }

  function showError(msg) {
    output.hidden = true;
    placeholder.hidden = true;
    errorBox.textContent = msg;
    errorBox.hidden = false;
  }

  function collect() {
    const payload = {};
    CATEGORICAL.forEach((n) => (payload[n] = $(n).value));
    NUMERIC.forEach((n) => (payload[n] = $(n).value === "" ? null : Number($(n).value)));
    return payload;
  }

  // Client-side check so users get instant feedback; server re-validates.
  function clientValidate(payload) {
    let ok = true;
    NUMERIC.forEach((n) => {
      const el = $(n);
      const v = payload[n];
      if (v === null || Number.isNaN(v)) { setFieldError(n, "Required."); ok = false; return; }
      if (el.min !== "" && v < Number(el.min)) { setFieldError(n, `Min ${el.min}.`); ok = false; }
      else if (el.max !== "" && v > Number(el.max)) { setFieldError(n, `Max ${el.max}.`); ok = false; }
      else if (el.step === "1" && !Number.isInteger(v)) { setFieldError(n, "Whole number only."); ok = false; }
    });
    return ok;
  }

  const inr = new Intl.NumberFormat("en-IN");

  function lakhToWords(l) {
    if (l >= 100) return `≈ ₹${(l / 100).toFixed(2)} Crore`;
    return `≈ ₹${inr.format(Math.round(l * 100000))}`;
  }

  function render(d) {
    const i = d.inputs;
    $("price").textContent = d.price_lakh.toFixed(2);
    $("priceWords").textContent = lakhToWords(d.price_lakh);
    $("ppsf").textContent = `₹${inr.format(d.price_per_sqft)}`;
    $("sLocality").textContent = i.Locality;
    $("sType").textContent = `${i.Property_Type} · ${i.Furnishing}`;
    $("sConfig").textContent = `${i.BHK} BHK · ${inr.format(i.Area_sqft)} sq ft`;
    placeholder.hidden = true;
    errorBox.hidden = true;
    output.hidden = false;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();
    const payload = collect();
    if (!clientValidate(payload)) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Predicting…";
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fields) Object.entries(data.fields).forEach(([k, m]) => setFieldError(k, m));
        showError(data.error || "Something went wrong.");
        return;
      }
      render(data);
    } catch {
      showError("Network error. Please check the server and try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Predict price";
    }
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    $("Locality").value = "Vijay Nagar";
    $("Furnishing").value = "Semi-Furnished";
    clearErrors();
    output.hidden = true;
    placeholder.hidden = false;
  });

  loadOptions();
})();
