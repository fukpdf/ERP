const state = { view: "dashboard", products: [], customers: [], orders: [], summary: null, search: "", categoryFilter: "", statusFilter: "" };
const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modal-root");

const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
const date = (value) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
const customerName = (id) => state.customers.find((item) => item.id === id)?.name || "Unknown customer";
const initials = (name) => String(name).split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();

async function request(url, options = {}) {
  const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}

function toast(message, type = "success") {
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.innerHTML = `<span>${type === "success" ? "✓" : "!"}</span>${escapeHtml(message)}`;
  document.querySelector("#toast-region").append(item);
  setTimeout(() => item.remove(), 3400);
}

async function load() {
  const data = await request("/api/bootstrap");
  Object.assign(state, data);
  document.querySelector("#product-nav-count").textContent = state.products.length;
  document.querySelector("#customer-nav-count").textContent = state.customers.length;
  render();
}

function pageHeader(eyebrow, title, description, action = "") {
  return `<div class="page-header"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="page-description">${description}</p></div>${action}</div>`;
}

function statCard(label, value, detail, icon, tone = "blue") {
  return `<article class="stat-card"><div class="stat-icon ${tone}">${icon}</div><div class="stat-copy"><span>${label}</span><strong>${value}</strong><small>${detail}</small></div></article>`;
}

function revenueByMonth() {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return {
      key: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(month),
      total: 0
    };
  });
  const totals = new Map(months.map((month) => [month.key, month]));
  state.orders.filter((order) => order.status !== "draft").forEach((order) => {
    const created = new Date(order.createdAt);
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
    const month = totals.get(key);
    if (month) month.total += order.total;
  });
  return months;
}

