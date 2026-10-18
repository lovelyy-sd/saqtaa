const catalogCopy = {
  ru: {
    pageTitle:"SAQTAA — цифровые приглашения",
    metaDescription:"Цифровые приглашения SAQTAA для особенных событий: пять авторских дизайнов, карта 2ГИС, обратный отсчёт и подтверждение присутствия.",
    navDesigns:"Дизайны",navProcess:"Как заказать",eyebrow:"ЦИФРОВЫЕ ПРИГЛАШЕНИЯ",
    heroTitle:'Ваш особенный день.<br><em>В красивой форме.</em>',
    heroCopy:"Индивидуальные онлайн-приглашения — с вниманием к каждой детали.",artSmall:"ОДИН ДЕНЬ · НАВСЕГДА",artScript:"Вместе",artNames:"Особенное событие",viewDesigns:"Выбрать дизайн",
    collection:"КОЛЛЕКЦИЯ",chooseStyle:"Выберите свой стиль",
    collectionCopy:"Каждый дизайн доступен на русском и казахском языке — с фотографиями или без них.",
    includedEyebrow:"В КАЖДОМ ПРИГЛАШЕНИИ",includedTitle:"Всё важное — в одном месте",
    includedCountdown:"Обратный отсчёт",includedCountdownCopy:"Гости видят, сколько осталось до вашего события.",
    includedMap:"Место встречи",includedMapCopy:"Кнопка ведёт гостей к месту проведения в 2ГИС.",
    includedRsvp:"Ответ гостей",includedRsvpCopy:"Удобные варианты ответа о присутствии.",
    processEyebrow:"ПРОСТОЙ ПРОЦЕСС",processTitle:"От идеи до вашей ссылки",
    step1Title:"Выберите дизайн",step1Copy:"Посмотрите демо и выберите подходящий стиль.",
    step2Title:"Передайте детали",step2Copy:"Имена, дату, место, язык и фотографии — если нужны.",
    step3Title:"Получите ссылку",step3Copy:"Готовое приглашение, которым удобно делиться с гостями.",
    footerTitle:"Сохраняй моменты, которые хочется помнить.",footerCopy:"Цифровые приглашения для особенных событий.",footerBrand:"ЦИФРОВЫЕ ПРИГЛАШЕНИЯ",
    viewDemo:"Смотреть демо",order:"Заказать в WhatsApp",photo:"С фото",noPhoto:"Без фото",
    langRu:"Русский",langKz:"Қазақша",switchLabel:"Переключить язык на казахский"
  },
  kz: {
    pageTitle:"SAQTAA — цифрлық шақырулар",
    metaDescription:"SAQTAA ерекше күндерге арналған цифрлық шақырулар: бес дизайн, 2ГИС картасы, кері санақ және қатысуды растау.",
    navDesigns:"Дизайндар",navProcess:"Тапсырыс",eyebrow:"ЦИФРЛЫҚ ШАҚЫРУЛАР",
    heroTitle:'Ерекше күніңіз.<br><em>Әсем безендірумен.</em>',
    heroCopy:"Ерекше күндерге арналған жеке онлайн-шақырулар — әр бөлшегіне мән бере отырып.",artSmall:"БІР КҮН · ЕСТЕ ҚАЛАР",artScript:"Бірге",artNames:"Ерекше күн",viewDesigns:"Дизайн таңдау",
    collection:"ЖИНАҚ",chooseStyle:"Өзіңізге лайық стильді таңдаңыз",
    collectionCopy:"Әр дизайн қазақ және орыс тілдерінде, фотосуретпен немесе фотосуретсіз қолжетімді.",
    includedEyebrow:"ӘР ШАҚЫРУДА",includedTitle:"Маңыздының бәрі бір жерде",
    includedCountdown:"Кері санақ",includedCountdownCopy:"Қонақтар мерекеге дейін қанша уақыт қалғанын көреді.",
    includedMap:"Кездесу орны",includedMapCopy:"Түйме қонақтарға мекенжайды 2ГИС-тен ашуға көмектеседі.",
    includedRsvp:"Қонақтардың жауабы",includedRsvpCopy:"Қатысу туралы жауап берудің ыңғайлы нұсқалары.",
    processEyebrow:"ҚАРАПАЙЫМ ҮДЕРІС",processTitle:"Идеядан дайын сілтемеге дейін",
    step1Title:"Дизайн таңдаңыз",step1Copy:"Демо нұсқаларын қарап, өзіңізге ұнаған стильді таңдаңыз.",
    step2Title:"Мәліметтерді жіберіңіз",step2Copy:"Есімдер, күн, орын, тіл және қажет болса фотосуреттер.",
    step3Title:"Сілтемені алыңыз",step3Copy:"Қонақтармен бөлісуге дайын жеке шақыру.",
    footerTitle:"Есте сақтағыңыз келетін сәттерді сақтаңыз.",footerCopy:"Ерекше күндерге арналған цифрлық шақырулар.",footerBrand:"ЦИФРЛЫҚ ШАҚЫРУЛАР",
    viewDemo:"Демоны көру",order:"WhatsApp арқылы тапсырыс беру",photo:"Фотомен",noPhoto:"Фотосуретсіз",
    langRu:"Русский",langKz:"Қазақша",switchLabel:"Тілді орысшаға ауыстыру"
  }
};
const designs = [
  {id:"luxury",name:"Luxury",sub:{ru:"Молочный · шампань · золото",kz:"Сүт түсті · шампань · алтын"},occasion:{ru:"СВАДЬБА",kz:"ҮЙЛЕНУ ТОЙЫ"},preview:{ru:["Свадебное торжество","Муж & Жена"],kz:["Үйлену тойы","Жас жұбайлар"]},number:"01",style:"luxury",cardImage:"images/optimized/luxury-card.jpg"},
  {id:"floral",name:"Floral",sub:{ru:"Цветы · пудровые оттенки",kz:"Гүлдер · нәзік реңктер"},occasion:{ru:"СВАДЬБА",kz:"ҮЙЛЕНУ ТОЙЫ"},preview:{ru:["Свадебное торжество","Муж & Жена"],kz:["Үйлену тойы","Жас жұбайлар"]},number:"02",style:"floral",cardImage:"images/optimized/floral-card.jpg"},
  {id:"qazaq",name:"Qazaq",sub:{ru:"Современная казахская эстетика",kz:"Заманауи қазақы эстетика"},occasion:{ru:"СВАДЬБА",kz:"ҮЙЛЕНУ ТОЙЫ"},preview:{ru:["Свадебное торжество","Муж & Жена"],kz:["Үйлену тойы","Жас жұбайлар"]},number:"03",style:"qazaq",cardImage:"images/optimized/qazaq-card.jpg"},
  {id:"editorial",name:"Editorial",sub:{ru:"Журнальный · чёрно-белый",kz:"Журнал стилі · ақ-қара"},occasion:{ru:"ЮБИЛЕЙ",kz:"МЕРЕЙТОЙ"},preview:{ru:["Юбилейный вечер","С близкими"],kz:["Мерейтой кеші","Жақындармен бірге"]},number:"04",style:"editorial",cardImage:"images/optimized/editorial-card.jpg"},
  {id:"emerald",name:"Emerald",sub:{ru:"Изумрудный · золото",kz:"Изумруд · алтын"},occasion:{ru:"ДЕНЬ РОЖДЕНИЯ",kz:"ТУҒАН КҮН"},preview:{ru:["День рождения","В кругу друзей"],kz:["Туған күн","Достар ортасында"]},number:"05",style:"emerald",cardImage:"images/optimized/emerald-card.jpg"}
];
let lang = new URLSearchParams(location.search).get("lang")==="kz"?"kz":"ru";
const grid = document.getElementById("designGrid");
const switcher = document.getElementById("languageSwitch");
const revealObserver = "IntersectionObserver" in window ? new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){entry.target.classList.add("is-visible");revealObserver.unobserve(entry.target)}
}),{threshold:.12,rootMargin:"0px 0px -28px 0px"}) : null;
function revealContent(){
  if(revealObserver)revealObserver.disconnect();
  document.querySelectorAll(".catalog-hero,.process-section,.design-section,.design-card,.included-section,.included-grid article,.brand-footer-card").forEach(el=>{
    el.classList.add("reveal-on-scroll");
    if(revealObserver)revealObserver.observe(el);else el.classList.add("is-visible");
  });
}
function render(){
  document.documentElement.lang = lang;
  document.title=catalogCopy[lang].pageTitle;
  document.querySelector('meta[name="description"]').content=catalogCopy[lang].metaDescription;
  document.querySelectorAll(".wordmark,.brand-footer-name").forEach(link=>link.href=`index.html?lang=${lang}`);
  document.querySelectorAll("[data-i18n]").forEach(el=>{const key=el.dataset.i18n;if(catalogCopy[lang][key])el.innerHTML=catalogCopy[lang][key]});
  switcher.textContent = lang === "ru" ? "ҚАЗ" : "РУС";
  switcher.setAttribute("aria-label",catalogCopy[lang].switchLabel);
  grid.innerHTML = designs.map(d=>`
    <article class="design-card">
      <a class="design-preview ${d.style}" href="demo.html?template=${d.id}&lang=${lang}&photo=1" aria-label="${d.name} — ${catalogCopy[lang].viewDemo}">
        <img class="preview-photo" src="${d.cardImage}" alt="" aria-hidden="true" loading="lazy" decoding="async">
        <span class="preview-vignette" aria-hidden="true"></span>
        <div class="preview-paper"><span class="preview-label">${d.occasion[lang]}</span><div class="preview-heading">${d.preview[lang][0]}</div><div class="preview-names">${d.preview[lang][1]}</div><span class="preview-date">15 / 08 / 2027</span></div>
      </a>
      <div class="card-meta"><div><span class="occasion-tag">${d.occasion[lang]}</span><h3>${d.name}</h3><p>${d.sub[lang]}</p></div><span class="card-number">${d.number} / 05</span></div>
      <div class="card-actions">
        <a class="small-link" href="demo.html?template=${d.id}&lang=${lang}&photo=1">${catalogCopy[lang].viewDemo} · ${catalogCopy[lang].photo}</a>
        <a class="small-link" href="demo.html?template=${d.id}&lang=${lang}&photo=0">${catalogCopy[lang].noPhoto}</a>
        <button class="small-button order-button" data-template="${d.name}">${catalogCopy[lang].order}</button>
      </div>
    </article>`).join("");
  grid.querySelectorAll(".preview-photo").forEach(img=>img.addEventListener("error",()=>img.closest(".design-preview")?.classList.add("image-unavailable"),{once:true}));
  document.querySelectorAll(".order-button").forEach(btn=>btn.addEventListener("click",()=>orderWhatsApp(btn.dataset.template)));
  revealContent();
}
function orderWhatsApp(template){
  const phone = window.SAQTAA_CONFIG?.whatsappNumber || "YOUR_WHATSAPP_NUMBER";
  const message = lang==="ru" ? `Здравствуйте! Хочу заказать приглашение в дизайне ${template}. Расскажите, пожалуйста, о следующих шагах.` : `Сәлеметсіз бе! ${template} дизайнындағы шақыруға тапсырыс бергім келеді. Келесі қадамдар туралы айтып беріңізші.`;
  if(phone==="YOUR_WHATSAPP_NUMBER"){alert(lang==="ru"?"Сначала укажите номер WhatsApp в js/config.js.":"Алдымен js/config.js файлына WhatsApp нөмірін енгізіңіз.");return}
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`,"_blank","noopener");
}
switcher.addEventListener("click",()=>{
  lang=lang==="ru"?"kz":"ru";
  const url=new URL(location.href);url.searchParams.set("lang",lang);
  try{history.replaceState(null,"",url)}catch{}
  render();
});
render();

