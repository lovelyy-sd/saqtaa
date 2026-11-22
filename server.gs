/**
 * SAQTAA BACKEND v4.1 (Google Apps Script)
 * Единый защищённый сервер для:
 * 1) Серверной авторизации админ-панели (PIN хранится только в Script Properties → ADMIN_PIN)
 * 2) Авторизации доверенных устройств по отзывным SHA-256 токенам (90 дней, управление в Настройках)
 * 3) Загрузки фотографий с телефона на Google Диск SAQTAA
 * 4) Сохранения, поиска и удаления заказов (только POST + ADMIN_PIN или токен устройства)
 * 5) Приёма ответов гостей (RSVP) с лимитами, защитой от спама и формул
 * 6) Отправки HTML-уведомлений на Email клиента через GmailApp (Email берётся только из таблицы ORDERS)
 * 7) Раздельной статистики: публичные счётчики (action=counts) и список гостей по токену (action=stats)
 *
 * НАСТРОЙКА ПАРОЛЯ:
 * В редакторе Google Apps Script откройте:
 * Настройки проекта (шестерёнка слева) → Свойства скрипта → Добавить свойство:
 *   Свойство: ADMIN_PIN
 *   Значение: ваш надёжный пароль (от 4 символов)
 */

// ================= НАСТРОЙКИ =================
var BRAND_NAME = "SAQTAA · Цифровые приглашения";
var TIMEZONE = "Asia/Almaty";
var MAX_EMAILS_PER_ORDER_HOUR = 120;
var DEVICE_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 дней
var MAX_DEVICES = 15;
// =============================================

function getAdminPin() {
  return String(PropertiesService.getScriptProperties().getProperty("ADMIN_PIN") || "").trim();
}

function isPinConfigured() {
  return getAdminPin().length >= 4;
}

function timingSafeEqual(a, b) {
  var sa = String(a || "");
  var sb = String(b || "");
  if (!sa || sa.length !== sb.length) return false;
  var diff = 0;
  for (var i = 0; i < sa.length; i++) {
    diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  }
  return diff === 0;
}

function verifyPin(pin) {
  var expected = getAdminPin();
  if (expected.length < 4) return false;
  return timingSafeEqual(String(pin || "").trim(), expected);
}

function pinError() {
  if (!isPinConfigured()) {
    return "Серверный пароль ADMIN_PIN не задан. Откройте Google Apps Script → Настройки проекта → Свойства скрипта и добавьте ADMIN_PIN (от 4 символов).";
  }
  return "Неверный серверный пароль администратора";
}

function sha256Hex(str) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(str || ""), Utilities.Charset.UTF_8);
  var out = "";
  for (var i = 0; i < digest.length; i++) {
    var b = digest[i];
    if (b < 0) b += 256;
    out += (b < 16 ? "0" : "") + b.toString(16);
  }
  return out;
}

function loadDevices() {
  var raw = PropertiesService.getScriptProperties().getProperty("ADMIN_DEVICES");
  if (!raw) return [];
  try {
    var arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    var now = Date.now();
    return arr.filter(function(d) {
      return d && typeof d === "object" && d.id && d.hash && (!d.exp || Number(d.exp) > now);
    });
  } catch (_) {
    return [];
  }
}

function saveDevices(list) {
  var trimmed = Array.isArray(list) ? list.slice(-MAX_DEVICES) : [];
  PropertiesService.getScriptProperties().setProperty("ADMIN_DEVICES", JSON.stringify(trimmed));
}

function issueDeviceToken(rawLabel) {
  var token = Utilities.getUuid() + "_" + Utilities.getUuid();
  var nowMs = Date.now();
  var nowStr = Utilities.formatDate(new Date(nowMs), TIMEZONE, "dd.MM.yyyy HH:mm");
  var devId = "dev_" + nowMs.toString(36) + "_" + Utilities.getUuid().slice(0, 6);
  var label = safeSingleLine(rawLabel || "Устройство администратора", 80) || "Устройство администратора";
  var list = loadDevices();
  list.push({
    id: devId,
    hash: sha256Hex(token),
    label: label,
    created: nowStr,
    lastSeen: nowStr,
    lastSeenMs: nowMs,
    exp: nowMs + DEVICE_TTL_MS
  });
  saveDevices(list);
  return { token: token, id: devId, label: label, created: nowStr };
}

function findDeviceByToken(token, touchLastSeen) {
  var cleanTok = String(token || "").trim();
  if (cleanTok.length < 24) return null;
  var targetHash = sha256Hex(cleanTok);
  var list = loadDevices();
  var found = null;
  var changed = false;
  var nowMs = Date.now();
  for (var i = 0; i < list.length; i++) {
    if (timingSafeEqual(list[i].hash, targetHash)) {
      found = list[i];
      if (touchLastSeen && (!found.lastSeenMs || (nowMs - Number(found.lastSeenMs)) > 1800000)) {
        found.lastSeen = Utilities.formatDate(new Date(nowMs), TIMEZONE, "dd.MM.yyyy HH:mm");
        found.lastSeenMs = nowMs;
        changed = true;
      }
      break;
    }
  }
  if (changed) {
    try { saveDevices(list); } catch (_) {}
  }
  return found;
}

