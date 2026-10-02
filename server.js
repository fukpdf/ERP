const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { URL } = require("node:url");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 5000);
const HOST = "0.0.0.0";
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

const seed = {
  products: [
    { id: "prod-001", sku: "OFF-1001", name: "Ergonomic Office Chair", category: "Office", price: 249.99, stock: 42, reorderLevel: 12, status: "active" },
    { id: "prod-002", sku: "OFF-1002", name: "Adjustable Standing Desk", category: "Office", price: 499.0, stock: 18, reorderLevel: 8, status: "active" },
    { id: "prod-003", sku: "TEC-2001", name: "27-inch 4K Monitor", category: "Technology", price: 379.0, stock: 7, reorderLevel: 10, status: "active" },
    { id: "prod-004", sku: "TEC-2002", name: "Wireless Keyboard", category: "Technology", price: 79.99, stock: 64, reorderLevel: 20, status: "active" },
    { id: "prod-005", sku: "SUP-3001", name: "Premium Notebook Pack", category: "Supplies", price: 24.5, stock: 5, reorderLevel: 15, status: "active" }
  ],
  customers: [
    { id: "cust-001", name: "Northstar Consulting", email: "accounts@northstar.example", phone: "+1 555 010 2200", city: "Austin", status: "active", createdAt: "2026-09-08" },
    { id: "cust-002", name: "Vertex Health Systems", email: "procurement@vertex.example", phone: "+1 555 010 3811", city: "Boston", status: "active", createdAt: "2026-09-12" },
    { id: "cust-003", name: "Brightline Studio", email: "hello@brightline.example", phone: "+1 555 010 7742", city: "Chicago", status: "active", createdAt: "2026-09-19" }
  ],
  orders: [
    {
      id: "ord-1001",
      number: "SO-2026-001",
      customerId: "cust-001",
      status: "confirmed",
      total: 739.95,
      createdAt: "2026-09-24T10:15:00.000Z",
      items: [{ productId: "prod-001", name: "Ergonomic Office Chair", quantity: 2, price: 249.99 }, { productId: "prod-004", name: "Wireless Keyboard", quantity: 3, price: 79.99 }]
    },
    {
      id: "ord-1002",
      number: "SO-2026-002",
      customerId: "cust-002",
      status: "processing",
      total: 499,
      createdAt: "2026-09-26T14:45:00.000Z",
      items: [{ productId: "prod-002", name: "Adjustable Standing Desk", quantity: 1, price: 499 }]
    },
    {
      id: "ord-1003",
      number: "SO-2026-003",
      customerId: "cust-003",
      status: "draft",
      total: 758,
      createdAt: "2026-09-28T09:20:00.000Z",
      items: [{ productId: "prod-003", name: "27-inch 4K Monitor", quantity: 2, price: 379 }]
    }
  ]
};

let writeQueue = Promise.resolve();
let apiQueue = Promise.resolve();

class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function ensureData() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(seed, null, 2));
  }
}

async function readDb() {
  await ensureData();
  return JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
}

