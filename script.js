(() => {
  "use strict";
  const STORAGE = {
    transactions: "bubuDudu.transactions.v1",
    budgets: "bubuDudu.budgets.v1",
    wallpaper: "bubuDudu.wallpaper.v1"
  };
  const categories = {
    income: [
      { value: "Gaji", label: "💼 Gaji" }, { value: "Bonus", label: "🎁 Bonus" },
      { value: "Bisnis", label: "🛍️ Bisnis" }, { value: "Investasi", label: "🌱 Investasi" },
      { value: "Hadiah", label: "🎀 Hadiah" }, { value: "Lainnya", label: "✨ Lainnya" }
    ],
    expense: [
      { value: "Makanan", label: "🍜 Makanan" }, { value: "Transportasi", label: "🚌 Transportasi" },
      { value: "Belanja", label: "🛍️ Belanja" }, { value: "Tagihan", label: "🧾 Tagihan" },
      { value: "Hiburan", label: "🎬 Hiburan" }, { value: "Kesehatan", label: "🌿 Kesehatan" },
      { value: "Pendidikan", label: "📚 Pendidikan" }, { value: "Tabungan", label: "🐷 Tabungan" },
      { value: "Lainnya", label: "✨ Lainnya" }
    ]
  };
  const categoryEmoji = { Gaji:"💼", Bonus:"🎁", Bisnis:"🛍️", Investasi:"🌱", Hadiah:"🎀", Makanan:"🍜", Transportasi:"🚌", Belanja:"🛍️", Tagihan:"🧾", Hiburan:"🎬", Kesehatan:"🌿", Pendidikan:"📚", Tabungan:"🐷", Lainnya:"✨" };
  const defaultBudgets = { Makanan:1000000, Transportasi:400000, Belanja:500000, Tagihan:800000, Hiburan:250000, Kesehatan:250000, Pendidikan:300000, Tabungan:0, Lainnya:300000 };
  const $ = id => document.getElementById(id);
  let transactions = readStorage(STORAGE.transactions, []);
  let budgets = { ...defaultBudgets, ...readStorage(STORAGE.budgets, {}) };
  let wallpaper = { preset:"peach", image:"", blur:8, overlay:15, ...readStorage(STORAGE.wallpaper, {}) };
  let expenseChart = null, monthlyChart = null, toastTimer = null;
  const today = new Date();
  const dateString = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const currentMonth = () => `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;
  const money = value => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(value)||0);
  const safe = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  function readStorage(key, fallback) { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch (e) { return fallback; } }
  function writeStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { showToast("Penyimpanan perangkat penuh. Hapus gambar wallpaper atau beberapa data lalu coba lagi."); return false; }
  }
  function showToast(message) {
    const toast = $("toast"); toast.textContent = message; toast.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  }
  function transactionMonth(t) { return (t.date || "").slice(0,7); }
  function monthTransactions(month = currentMonth()) { return transactions.filter(t => transactionMonth(t) === month); }
  function sum(list, type) { return list.filter(t => t.type === type).reduce((total,t) => total + Number(t.amount || 0),0); }
  function setCategoryOptions(type, selected = "") {
    const select = $("category");
    select.innerHTML = categories[type].map(c => `<option value="${safe(c.value)}">${safe(c.label)}</option>`).join("");
    if (selected && categories[type].some(c => c.value === selected)) select.value = selected;
  }
  function allExpenseCategories() { return categories.expense.map(c => c.value); }
  function init() {
    $("date").value = dateString(today);
    $("filterMonth").value = currentMonth();
    setCategoryOptions("income");
    document.querySelectorAll('input[name="type"]').forEach(radio => radio.addEventListener("change", () => setCategoryOptions(radio.value)));
    $("transactionForm").addEventListener("submit", saveTransaction);
    $("cancelEdit").addEventListener("click", resetForm);
    ["searchInput","filterCategory","filterType","filterMonth"].forEach(id => $(id).addEventListener(id === "searchInput" ? "input" : "change", renderTransactions));
    $("clearFilters").addEventListener("click", () => { $("searchInput").value=""; $("filterCategory").value="all"; $("filterType").value="all"; $("filterMonth").value=""; renderTransactions(); });
    $("editBudgets").addEventListener("click", toggleBudgetEditor);
    $("cancelBudgets").addEventListener("click", () => $("budgetEditor").classList.add("hidden"));
    $("budgetForm").addEventListener("submit", saveBudgets);
    $("exportCsv").addEventListener("click", exportCsv);
    $("openWallpaper").addEventListener("click", openWallpaperDialog);
    $("saveWallpaper").addEventListener("click", () => { saveWallpaperSettings(); $("wallpaperDialog").close(); });
    $("resetWallpaper").addEventListener("click", resetWallpaper);
    $("blurSlider").addEventListener("input", () => { wallpaper.blur = Number($("blurSlider").value); applyWallpaper(); });
    $("overlaySlider").addEventListener("input", () => { wallpaper.overlay = Number($("overlaySlider").value); applyWallpaper(); });
    $("wallpaperUpload").addEventListener("change", uploadWallpaper);
    document.querySelectorAll("[data-preset]").forEach(button => button.addEventListener("click", () => { wallpaper.preset = button.dataset.preset; wallpaper.image = ""; applyWallpaper(); $("wallpaperStatus").textContent = "Preset dipilih. Tekan Selesai untuk menyimpan."; }));
    $("mascotButton").addEventListener("click", () => showToast("Bubu bilang: satu langkah kecil tetap berarti! Dudu setuju! ♡"));
    fillFilterCategories(); applyWallpaper(); renderAll();
    window.addEventListener("resize", debounce(renderCharts, 120));
  }
  function saveTransaction(event) {
    event.preventDefault();
    const id = $("transactionId").value;
    const type = document.querySelector('input[name="type"]:checked').value;
    const amount = Math.floor(Number($("amount").value));
    const date = $("date").value;
    const category = $("category").value;
    const note = $("note").value.trim();
    if (!Number.isFinite(amount) || amount <= 0) return showToast("Masukkan jumlah yang lebih besar dari Rp0.");
    if (!date) return showToast("Pilih tanggal transaksi.");
    const transaction = { id: id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`), type, amount, date, category, note, updatedAt: new Date().toISOString() };
    const previous = transactions;
    transactions = id ? transactions.map(t => t.id === id ? transaction : t) : [transaction, ...transactions];
    if (!writeStorage(STORAGE.transactions, transactions)) { transactions = previous; return; }
    resetForm(); renderAll(); showToast(id ? "Transaksi berhasil diperbarui ♡" : "Transaksi tersimpan. Good job! ♡");
  }
  function resetForm() {
    $("transactionForm").reset(); $("transactionId").value = ""; $("date").value = dateString(new Date());
    document.querySelector('input[name="type"][value="income"]').checked = true; setCategoryOptions("income");
    $("formTitle").textContent = "Tambah transaksi"; $("saveTransaction").textContent = "♡ Simpan transaksi"; $("cancelEdit").classList.add("hidden");
  }
  function editTransaction(id) {
    const t = transactions.find(item => item.id === id); if (!t) return;
    $("transactionId").value = t.id; document.querySelector(`input[name="type"][value="${t.type}"]`).checked = true;
    setCategoryOptions(t.type, t.category); $("amount").value = t.amount; $("date").value = t.date; $("note").value = t.note || "";
    $("formTitle").textContent = "Edit transaksi"; $("saveTransaction").textContent = "♡ Simpan perubahan"; $("cancelEdit").classList.remove("hidden");
    $("transactionFormPanel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function deleteTransaction(id) {
    const item = transactions.find(t => t.id === id); if (!item) return;
    if (!confirm(`Hapus transaksi "${item.category}" sebesar ${money(item.amount)}?`)) return;
    const previous = transactions; transactions = transactions.filter(t => t.id !== id);
    if (!writeStorage(STORAGE.transactions, transactions)) { transactions = previous; return; }
    renderAll(); showToast("Transaksi dihapus.");
  }
  function fillFilterCategories() {
    const values = [...new Set([...categories.income,...categories.expense].map(c=>c.value))].sort();
    $("filterCategory").innerHTML = '<option value="all">Semua kategori</option>' + values.map(v=>`<option value="${safe(v)}">${safe(v)}</option>`).join("");
  }
  function renderAll() { renderSummary(); renderTransactions(); renderBudgets(); renderBudgetInputs(); renderCharts(); updateMascot(); }
  function renderSummary() {
    const allIncome = sum(transactions,"income"), allExpense = sum(transactions,"expense"), month = monthTransactions();
    const income = sum(month,"income"), expense = sum(month,"expense"), savings = income ? Math.round(((income-expense)/income)*100) : 0;
    $("totalBalance").textContent = money(allIncome-allExpense);
    $("monthIncome").textContent = money(income); $("monthExpense").textContent = money(expense);
    $("savingsRate").textContent = `${savings}%`;
    $("savingsRate").style.color = savings < 0 ? "#c77870" : "";
  }
  function renderTransactions() {
    const query = $("searchInput").value.trim().toLocaleLowerCase("id-ID"), category = $("filterCategory").value, type = $("filterType").value, month = $("filterMonth").value;
    const list = [...transactions].filter(t => (!query || `${t.note} ${t.category} ${t.date}`.toLocaleLowerCase("id-ID").includes(query)) && (category === "all" || t.category === category) && (type === "all" || t.type === type) && (!month || transactionMonth(t) === month)).sort((a,b)=>b.date.localeCompare(a.date) || String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
    $("transactionCount").textContent = `${list.length} transaksi`;
    if (!list.length) { $("transactionList").innerHTML = '<div class="empty-state"><strong>Belum ada cerita uang di sini ♡</strong>Coba tambahkan transaksi atau ubah filter pencarianmu.</div>'; return; }
    $("transactionList").innerHTML = list.map(t => `<article class="transaction-row">
      <div class="transaction-main"><span class="transaction-emoji">${categoryEmoji[t.category] || "✨"}</span><div style="min-width:0"><div class="transaction-title">${safe(t.note || t.category)}</div><div class="transaction-sub">${safe(t.category)} · ${formatDate(t.date)}</div></div></div>
      <div class="transaction-amount ${t.type}">${t.type === "income" ? "+" : "−"}${money(t.amount)}</div>
      <div class="transaction-actions"><button class="mini-button" type="button" data-edit="${safe(t.id)}" aria-label="Edit transaksi">Edit</button><button class="mini-button" type="button" data-delete="${safe(t.id)}" aria-label="Hapus transaksi">Hapus</button></div>
    </article>`).join("");
    $("transactionList").querySelectorAll("[data-edit]").forEach(btn=>btn.addEventListener("click",()=>editTransaction(btn.dataset.edit)));
    $("transactionList").querySelectorAll("[data-delete]").forEach(btn=>btn.addEventListener("click",()=>deleteTransaction(btn.dataset.delete)));
  }
  function formatDate(value) {
    if (!value) return "Tanggal tidak diketahui";
    const d = new Date(`${value}T12:00:00`);
    return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric"}).format(d);
  }
  function renderBudgets() {
    const monthExpenses = monthTransactions().filter(t=>t.type==="expense");
    const list = allExpenseCategories().filter(c=>Number(budgets[c]||0)>0);
    if (!list.length) { $("budgetList").innerHTML = '<div class="empty-state">Belum ada budget yang diatur. Klik “Atur budget” untuk mulai.</div>'; return; }
    $("budgetList").innerHTML = list.map(category => {
      const spent = monthExpenses.filter(t=>t.category===category).reduce((n,t)=>n+Number(t.amount),0), limit = Number(budgets[category]), percent = limit ? Math.round(spent/limit*100) : 0, width = Math.min(100,percent);
      const state = percent >= 100 ? "over" : percent >= 75 ? "warning" : "";
      const status = percent >= 100 ? `Lewat ${money(spent-limit)}` : `${money(limit-spent)} tersisa`;
      return `<div class="budget-item"><div class="budget-item-top"><span class="budget-category">${categoryEmoji[category]||"✨"} ${safe(category)}</span><span class="budget-amount">${money(spent)} / ${money(limit)}</span></div><div class="budget-track"><div class="budget-fill ${state}" style="width:${width}%"></div></div><div class="budget-meta"><span>${percent}% terpakai</span><span>${status}</span></div></div>`;
    }).join("");
  }
  function renderBudgetInputs() {
    $("budgetInputs").innerHTML = allExpenseCategories().map(category=>`<label>${categoryEmoji[category]||"✨"} ${safe(category)}<input type="number" min="0" step="1000" name="${safe(category)}" value="${Number(budgets[category]||0)}" inputmode="numeric"></label>`).join("");
  }
  function toggleBudgetEditor() { renderBudgetInputs(); $("budgetEditor").classList.toggle("hidden"); }
  function saveBudgets(event) {
    event.preventDefault(); const next = {...budgets};
    allExpenseCategories().forEach(category=>{ const value = Number($("budgetInputs").querySelector(`[name="${CSS.escape(category)}"]`).value); next[category] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0; });
    if (!writeStorage(STORAGE.budgets,next)) return;
    budgets = next; $("budgetEditor").classList.add("hidden"); renderBudgets(); updateMascot(); showToast("Budget bulanan diperbarui ♡");
  }
  function updateMascot() {
    const expenses = monthTransactions().filter(t=>t.type==="expense"), income = sum(monthTransactions(),"income"), spent = sum(expenses,"expense");
    const activeBudgets = Object.entries(budgets).filter(([,limit])=>Number(limit)>0);
    const over = activeBudgets.find(([category,limit])=>expenses.filter(t=>t.category===category).reduce((n,t)=>n+t.amount,0)>limit);
    const highest = activeBudgets.map(([category,limit])=>({category,limit,spent:expenses.filter(t=>t.category===category).reduce((n,t)=>n+t.amount,0)})).sort((a,b)=>b.spent/Math.max(1,b.limit)-a.spent/Math.max(1,a.limit))[0];
    let message = "Bubu & Dudu siap menemani kamu mengatur uang.";
    if (over) message = `Dudu pusing, budget ${over[0].toLowerCase()} sudah lewat! Yuk atur lagi pelan-pelan.`;
    else if (highest && highest.spent/highest.limit >= .8) message = `Hati-hati jajan ${highest.category.toLowerCase()}, budget sudah terpakai ${Math.round(highest.spent/highest.limit*100)}%!`;
    else if (income > 0 && spent < income*.5) message = "Yeay! Keuanganmu terlihat lebih terjaga. Sedikit demi sedikit, jadi bukit! ♡";
    else if (spent > income && income > 0) message = "Ups, pengeluaran lebih besar dari pemasukan. Yuk cek lagi bareng Bubu.";
    else message = "Ayo nabung! Kamu tidak harus sempurna, yang penting konsisten. ♡";
    $("mascotMessage").textContent = message;
  }
  function renderCharts() {
    const month = monthTransactions(), expenseData = {};
    month.filter(t=>t.type==="expense").forEach(t=>expenseData[t.category]=(expenseData[t.category]||0)+Number(t.amount));
    const labels = Object.keys(expenseData), values = labels.map(k=>expenseData[k]);
    const donutFallback = $("donutFallback"), barFallback = $("barFallback");
    if (typeof Chart === "undefined") { donutFallback.classList.remove("hidden"); barFallback.classList.remove("hidden"); return; }
    donutFallback.classList.toggle("hidden",labels.length>0); barFallback.classList.toggle("hidden",month.length>0);
    const textColor = "#8b7770";
    if (expenseChart) expenseChart.destroy();
    expenseChart = new Chart($("expenseChart"),{type:"doughnut",data:{labels:labels.length?labels:["Belum ada data"],datasets:[{data:values.length?values:[1],backgroundColor:labels.length?["#ffb7b2","#d4a373","#a9d8b3","#c9c8f5","#f6d68d","#e5a9c7","#a7d7e8","#d6c2ad","#c5d7ae"]:["#f4e9e2"],borderColor:"rgba(255,255,255,.8)",borderWidth:3,hoverOffset:5}]},options:{responsive:true,maintainAspectRatio:false,cutout:"67%",plugins:{legend:{position:"bottom",labels:{color:textColor,usePointStyle:true,pointStyle:"circle",padding:13,font:{family:"Quicksand",size:10}}},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${money(ctx.raw)}`}}}}});
    if (monthlyChart) monthlyChart.destroy();
    const income = sum(month,"income"), expense = sum(month,"expense");
    monthlyChart = new Chart($("monthlyChart"),{type:"bar",data:{labels:["Bulan ini"],datasets:[{label:"Pemasukan",data:[income],backgroundColor:"#a9d8b3",borderRadius:8,maxBarThickness:38},{label:"Pengeluaran",data:[expense],backgroundColor:"#ffb7b2",borderRadius:8,maxBarThickness:38}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{color:textColor,usePointStyle:true,pointStyle:"circle",padding:13,font:{family:"Quicksand",size:10}}},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${money(ctx.raw)}`}}},scales:{x:{ticks:{color:textColor,font:{family:"Quicksand",size:10}},grid:{display:false}},y:{beginAtZero:true,ticks:{color:textColor,font:{family:"Quicksand",size:9},callback:value=>value>=1000000?`${(value/1000000).toLocaleString("id-ID")} jt`:value>=1000?`${value/1000} rb`:value},grid:{color:"rgba(150,120,105,.12)"}}}}});
  }
  function exportCsv() {
    if (!transactions.length) return showToast("Belum ada transaksi untuk diekspor.");
    const rows = [["Tanggal","Jenis","Kategori","Jumlah (Rp)","Catatan"],...transactions.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(t=>[t.date,t.type==="income"?"Pemasukan":"Pengeluaran",t.category,t.amount,t.note||""])];
    const csv = "\uFEFF" + rows.map(row=>row.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"})), a = document.createElement("a");
    a.href=url; a.download=`bubu-dudu-transaksi-${dateString(new Date())}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showToast("File CSV siap diunduh.");
  }
  const presets = {
    peach: "radial-gradient(circle at 20% 20%, rgba(255,183,178,.8), transparent 30%), radial-gradient(circle at 85% 30%, rgba(255,221,199,.9), transparent 30%), linear-gradient(135deg,#fff0e8,#fff7e7 60%,#f4e9d8)",
    sky: "radial-gradient(circle at 20% 20%, rgba(197,229,255,.95), transparent 32%), radial-gradient(circle at 80% 65%, rgba(218,228,255,.95), transparent 34%), linear-gradient(135deg,#f3fbff,#e6f0ff)",
    flower: "radial-gradient(circle at 18% 20%, rgba(255,230,143,.85), transparent 28%), radial-gradient(circle at 82% 30%, rgba(194,231,180,.95), transparent 34%), linear-gradient(135deg,#fff8d8,#eff9e9)",
    night: "radial-gradient(circle at 20% 20%, rgba(216,196,250,.9), transparent 30%), radial-gradient(circle at 85% 65%, rgba(180,192,245,.9), transparent 34%), linear-gradient(135deg,#f6edff,#e8e9ff)"
  };
  function applyWallpaper() {
    const layer = document.querySelector(".wallpaper-layer");
    layer.style.backgroundImage = wallpaper.image ? `url("${wallpaper.image}")` : (presets[wallpaper.preset] || presets.peach);
    layer.style.filter = `blur(${Math.max(0,Math.min(20,Number(wallpaper.blur)||0))}px)`;
    document.documentElement.style.setProperty("--blur",`${Math.max(0,Math.min(20,Number(wallpaper.blur)||0))}px`);
    document.documentElement.style.setProperty("--overlay",String(Math.max(0,Math.min(80,Number(wallpaper.overlay)||0))/100));
    $("blurSlider").value = wallpaper.blur; $("overlaySlider").value = wallpaper.overlay;
    $("blurValue").textContent = `${wallpaper.blur} px`; $("overlayValue").textContent = `${wallpaper.overlay}%`;
  }
  function openWallpaperDialog() {
    $("wallpaperStatus").textContent = ""; $("wallpaperUpload").value = ""; applyWallpaper();
    const dialog = $("wallpaperDialog"); if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open","");
  }
  function uploadWallpaper(event) {
    const file = event.target.files && event.target.files[0]; if (!file) return;
    if (!file.type.startsWith("image/")) return showToast("Pilih file gambar.");
    if (file.size > 5*1024*1024) { event.target.value=""; return showToast("Gambar maksimal 5 MB. Kompres gambar lalu coba lagi."); }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas"), maxSide = 1200, scale = Math.min(1,maxSide/Math.max(img.width,img.height));
          canvas.width = Math.round(img.width*scale); canvas.height = Math.round(img.height*scale);
          const ctx = canvas.getContext("2d"); ctx.drawImage(img,0,0,canvas.width,canvas.height);
          wallpaper.image = canvas.toDataURL("image/jpeg",.78); wallpaper.preset = "";
          applyWallpaper(); $("wallpaperStatus").textContent = "Gambar siap dipakai. Tekan Selesai untuk menyimpan.";
        } catch (error) { showToast("Gambar tidak dapat diproses. Coba gambar lain."); }
      };
      img.onerror = () => showToast("Gambar tidak dapat dibuka.");
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  function saveWallpaperSettings() {
    if (writeStorage(STORAGE.wallpaper,wallpaper)) { applyWallpaper(); showToast("Wallpaper tersimpan ♡"); }
  }
  function resetWallpaper() {
    wallpaper = {preset:"peach",image:"",blur:8,overlay:15}; applyWallpaper();
    $("wallpaperUpload").value = ""; $("wallpaperStatus").textContent = "Tampilan kembali ke default. Tekan Selesai untuk menyimpan.";
  }
  function debounce(fn,wait) { let timer; return (...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),wait);}; }
  document.addEventListener("DOMContentLoaded",init);
})();