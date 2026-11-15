/**
 * SAQTAA BACKEND v3.0 (Google Apps Script)
 * Единый сервер для:
 * 1) Защиты админ-панели паролем на сервере
 * 2) Загрузки фотографий с телефона (сохраняются на Google Диск SAQTAA и отдаются по прямой ссылке)
 * 3) Сохранения и поиска всех заказов с любого телефона/компьютера (по имени, дате и времени)
 * 4) Приёма ответов гостей (RSVP) с защитой от спама и дублей
 * 5) Автоматической отправки красивых HTML-писем на Email клиента через MailApp (без регистрации клиента!)
 * 6) Живой онлайн-статистики ответов для клиента (stats.html)
 */

// ================= НАСТРОЙКИ =================
// При первом входе из админ-панели вы сможете задать свой пароль, либо укажите его здесь:
var DEFAULT_ADMIN_PIN = "saqtaa2026";
var BRAND_NAME = "SAQTAA · Цифровые приглашения";
var TIMEZONE = "Asia/Almaty";
// =============================================

function getAdminPin() {
  var saved = PropertiesService.getScriptProperties().getProperty("ADMIN_PIN");
  return saved || DEFAULT_ADMIN_PIN;
}

function verifyPin(pin) {
  return String(pin || "").trim() === getAdminPin();
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Автоматически создаёт листы ORDERS и RSVPS в текущей Google Таблице
 */
function ensureSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var orders = ss.getSheetByName("ORDERS");
  if (!orders) {
    orders = ss.insertSheet("ORDERS");
    orders.appendRow([
      "ID заказа", "Создано", "Имена", "Дата тоя", "Время", "Шаблон",
      "Email клиента", "Ссылка приглашения", "Ссылка статистики", "JSON данных"
    ]);
    orders.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#0F4A38").setFontColor("#F6F1E4");
    orders.setFrozenRows(1);
  }
  var rsvps = ss.getSheetByName("RSVPS");
  if (!rsvps) {
    rsvps = ss.insertSheet("RSVPS");
    rsvps.appendRow([
      "Order ID", "RSVP ID", "Дата и время", "Имя", "Фамилия",
      "Статус (yes/no/maybe)", "Ответ текстом", "Гостей", "Мероприятие", "Email клиента"
    ]);
    rsvps.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#0F4A38").setFontColor("#F6F1E4");
    rsvps.setFrozenRows(1);
  }
  return { ss: ss, orders: orders, rsvps: rsvps };
}

function doGet(e) {
  return handle(e ? e.parameter : {});
}

function doPost(e) {
  var p = {};
  try {
    if (e && e.postData && e.postData.contents) {
      p = JSON.parse(e.postData.contents);
    }
  } catch (_) {}
  if (e && e.parameter) {
    for (var k in e.parameter) {
      if (p[k] === undefined) p[k] = e.parameter[k];
    }
  }
  return handle(p);
}

