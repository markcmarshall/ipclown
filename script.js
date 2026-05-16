const API = {
  ipv4: "https://api.ipify.org?format=json",
  ipv6: "https://api6.ipify.org?format=json",
  details: (ip) => `https://ipwho.is/${encodeURIComponent(ip)}?security=1`,
  detailsFallback: (ip) => `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
};

const state = {
  ipv4: "",
  ipv6: "",
  isp: "",
  location: "",
  country: "",
  countryCode: "",
  asn: "",
  timezone: "",
  localTime: "",
  reverseDns: "",
  vpnProxy: "",
  hostingStatus: "",
  privacyFlags: [],
  userAgent: navigator.userAgent,
  screen: `${window.screen.width} x ${window.screen.height}`,
  language: navigator.language || "Unknown",
  browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown",
  timezoneMatch: "",
  cookies: navigator.cookieEnabled ? "Enabled" : "Disabled",
};

const elements = {
  toast: document.querySelector("#toast"),
  heroStatus: document.querySelector("#hero-status"),
  ipv4Address: document.querySelector("#ipv4-address"),
  ipv4Status: document.querySelector("#ipv4-status"),
  ipv6Address: document.querySelector("#ipv6-address"),
  ipv6Status: document.querySelector("#ipv6-status"),
  ipv6Detail: document.querySelector("#ipv6-detail"),
  isp: document.querySelector("#isp"),
  location: document.querySelector("#location"),
  country: document.querySelector("#country"),
  asn: document.querySelector("#asn"),
  timezone: document.querySelector("#timezone"),
  localTime: document.querySelector("#local-time"),
  reverseDns: document.querySelector("#reverse-dns"),
  vpnProxy: document.querySelector("#vpn-proxy"),
  hostingStatus: document.querySelector("#hosting-status"),
  privacyFlags: document.querySelector("#privacy-flags"),
  userAgent: document.querySelector("#user-agent"),
  screen: document.querySelector("#screen-size"),
  language: document.querySelector("#language"),
  browserTimezone: document.querySelector("#browser-timezone"),
  timezoneMatch: document.querySelector("#timezone-match"),
  cookies: document.querySelector("#cookies"),
  copyReport: document.querySelector("#copy-report"),
  manualCopy: document.querySelector("#manual-copy"),
  manualCopyText: document.querySelector("#manual-copy-text"),
  manualCopyClose: document.querySelector("#manual-copy-close"),
};

let toastTimer;

function setText(element, value, fallback = "Unknown") {
  element.textContent = value || fallback;
  element.classList.remove("loading");
}

function setField(element, value, note) {
  element.textContent = "";
  element.append(document.createTextNode(value || "Unknown"));

  if (note) {
    const helper = document.createElement("span");
    helper.textContent = note;
    element.append(helper);
  }
}

function setBadge(container, label, variant = "") {
  container.textContent = "";
  const badge = document.createElement("span");
  badge.className = `badge ${variant}`.trim();
  badge.textContent = label;
  container.append(badge);
}

function setBadgeList(container, items) {
  container.textContent = "";

  items.forEach((item) => {
    const badge = document.createElement("span");
    badge.className = `badge ${item.variant}`.trim();
    badge.textContent = item.label;
    container.append(badge);
  });
}

function setCountry(element, country, countryCode) {
  element.textContent = "";

  if (!country && !countryCode) {
    element.textContent = "Unknown";
    return;
  }

  const wrapper = document.createElement("span");
  wrapper.className = "country-value";

  const flag = document.createElement("span");
  flag.className = "country-flag";
  flag.setAttribute("aria-hidden", "true");
  flag.textContent = countryCodeToFlag(countryCode);

  const label = document.createElement("span");
  label.textContent = [country, countryCode].filter(Boolean).join(" ");

  if (flag.textContent) {
    wrapper.append(flag);
  }
  wrapper.append(label);
  element.append(wrapper);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("visible");
  }, 2600);
}

async function copyText(text, successMessage) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopy(text);
    }
    showToast(successMessage);
  } catch {
    try {
      fallbackCopy(text);
      showToast(successMessage);
    } catch {
      showManualCopy(text);
      showToast("Clipboard blocked. Manual copy is ready.");
    }
  }
}

function showManualCopy(text) {
  elements.manualCopyText.value = text;
  elements.manualCopy.hidden = false;
  elements.manualCopyText.focus();
  elements.manualCopyText.select();
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-999px";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Copy command failed");
  }
}

async function fetchJson(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function detectIp(kind) {
  const data = await fetchJson(API[kind]);
  if (!data.ip) {
    throw new Error(`No ${kind} address returned`);
  }
  return data.ip;
}

async function getIpDetails(ip) {
  try {
    const data = await fetchJson(API.details(ip));
    if (data.success === false) {
      throw new Error(data.message || "IP detail lookup failed");
    }
    return normalizeIpWhoDetails(data);
  } catch {
    const data = await fetchJson(API.detailsFallback(ip));
    if (data.error) {
      throw new Error(data.reason || "Fallback IP detail lookup failed");
    }
    return normalizeIpApiDetails(data);
  }
}

function normalizeIpWhoDetails(data) {
  const connection = data.connection || {};
  const timezone = data.timezone || {};
  const security = data.security || {};

  return {
    isp: connection.isp || connection.org || "",
    location: formatLocation(data.city, data.region, data.country_code),
    country: data.country || "",
    countryCode: data.country_code || "",
    asn: formatAsn(connection.asn, connection.org),
    timezone: timezone.id || "",
    reverseDns: connection.domain || "",
    security,
    hasSecurityData: Object.keys(security).length > 0,
  };
}

function normalizeIpApiDetails(data) {
  return {
    isp: data.org || "",
    location: formatLocation(data.city, data.region, data.country_code),
    country: data.country_name || "",
    countryCode: data.country_code || "",
    asn: [data.asn, data.org].filter(Boolean).join(" "),
    timezone: data.timezone || "",
    reverseDns: "",
    security: {},
    hasSecurityData: false,
  };
}

function formatLocation(city, region, countryCode) {
  return [city, region, countryCode]
    .filter(Boolean)
    .join(", ");
}

function formatAsn(asnValue, org) {
  const asn = asnValue ? String(asnValue) : "";
  const normalizedAsn = asn && asn.toUpperCase().startsWith("AS") ? asn : `AS${asn}`;
  return [normalizedAsn, org].filter(Boolean).join(" ");
}

function formatVpnProxy(security = {}) {
  if (security.tor) return { label: "Tor Wig", variant: "red" };
  if (security.vpn || security.proxy || security.anonymous) {
    return { label: "Behind the Curtain", variant: "red" };
  }
  if (security.hosting) return { label: "Hosting Tent", variant: "blue" };
  return { label: "Plain Face", variant: "green" };
}

function formatHostingStatus(security = {}, hasSecurityData = false) {
  if (!hasSecurityData) return { label: "Unknown", variant: "blue" };
  if (security.hosting) return { label: "Hosting Tent", variant: "blue" };
  return { label: "Residential-ish", variant: "green" };
}

function formatPrivacyFlags(security = {}, hasSecurityData = false) {
  if (!hasSecurityData) {
    return [{ label: "Privacy flags unavailable", variant: "blue" }];
  }

  const flags = [
    { key: "vpn", label: "VPN" },
    { key: "proxy", label: "Proxy" },
    { key: "tor", label: "Tor" },
    { key: "hosting", label: "Hosting" },
  ];

  return flags.map((flag) => ({
    label: `${flag.label}: ${security[flag.key] ? "Yes" : "No"}`,
    variant: security[flag.key] ? "red" : "green",
  }));
}

function countryCodeToFlag(countryCode) {
  if (!countryCode || !/^[a-z]{2}$/i.test(countryCode)) return "";
  return [...countryCode.toUpperCase()]
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function inferCountryCode(location) {
  const lastPart = String(location || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .pop();

  return /^[a-z]{2}$/i.test(lastPart || "") ? lastPart.toUpperCase() : "";
}

function formatLocalTime(timezone) {
  if (!timezone) return "";

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date());
  } catch {
    return "";
  }
}

function compareTimezones(ipTimezone) {
  if (!ipTimezone || !state.browserTimezone || state.browserTimezone === "Unknown") {
    return {
      value: "Unknown",
      note: "Not enough tent paperwork to compare.",
    };
  }

  if (ipTimezone === state.browserTimezone) {
    return {
      value: "Match",
      note: "Your shoes and tent are in the same timezone.",
    };
  }

  return {
    value: "Different",
    note: "Your shoes and tent are in different cities.",
  };
}

function updateBrowserDetails() {
  setText(elements.userAgent, state.userAgent);
  setText(elements.screen, state.screen);
  setText(elements.language, state.language);
  setText(elements.browserTimezone, state.browserTimezone);
  setField(elements.timezoneMatch, "Unknown", "Waiting on the IP timezone.");
  setText(elements.cookies, state.cookies);
}

function updateIpCard(kind, ip) {
  const address = kind === "ipv4" ? elements.ipv4Address : elements.ipv6Address;
  const status = kind === "ipv4" ? elements.ipv4Status : elements.ipv6Status;
  const button = document.querySelector(`[data-copy-target="${kind}"]`);

  if (ip) {
    setText(address, ip);
    setText(status, kind === "ipv6" ? "Second Act Detected" : "Detected");
    button.disabled = false;
    button.dataset.copyValue = ip;
    return;
  }

  const missingText =
    kind === "ipv6" ? "IPv6 did not fit in the tiny car." : "Could not detect IPv4.";
  setText(address, missingText);
  setText(status, "Not detected");
  button.disabled = true;
  button.dataset.copyValue = "";
}

function updateNetworkDetails(details) {
  const security = details.security || {};
  const privacy = formatVpnProxy(security);
  const hosting = formatHostingStatus(security, details.hasSecurityData);
  const timezoneComparison = compareTimezones(details.timezone);

  state.isp = details.isp || "";
  state.location = details.location || "";
  state.countryCode = details.countryCode || inferCountryCode(details.location);
  state.country = details.country || state.countryCode;
  state.asn = details.asn || "";
  state.timezone = details.timezone || "";
  state.localTime = formatLocalTime(state.timezone);
  state.reverseDns = details.reverseDns || "";
  state.vpnProxy = privacy.label;
  state.hostingStatus = hosting.label;
  state.privacyFlags = formatPrivacyFlags(security, details.hasSecurityData).map((flag) => flag.label);
  state.timezoneMatch = timezoneComparison.value;

  setText(elements.isp, state.isp);
  setText(elements.location, state.location);
  setCountry(elements.country, state.country, state.countryCode);
  setText(elements.asn, state.asn);
  setText(elements.timezone, state.timezone);
  setText(elements.localTime, state.localTime);
  setField(
    elements.reverseDns,
    state.reverseDns || "Unavailable",
    state.reverseDns ? "" : "No name tag on this clown."
  );
  setBadge(elements.vpnProxy, privacy.label, privacy.variant);
  setBadge(elements.hostingStatus, hosting.label, hosting.variant);
  setBadgeList(elements.privacyFlags, formatPrivacyFlags(security, details.hasSecurityData));
  setField(elements.timezoneMatch, timezoneComparison.value, timezoneComparison.note);
}

function updateSummary() {
  if (state.ipv4 && state.ipv6) {
    elements.heroStatus.textContent = "The clown has sniffed out two IPs.";
    elements.ipv6Detail.textContent = "Second Act Detected";
    return;
  }

  if (state.ipv4) {
    elements.heroStatus.textContent = "The clown found IPv4. IPv6 is still looking for its shoes.";
    elements.ipv6Detail.textContent = "IPv6 Missing Its Shoes";
    return;
  }

  if (state.ipv6) {
    elements.heroStatus.textContent = "The clown found IPv6. IPv4 missed the cannon.";
    elements.ipv6Detail.textContent = "IPv6 Only Act";
    return;
  }

  elements.heroStatus.textContent = "The clown could not sniff out an IP. The tent flap may be closed.";
  elements.ipv6Detail.textContent = "Not detected";
}

function buildReport() {
  return [
    "ipclown.com - Full Clown Report",
    `IPv4: ${state.ipv4 || "Not detected"}`,
    `IPv6: ${state.ipv6 || "Not detected - IPv6 did not fit in the tiny car."}`,
    `ISP: ${state.isp || "Unknown"}`,
    `Location: ${state.location || "Unknown"}`,
    `Country: ${[state.country, state.countryCode].filter(Boolean).join(" ") || "Unknown"}`,
    `ASN: ${state.asn || "Unknown"}`,
    `Timezone: ${state.timezone || "Unknown"}`,
    `Local Time: ${state.localTime || "Unknown"}`,
    `Reverse DNS: ${state.reverseDns || "Unavailable"}`,
    `VPN/Proxy: ${state.vpnProxy || "Unknown"}`,
    `Hosting: ${state.hostingStatus || "Unknown"}`,
    `Privacy Flags: ${state.privacyFlags.length ? state.privacyFlags.join(", ") : "Unknown"}`,
    `User Agent: ${state.userAgent}`,
    `Screen: ${state.screen}`,
    `Language: ${state.language}`,
    `Browser Timezone: ${state.browserTimezone}`,
    `Timezone Match: ${state.timezoneMatch || "Unknown"}`,
    `Cookies: ${state.cookies}`,
    "",
    "Approximate location only. We are clowns, not cartographers.",
  ].join("\n");
}

function bindCopyButtons() {
  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!button.dataset.copyValue) {
        showToast("Nothing to copy. That act is not on stage.");
        return;
      }

      const label = button.dataset.copyLabel;
      const message =
        label === "IPv6"
          ? "IPv6 cannon-launched to clipboard."
          : "IPv4 tucked into the tiny car.";

      copyText(button.dataset.copyValue, message);
    });
  });

  elements.copyReport.addEventListener("click", () => {
    copyText(buildReport(), "Full clown report copied. Try not to honk at work.");
  });

  elements.manualCopyClose.addEventListener("click", () => {
    elements.manualCopy.hidden = true;
  });
}

async function init() {
  updateBrowserDetails();
  bindCopyButtons();

  const [ipv4Result, ipv6Result] = await Promise.allSettled([
    detectIp("ipv4"),
    detectIp("ipv6"),
  ]);

  state.ipv4 = ipv4Result.status === "fulfilled" ? ipv4Result.value : "";
  state.ipv6 = ipv6Result.status === "fulfilled" ? ipv6Result.value : "";

  updateIpCard("ipv4", state.ipv4);
  updateIpCard("ipv6", state.ipv6);
  updateSummary();

  const primaryIp = state.ipv4 || state.ipv6;

  if (!primaryIp) {
    setText(elements.isp, "Unknown");
    setText(elements.location, "Unknown");
    setCountry(elements.country, "", "");
    setText(elements.asn, "Unknown");
    setText(elements.timezone, "Unknown");
    setText(elements.localTime, "Unknown");
    setField(elements.reverseDns, "Unavailable", "No name tag on this clown.");
    setBadge(elements.vpnProxy, "Unknown", "blue");
    setBadge(elements.hostingStatus, "Unknown", "blue");
    setBadgeList(elements.privacyFlags, [{ label: "Privacy flags unavailable", variant: "blue" }]);
    return;
  }

  try {
    const details = await getIpDetails(primaryIp);
    updateNetworkDetails(details);
  } catch {
    setText(elements.isp, "Unknown");
    setText(elements.location, "Unknown");
    setCountry(elements.country, "", "");
    setText(elements.asn, "Unknown");
    setText(elements.timezone, "Unknown");
    setText(elements.localTime, "Unknown");
    setField(elements.reverseDns, "Unavailable", "No name tag on this clown.");
    setBadge(elements.vpnProxy, "Lookup missed", "blue");
    setBadge(elements.hostingStatus, "Unknown", "blue");
    setBadgeList(elements.privacyFlags, [{ label: "Privacy flags unavailable", variant: "blue" }]);
  }
}

init();