function shortMoney(value) {
  if (value >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${Math.round(value)}`;
}

function statusPill(status) {
  return `<span class="status-pill ${status}"><i></i>${status[0].toUpperCase() + status.slice(1)}</span>`;
}

function render() {
  document.querySelector("#breadcrumb").textContent = { dashboard: "Overview", products: "Products", customers: "Customers", orders: "Sales orders" }[state.view];
  document.querySelectorAll(".nav-item[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === state.view));
  ({ dashboard: renderDashboard, products: renderProducts, customers: renderCustomers, orders: renderOrders }[state.view])();
}

function renderDashboard() {
  const lowStock = state.summary.lowStockItems || [];
  const recent = state.summary.recentOrders || [];
  const months = revenueByMonth();
  const maxRevenue = Math.max(1, ...months.map((month) => month.total));
  const monthLabels = [4, 3, 2, 1, 0].map((step) => shortMoney(maxRevenue * step / 4));
  const activeOrders = state.orders.filter((order) => order.status !== "draft").length;
  const today = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
  app.innerHTML = `
    ${pageHeader(today, "Good morning, Alex", "Here’s what’s happening across your operations today.", `<button class="button primary" data-action="new-order">＋ New sales order</button>`)}
    <div class="stats-grid">
      ${statCard("Total revenue", money(state.summary.revenue), "From confirmed and processing orders", "↗", "blue")}
      ${statCard("Sales orders", state.summary.orders, `${activeOrders} confirmed or processing`, "▤", "purple")}
      ${statCard("Customers", state.summary.customers, "Active accounts", "♙", "green")}
      ${statCard("Low stock items", state.summary.lowStock, state.summary.lowStock ? "Needs your attention" : "Inventory looks healthy", "!", state.summary.lowStock ? "orange" : "green")}
    </div>
    <div class="dashboard-grid">
      <section class="panel chart-panel"><div class="panel-heading"><div><h2>Revenue overview</h2><p>Recorded order revenue · last 6 months</p></div><span class="muted-text">USD</span></div><div class="chart"><div class="chart-y">${monthLabels.map((label) => `<span>${label}</span>`).join("")}</div><div class="chart-area"><div class="chart-bars">${months.map((month) => `<i title="${month.label}: ${money(month.total)}" style="height:${Math.max(2, month.total / maxRevenue * 100)}%"></i>`).join("")}</div><div class="chart-x">${months.map((month) => `<span>${month.label}</span>`).join("")}</div></div></div></section>
      <section class="panel"><div class="panel-heading"><div><h2>Inventory alerts</h2><p>Products at or below reorder level</p></div><button class="text-button" data-view="products">View all →</button></div><div class="alert-list">${lowStock.length ? lowStock.slice(0, 4).map((item) => `<div class="alert-row"><div class="product-avatar">${initials(item.name)}</div><div class="alert-name"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.sku)}</small></div><span class="stock-warning">${item.stock} left</span></div>`).join("") : `<div class="empty-state small">No inventory alerts right now.</div>`}</div></section>
    </div>
    <section class="panel"><div class="panel-heading"><div><h2>Recent sales orders</h2><p>Latest activity from your sales team</p></div><button class="text-button" data-view="orders">View all →</button></div>${ordersTable(recent)}</section>`;
}

function ordersTable(orders) {
  return `<div class="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${orders.length ? orders.map((order) => `<tr><td><strong class="linkish">${order.number}</strong></td><td><div class="person"><span class="mini-avatar">${initials(customerName(order.customerId))}</span>${escapeHtml(customerName(order.customerId))}</div></td><td>${date(order.createdAt)}</td><td><strong>${money(order.total)}</strong></td><td>${statusPill(order.status)}</td><td><button class="row-menu" aria-label="Order actions">•••</button></td></tr>`).join("") : `<tr><td colspan="6"><div class="empty-state">No sales orders yet.</div></td></tr>`}</tbody></table></div>`;
}

function renderProducts() {
  const query = state.search.toLowerCase();
  const products = state.products.filter((item) => `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(query) && (!state.categoryFilter || item.category === state.categoryFilter));
  const categories = [...new Set(state.products.map((item) => item.category))].sort();
  app.innerHTML = `${pageHeader("Catalog & inventory", "Products", "Keep your catalog accurate and know when it’s time to reorder.", `<button class="button primary" data-action="new-product">＋ Add product</button>`)}
    <div class="toolbar"><div class="search-box"><span>⌕</span><input id="table-search" value="${escapeHtml(state.search)}" placeholder="Search products or SKU" /></div><select id="category-filter" class="select"><option value="">All categories</option>${categories.map((category) => `<option value="${escapeHtml(category)}" ${state.categoryFilter === category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}</select><button class="button secondary" data-action="export-products">⇩ Export CSV</button></div>
    <section class="panel"><div class="table-meta"><span>${products.length} products</span><span class="muted-text">Updated just now</span></div><div class="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>In stock</th><th>Health</th><th></th></tr></thead><tbody>${products.length ? products.map((item) => `<tr><td><div class="product-cell"><div class="product-avatar ${item.category.toLowerCase()}">${initials(item.name)}</div><strong>${escapeHtml(item.name)}</strong></div></td><td class="mono">${escapeHtml(item.sku)}</td><td>${escapeHtml(item.category)}</td><td><strong>${money(item.price)}</strong></td><td><strong>${item.stock}</strong> units</td><td>${item.stock <= item.reorderLevel ? `<span class="health low"><i></i>Reorder</span>` : `<span class="health good"><i></i>Healthy</span>`}</td><td><button class="row-menu" data-action="delete-product" data-id="${item.id}">•••</button></td></tr>`).join("") : `<tr><td colspan="7"><div class="empty-state">No products match your search.</div></td></tr>`}</tbody></table></div></section>`;
}

function renderCustomers() {
  const query = state.search.toLowerCase();
  const customers = state.customers.filter((item) => `${item.name} ${item.email} ${item.city}`.toLowerCase().includes(query));
  app.innerHTML = `${pageHeader("Relationships", "Customers", "Manage the companies and people your team sells to.", `<button class="button primary" data-action="new-customer">＋ Add customer</button>`)}
    <div class="toolbar"><div class="search-box"><span>⌕</span><input id="table-search" value="${escapeHtml(state.search)}" placeholder="Search customers" /></div><button class="button secondary" data-action="export-customers">⇩ Export CSV</button></div>
    <section class="panel"><div class="table-meta"><span>${customers.length} customers</span><span class="muted-text">All active accounts</span></div><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Contact</th><th>Location</th><th>Orders</th><th>Lifetime value</th><th>Status</th><th></th></tr></thead><tbody>${customers.length ? customers.map((item) => { const customerOrders = state.orders.filter((order) => order.customerId === item.id); const lifetime = customerOrders.reduce((sum, order) => sum + order.total, 0); return `<tr><td><div class="person"><span class="mini-avatar large">${initials(item.name)}</span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.id)}</small></div></div></td><td><div class="contact"><span>${escapeHtml(item.email)}</span><small>${escapeHtml(item.phone)}</small></div></td><td>${escapeHtml(item.city)}</td><td>${customerOrders.length}</td><td><strong>${money(lifetime)}</strong></td><td>${statusPill(item.status)}</td><td><button class="row-menu" data-action="delete-customer" data-id="${item.id}">•••</button></td></tr>`; }).join("") : `<tr><td colspan="7"><div class="empty-state">No customers match your search.</div></td></tr>`}</tbody></table></div></section>`;
}

function renderOrders() {
  const orders = state.orders.filter((order) => `${order.number} ${customerName(order.customerId)}`.toLowerCase().includes(state.search.toLowerCase()) && (!state.statusFilter || order.status === state.statusFilter));
  app.innerHTML = `${pageHeader("Sales", "Sales orders", "Track every order from confirmation through fulfillment.", `<button class="button primary" data-action="new-order">＋ New sales order</button>`)}
    <div class="toolbar"><div class="search-box"><span>⌕</span><input id="table-search" value="${escapeHtml(state.search)}" placeholder="Search order number or customer" /></div><select id="status-filter" class="select"><option value="">All statuses</option><option value="confirmed" ${state.statusFilter === "confirmed" ? "selected" : ""}>Confirmed</option><option value="processing" ${state.statusFilter === "processing" ? "selected" : ""}>Processing</option><option value="draft" ${state.statusFilter === "draft" ? "selected" : ""}>Draft</option></select><button class="button secondary" data-action="export-orders">⇩ Export CSV</button></div>
    <section class="panel">${ordersTable(orders)}</section>`;
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
  toast(`Exported ${rows.length} row${rows.length === 1 ? "" : "s"} to CSV`);
}

function modal(title, subtitle, body) {
  modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal"><div class="modal-header"><div><h2>${title}</h2><p>${subtitle}</p></div><button class="close-modal">×</button></div>${body}</div></div>`;
  modalRoot.querySelector(".close-modal").addEventListener("click", closeModal);
  modalRoot.querySelector(".modal-backdrop").addEventListener("click", (event) => { if (event.target.classList.contains("modal-backdrop")) closeModal(); });
}

function closeModal() { modalRoot.innerHTML = ""; }

function productForm() {
  modal("Add a product", "Create an inventory item for your catalog.", `<form id="product-form" class="form-grid"><label>Product name<input name="name" required placeholder="e.g. Wireless mouse" /></label><label>SKU<input name="sku" required placeholder="e.g. TEC-2003" /></label><label>Category<select name="category"><option>Office</option><option>Technology</option><option>Supplies</option><option>Services</option></select></label><label>Price<input name="price" required type="number" min="0" step="0.01" placeholder="0.00" /></label><label>Opening stock<input name="stock" required type="number" min="0" step="1" value="0" /></label><label>Reorder level<input name="reorderLevel" required type="number" min="0" step="1" value="10" /></label><div class="form-actions"><button type="button" class="button secondary close-modal">Cancel</button><button class="button primary">Save product</button></div></form>`);
  modalRoot.querySelector("#product-form").addEventListener("submit", async (event) => { event.preventDefault(); try { await request("/api/products", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.target))) }); closeModal(); await load(); toast("Product added to your catalog"); } catch (err) { toast(err.message, "error"); } });
  modalRoot.querySelectorAll(".close-modal").forEach((item) => item.addEventListener("click", closeModal));
}

