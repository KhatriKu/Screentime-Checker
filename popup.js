chrome.storage.local.get(null, (items) => {
  const list = document.getElementById("time-list");

  const domains = Object.entries(items)
    .filter(([domain, value]) => typeof value === "number")
    .sort((a, b) => b[1] - a[1]);

  if (domains.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "empty-state";
    emptyState.textContent = "No websites tracked yet";
    list.appendChild(emptyState);
    return;
  }

  for (const [domain, seconds] of domains) {
    const mins = Math.floor(seconds / 60);

    const li = document.createElement("li");

    const logo = document.createElement("img");
    const domainUrl = domain.startsWith("http") ? domain : `https://${domain}`;
    logo.src = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(domainUrl)}`;
    logo.alt = `${domain} logo`;
    logo.className = "domain-logo";

    const label = document.createElement("span");
    label.textContent = `${domain}: ${mins} mins`;

    const blockSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-x">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M18 6l-12 12" />
        <path d="M6 6l12 12" />
      </svg>
    `;

    const unblockSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-check">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M5 12l5 5l10 -10" />
      </svg>
    `;

    const updateButtonState = (button, blocked) => {
      button.innerHTML = blocked ? unblockSvg : blockSvg;
      button.className = blocked ? "unblock-button" : "block-button";
    };

    const blockButton = document.createElement("button");
    blockButton.className = "block-button";
    blockButton.addEventListener("click", async () => {
      const blocked = await chrome.storage.local.get("blockedSites");
      const blockedSites = blocked.blockedSites || [];
      const nextBlockedSites = blockedSites.includes(domain)
        ? blockedSites.filter((item) => item !== domain)
        : [...blockedSites, domain];

      await chrome.storage.local.set({ blockedSites: nextBlockedSites });
      updateButtonState(blockButton, nextBlockedSites.includes(domain));
    });

    chrome.storage.local.get("blockedSites", (result) => {
      const blockedSites = result.blockedSites || [];
      updateButtonState(blockButton, blockedSites.includes(domain));
    });

    li.appendChild(logo);
    li.appendChild(label);
    li.appendChild(blockButton);
    list.appendChild(li);
  }
});