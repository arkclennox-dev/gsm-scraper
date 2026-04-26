(function () {
  const form = document.getElementById("scrape-form");
  const jobsList = document.getElementById("jobs");
  const filesTable = document.querySelector("#files tbody");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const mode = data.get("mode");
    const payload = {
      output: data.get("output") || "json",
      limit: data.get("limit") || null,
      resume: data.get("resume") ? "1" : "",
    };
    if (mode === "brand") payload.brand = data.get("brand");
    if (mode === "url") payload.url = data.get("url");
    if (mode === "all") payload.all = "1";

    const res = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      alert(body.error || "Failed to start scrape");
      return;
    }
    addJob(body.job_id, payload.brand || payload.url || "all");
    pollJob(body.job_id);
  });

  function addJob(id, label) {
    if (jobsList.querySelector('li[data-job-id="' + id + '"]')) return;
    const li = document.createElement("li");
    li.dataset.jobId = id;
    li.innerHTML =
      "<strong>" +
      escapeHtml(label) +
      '</strong> <span class="status status-pending">pending</span> ' +
      '<span class="progress">0/0</span>';
    jobsList.prepend(li);
  }

  async function pollJob(id) {
    const li = jobsList.querySelector('li[data-job-id="' + id + '"]');
    if (!li) return;
    const statusEl = li.querySelector(".status");
    const progressEl = li.querySelector(".progress");

    while (true) {
      const res = await fetch("/api/jobs/" + id);
      if (!res.ok) {
        statusEl.textContent = "error";
        statusEl.className = "status status-error";
        return;
      }
      const job = await res.json();
      statusEl.textContent = job.status;
      statusEl.className = "status status-" + job.status;
      progressEl.textContent = job.progress + "/" + job.total;
      if (job.status === "complete" || job.status === "error") {
        if (job.summary) {
          progressEl.textContent =
            job.summary.scraped + " ok / " + job.summary.failed + " failed";
        }
        await refreshFiles();
        return;
      }
      await sleep(1500);
    }
  }

  async function refreshFiles() {
    const res = await fetch("/api/files");
    if (!res.ok) return;
    const body = await res.json();
    filesTable.innerHTML = "";
    if (!body.files.length) {
      filesTable.innerHTML =
        '<tr><td colspan="4" class="muted">No outputs yet.</td></tr>';
      return;
    }
    for (const file of body.files) {
      const row = document.createElement("tr");
      row.innerHTML =
        "<td><code>" +
        escapeHtml(file.name) +
        "</code></td>" +
        "<td>" +
        (file.size / 1024).toFixed(1) +
        " KB</td>" +
        "<td>" +
        new Date(file.modified * 1000).toLocaleString() +
        "</td>" +
        '<td><a href="/download/' +
        encodeURIComponent(file.name) +
        '">download</a></td>';
      filesTable.appendChild(row);
    }
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[ch]);
  }
})();