function verifyAdmin(p) {
  if (!isPinConfigured()) return { ok: false, mode: "", deviceId: "", error: pinError() };
  if (p && p.pin && verifyPin(p.pin)) {
    var curDevId = "";
    if (p.device_token) {
      var d = findDeviceByToken(p.device_token, false);
      if (d) curDevId = d.id;
    }
    return { ok: true, mode: "pin", deviceId: curDevId };
  }
  var tok = String((p && p.device_token) || "").trim();
  if (tok.length >= 24) {
    var dev = findDeviceByToken(tok, true);
    if (dev) return { ok: true, mode: "device", deviceId: dev.id, label: dev.label };
    return { ok: false, mode: "", deviceId: "", token_invalid: true, error: "Доступ для этого устройства отозван или истёк. Войдите снова по паролю." };
  }
  return { ok: false, mode: "", deviceId: "", error: pinError() };
}

function escHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeSingleLine(s, maxLen) {
  var clean = String(s == null ? "" : s).replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return maxLen ? clean.slice(0, maxLen) : clean;
}

function safeCell(v) {
  var s = String(v == null ? "" : v).trim();
  if (/^[=+\-@\t\r]/.test(s)) return "'" + s;
  return s;
}

function isDateVal(v) {
  return Boolean(v && typeof v === "object" && typeof v.getTime === "function" && !isNaN(v.getTime()));
}

function extractStatsToken(jsonStr) {
  try {
    var obj = typeof jsonStr === "string" ? JSON.parse(jsonStr || "{}") : jsonStr;
    return obj && typeof obj === "object" ? String(obj.st || "").trim() : "";
  } catch (_) {
    return "";
  }
}

function verifyStatsToken(expected, given) {
  var e = String(expected || "").trim();
  var g = String(given || "").trim();
  if (e.length < 8 || g.length < 8) return false;
  return timingSafeEqual(e, g);
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Автоматически создаёт листы ORDERS и RSVPS в текущей Google Таблице
 */
function ensureSheets(needOrders, needRsvps) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var orders = null;
  if (needOrders !== false) {
    orders = ss.getSheetByName("ORDERS");
    if (!orders) {
      orders = ss.insertSheet("ORDERS");
      orders.appendRow([
        "ID заказа", "Создано", "Имена", "Дата тоя", "Время", "Шаблон",
        "Email клиента", "Ссылка приглашения", "Ссылка статистики", "JSON данных"
      ]);
      orders.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#0F4A38").setFontColor("#F6F1E4");
      orders.setFrozenRows(1);
    }
  }
  var rsvps = null;
  if (needRsvps !== false) {
    rsvps = ss.getSheetByName("RSVPS");
    if (!rsvps) {
      rsvps = ss.insertSheet("RSVPS");
      rsvps.appendRow([
        "Order ID", "RSVP ID", "Дата и время", "Имя", "Фамилия",
        "Статус (yes/no/maybe)", "Ответ текстом", "Гостей", "Мероприятие", "Email клиента"
      ]);
      rsvps.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#0F4A38").setFontColor("#F6F1E4");
      rsvps.setFrozenRows(1);
    }
  }
  return { ss: ss, orders: orders, rsvps: rsvps };
}

function doGet(e) {
  return handle(e && e.parameter ? e.parameter : {}, false);
}

function doPost(e) {
  var p = {};
  try {
    if (e && e.postData && e.postData.contents) {
      p = JSON.parse(e.postData.contents);
    }
  } catch (_) {}
  if (!p || typeof p !== "object" || Array.isArray(p)) p = {};
  return handle(p, true);
}