function writeDb(db) {
  writeQueue = writeQueue.then(async () => {
    const tempFile = `${DATA_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(db, null, 2));
    await fs.rename(tempFile, DATA_FILE);
  });
  return writeQueue;
}

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(body);
}

function error(res, status, message) {
  json(res, status, { error: message });
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_000_000) throw new RequestError("Request body is too large", 413);
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw new RequestError("Request body must be valid JSON");
  }
}

function id(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function cleanText(value, field, max = 120) {
  if (typeof value !== "string" || !value.trim()) throw new RequestError(`${field} is required`);
  return value.trim().slice(0, max);
}

function money(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new RequestError("Price must be a non-negative number");
  return Math.round(number * 100) / 100;
}

function summary(db) {
  const revenue = db.orders.filter((order) => order.status !== "draft").reduce((total, order) => total + order.total, 0);
  const lowStock = db.products.filter((product) => product.stock <= product.reorderLevel);
  return {
    revenue,
    orders: db.orders.length,
    customers: db.customers.length,
    products: db.products.length,
    lowStock: lowStock.length,
    lowStockItems: lowStock,
    recentOrders: [...db.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)
  };
}

async function api(req, res, url) {
  const db = await readDb();
  const segments = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const resource = segments[0];
  const resourceId = segments[1];

  if (req.method === "GET" && url.pathname === "/api/bootstrap") {
    return json(res, 200, { ...db, summary: summary(db) });
  }

  if (req.method === "GET" && resource === "summary") {
    return json(res, 200, summary(db));
  }

  if (resource === "products") {
    if (req.method === "GET" && !resourceId) return json(res, 200, db.products);
    if (req.method === "POST") {
      const body = await readBody(req);
      const product = {
        id: id("prod"),
        sku: cleanText(body.sku, "SKU", 40).toUpperCase(),
        name: cleanText(body.name, "Product name"),
        category: cleanText(body.category, "Category", 60),
        price: money(body.price),
        stock: Math.max(0, Number.parseInt(body.stock || 0, 10)),
        reorderLevel: Math.max(0, Number.parseInt(body.reorderLevel || 0, 10)),
        status: "active"
      };
      if (!Number.isInteger(product.stock) || !Number.isInteger(product.reorderLevel)) throw new RequestError("Stock values must be whole numbers");
      if (db.products.some((item) => item.sku === product.sku)) throw new RequestError("SKU already exists");
      db.products.unshift(product);
      await writeDb(db);
      return json(res, 201, product);
    }
    if (req.method === "PATCH" && resourceId) {
      const product = db.products.find((item) => item.id === resourceId);
      if (!product) return error(res, 404, "Product not found");
      const body = await readBody(req);
      if (body.name !== undefined) product.name = cleanText(body.name, "Product name");
      if (body.category !== undefined) product.category = cleanText(body.category, "Category", 60);
      if (body.price !== undefined) product.price = money(body.price);
      if (body.stock !== undefined) {
        product.stock = Number.parseInt(body.stock, 10);
        if (!Number.isInteger(product.stock) || product.stock < 0) throw new RequestError("Stock must be a non-negative whole number");
      }
      if (body.reorderLevel !== undefined) {
        product.reorderLevel = Number.parseInt(body.reorderLevel, 10);
        if (!Number.isInteger(product.reorderLevel) || product.reorderLevel < 0) throw new RequestError("Reorder level must be a non-negative whole number");
      }
      await writeDb(db);
      return json(res, 200, product);
    }
    if (req.method === "DELETE" && resourceId) {
      const index = db.products.findIndex((item) => item.id === resourceId);
      if (index === -1) return error(res, 404, "Product not found");
      db.products.splice(index, 1);
      await writeDb(db);
      return json(res, 200, { ok: true });
    }
  }

  if (resource === "customers") {
    if (req.method === "GET" && !resourceId) return json(res, 200, db.customers);
    if (req.method === "POST") {
      const body = await readBody(req);
      const customer = {
        id: id("cust"),
        name: cleanText(body.name, "Customer name"),
        email: cleanText(body.email, "Email", 160).toLowerCase(),
        phone: cleanText(body.phone || "Not provided", "Phone", 40),
        city: cleanText(body.city || "Not provided", "City", 80),
        status: "active",
        createdAt: new Date().toISOString().slice(0, 10)
      };
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email)) throw new RequestError("Enter a valid email address");
      db.customers.unshift(customer);
      await writeDb(db);
      return json(res, 201, customer);
    }
    if (req.method === "PATCH" && resourceId) {
      const customer = db.customers.find((item) => item.id === resourceId);
      if (!customer) return error(res, 404, "Customer not found");
      const body = await readBody(req);
      if (body.name !== undefined) customer.name = cleanText(body.name, "Customer name");
      if (body.email !== undefined) {
        customer.email = cleanText(body.email, "Email", 160).toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email)) throw new RequestError("Enter a valid email address");
      }
      if (body.phone !== undefined) customer.phone = cleanText(body.phone, "Phone", 40);
      if (body.city !== undefined) customer.city = cleanText(body.city, "City", 80);
      await writeDb(db);
      return json(res, 200, customer);
    }
    if (req.method === "DELETE" && resourceId) {
      const index = db.customers.findIndex((item) => item.id === resourceId);
      if (index === -1) return error(res, 404, "Customer not found");
      if (db.orders.some((order) => order.customerId === resourceId)) return error(res, 409, "This customer has order history and cannot be removed");
      db.customers.splice(index, 1);
      await writeDb(db);
      return json(res, 200, { ok: true });
    }
  }

  if (resource === "orders") {
    if (req.method === "GET" && !resourceId) {
      return json(res, 200, [...db.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }
    if (req.method === "POST") {
      const body = await readBody(req);
      const customer = db.customers.find((item) => item.id === body.customerId);
      if (!customer) throw new RequestError("Select a valid customer");
      if (!Array.isArray(body.items) || body.items.length === 0) throw new RequestError("Add at least one product");
      const items = body.items.map((line) => {
        const product = db.products.find((item) => item.id === line.productId);
        const quantity = Number.parseInt(line.quantity, 10);
        if (!product) throw new RequestError("A selected product no longer exists");
        if (!Number.isInteger(quantity) || quantity < 1) throw new RequestError("Quantity must be at least 1");
        if (quantity > product.stock) throw new RequestError(`${product.name} only has ${product.stock} in stock`);
        product.stock -= quantity;
        return { productId: product.id, name: product.name, quantity, price: product.price };
      });
      const order = {
        id: id("ord"),
        number: `SO-${new Date().getFullYear()}-${String(db.orders.length + 1).padStart(3, "0")}`,
        customerId: customer.id,
        status: "confirmed",
        total: Math.round(items.reduce((total, item) => total + item.price * item.quantity, 0) * 100) / 100,
        createdAt: new Date().toISOString(),
        items
      };
      db.orders.unshift(order);
      await writeDb(db);
      return json(res, 201, order);
    }
  }

  return error(res, 404, "API route not found");
}

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };

async function staticFile(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : url.pathname === "/favicon.ico" ? "/favicon.svg" : url.pathname;
  const file = path.resolve(PUBLIC_DIR, `.${requested}`);
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return error(res, 403, "Forbidden");
  try {
    const content = await fs.readFile(file);
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(content);
  } catch {
    error(res, 404, "Page not found");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      const current = apiQueue.then(() => api(req, res, url));
      apiQueue = current.catch(() => {});
      await current;
    }
    else await staticFile(req, res, url);
  } catch (err) {
    if (!(err instanceof RequestError)) console.error(err);
    const status = err instanceof RequestError ? err.status : 500;
    error(res, status, err instanceof RequestError ? err.message : "Internal server error");
  }
});

ensureData().then(() => {
  server.listen(PORT, HOST, () => console.log(`ERP foundation running at http://${HOST}:${PORT}`));
}).catch((err) => {
  console.error("Unable to initialize data store", err);
  process.exit(1);
});