/* ==========================================================================
   Insight POS — capa de datos LOCAL-FIRST (Opción B)
   IndexedDB en la computadora del local. Funciona sin internet.
   Multi-restaurante (cada cuenta = su propio espacio) + cola de
   sincronización lista para la nube (Fase de sync).
   ========================================================================== */
(function (global) {
  "use strict";

  var DB_NAME = "insight_pos";
  var DB_VERSION = 1;
  var dbp = null;

  /* ---------- IndexedDB helpers ---------- */
  function openDB() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = req.result;
        if (!db.objectStoreNames.contains("accounts")) {
          db.createObjectStore("accounts", { keyPath: "email" });
        }
        if (!db.objectStoreNames.contains("session")) {
          db.createObjectStore("session", { keyPath: "k" });
        }
        ["menu", "tables", "invoices", "waOrders"].forEach(function (name) {
          if (!db.objectStoreNames.contains(name)) {
            var st = db.createObjectStore(name, { keyPath: "id" });
            st.createIndex("tenant", "tenant", { unique: false });
          }
        });
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "k" });
        }
        if (!db.objectStoreNames.contains("syncQueue")) {
          db.createObjectStore("syncQueue", { keyPath: "id", autoIncrement: true });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbp;
  }

  function tx(store, mode) {
    return openDB().then(function (db) {
      return db.transaction(store, mode).objectStore(store);
    });
  }
  function reqP(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }
  function put(store, val) { return tx(store, "readwrite").then(function (s) { return reqP(s.put(val)); }); }
  function get(store, key) { return tx(store, "readonly").then(function (s) { return reqP(s.get(key)); }); }
  function del(store, key) { return tx(store, "readwrite").then(function (s) { return reqP(s.delete(key)); }); }
  function allByTenant(store, tenant) {
    return tx(store, "readonly").then(function (s) {
      return reqP(s.index("tenant").getAll(tenant));
    });
  }

  /* ---------- Password hashing (PBKDF2, real) ---------- */
  function buf2hex(b) {
    return Array.prototype.map.call(new Uint8Array(b), function (x) {
      return ("00" + x.toString(16)).slice(-2);
    }).join("");
  }
  function randomHex(n) {
    var a = new Uint8Array(n); crypto.getRandomValues(a); return buf2hex(a);
  }
  function hashPassword(pass, saltHex) {
    var enc = new TextEncoder();
    var salt = new Uint8Array(saltHex.match(/.{2}/g).map(function (h) { return parseInt(h, 16); }));
    return crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveBits"])
      .then(function (key) {
        return crypto.subtle.deriveBits(
          { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
          key, 256
        );
      }).then(buf2hex);
  }

  /* ---------- Sync queue (listo para nube) ---------- */
  function queueChange(tenant, entity, op, data) {
    return put("syncQueue", { tenant: tenant, entity: entity, op: op, data: data, ts: Date.now(), synced: false })
      .then(function () { updateSyncBadge(); });
  }
  function pendingSyncCount() {
    return tx("syncQueue", "readonly").then(function (s) { return reqP(s.getAll()); })
      .then(function (all) { return all.filter(function (x) { return !x.synced; }).length; });
  }
  var syncListeners = [];
  function onSyncChange(cb) { syncListeners.push(cb); }
  function updateSyncBadge() {
    Promise.all([pendingSyncCount(), Promise.resolve(navigator.onLine)]).then(function (r) {
      syncListeners.forEach(function (cb) { cb({ pending: r[0], online: r[1] }); });
    });
  }
  global.addEventListener("online", updateSyncBadge);
  global.addEventListener("offline", updateSyncBadge);

  /* ---------- Auth / cuentas ---------- */
  function register(data) {
    var email = (data.email || "").trim().toLowerCase();
    if (!email || !data.password || !data.restaurant) {
      return Promise.reject(new Error("Faltan datos"));
    }
    return get("accounts", email).then(function (existing) {
      if (existing) throw new Error("Ese correo ya está registrado. Inicia sesión.");
      var salt = randomHex(16);
      return hashPassword(data.password, salt).then(function (hash) {
        var tenantId = "t_" + randomHex(8);
        var account = {
          email: email, salt: salt, hash: hash, tenantId: tenantId,
          restaurant: {
            name: data.restaurant, ruc: data.ruc || "", address: data.address || "",
            phone: data.phone || "", type: data.type || "Restaurante"
          },
          plan: "Restaurante", createdAt: Date.now()
        };
        return put("accounts", account).then(function () {
          return queueChange(tenantId, "account", "create", { email: email, restaurant: account.restaurant });
        }).then(function () {
          return seedTenant(tenantId);
        }).then(function () {
          return setSession(email, tenantId).then(function () { return account; });
        });
      });
    });
  }

  function login(email, password) {
    email = (email || "").trim().toLowerCase();
    return get("accounts", email).then(function (acc) {
      if (!acc) throw new Error("No existe una cuenta con ese correo.");
      return hashPassword(password, acc.salt).then(function (hash) {
        if (hash !== acc.hash) throw new Error("Contraseña incorrecta.");
        return setSession(email, acc.tenantId).then(function () { return acc; });
      });
    });
  }

  function setSession(email, tenantId) { return put("session", { k: "current", email: email, tenantId: tenantId }); }
  function logout() { return del("session", "current"); }
  function currentSession() { return get("session", "current"); }
  function account(email) { return get("accounts", email); }
  function updateRestaurant(email, restaurant) {
    return get("accounts", email).then(function (acc) {
      if (!acc) throw new Error("Cuenta no encontrada");
      acc.restaurant = restaurant;
      return put("accounts", acc).then(function () {
        return queueChange(acc.tenantId, "account", "update", { email: email, restaurant: restaurant });
      });
    });
  }

  /* ---------- Semilla de un restaurante nuevo ---------- */
  function seedTenant(tenant) {
    var base = [
      { name: "Bolón mixto", cat: "Desayunos", price: 2.50, stock: 30 },
      { name: "Encebollado", cat: "Platos fuertes", price: 3.50, stock: 20 },
      { name: "Seco de pollo", cat: "Platos fuertes", price: 4.50, stock: 18 },
      { name: "Café pasado", cat: "Bebidas", price: 1.25, stock: 60 },
      { name: "Jugo de naranja", cat: "Bebidas", price: 1.75, stock: 40 }
    ];
    var chain = Promise.resolve();
    base.forEach(function (m) {
      chain = chain.then(function () {
        return put("menu", { id: "m_" + randomHex(6), tenant: tenant, name: m.name, cat: m.cat, price: m.price, stock: m.stock });
      });
    });
    var tables = [];
    for (var i = 1; i <= 6; i++) {
      tables.push(put("tables", { id: "tb_" + tenant + "_" + i, tenant: tenant, num: i, name: "Mesa " + i, type: "mesa", lines: [], status: "free" }));
    }
    return chain.then(function () { return Promise.all(tables); })
      .then(function () { return put("meta", { k: tenant + ":counter", value: 0 }); });
  }

  /* ---------- CRUD por restaurante ---------- */
  function listMenu(tenant) { return allByTenant("menu", tenant); }
  function saveMenuItem(tenant, item) {
    if (!item.id) item.id = "m_" + randomHex(6);
    item.tenant = tenant;
    return put("menu", item).then(function () {
      return queueChange(tenant, "menu", "put", item).then(function () { return item; });
    });
  }
  function deleteMenuItem(tenant, id) {
    return del("menu", id).then(function () { return queueChange(tenant, "menu", "delete", { id: id }); });
  }

  function listTables(tenant) {
    return allByTenant("tables", tenant).then(function (t) {
      return t.sort(function (a, b) { return (a.num || 999) - (b.num || 999); });
    });
  }
  function saveTable(tenant, table) {
    table.tenant = tenant;
    return put("tables", table).then(function () { return queueChange(tenant, "table", "put", table).then(function () { return table; }); });
  }
  function deleteTable(tenant, id) {
    return del("tables", id).then(function () { return queueChange(tenant, "table", "delete", { id: id }); });
  }

  function listInvoices(tenant) {
    return allByTenant("invoices", tenant).then(function (inv) {
      return inv.sort(function (a, b) { return b.ts - a.ts; });
    });
  }
  function saveInvoice(tenant, inv) {
    inv.tenant = tenant;
    if (!inv.id) inv.id = "inv_" + randomHex(8);
    return put("invoices", inv).then(function () { return queueChange(tenant, "invoice", "create", inv).then(function () { return inv; }); });
  }
  function nextInvoiceNumber(tenant) {
    return get("meta", tenant + ":counter").then(function (m) {
      var n = ((m && m.value) || 0) + 1;
      return put("meta", { k: tenant + ":counter", value: n }).then(function () {
        return "001-001-" + String(n).padStart(9, "0");
      });
    });
  }

  function listWaOrders(tenant) {
    return allByTenant("waOrders", tenant).then(function (w) {
      return w.sort(function (a, b) { return b.ts - a.ts; });
    });
  }
  function saveWaOrder(tenant, o) {
    o.tenant = tenant;
    if (!o.id) o.id = "wa_" + randomHex(8);
    return put("waOrders", o).then(function () { return o; });
  }

  /* Borrar todos los datos del inquilino (para "reiniciar") */
  function resetTenant(tenant) {
    return Promise.all(["menu", "tables", "invoices", "waOrders"].map(function (store) {
      return allByTenant(store, tenant).then(function (items) {
        return Promise.all(items.map(function (it) { return del(store, it.id); }));
      });
    })).then(function () { return seedTenant(tenant); });
  }

  global.Store = {
    register: register, login: login, logout: logout,
    currentSession: currentSession, account: account, updateRestaurant: updateRestaurant,
    listMenu: listMenu, saveMenuItem: saveMenuItem, deleteMenuItem: deleteMenuItem,
    listTables: listTables, saveTable: saveTable, deleteTable: deleteTable,
    listInvoices: listInvoices, saveInvoice: saveInvoice, nextInvoiceNumber: nextInvoiceNumber,
    listWaOrders: listWaOrders, saveWaOrder: saveWaOrder,
    resetTenant: resetTenant,
    onSyncChange: onSyncChange, updateSyncBadge: updateSyncBadge, pendingSyncCount: pendingSyncCount
  };
})(window);