function customerForm() {
  modal("Add a customer", "Save a company or contact for your sales team.", `<form id="customer-form" class="form-grid"><label class="wide">Customer name<input name="name" required placeholder="e.g. Acme Corporation" /></label><label>Email<input name="email" type="email" required placeholder="name@company.com" /></label><label>Phone<input name="phone" required placeholder="+1 555 010 0000" /></label><label>City<input name="city" required placeholder="Austin" /></label><div class="form-actions"><button type="button" class="button secondary close-modal">Cancel</button><button class="button primary">Save customer</button></div></form>`);
  modalRoot.querySelector("#customer-form").addEventListener("submit", async (event) => { event.preventDefault(); try { await request("/api/customers", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.target))) }); closeModal(); await load(); toast("Customer added"); } catch (err) { toast(err.message, "error"); } });
  modalRoot.querySelectorAll(".close-modal").forEach((item) => item.addEventListener("click", closeModal));
}

function orderForm() {
  const options = state.products.filter((item) => item.stock > 0).map((item) => `<option value="${item.id}">${escapeHtml(item.name)} — ${money(item.price)} (${item.stock} available)</option>`).join("");
  modal("New sales order", "Reserve inventory and create a confirmed order.", `<form id="order-form"><label>Customer<select name="customerId" required><option value="">Select a customer</option>${state.customers.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}</select></label><div class="line-items"><div class="line-item-header"><span>Product</span><span>Quantity</span></div><div class="line-item"><select name="productId" required><option value="">Select a product</option>${options}</select><input name="quantity" type="number" min="1" value="1" required /></div></div><button type="button" class="text-button add-line">＋ Add another product</button><div class="form-actions"><button type="button" class="button secondary close-modal">Cancel</button><button class="button primary">Create order</button></div></form>`);
  const form = modalRoot.querySelector("#order-form");
  modalRoot.querySelector(".add-line").addEventListener("click", () => { const item = document.createElement("div"); item.className = "line-item"; item.innerHTML = `<select name="productId" required><option value="">Select a product</option>${options}</select><input name="quantity" type="number" min="1" value="1" required />`; modalRoot.querySelector(".line-items").append(item); });
  form.addEventListener("submit", async (event) => { event.preventDefault(); try { const values = [...new FormData(form).entries()]; const items = []; for (let index = 0; index < values.length; index += 1) { if (values[index][0] === "productId") items.push({ productId: values[index][1], quantity: values[index + 1][1] }); } await request("/api/orders", { method: "POST", body: JSON.stringify({ customerId: form.customerId.value, items }) }); closeModal(); await load(); state.view = "orders"; render(); toast("Sales order created"); } catch (err) { toast(err.message, "error"); } });
  modalRoot.querySelectorAll(".close-modal").forEach((item) => item.addEventListener("click", closeModal));
}

