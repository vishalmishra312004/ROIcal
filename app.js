(() => {
  "use strict";

  const currencies = {
    INR: { symbol: "₹", locale: "en-IN" },
    USD: { symbol: "$", locale: "en-US" },
    EUR: { symbol: "€", locale: "de-DE" },
  };
  const defaults = {
    spend: 400000, duration: 4, spots: 180, audience: 30000, universe: 10000000, reach: 18,
    visitsBase: 8000, visitsCampaign: 10400,
    searchBase: 3000, searchCampaign: 3900,
    leadsBase: 120, leadsCampaign: 150,
    footfallBase: 900, footfallCampaign: 1140,
    sales: 30, orderValue: 50000, margin: 30,
  };
  const fields = Object.fromEntries(
    Object.keys(defaults).map((name) => [name, document.getElementById(name)])
  );
  const storageKey = "mirchi-radio-planner-v1";
  const numberFormats = Object.fromEntries(
    Object.entries(currencies).map(([key, value]) => [
      key,
      new Intl.NumberFormat(value.locale, { maximumFractionDigits: 0 }),
    ])
  );
  let currency = "INR";
  let latest = {};

  const value = (name) => {
    const field = fields[name];
    if (!field) return 0;
    const parsed = Number(field.value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };
  const formatNumber = (number) => numberFormats[currency].format(Number.isFinite(number) ? number : 0);
  const formatMoney = (number) => formatNumber(number);
  const setText = (id, text) => {
    document.getElementById(id).textContent = text;
  };
  const compact = (number) => {
    if (!Number.isFinite(number)) return "0";
    if (currency === "INR") {
      if (number >= 10000000) return (number / 10000000).toFixed(number >= 100000000 ? 0 : 1).replace(/\.0$/, "") + "Cr";
      if (number >= 100000) return (number / 100000).toFixed(number >= 1000000 ? 0 : 1).replace(/\.0$/, "") + "L";
      if (number >= 1000) return (number / 1000).toFixed(number >= 10000 ? 0 : 1).replace(/\.0$/, "") + "K";
      return formatNumber(number);
    }
    if (number >= 1000000) return (number / 1000000).toFixed(number >= 10000000 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (number >= 1000) return (number / 1000).toFixed(number >= 10000 ? 0 : 1).replace(/\.0$/, "") + "K";
    return formatNumber(number);
  };

  function renderComparison(name, baseline, campaign) {
    const row = document.querySelector('[data-comparison="' + name + '"]');
    const max = Math.max(baseline, campaign);
    const baseWidth = max > 0 ? (baseline / max) * 100 : 0;
    const campaignWidth = max > 0 ? (campaign / max) * 100 : 0;
    row.querySelector(".baseline-bar").style.width = baseWidth + "%";
    row.querySelector(".campaign-bar").style.width = campaignWidth + "%";
    row.querySelector(".base-value").textContent = formatNumber(baseline);
    row.querySelector(".campaign-value").textContent = formatNumber(campaign);
    const change = baseline > 0 ? ((campaign - baseline) / baseline) * 100 : null;
    const changeLabel = change === null ? "—" : (change > 0 ? "+" : "") + change.toFixed(1) + "%";
    const changeElement = row.querySelector(".change-value");
    changeElement.textContent = changeLabel;
    changeElement.classList.toggle("negative", change !== null && change < 0);
    changeElement.classList.toggle("positive", change !== null && change >= 0);
    row.setAttribute("aria-label", row.querySelector(".metric-name").textContent.trim() + ": baseline " +
      formatNumber(baseline) + ", campaign " + formatNumber(campaign) + ", change " + changeLabel);
  }

  function renderMoneyChart(spend, contribution, revenue) {
    const highest = Math.max(spend, contribution, revenue, 1);
    [
      ["spend", spend],
      ["contribution", contribution],
      ["revenue", revenue],
    ].forEach(([name, amount]) => {
      const row = document.querySelector('[data-money-row="' + name + '"]');
      row.querySelector(".money-value").textContent = currencies[currency].symbol + formatMoney(amount);
      row.querySelector("i > span").style.width = Math.max(amount > 0 ? 1 : 0, (amount / highest) * 100) + "%";
      row.setAttribute("aria-label", row.querySelector("div > span").textContent + ": " + currencies[currency].symbol + formatMoney(amount));
    });
  }

  function restoreScenario() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (!saved || typeof saved !== "object") return;

      Object.keys(defaults).forEach((name) => {
        const input = fields[name];
        const savedValue = saved.inputs && saved.inputs[name];
        if (savedValue === "") {
          input.value = "";
          return;
        }
        const parsed = Number(savedValue);
        if (!Number.isFinite(parsed)) return;
        const min = input.min === "" ? -Infinity : Number(input.min);
        const max = input.max === "" ? Infinity : Number(input.max);
        input.value = String(Math.max(min, Math.min(max, parsed)));
      });

      ["objective", "category"].forEach((name) => {
        const select = document.getElementById(name);
        const savedValue = saved[name];
        if (Array.from(select.options).some((option) => option.value === savedValue)) select.value = savedValue;
      });
      if (currencies[saved.currency]) currency = saved.currency;
      document.querySelectorAll("[data-symbol]").forEach((node) => {
        node.textContent = currencies[currency].symbol;
      });
      document.querySelectorAll("[data-currency-choice]").forEach((button) => {
        const selected = button.dataset.currencyChoice === currency;
        button.setAttribute("aria-pressed", String(selected));
        button.classList.toggle("selected", selected);
      });
    } catch (error) {
      console.warn("Unable to restore the saved scenario.", error);
    }
  }

  function saveScenario() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        inputs: Object.fromEntries(Object.entries(fields).map(([name, input]) => [name, input.value])),
        objective: document.getElementById("objective").value,
        category: document.getElementById("category").value,
        currency,
      }));
    } catch (error) {
      console.warn("Unable to save the scenario.", error);
    }
  }

  function calculate() {
    const spend = value("spend");
    const spots = value("spots");
    const audience = value("audience");
    const universe = value("universe");
    const netReach = universe * Math.min(value("reach"), 100) / 100;
    const impressions = spots * audience;
    const frequency = netReach > 0 ? impressions / netReach : 0;
    const grps = universe > 0 ? (impressions / universe) * 100 : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    const sales = value("sales");
    const revenue = sales * value("orderValue");
    const contribution = revenue * Math.min(value("margin"), 100) / 100;
    const roi = spend > 0 ? ((contribution - spend) / spend) * 100 : null;
    const roas = spend > 0 ? revenue / spend : null;
    const leads = value("leadsCampaign");
    const cpl = leads > 0 ? spend / leads : 0;

    setText("impressions", compact(impressions));
    setText("reach-people", compact(netReach));
    setText("frequency", frequency.toFixed(1) + "×");
    setText("grps", formatNumber(grps));
    setText("revenue", formatMoney(revenue));
    setText("contribution", formatMoney(contribution));
    setText("cpm", formatMoney(cpm));
    setText("cpl", formatMoney(cpl));
    setText("roi", roi === null ? "—" : (roi > 0 ? "+" : "") + roi.toFixed(1) + "%");
    setText("roas", roas === null ? "—" : roas.toFixed(2) + "×");
    const roiStatus = document.getElementById("roi-status");
    roiStatus.replaceChildren();
    const statusLines = roi === null ? ["enter", "campaign spend"] : roi >= 0 ? ["positive", "scenario"] : ["below spend", "scenario"];
    roiStatus.append(statusLines[0], document.createElement("br"), statusLines[1]);
    roiStatus.classList.toggle("negative", roi !== null && roi < 0);

    const objective = document.getElementById("objective");
    const objectiveName = objective.options[objective.selectedIndex].text.split(" — ")[0].toUpperCase();
    const category = document.getElementById("category");
    const categoryName = category.options[category.selectedIndex].text.toUpperCase();
    setText("objective-tag", categoryName + " / " + objectiveName + " / " + value("duration") + "W");

    renderComparison("visits", value("visitsBase"), value("visitsCampaign"));
    renderComparison("search", value("searchBase"), value("searchCampaign"));
    renderComparison("leads", value("leadsBase"), value("leadsCampaign"));
    renderComparison("footfall", value("footfallBase"), value("footfallCampaign"));
    renderMoneyChart(spend, contribution, revenue);

    latest = { spend, spots, audience, universe, netReach, impressions, frequency, grps, cpm, revenue, contribution, roi, roas, cpl, sales, leads };
  }

  function setCurrency(nextCurrency) {
    if (!currencies[nextCurrency]) return;
    currency = nextCurrency;
    document.querySelectorAll("[data-symbol]").forEach((node) => {
      node.textContent = currencies[currency].symbol;
    });
    document.querySelectorAll("[data-currency-choice]").forEach((button) => {
      const selected = button.dataset.currencyChoice === currency;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("selected", selected);
    });
    calculate();
    saveScenario();
  }

  restoreScenario();
  Object.values(fields).forEach((field) => field.addEventListener("input", () => {
    calculate();
    saveScenario();
  }));
  document.getElementById("radio-form").addEventListener("submit", (event) => event.preventDefault());
  document.getElementById("objective").addEventListener("change", () => {
    calculate();
    saveScenario();
  });
  document.getElementById("category").addEventListener("change", () => {
    calculate();
    saveScenario();
  });
  document.querySelectorAll("[data-currency-choice]").forEach((button) => {
    button.addEventListener("click", () => setCurrency(button.dataset.currencyChoice));
  });

  document.getElementById("reset-scenario").addEventListener("click", () => {
    Object.entries(defaults).forEach(([name, defaultValue]) => {
      fields[name].value = String(defaultValue);
    });
    document.getElementById("objective").value = "leads";
    document.getElementById("category").value = "retail";
    setCurrency("INR");
  });

  const csvCell = (entry) => '"' + String(entry).replace(/"/g, '""') + '"';
  document.getElementById("download-report").addEventListener("click", () => {
    const rows = [
      ["Mirchi radio effectiveness planner"],
      ["Currency", currency],
      ["Advertiser category", document.getElementById("category").selectedOptions[0].text],
      ["Primary objective", document.getElementById("objective").selectedOptions[0].text],
      ["Duration (weeks)", value("duration")],
      ["Campaign spend", latest.spend],
      ["Spots aired", latest.spots],
      ["Average audience per spot", latest.audience],
      ["Target audience universe", latest.universe],
      ["Estimated net reach", latest.netReach],
      ["Gross impressions", latest.impressions],
      ["Average frequency", latest.frequency.toFixed(2)],
      ["GRPs", latest.grps.toFixed(2)],
      ["Cost per thousand impressions", latest.cpm.toFixed(2)],
      ["Attributed sales", latest.sales],
      ["Attributed revenue", latest.revenue],
      ["Gross contribution", latest.contribution],
      ["Modeled ROI (%)", latest.roi === null ? "Not available: campaign spend is zero" : latest.roi.toFixed(2)],
      ["ROAS", latest.roas === null ? "Not available: campaign spend is zero" : latest.roas.toFixed(2)],
      ["Campaign enquiries", latest.leads],
      ["Cost per campaign enquiry", latest.cpl.toFixed(2)],
      [],
      ["Observed outcome", "Baseline", "Campaign", "Change (%)"],
      ["Website visits", value("visitsBase"), value("visitsCampaign"), percentChange(value("visitsBase"), value("visitsCampaign"))],
      ["Brand searches", value("searchBase"), value("searchCampaign"), percentChange(value("searchBase"), value("searchCampaign"))],
      ["Enquiries / leads", value("leadsBase"), value("leadsCampaign"), percentChange(value("leadsBase"), value("leadsCampaign"))],
      ["Dealer / store visits", value("footfallBase"), value("footfallCampaign"), percentChange(value("footfallBase"), value("footfallCampaign"))],
      [],
      ["Note", "Illustrative planning model. Observed change is not proof of radio causation. Replace inputs and document the source and attribution method."],
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mirchi-radio-campaign-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  function percentChange(baseline, campaign) {
    return baseline > 0 ? (((campaign - baseline) / baseline) * 100).toFixed(1) : "No baseline";
  }

  const menuToggle = document.querySelector(".mobile-menu-toggle");
  const mobileNav = document.getElementById("mobile-navigation");
  const siteHeader = document.querySelector(".site-header");
  const setMobileNavOpen = (open, returnFocus = false) => {
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    mobileNav.hidden = !open;
    if (returnFocus) menuToggle.focus();
  };

  menuToggle.addEventListener("click", () => {
    const opening = menuToggle.getAttribute("aria-expanded") !== "true";
    setMobileNavOpen(opening);
  });
  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMobileNavOpen(false));
  });
  document.addEventListener("click", (event) => {
    if (menuToggle.getAttribute("aria-expanded") === "true" && !siteHeader.contains(event.target)) {
      setMobileNavOpen(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || menuToggle.getAttribute("aria-expanded") !== "true") return;
    setMobileNavOpen(false, true);
  });
  window.matchMedia("(min-width: 761px)").addEventListener("change", (event) => {
    if (event.matches) setMobileNavOpen(false);
  });

  calculate();
})();