function handle(p) {
  var action = String(p.action || "ping").trim();

  // 1. ПРОВЕРКА СВЯЗИ И АВТОРИЗАЦИИ АДМИНКИ
  if (action === "auth") {
    if (!verifyPin(p.pin)) {
      return jsonOut({ ok: false, error: "Неверный серверный пароль администратора" });
    }
    ensureSheets();
    return jsonOut({ ok: true, message: "Авторизация успешна" });
  }

  // Смена пароля администратора
  if (action === "change_pin") {
    if (!verifyPin(p.pin)) return jsonOut({ ok: false, error: "Неверный текущий пароль" });
    var newPin = String(p.new_pin || "").trim();
    if (newPin.length < 4) return jsonOut({ ok: false, error: "Новый пароль слишком короткий" });
    PropertiesService.getScriptProperties().setProperty("ADMIN_PIN", newPin);
    return jsonOut({ ok: true });
  }

  // Тест отправки письма через MailApp (из Настроек админ-панели)
  if (action === "test_email") {
    if (!verifyPin(p.pin)) return jsonOut({ ok: false, error: "Неверный пароль администратора" });
    var toAddr = String(p.to || "").trim();
    if (!toAddr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toAddr)) {
      return jsonOut({ ok: false, error: "Укажите корректный Email получателя" });
    }
    try {
      MailApp.sendEmail({
        to: toAddr,
        subject: "✦ Тест почты SAQTAA",
        name: BRAND_NAME,
        htmlBody: '<div style="font-family:Georgia,serif;padding:20px;background:#F5EFE2;border-radius:12px;border:1px solid #D9BC7F;color:#182720"><h3 style="margin:0 0 8px;color:#0F4A38">SAQTAA · Тест отправки</h3><p style="margin:0">Почта Google Apps Script работает корректно. Ответы гостей будут приходить на этот адрес.</p></div>'
      });
      return jsonOut({ ok: true, email_sent: true, to: toAddr, remaining_quota: MailApp.getRemainingDailyQuota() });
    } catch (testErr) {
      return jsonOut({ ok: false, error: String(testErr && testErr.message ? testErr.message : testErr) });
    }
  }

  // 2. ЗАГРУЗКА ФОТО С ТЕЛЕФОНА НА GOOGLE ДИСК SAQTAA
  if (action === "upload_photo") {
    if (!verifyPin(p.pin)) return jsonOut({ ok: false, error: "Доступ запрещён (неверный пароль)" });
    try {
      var b64 = String(p.base64 || "");
      var mime = String(p.mime || "image/jpeg");
      var name = "saqtaa_" + new Date().getTime() + ".jpg";
      if (!b64) return jsonOut({ ok: false, error: "Пустой файл фото" });
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
  lock.tryLock(10000);
  try {
    var db = ensureSheets();

    // 3. СОХРАНЕНИЕ ЗАКАЗА В ОБЛАЧНУЮ БАЗУ
    if (action === "save_order") {
      if (!verifyPin(p.pin)) return jsonOut({ ok: false, error: "Доступ запрещён" });
      var orderId = String(p.id || ("ord_" + new Date().getTime())).trim();
      var nowStr = Utilities.formatDate(new Date(), TIMEZONE, "dd.MM.yyyy HH:mm");
      var names = String(p.names || "").trim();
      var dateStr = String(p.date || "").trim();
      var timeStr = String(p.time || "").trim();
      var tpl = String(p.tpl || "luxury").trim();
      var email = String(p.email || "").trim();
      var inviteUrl = String(p.invite_url || "").trim();
      var statsUrl = String(p.stats_url || "").trim();
      var jsonStr = typeof p.data === "string" ? p.data : JSON.stringify(p.data || {});

      var rows = db.orders.getDataRange().getValues();
      var foundRow = -1;
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === orderId) {
          foundRow = i + 1;
          break;
        }
      }
      var rowVals = [orderId, nowStr, names, dateStr, timeStr, tpl, email, inviteUrl, statsUrl, jsonStr];
      if (foundRow > 0) {
        db.orders.getRange(foundRow, 1, 1, 10).setValues([rowVals]);
      } else {
        db.orders.appendRow(rowVals);
      }
      return jsonOut({ ok: true, id: orderId, saved_at: nowStr });
    }

    // 4. СПИСОК И ПОИСК ЗАКАЗОВ ДЛЯ АДМИНКИ
    if (action === "list_orders") {
      if (!verifyPin(p.pin)) return jsonOut({ ok: false, error: "Доступ запрещён" });
      var rows = db.orders.getDataRange().getValues();
      var list = [];
      for (var i = 1; i < rows.length; i++) {
        var r = rows[i];
        if (!r[0]) continue;
        var dVal = r[3] instanceof Date ? Utilities.formatDate(r[3], TIMEZONE, "yyyy-MM-dd") : String(r[3] || "");
        var cVal = r[1] instanceof Date ? Utilities.formatDate(r[1], TIMEZONE, "dd.MM.yyyy HH:mm") : String(r[1] || "");
        list.push({
          id: String(r[0]),
          created: cVal,
          names: String(r[2] || ""),
          date: dVal,
          time: String(r[4] || ""),
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
      if (!verifyPin(p.pin)) return jsonOut({ ok: false, error: "Доступ запрещён" });
      var targetId = String(p.id || "").trim();
      var rows = db.orders.getDataRange().getValues();
      for (var i = rows.length - 1; i >= 1; i--) {
        if (String(rows[i][0]) === targetId) {
          db.orders.deleteRow(i + 1);
          return jsonOut({ ok: true });
        }
      }
      return jsonOut({ ok: false, error: "Заказ не найден" });
    }

    // 6. ПРИЁМ ОТВЕТА ГОСТЯ (RSVP) + ОТПРАВКА ПИСЬМА НА ПОЧТУ КЛИЕНТА ЧЕРЕЗ GMAIL SAQTAA
    if (action === "rsvp") {
      if (p.botcheck) return jsonOut({ ok: true }); // Honeypot от ботов

      var name = String(p.name || "").trim().slice(0, 50);
      var fam = String(p.fam || "").trim().slice(0, 50);
      if (!name || !fam) return jsonOut({ ok: false, error: "Укажите имя и фамилию" });

      var attCode = String(p.att_code || p.att || "yes").toLowerCase();
      if (attCode.indexOf("не") !== -1 || attCode === "no") attCode = "no";
      else if (attCode.indexOf("пока") !== -1 || attCode.indexOf("maybe") !== -1) attCode = "maybe";
      else attCode = "yes";

      var rawLang = String(p.lang || "").toLowerCase().trim();
      var rawAttText = String(p.att || "").toLowerCase();
      var isBoth = (rawLang === "both");
      var isKz = (!isBoth && (rawLang === "kz" || rawLang === "kk" || (!rawLang && (rawAttText.indexOf("келед") !== -1 || rawAttText.indexOf("келмей") !== -1 || rawAttText.indexOf("білмей") !== -1))));
      var lang = isBoth ? "both" : (isKz ? "kz" : "ru");
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
      var guests = attCode === "yes" ? (Number(p.guests) || 1) : 0;

      var orderId = String(p.oid || p.order_id || "default").trim();
      var rsvpId = String(p.id || ("g_" + new Date().getTime())).trim();
      var eventTitle = String(p.title || (isBoth ? "Мерекелік шара / Праздничное торжество" : (isKz ? "Мерекелік шара" : "Праздничное торжество"))).trim();
      var eventDate = String(p.date || "").trim();
      var clientEmail = String(p.to_email || "").trim();
      var noEmail = String(p.no_email || "") === "1";

      // Антиспам: защита от частых кликов с одного rsvpId (не чаще 1 раза в 10 сек)
      var cache = CacheService.getScriptCache();
      var rateKey = "rate_" + rsvpId;
      if (cache.get(rateKey)) {
        return jsonOut({ ok: true, cached: true });
      }
      cache.put(rateKey, "1", 10);

      // Если email клиента не передан в запросе — ищем его в таблице ORDERS по orderId
      if (!clientEmail && orderId && orderId !== "default") {
        var oRows = db.orders.getDataRange().getValues();
        for (var k = 1; k < oRows.length; k++) {
          if (String(oRows[k][0]) === orderId) {
            clientEmail = String(oRows[k][6] || "").trim();
            break;
          }
        }
      }

      var now = Utilities.formatDate(new Date(), TIMEZONE, "dd.MM.yyyy HH:mm");
      var rRows = db.rsvps.getDataRange().getValues();
      var foundRsvpRow = -1;
      for (var j = 1; j < rRows.length; j++) {
        if (String(rRows[j][0]) === orderId && String(rRows[j][1]) === rsvpId) {
          foundRsvpRow = j + 1;
          break;
        }
      }

      var isUpdate = foundRsvpRow > 0;
      var rowData = [orderId, rsvpId, now, name, fam, attCode, attLabel, guests, eventTitle, clientEmail];
      if (isUpdate) {
        db.rsvps.getRange(foundRsvpRow, 1, 1, 10).setValues([rowData]);
      } else {
        db.rsvps.appendRow(rowData);
      }

      // Считаем текущую сводку по мероприятию для письма клиенту
      var allRsvps = db.rsvps.getDataRange().getValues();
      var totalYes = 0, totalNo = 0, totalMaybe = 0;
      for (var m = 1; m < allRsvps.length; m++) {
        if (String(allRsvps[m][0]) === orderId) {
          var st = String(allRsvps[m][5]);
          if (st === "yes") totalYes += (Number(allRsvps[m][7]) || 1);
          else if (st === "no") totalNo++;
          else totalMaybe++;
        }
      }

      // Отправка письма с аккаунта SAQTAA на Email клиента через MailApp (только если не выбран EmailJS)
      var emailSent = false, mailError = "";
      if (!noEmail && clientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
        try {
          var fullName = name + " " + fam;
          var subjPrefix = isBoth
            ? (isUpdate ? "Жауап өзгертілді / Изменение ответа: " : "Жаңа жауап / Новый ответ гостя: ")
            : (isUpdate
              ? (isKz ? "Жауап өзгертілді: " : "Изменение ответа: ")
              : (isKz ? "Жаңа жауап: " : "Новый ответ гостя: "));
          var subject = subjPrefix + fullName + " — " + eventTitle;
          var badgeColor = attCode === "yes" ? "#1E6F43" : (attCode === "no" ? "#9E2B3A" : "#9E7318");
          var txt = isBoth ? {
            hdr: "SAQTAA · ҚОНАҚ ЖАУАБЫ / УВЕДОМЛЕНИЕ О ГОСТЕ",
            date: "Күні / Дата: ",
            guest: "Қонақ / Гость:",
            ans: "Жауабы / Ответ:",
            time: "Уақыты / Время: ",
            upd: " (жаңартылды / обновлено)",
            stTitle: "Статистика / Текущая статистика",
            stLine: "Келеді / Придут: <b>" + totalYes + "</b> &nbsp;·&nbsp; Келмейді / Не придут: <b>" + totalNo + "</b> &nbsp;·&nbsp; Ойлануда / Думают: <b>" + totalMaybe + "</b>",
            stPlain: "Келеді / Придут: " + totalYes + " · Келмейді / Не придут: " + totalNo + " · Ойлануда / Думают: " + totalMaybe,
            brand: "SAQTAA · Цифрлық шақырулар / Цифровые приглашения"
          } : (isKz ? {
            hdr: "SAQTAA · ҚОНАҚ ТУРАЛЫ ХАБАРЛАМА",
            date: "Күні: ",
            guest: "Қонақ:",
            ans: "Жауабы:",
            time: "Жауап уақыты: ",
            upd: " (жаңартылған жауап)",
            stTitle: "Шақыру бойынша ағымдағы статистика",
            stLine: "Келеді: <b>" + totalYes + "</b> &nbsp;·&nbsp; Келмейді: <b>" + totalNo + "</b> &nbsp;·&nbsp; Ойлануда: <b>" + totalMaybe + "</b>",
            stPlain: "Келеді: " + totalYes + " · Келмейді: " + totalNo + " · Ойлануда: " + totalMaybe,
            brand: "SAQTAA · Цифрлық шақырулар"
          } : {
            hdr: "SAQTAA · УВЕДОМЛЕНИЕ О ГОСТЕ",
            date: "Дата: ",
            guest: "Гость:",
            ans: "Ответ:",
            time: "Время ответа: ",
            upd: " (обновлённый ответ)",
            stTitle: "Текущая статистика по вашему приглашению",
            stLine: "Придут: <b>" + totalYes + "</b> &nbsp;·&nbsp; Не придут: <b>" + totalNo + "</b> &nbsp;·&nbsp; Думают: <b>" + totalMaybe + "</b>",
            stPlain: "Придут: " + totalYes + " · Не придут: " + totalNo + " · Думают: " + totalMaybe,
            brand: BRAND_NAME
          });
          var plainBody = [
            eventTitle + (eventDate ? " (" + eventDate + ")" : ""),
            txt.guest + " " + fullName,
            txt.ans + " " + attLabel,
            txt.time + now + (isUpdate ? txt.upd : ""),
            txt.stPlain
          ].join("\n");
          var htmlBody = [
            '<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#F5EFE2;padding:24px;border-radius:14px;color:#182720;border:1px solid #D9BC7F">',
            '  <div style="text-align:center;border-bottom:1px solid rgba(24,39,32,0.15);padding-bottom:14px;margin-bottom:18px">',
            '    <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#B98E45;font-weight:bold">' + txt.hdr + '</div>',
            '    <h2 style="margin:6px 0 2px;font-size:22px;color:#0F4A38">' + eventTitle + '</h2>',
            (eventDate ? '<div style="font-size:13px;color:#46584D">' + txt.date + eventDate + '</div>' : ''),
            '  </div>',
            '  <div style="background:#FFFDF6;padding:18px;border-radius:10px;border:1px solid rgba(24,39,32,0.12);margin-bottom:18px">',
            '    <p style="margin:0 0 10px;font-size:15px"><strong>' + txt.guest + '</strong> ' + fullName + '</p>',
            '    <p style="margin:0 0 10px;font-size:15px"><strong>' + txt.ans + '</strong> <span style="color:' + badgeColor + ';font-weight:bold">' + attLabel + '</span></p>',
            '    <p style="margin:0;font-size:12px;color:#46584D">' + txt.time + now + (isUpdate ? txt.upd : '') + '</p>',
            '  </div>',
            '  <div style="background:#0F4A38;color:#F6F1E4;padding:14px 16px;border-radius:10px;font-size:13px;text-align:center">',
            '    <div style="color:#D9BC7F;font-weight:bold;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;font-size:11px">' + txt.stTitle + '</div>',
            '    ' + txt.stLine,
            '  </div>',
            '</div>'
          ].join("\n");

          MailApp.sendEmail({
            to: clientEmail,
            subject: subject,
            name: txt.brand,
            body: plainBody,
            htmlBody: htmlBody
          });
          emailSent = true;
        } catch (mailErr) {
          mailError = String(mailErr && mailErr.message ? mailErr.message : mailErr);
        }
      }

      return jsonOut({ ok: true, id: rsvpId, updated: isUpdate, email_sent: emailSent, mail_error: mailError });
    }

    // 7. ПОЛУЧЕНИЕ ЖИВОЙ СТАТИСТИКИ ДЛЯ КЛИЕНТА (stats.html)
    if (action === "stats" || action === "get") {
      var filterOrderId = String(p.oid || p.order_id || "").trim();
      var rRows = db.rsvps.getDataRange().getValues();
      var outRows = [];
      for (var i = 1; i < rRows.length; i++) {
        var r = rRows[i];
        if (!r[3] && !r[4]) continue;
        if (filterOrderId && String(r[0]) !== filterOrderId) continue;
        var tVal = r[2] instanceof Date ? Utilities.formatDate(r[2], TIMEZONE, "dd.MM.yyyy HH:mm") : String(r[2] || "");
        outRows.push({
          oid: String(r[0] || ""),
          id: String(r[1] || ""),
          time: tVal,
          name: String(r[3] || ""),
          fam: String(r[4] || ""),
          att: String(r[5] || "yes"),
          att_label: String(r[6] || ""),
          guests: Number(r[7] || 0),
          title: String(r[8] || "")
        });
      }
      return jsonOut({ ok: true, rows: outRows });
    }

    return jsonOut({ ok: true, status: "SAQTAA Server Active" });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