document.addEventListener("click", async (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton && !viewButton.disabled) { state.view = viewButton.dataset.view; state.search = ""; state.categoryFilter = ""; state.statusFilter = ""; render(); document.querySelector(".sidebar").classList.remove("open"); return; }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "new-product") productForm();
  if (action === "new-customer") customerForm();
  if (action === "new-order") orderForm();
  if (action === "export-products") {
    const query = state.search.toLowerCase();
    const rows = state.products.filter((item) => `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(query) && (!state.categoryFilter || item.category === state.categoryFilter));
    exportCsv("products.csv", ["SKU", "Name", "Category", "Price", "Stock", "Reorder Level", "Status"], rows.map((item) => [item.sku, item.name, item.category, item.price, item.stock, item.reorderLevel, item.status]));
  }
  if (action === "export-customers") {
    const query = state.search.toLowerCase();
    const rows = state.customers.filter((item) => `${item.name} ${item.email} ${item.city}`.toLowerCase().includes(query));
    exportCsv("customers.csv", ["Name", "Email", "Phone", "City", "Status", "Created"], rows.map((item) => [item.name, item.email, item.phone, item.city, item.status, item.createdAt]));
  }
  if (action === "export-orders") {
    const rows = state.orders.filter((order) => `${order.number} ${customerName(order.customerId)}`.toLowerCase().includes(state.search.toLowerCase()) && (!state.statusFilter || order.status === state.statusFilter));
    exportCsv("sales-orders.csv", ["Order", "Customer", "Date", "Status", "Total"], rows.map((order) => [order.number, customerName(order.customerId), order.createdAt, order.status, order.total]));
  }
  if (action === "delete-product") { if (confirm("Remove this product from the catalog?")) { await request(`/api/products/${event.target.closest("[data-id]").dataset.id}`, { method: "DELETE" }); await load(); toast("Product removed"); } }
  if (action === "delete-customer") { if (confirm("Remove this customer? Customers with order history cannot be removed.")) { try { await request(`/api/customers/${event.target.closest("[data-id]").dataset.id}`, { method: "DELETE" }); await load(); toast("Customer removed"); } catch (err) { toast(err.message, "error"); } } }
});

document.addEventListener("input", (event) => { if (event.target.id === "table-search") { state.search = event.target.value; const position = event.target.selectionStart; render(); const input = document.querySelector("#table-search"); input.focus(); input.setSelectionRange(position, position); } });
document.addEventListener("change", (event) => {
  if (event.target.id === "category-filter") { state.categoryFilter = event.target.value; render(); }
  if (event.target.id === "status-filter") { state.statusFilter = event.target.value; render(); }
});
document.querySelector("#mobile-menu").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));
load().catch((err) => { app.innerHTML = `<div class="error-state"><h1>Couldn’t load the workspace</h1><p>${escapeHtml(err.message)}</p><button class="button primary" onclick="location.reload()">Try again</button></div>`; });