function handle(p, isPost) {
  var action = String(p.action || "ping").trim();
  if (action === "ping") {
    return jsonOut({ ok: true, status: "SAQTAA Server Active", version: "4.1", pin_configured: isPinConfigured() });
  }

  // Защищённые действия принимаются строго через POST, чтобы PIN и токены не попадали в URL/логи
  var postOnlyActions = {
    auth: 1, change_pin: 1, remember_device: 1, list_devices: 1, revoke_device: 1,
    test_email: 1, upload_photo: 1,
    save_order: 1, list_orders: 1, delete_order: 1, stats: 1, get: 1
  };
  if (postOnlyActions[action] && !isPost) {
    return jsonOut({ ok: false, error: "Используйте POST-запрос для защищённого действия" });
  }

  // 1. ПРОВЕРКА СВЯЗИ, АВТОРИЗАЦИЯ И ЗАПОМИНАНИЕ УСТРОЙСТВА
  if (action === "auth") {
    if (!isPinConfigured()) {
      return jsonOut({ ok: false, error: pinError() });
    }
    if (p.pin) {
      if (!verifyPin(p.pin)) {
        return jsonOut({ ok: false, error: pinError() });
      }
      ensureSheets(true, true);
      var outAuth = { ok: true, message: "Авторизация успешна", version: "4.1" };
      if (p.remember === true || p.remember === "1" || p.remember === "true") {
        var devLock = LockService.getScriptLock();
        var gotDevLock = devLock.tryLock(5000);
        try {
          var issued = issueDeviceToken(p.device_label);
          outAuth.device_token = issued.token;
          outAuth.device_id = issued.id;
          outAuth.device_label = issued.label;
        } finally {
          if (gotDevLock) devLock.releaseLock();
        }
      }
      return jsonOut(outAuth);
    }
    if (p.device_token) {
      var dev = findDeviceByToken(p.device_token, true);
      if (!dev) {
        return jsonOut({ ok: false, token_invalid: true, error: "Доступ для этого устройства отозван или истёк. Войдите снова по паролю." });
      }
      ensureSheets(true, true);
      return jsonOut({ ok: true, message: "Устройство авторизовано", version: "4.1", device_id: dev.id, device_label: dev.label });
    }
    return jsonOut({ ok: false, error: pinError() });
  }

  // Запомнить текущее устройство из Настроек (если вошли по паролю без галочки)
  if (action === "remember_device") {
    if (!verifyPin(p.pin)) return jsonOut({ ok: false, error: pinError() });
    var remLock = LockService.getScriptLock();
    var gotRemLock = remLock.tryLock(5000);
    if (!gotRemLock) return jsonOut({ ok: false, error: "Сервер занят, попробуйте ещё раз" });
    try {
      var issued2 = issueDeviceToken(p.device_label);
      return jsonOut({ ok: true, device_token: issued2.token, device_id: issued2.id, device_label: issued2.label, created: issued2.created });
    } finally {
      remLock.releaseLock();
    }
  }

  // Список всех запомненных устройств
  if (action === "list_devices") {
    var ldAuth = verifyAdmin(p);
    if (!ldAuth.ok) return jsonOut({ ok: false, token_invalid: Boolean(ldAuth.token_invalid), error: ldAuth.error });
    var devs = loadDevices();
    return jsonOut({
      ok: true,
      devices: devs.map(function(d) {
        return {
          id: d.id,
          label: d.label,
          created: d.created || "",
          lastSeen: d.lastSeen || d.created || "",
          current: Boolean(ldAuth.deviceId && d.id === ldAuth.deviceId)
        };
      }).reverse()
    });
  }

  // Отзыв одного или всех доверенных устройств
  if (action === "revoke_device") {
    var rvAuth = verifyAdmin(p);
    if (!rvAuth.ok) return jsonOut({ ok: false, token_invalid: Boolean(rvAuth.token_invalid), error: rvAuth.error });
    var rvLock = LockService.getScriptLock();
    var gotRvLock = rvLock.tryLock(5000);
    if (!gotRvLock) return jsonOut({ ok: false, error: "Сервер занят, попробуйте ещё раз" });
    try {
      if (p.all === true || p.all === "1" || p.all === "true") {
        saveDevices([]);
        return jsonOut({ ok: true, revoked_all: true, remaining: 0 });
      }
      var targetDevId = safeSingleLine(p.device_id || rvAuth.deviceId || "", 80);
      if (!targetDevId) return jsonOut({ ok: false, error: "Устройство не указано" });
      var curList = loadDevices();
      var nextList = curList.filter(function(d) { return d.id !== targetDevId; });
      saveDevices(nextList);
      return jsonOut({ ok: true, revoked_id: targetDevId, remaining: nextList.length });
    } finally {
      rvLock.releaseLock();
    }
  }

  // Смена пароля администратора (сбрасывает старые токены устройств)
  if (action === "change_pin") {
    if (!verifyPin(p.pin)) return jsonOut({ ok: false, error: pinError() });
    var newPin = String(p.new_pin || "").trim();
    if (newPin.length < 4 || newPin.length > 64) {
      return jsonOut({ ok: false, error: "Новый пароль должен быть от 4 до 64 символов" });
    }
    var cpLock = LockService.getScriptLock();
    var gotCpLock = cpLock.tryLock(5000);
    try {
      PropertiesService.getScriptProperties().setProperty("ADMIN_PIN", newPin);
      saveDevices([]);
      var cpOut = { ok: true, devices_cleared: true };
      if (p.remember === true || p.remember === "1" || p.remember === "true") {
        var reIssued = issueDeviceToken(p.device_label);
        cpOut.device_token = reIssued.token;
        cpOut.device_id = reIssued.id;
        cpOut.device_label = reIssued.label;
      }
      return jsonOut(cpOut);
    } finally {
      if (gotCpLock) cpLock.releaseLock();
    }
  }

  // Тест отправки письма через GmailApp (из Настроек админ-панели)
  if (action === "test_email") {
    var teAuth = verifyAdmin(p);
    if (!teAuth.ok) return jsonOut({ ok: false, token_invalid: Boolean(teAuth.token_invalid), error: teAuth.error });
    var toAddr = safeSingleLine(p.to, 120);
    if (!toAddr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toAddr)) {
      return jsonOut({ ok: false, error: "Укажите корректный Email получателя" });
    }
    try {
      var testPlain = "Почта Google Apps Script работает корректно. Ответы гостей будут приходить на этот адрес.";
      GmailApp.sendEmail(toAddr, "Тест почты SAQTAA", testPlain, {
        name: BRAND_NAME,
        htmlBody: '<div style="font-family:Arial,sans-serif;max-width:520px;padding:20px;background:#ffffff;border:1px solid #e5e0d5;border-radius:10px;color:#182720"><h3 style="margin:0 0 8px;color:#0F4A38;font-size:17px">SAQTAA · Тест отправки</h3><p style="margin:0;font-size:14px;line-height:1.5">' + escHtml(testPlain) + '</p></div>'
      });
      return jsonOut({ ok: true, email_sent: true, to: toAddr, remaining_quota: MailApp.getRemainingDailyQuota() });
    } catch (testErr) {
      return jsonOut({ ok: false, error: String(testErr && testErr.message ? testErr.message : testErr) });
    }
  }

  // 2. ЗАГРУЗКА ФОТО С ТЕЛЕФОНА НА GOOGLE ДИСК SAQTAA
  if (action === "upload_photo") {
    var upAuth = verifyAdmin(p);
    if (!upAuth.ok) return jsonOut({ ok: false, token_invalid: Boolean(upAuth.token_invalid), error: upAuth.error });
    try {
      var b64 = String(p.base64 || "");
      var mime = String(p.mime || "image/jpeg").toLowerCase().trim();
      var allowedMimes = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
      if (!allowedMimes[mime]) return jsonOut({ ok: false, error: "Поддерживаются только JPG, PNG или WebP" });
      if (!b64) return jsonOut({ ok: false, error: "Пустой файл фото" });
      if (b64.length > 7000000) return jsonOut({ ok: false, error: "Файл слишком большой (максимум 5 МБ)" });
      var name = "saqtaa_" + new Date().getTime() + "." + allowedMimes[mime];
      var bytes = Utilities.base64Decode(b64);
      var blob = Utilities.newBlob(bytes, mime, name);

      var folders = DriveApp.getFoldersByName("SAQTAA_PHOTOS");
      var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("SAQTAA_PHOTOS");
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var fileId = file.getId();
      var directUrl = "https://lh3.googleusercontent.com/d/" + fileId + "=w1600";
      return jsonOut({
        ok: true,
        id: fileId,
        url: directUrl,
        fallback_url: "https://drive.google.com/uc?export=view&id=" + fileId
      });
    } catch (err) {
      return jsonOut({ ok: false, error: "Ошибка сохранения фото на Google Диск: " + String(err) });
    }
  }

  var lock = LockService.getScriptLock();
  var locked = lock.tryLock(10000);
  if (!locked) {
    return jsonOut({ ok: false, error: "Сервер занят, попробуйте через пару секунд" });
  }
  try {
    var needOrdersSheet = (
      action === "save_order" || action === "list_orders" || action === "delete_order" ||
      action === "stats" || action === "get" ||
      (action === "rsvp" && safeSingleLine(p.oid || p.order_id || "default", 80) !== "default")
    );
    var needRsvpsSheet = (action === "rsvp" || action === "stats" || action === "get" || action === "counts");
    var db = ensureSheets(needOrdersSheet, needRsvpsSheet);

    // 3. СОХРАНЕНИЕ ЗАКАЗА В ОБЛАЧНУЮ БАЗУ
    if (action === "save_order") {
      var soAuth = verifyAdmin(p);
      if (!soAuth.ok) return jsonOut({ ok: false, token_invalid: Boolean(soAuth.token_invalid), error: soAuth.error });
      var orderId = safeSingleLine(p.id || ("ord_" + new Date().getTime()), 80);
      var nowStr = Utilities.formatDate(new Date(), TIMEZONE, "dd.MM.yyyy HH:mm");
      var names = safeCell(safeSingleLine(p.names || p.name || "", 140));
      var dateStr = safeSingleLine(p.date || "", 20);
      var rawTime = safeSingleLine(p.time || "", 40);
      // Префикс апострофа не даёт Google Таблицам превращать «18:00» в объект Date
      var timeStr = rawTime ? ("'" + rawTime.replace(/^'+/, "")) : "";
      var tpl = safeCell(safeSingleLine(p.tpl || p.template || "luxury", 40));
      var email = safeSingleLine(p.email || "", 120);
      var inviteUrl = safeSingleLine(p.invite_url || "", 16000);
      var statsUrl = safeSingleLine(p.stats_url || "", 16000);
      var dataObj = {};
      try {
        dataObj = typeof p.data === "string" ? JSON.parse(p.data || "{}") : (p.data || {});
      } catch (_) {
        dataObj = {};
      }
      if (p.stats_token && !dataObj.st) dataObj.st = String(p.stats_token).trim();
      var jsonStr = JSON.stringify(dataObj);

      var rows = db.orders.getDataRange().getValues();
      var foundRow = -1;
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === orderId) {
          foundRow = i + 1;
          break;
        }
      }
      var rowVals = [safeCell(orderId), nowStr, names, dateStr, timeStr, tpl, safeCell(email), inviteUrl, statsUrl, jsonStr];
      if (foundRow > 0) {
        db.orders.getRange(foundRow, 1, 1, 10).setValues([rowVals]);
      } else {
        db.orders.appendRow(rowVals);
      }
      return jsonOut({ ok: true, id: orderId, saved_at: nowStr });
    }

    // 4. СПИСОК И ПОИСК ЗАКАЗОВ ДЛЯ АДМИНКИ
    if (action === "list_orders") {
      var loAuth = verifyAdmin(p);
      if (!loAuth.ok) return jsonOut({ ok: false, token_invalid: Boolean(loAuth.token_invalid), error: loAuth.error });
      var rows = db.orders.getDataRange().getValues();
      var list = [];
      for (var i = 1; i < rows.length; i++) {
        var r = rows[i];
        if (!r[0]) continue;
        var dVal = isDateVal(r[3]) ? Utilities.formatDate(r[3], TIMEZONE, "yyyy-MM-dd") : String(r[3] || "");
        var cVal = isDateVal(r[1]) ? Utilities.formatDate(r[1], TIMEZONE, "dd.MM.yyyy HH:mm") : String(r[1] || "");
        var tVal = isDateVal(r[4]) ? Utilities.formatDate(r[4], TIMEZONE, "HH:mm") : String(r[4] || "");
        list.push({
          id: String(r[0]),
          created: cVal,
          names: String(r[2] || ""),
          date: dVal,
          time: tVal,
          tpl: String(r[5] || ""),
          email: String(r[6] || ""),
          invite_url: String(r[7] || ""),
          stats_url: String(r[8] || ""),
          data: String(r[9] || "{}")
        });
      }
      return jsonOut({ ok: true, orders: list.reverse() });
    }

    // 5. УДАЛЕНИЕ ЗАКАЗА
    if (action === "delete_order") {
      var doAuth = verifyAdmin(p);
      if (!doAuth.ok) return jsonOut({ ok: false, token_invalid: Boolean(doAuth.token_invalid), error: doAuth.error });
      var targetId = safeSingleLine(p.id || "", 80);
      var rows = db.orders.getDataRange().getValues();
      for (var i = rows.length - 1; i >= 1; i--) {
        if (String(rows[i][0]) === targetId) {
          db.orders.deleteRow(i + 1);
          return jsonOut({ ok: true });
        }
      }
      return jsonOut({ ok: false, error: "Заказ не найден" });
    }

    // 6. ПРИЁМ ОТВЕТА ГОСТЯ (RSVP) + ОТПРАВКА ПИСЬМА НА ПОЧТУ КЛИЕНТА ИЗ ТАБЛИЦЫ ORDERS
    if (action === "rsvp") {
      if (p.botcheck) return jsonOut({ ok: true }); // Honeypot от ботов

      var name = safeSingleLine(p.name, 50);
      var fam = safeSingleLine(p.fam, 50);
      if (!name || !fam) return jsonOut({ ok: false, error: "Укажите имя и фамилию" });

      var attCode = String(p.att_code || p.att || "yes").toLowerCase();
      if (attCode.indexOf("не") !== -1 || attCode.indexOf("келмей") !== -1 || attCode.indexOf("алмай") !== -1 || attCode === "no") attCode = "no";
      else if (attCode.indexOf("пока") !== -1 || attCode.indexOf("білмей") !== -1 || attCode.indexOf("ойлан") !== -1 || attCode.indexOf("maybe") !== -1) attCode = "maybe";
      else attCode = "yes";

      var rawLang = String(p.lang || "").toLowerCase().trim();
      var rawAttText = String(p.att || "").toLowerCase();
      var isBoth = (rawLang === "both");
      var isKz = (!isBoth && (rawLang === "kz" || rawLang === "kk" || (!rawLang && (rawAttText.indexOf("келед") !== -1 || rawAttText.indexOf("келмей") !== -1 || rawAttText.indexOf("алмай") !== -1 || rawAttText.indexOf("білмей") !== -1))));
      var labels = isBoth ? {
        yes: "Келеді (Расталды) / Придёт (Подтверждено)",
        no: "Келе алмайды (Бас тартты) / Не придёт (Отказ)",
        maybe: "Әзірге білмейді / Пока не знает"
      } : (isKz ? {
        yes: "Келеді (Расталды)",
        no: "Келе алмайды (Бас тартты)",
        maybe: "Әзірге білмейді (Ойлануда)"
      } : {
        yes: "Придёт (Подтверждено)",
        no: "Не придёт (Отказ)",
        maybe: "Пока не знает (Под вопросом)"
      });
      var attLabel = labels[attCode];
      var parsedGuests = parseInt(p.guests, 10);
      var guests = attCode === "yes" ? Math.max(1, Math.min(10, isNaN(parsedGuests) ? 1 : parsedGuests)) : 0;

      var orderId = safeSingleLine(p.oid || p.order_id || "default", 80) || "default";
      var rsvpId = safeSingleLine(p.id || ("g_" + new Date().getTime()), 80);
      var eventTitle = safeSingleLine(p.title || (isBoth ? "Мерекелік шара / Праздничное торжество" : (isKz ? "Мерекелік шара" : "Праздничное торжество")), 120);
      var eventDate = safeSingleLine(p.date || "", 40);
      var noEmail = String(p.no_email || "") === "1";

      // Антиспам: не чаще 1 раза в 10 сек на один (orderId + rsvpId), честно сообщаем клиенту
      var cache = CacheService.getScriptCache();
      var rateKey = "rate_" + orderId.slice(0, 40) + "_" + rsvpId.slice(0, 40);
      if (cache.get(rateKey)) {
        return jsonOut({ ok: false, rate_limited: true, error: "Подождите 10 секунд перед повторной отправкой" });
      }
      cache.put(rateKey, "1", 10);

      // Email клиента и название события для письма берём ТОЛЬКО из таблицы ORDERS (защита от почтового релея)
      var clientEmail = "";
      if (orderId !== "default" && db.orders) {
        var oRows = db.orders.getDataRange().getValues();
        for (var k = 1; k < oRows.length; k++) {
          if (String(oRows[k][0]) === orderId) {
            clientEmail = safeSingleLine(oRows[k][6], 120);
            var dbNames = safeSingleLine(oRows[k][2], 120);
            if (dbNames) eventTitle = dbNames;
            if (!eventDate && oRows[k][3]) {
              var dbDate = isDateVal(oRows[k][3]) ? Utilities.formatDate(oRows[k][3], TIMEZONE, "dd.MM.yyyy") : safeSingleLine(oRows[k][3], 20);
              var dbTime = isDateVal(oRows[k][4]) ? Utilities.formatDate(oRows[k][4], TIMEZONE, "HH:mm") : safeSingleLine(oRows[k][4], 20);
              eventDate = (dbDate + (dbTime ? " " + dbTime : "")).trim();
            }
            break;
          }
        }
      }

      var now = Utilities.formatDate(new Date(), TIMEZONE, "dd.MM.yyyy HH:mm");
      var foundRsvpRow = -1;
      var totalYes = 0, totalNo = 0, totalMaybe = 0, totalResponses = 0;
      var rRows = db.rsvps.getDataRange().getValues();
      for (var j = 1; j < rRows.length; j++) {
        var rRow = rRows[j];
        var sameOrder = String(rRow[0]) === orderId;
        if (!sameOrder) continue;
        if (String(rRow[1]) === rsvpId) {
          foundRsvpRow = j + 1;
        } else {
          var st = String(rRow[5]);
          var gVal = parseInt(rRow[7], 10);
          totalResponses++;
          if (st === "yes") totalYes += Math.max(1, Math.min(10, isNaN(gVal) ? 1 : gVal));
          else if (st === "no") totalNo++;
          else totalMaybe++;
        }
      }
      totalResponses++;
      if (attCode === "yes") totalYes += guests;
      else if (attCode === "no") totalNo++;
      else totalMaybe++;

      var isUpdate = foundRsvpRow > 0;
      var rowData = [
        safeCell(orderId), safeCell(rsvpId), now, safeCell(name), safeCell(fam),
        attCode, attLabel, guests, safeCell(eventTitle), safeCell(clientEmail)
      ];
      if (isUpdate) {
        db.rsvps.getRange(foundRsvpRow, 1, 1, 10).setValues([rowData]);
      } else {
        db.rsvps.appendRow(rowData);
      }

      // Отправка письма на подтверждённый Email из ORDERS через GmailApp (с часовым лимитом на заказ)
      var emailSent = false, mailError = "";
      var needEmail = (!noEmail && clientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail));
      if (needEmail) {
        var mailQuotaKey = "mq_" + orderId.slice(0, 60);
        var sentCount = parseInt(cache.get(mailQuotaKey) || "0", 10) || 0;
        if (sentCount >= MAX_EMAILS_PER_ORDER_HOUR) {
          mailError = "Превышен часовой лимит уведомлений для заказа";
        } else {
          try {
            var fullName = name + " " + fam;
            var subjPrefix = isBoth
              ? (isUpdate ? "Жауап өзгертілді / Изменение ответа: " : "Жаңа жауап / Новый ответ гостя: ")
              : (isUpdate
                ? (isKz ? "Жауап өзгертілді: " : "Изменение ответа: ")
                : (isKz ? "Жаңа жауап: " : "Новый ответ гостя: "));
            var subject = safeSingleLine(subjPrefix + fullName + " — " + eventTitle, 200);
            var badgeColor = attCode === "yes" ? "#1E6F43" : (attCode === "no" ? "#9E2B3A" : "#9E7318");
            var txt = isBoth ? {
              hdr: "SAQTAA · Қонақ жауабы / Уведомление о госте",
              date: "Күні / Дата: ",
              guest: "Қонақ / Гость:",
              ans: "Жауабы / Ответ:",
              guestsLbl: "Қонақ саны / Гостей:",
              time: "Уақыты / Время: ",
              upd: " (жаңартылды / обновлено)",
              stTitle: "Статистика / Текущая статистика",
              stLine: "Келеді / Придут: <b>" + totalYes + "</b> &nbsp;·&nbsp; Келмейді / Не придут: <b>" + totalNo + "</b> &nbsp;·&nbsp; Ойлануда / Думают: <b>" + totalMaybe + "</b>",
              stPlain: "Келеді / Придут: " + totalYes + " · Келмейді / Не придут: " + totalNo + " · Ойлануда / Думают: " + totalMaybe,
              brand: "SAQTAA · Цифрлық шақырулар / Цифровые приглашения"
            } : (isKz ? {
              hdr: "SAQTAA · Қонақ туралы хабарлама",
              date: "Күні: ",
              guest: "Қонақ:",
              ans: "Жауабы:",
              guestsLbl: "Қонақ саны:",
              time: "Жауап уақыты: ",
              upd: " (жаңартылған жауап)",
              stTitle: "Шақыру бойынша статистика",
              stLine: "Келеді: <b>" + totalYes + "</b> &nbsp;·&nbsp; Келмейді: <b>" + totalNo + "</b> &nbsp;·&nbsp; Ойлануда: <b>" + totalMaybe + "</b>",
              stPlain: "Келеді: " + totalYes + " · Келмейді: " + totalNo + " · Ойлануда: " + totalMaybe,
              brand: "SAQTAA · Цифрлық шақырулар"
            } : {
              hdr: "SAQTAA · Уведомление о госте",
              date: "Дата: ",
              guest: "Гость:",
              ans: "Ответ:",
              guestsLbl: "Количество гостей:",
              time: "Время ответа: ",
              upd: " (обновлённый ответ)",
              stTitle: "Статистика по приглашению",
              stLine: "Придут: <b>" + totalYes + "</b> &nbsp;·&nbsp; Не придут: <b>" + totalNo + "</b> &nbsp;·&nbsp; Думают: <b>" + totalMaybe + "</b>",
              stPlain: "Придут: " + totalYes + " · Не придут: " + totalNo + " · Думают: " + totalMaybe,
              brand: BRAND_NAME
            });
            var plainBody = [
              eventTitle + (eventDate ? " (" + eventDate + ")" : ""),
              txt.guest + " " + fullName,
              txt.ans + " " + attLabel + (attCode === "yes" && guests > 1 ? " (" + guests + ")" : ""),
              txt.time + now + (isUpdate ? txt.upd : ""),
              txt.stPlain
            ].join("\n");
            var htmlBody = [
              '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;padding:22px;border-radius:10px;color:#182720;border:1px solid #e5e0d5">',
              '  <div style="border-bottom:1px solid #ece7dc;padding-bottom:12px;margin-bottom:16px">',
              '    <div style="font-size:12px;color:#8c6d32;font-weight:bold">' + escHtml(txt.hdr) + '</div>',
              '    <h2 style="margin:6px 0 2px;font-size:20px;color:#0F4A38">' + escHtml(eventTitle) + '</h2>',
              (eventDate ? '    <div style="font-size:13px;color:#46584D">' + escHtml(txt.date + eventDate) + '</div>' : ''),
              '  </div>',
              '  <div style="padding:4px 0 14px;border-bottom:1px solid #ece7dc;margin-bottom:14px">',
              '    <p style="margin:0 0 8px;font-size:15px"><strong>' + escHtml(txt.guest) + '</strong> ' + escHtml(fullName) + '</p>',
              '    <p style="margin:0 0 8px;font-size:15px"><strong>' + escHtml(txt.ans) + '</strong> <span style="color:' + badgeColor + ';font-weight:bold">' + escHtml(attLabel) + '</span>' + (attCode === "yes" && guests > 1 ? ' (' + guests + ')' : '') + '</p>',
              '    <p style="margin:0;font-size:12px;color:#6a746d">' + escHtml(txt.time + now + (isUpdate ? txt.upd : '')) + '</p>',
              '  </div>',
              '  <div style="font-size:13px;color:#182720">',
              '    <div style="color:#46584D;font-weight:bold;margin-bottom:4px;font-size:12px">' + escHtml(txt.stTitle) + '</div>',
              '    ' + txt.stLine,
              '  </div>',
              '</div>'
            ].join("\n");

            GmailApp.sendEmail(clientEmail, subject, plainBody, {
              name: txt.brand,
              htmlBody: htmlBody
            });
            cache.put(mailQuotaKey, String(sentCount + 1), 3600);
            emailSent = true;
          } catch (mailErr) {
            mailError = String(mailErr && mailErr.message ? mailErr.message : mailErr);
          }
        }
      }

      return jsonOut({
        ok: true,
        id: rsvpId,
        updated: isUpdate,
        email_sent: emailSent,
        mail_error: mailError,
        counts: { yes: totalYes, no: totalNo, maybe: totalMaybe, responses: totalResponses }
      });
    }

    // 7. ПУБЛИЧНЫЕ СЧЁТЧИКИ ДЛЯ СТРАНИЦЫ ПРИГЛАШЕНИЯ (invite.html — без имён и личных данных)
    if (action === "counts") {
      var cntOrderId = safeSingleLine(p.oid || p.order_id || "", 80);
      if (!cntOrderId || cntOrderId === "default") {
        return jsonOut({ ok: true, yes: 0, no: 0, maybe: 0, responses: 0 });
      }
      var cRows = db.rsvps.getDataRange().getValues();
      var cYes = 0, cNo = 0, cMaybe = 0, cResp = 0;
      for (var ci = 1; ci < cRows.length; ci++) {
        var cr = cRows[ci];
        if ((!cr[3] && !cr[4]) || String(cr[0]) !== cntOrderId) continue;
        cResp++;
        var cSt = String(cr[5] || "yes");
        var cG = parseInt(cr[7], 10);
        if (cSt === "yes") cYes += Math.max(1, Math.min(10, isNaN(cG) ? 1 : cG));
        else if (cSt === "no") cNo++;
        else cMaybe++;
      }
      return jsonOut({ ok: true, yes: cYes, no: cNo, maybe: cMaybe, responses: cResp });
    }

    // 8. ПОЛНЫЙ СПИСОК ГОСТЕЙ ДЛЯ КЛИЕНТА И АДМИНКИ (POST + oid + токен st, ADMIN_PIN или device_token)
    if (action === "stats" || action === "get") {
      var filterOrderId = safeSingleLine(p.oid || p.order_id || "", 80);
      if (!filterOrderId || filterOrderId === "default") {
        return jsonOut({ ok: false, error: "Укажите корректный ID заказа" });
      }
      var stAdmin = verifyAdmin(p);
      var hasAccess = stAdmin.ok;
      if (!hasAccess) {
        var givenToken = String(p.st || p.token || "").trim();
        if (givenToken && db.orders) {
          var ordRows = db.orders.getDataRange().getValues();
          for (var oi = 1; oi < ordRows.length; oi++) {
            if (String(ordRows[oi][0]) === filterOrderId) {
              var savedToken = extractStatsToken(ordRows[oi][9]);
              if (verifyStatsToken(savedToken, givenToken)) {
                hasAccess = true;
              }
              break;
            }
          }
        }
      }
      if (!hasAccess) {
        return jsonOut({ ok: false, error: "Доступ к списку гостей запрещён (требуется токен статистики или пароль администратора)" });
      }

      var rRows = db.rsvps.getDataRange().getValues();
      var outRows = [];
      for (var i = 1; i < rRows.length; i++) {
        var r = rRows[i];
        if (!r[3] && !r[4]) continue;
        if (String(r[0]) !== filterOrderId) continue;
        var tVal = isDateVal(r[2]) ? Utilities.formatDate(r[2], TIMEZONE, "dd.MM.yyyy HH:mm") : String(r[2] || "");
        var gNum = parseInt(r[7], 10);
        outRows.push({
          oid: String(r[0] || ""),
          id: String(r[1] || ""),
          time: tVal,
          name: String(r[3] || ""),
          fam: String(r[4] || ""),
          att: String(r[5] || "yes"),
          att_label: String(r[6] || ""),
          guests: String(r[5]) === "yes" ? Math.max(1, Math.min(10, isNaN(gNum) ? 1 : gNum)) : 0,
          title: String(r[8] || "")
        });
      }
      return jsonOut({ ok: true, rows: outRows });
    }

    return jsonOut({ ok: true, status: "SAQTAA Server Active", version: "4.1" });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  } finally {
    if (locked) lock.releaseLock();
  }
}
