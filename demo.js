const params=new URLSearchParams(location.search);
const templateNames=["luxury","floral","qazaq","editorial","emerald"];
const template=templateNames.includes(params.get("template"))?params.get("template"):"luxury";
const templateImages={luxury:"images/optimized/luxury-hero.jpg",floral:"images/optimized/floral-hero.jpg",qazaq:"images/optimized/qazaq-hero.jpg",editorial:"images/optimized/editorial-hero.jpg",emerald:"images/optimized/emerald-hero.jpg"};
let lang=params.get("lang")==="kz"?"kz":"ru";
let photo=params.get("photo")!=="0";
const defaults={eventTitle:"",brideName:"",groomName:"",eventDate:"2027-08-15",eventTime:"18:00",venue:"Ресторан Астана",address:"Астана, Казахстан",city:"astana",cityName:"",twoGisUrl:"",formspreeEndpoint:""};
const copy={
  ru:{back:"Коллекция",language:"Язык",scrollLabel:"Прокрутить к приглашению",photoAlt:"Фото для приглашения",upload:"Заменить фото",photo:"С фото",noPhoto:"Без фото",kicker:"ПРИГЛАШЕНИЕ НА ТОРЖЕСТВО",eventTitle:"Свадебное торжество",noPhotoTitle:"День нашей свадьбы",wife:"Жена",husband:"Муж",overline:"С БОЛЬШОЙ РАДОСТЬЮ",heading:"Приглашаем разделить с нами этот особенный день",description:"Будем счастливы видеть вас рядом и вместе сохранить тёплые воспоминания об этом дне.",dateTime:"ДАТА И ВРЕМЯ",countdown:"До встречи осталось",today:"Сегодня встречаемся!",past:"Это событие уже состоялось",venueLabel:"МЕСТО ВСТРЕЧИ",map:"Открыть в 2ГИС",rsvpOverline:"ПОДТВЕРЖДЕНИЕ ПРИСУТСТВИЯ",rsvpTitle:"Ждём вашего ответа",rsvpNote:"Пожалуйста, сообщите, сможете ли вы быть с нами.",firstName:"Имя",lastName:"Фамилия",firstNamePlaceholder:"Введите имя",lastNamePlaceholder:"Введите фамилию",yes:"Конечно, приду",no:"К сожалению, не смогу прийти",maybe:"Пока не могу ответить",closing:"С нетерпением ждём встречи с вами",disclaimer:"Демонстрационный шаблон. Данные можно изменить в настройках проекта.",alert:"Укажите имя и выберите вариант ответа.",noEndpoint:"Форма пока не подключена к организатору. Добавьте Formspree endpoint в js/config.js.",sent:"Ответ отправлен. Спасибо!",sendError:"Не удалось отправить ответ. Попробуйте позже.",days:"дней",hours:"часов",minutes:"минут",seconds:"секунд"},
  kz:{back:"Дизайндар",language:"Тіл",scrollLabel:"Шақыруға өту",photoAlt:"Шақыруға арналған сурет",upload:"Фотосуретті ауыстыру",photo:"Фотомен",noPhoto:"Фотосуретсіз",kicker:"МЕРЕКЕГЕ ШАҚЫРУ",eventTitle:"Үйлену тойы",noPhotoTitle:"Жас жұбайлар",wife:"Әйелі",husband:"Күйеуі",overline:"ШЫН ЖҮРЕКТЕН",heading:"Осы ерекше күнімізді бізбен бірге атап өтіңіз",description:"Сізді жанымыздан көріп, осы күннің жылы естеліктерін бірге сақтауға қуаныштымыз.",dateTime:"КҮНІ МЕН УАҚЫТЫ",countdown:"Кездесуге дейін",today:"Бүгін кездесеміз!",past:"Бұл іс-шара өтіп кетті",venueLabel:"КЕЗДЕСУ ОРНЫ",map:"2ГИС-те ашу",rsvpOverline:"ҚАТЫСУДЫ РАСТАУ",rsvpTitle:"Жауабыңызды күтеміз",rsvpNote:"Бізбен бірге бола алатыныңызды хабарлаңыз.",firstName:"Аты",lastName:"Тегі",firstNamePlaceholder:"Атыңызды енгізіңіз",lastNamePlaceholder:"Тегіңізді енгізіңіз",yes:"Әрине, келемін",no:"Өкінішке қарай, келе алмаймын",maybe:"Әзірше жауап бере алмаймын",closing:"Сізбен кездесуді асыға күтеміз",disclaimer:"Демонстрациялық үлгі. Мәліметтерді жоба баптауларынан өзгертуге болады.",alert:"Атыңызды жазып, жауап нұсқасын таңдаңыз.",noEndpoint:"Форма әлі қосылмаған. js/config.js файлына Formspree endpoint енгізіңіз.",sent:"Жауабыңыз жіберілді. Рақмет!",sendError:"Жауап жіберілмеді. Кейінірек қайталап көріңіз.",days:"күн",hours:"сағат",minutes:"минут",seconds:"секунд"}
};
copy.ru.submit="Отправить ответ";
copy.ru.brand="SAQTAA · ЦИФРОВЫЕ ПРИГЛАШЕНИЯ";
copy.ru.firstNameRequired="Пожалуйста, укажите имя.";
copy.ru.lastNameRequired="Пожалуйста, укажите фамилию.";
copy.ru.attendanceRequired="Выберите, сможете ли вы прийти.";
copy.kz.submit="Жауапты жіберу";
copy.kz.brand="SAQTAA · ЦИФРЛЫҚ ШАҚЫРУЛАР";
copy.kz.firstNameRequired="Атыңызды енгізіңіз.";
copy.kz.lastNameRequired="Тегіңізді енгізіңіз.";
copy.kz.attendanceRequired="Қатысу жауабының бірін таңдаңыз.";
const occasionCopy={
  editorial:{
    ru:{title:"Юбилейный вечер",noPhotoTitle:"Вечер в честь юбилея",kicker:"ПРИГЛАШЕНИЕ НА ЮБИЛЕЙ",overline:"ВАЖНЫЙ ПОВОД",heading:"Приглашаем отметить этот день вместе",description:"Будем рады разделить этот особенный вечер с вами."},
    kz:{title:"Мерейтой кеші",noPhotoTitle:"Мерейтой кеші",kicker:"МЕРЕЙТОЙҒА ШАҚЫРУ",overline:"ЕРЕКШЕ КҮН",heading:"Осы мерекені бірге атап өтуге шақырамыз",description:"Осы ерекше кеште сізді көргенімізге қуаныштымыз."}
  },
  emerald:{
    ru:{title:"День рождения",noPhotoTitle:"Праздничный вечер",kicker:"ПРИГЛАШЕНИЕ НА ДЕНЬ РОЖДЕНИЯ",overline:"ПРИГЛАШЕНИЕ НА ПРАЗДНИК",heading:"Приглашаем отпраздновать вместе",description:"Будем рады видеть вас среди гостей в этот особенный день."},
    kz:{title:"Туған күн",noPhotoTitle:"Мерекелік кеш",kicker:"ТУҒАН КҮНГЕ ШАҚЫРУ",overline:"МЕРЕКЕГЕ ШАҚЫРУ",heading:"Мерекемізді бірге атап өтуге шақырамыз",description:"Осы ерекше күні қонақтарымыздың қатарында болғаныңызға қуаныштымыз."}
  }
};
let t=copy[lang];
const invitation=document.getElementById("invitation");
invitation.classList.add(template);
const inviteImage=document.getElementById("inviteImage");
inviteImage.addEventListener("error",()=>invitation.classList.add("image-unavailable"));
inviteImage.addEventListener("load",()=>invitation.classList.remove("image-unavailable"));
if(photo)inviteImage.src=templateImages[template];
const observer="IntersectionObserver" in window?new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target)}}),{threshold:.12}):null;
document.querySelectorAll(".invitation-intro,.details-section,.venue-section,.rsvp-section,.invitation-footer").forEach(el=>{el.classList.add("demo-reveal");if(observer)observer.observe(el);else el.classList.add("is-visible")});
function eventDateFrom(settings){const value=settings.eventDate||defaults.eventDate;const [y,m,d]=value.split("-").map(Number);const [h,min]=String(settings.eventTime||defaults.eventTime).split(":").map(Number);return new Date(y,m-1,d,h,min)}
function applyLanguage(){
  t=copy[lang];document.documentElement.lang=lang;document.title=`${template.toUpperCase()} — SAQTAA`;
  document.getElementById("templateName").textContent=template.toUpperCase();
  const settings={...defaults,...(window.SAQTAA_CONFIG||{})};
  const occasion=occasionCopy[template]?.[lang]||{};
  const labels={backLabel:"back",languageLabel:"language",uploadLabel:"upload",inviteKicker:"kicker",inviteOverline:"overline",inviteHeading:"heading",inviteDescription:"description",eventSectionKicker:"dateTime",countdownTitle:"countdown",venueLabel:"venueLabel",mapLinkLabel:"map",rsvpOverline:"rsvpOverline",rsvpTitle:"rsvpTitle",rsvpNote:"rsvpNote",guestFirstNameLabel:"firstName",guestLastNameLabel:"lastName",answerYes:"yes",answerNo:"no",answerMaybe:"maybe",rsvpSubmit:"submit",inviteClosing:"closing",inviteBrand:"brand",demoDisclaimer:"disclaimer"};
  Object.entries(labels).forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.textContent=t[key]});
  if(occasion.kicker){document.getElementById("inviteKicker").textContent=occasion.kicker;document.getElementById("inviteOverline").textContent=occasion.overline;document.getElementById("inviteHeading").textContent=occasion.heading;document.getElementById("inviteDescription").textContent=occasion.description}
  document.getElementById("backLink").href=`index.html?lang=${lang}`;
  document.getElementById("languageSelect").setAttribute("aria-label",t.language);
  document.querySelector(".scroll-cue").setAttribute("aria-label",t.scrollLabel);
  document.getElementById("inviteImage").alt=t.photoAlt;
  const date=eventDateFrom(settings),locale=lang==="ru"?"ru-RU":"kk-KZ";
  const displayDate=new Intl.DateTimeFormat(locale,{day:"numeric",month:"long",year:"numeric"}).format(date);
  document.getElementById("coverDate").textContent=displayDate.toLocaleUpperCase(locale);
  document.getElementById("inviteDate").textContent=displayDate;
  document.getElementById("inviteTime").textContent=settings.eventTime||defaults.eventTime;
  document.getElementById("eventTitle").textContent=(!photo&&!settings.eventTitle)?(occasion.noPhotoTitle||t.noPhotoTitle):(settings.eventTitle||occasion.title||t.eventTitle);
  document.getElementById("brideName").textContent=settings.brideName||t.wife;
  document.getElementById("groomName").textContent=settings.groomName||t.husband;
  document.getElementById("guestFirstName").placeholder=t.firstNamePlaceholder;
  document.getElementById("guestLastName").placeholder=t.lastNamePlaceholder;
  document.getElementById("venueName").textContent=settings.venue||defaults.venue;
  document.getElementById("venueAddress").textContent=settings.address||defaults.address;
  const city=settings.city||defaults.city;
  const map=settings.twoGisUrl||`https://2gis.kz/${encodeURIComponent(city)}/search/${encodeURIComponent(`${settings.venue||defaults.venue} ${settings.address||defaults.address}`)}`;
  document.getElementById("mapLink").href=map;
  document.getElementById("photoLabel").textContent=photo?t.photo:t.noPhoto;
  document.getElementById("languageSelect").value=lang;
  invitation.classList.toggle("no-photo",!photo);
  invitation.classList.toggle("non-wedding",template==="editorial"||template==="emerald");
  updateCountdown(date);
}
function russianUnit(value,one,few,many){const lastTwo=value%100,last=value%10;return lastTwo>=11&&lastTwo<=14?many:last===1?one:last>=2&&last<=4?few:many}
function updateCountdown(date){
  const now=new Date(),remaining=Math.max(0,date.getTime()-now.getTime()),complete=date<=now;
  const countdown=document.getElementById("eventCountdown");countdown.classList.toggle("is-complete",complete);
  if(complete){document.getElementById("countdownTitle").textContent=date.toDateString()===now.toDateString()?t.today:t.past;return}
  document.getElementById("countdownTitle").textContent=t.countdown;
  const values=[Math.floor(remaining/86400000),Math.floor(remaining%86400000/3600000),Math.floor(remaining%3600000/60000),Math.floor(remaining%60000/1000)];
  const units=lang==="ru"?[russianUnit(values[0],"день","дня","дней"),russianUnit(values[1],"час","часа","часов"),russianUnit(values[2],"минута","минуты","минут"),russianUnit(values[3],"секунда","секунды","секунд")]:[t.days,t.hours,t.minutes,t.seconds];
  ["Days","Hours","Minutes","Seconds"].forEach((unit,index)=>{document.getElementById(`countdown${unit}`).textContent=String(values[index]).padStart(index===0?3:2,"0");document.getElementById(`countdown${unit}Unit`).textContent=units[index]});
}
document.getElementById("languageSelect").addEventListener("change",event=>{
  lang=event.target.value;
  const url=new URL(location.href);url.searchParams.set("lang",lang);
  try{history.replaceState(null,"",url)}catch{}
  applyLanguage();
});
document.getElementById("photoToggle").checked=photo;
document.getElementById("photoToggle").addEventListener("change",event=>{photo=event.target.checked;if(photo&&!inviteImage.getAttribute("src"))inviteImage.src=templateImages[template];applyLanguage()});
document.getElementById("photoInput").addEventListener("change",event=>{const file=event.target.files?.[0];if(!file)return;const image=document.getElementById("inviteImage");const objectUrl=URL.createObjectURL(file);image.onload=()=>URL.revokeObjectURL(objectUrl);image.onerror=()=>URL.revokeObjectURL(objectUrl);image.src=objectUrl;photo=true;document.getElementById("photoToggle").checked=true;applyLanguage()});
const attendanceButtons=[...document.querySelectorAll("[data-attendance]")];
const attendanceValue=document.getElementById("attendanceValue");
function setFormMessage(message){document.getElementById("formMessage").textContent=message}
attendanceButtons.forEach(button=>button.addEventListener("click",()=>{
  attendanceValue.value=button.dataset.attendance;
  attendanceButtons.forEach(option=>{
    const selected=option===button;
    option.classList.toggle("is-selected",selected);
    option.setAttribute("aria-pressed",String(selected));
  });
  setFormMessage("");
}));
document.getElementById("guestFirstName").addEventListener("input",event=>{event.currentTarget.setAttribute("aria-invalid","false");setFormMessage("")});
document.getElementById("guestLastName").addEventListener("input",event=>{event.currentTarget.setAttribute("aria-invalid","false");setFormMessage("")});
document.getElementById("rsvpForm").addEventListener("submit",async event=>{
  event.preventDefault();const firstName=document.getElementById("guestFirstName");const lastName=document.getElementById("guestLastName");
  if(!firstName.value.trim()){firstName.setAttribute("aria-invalid","true");setFormMessage(t.firstNameRequired);firstName.focus();return}
  if(!lastName.value.trim()){lastName.setAttribute("aria-invalid","true");setFormMessage(t.lastNameRequired);lastName.focus();return}
  if(!attendanceValue.value){setFormMessage(t.attendanceRequired);attendanceButtons[0].focus();return}
  const endpoint=window.SAQTAA_CONFIG?.formspreeEndpoint||"";
  if(!endpoint){setFormMessage(t.noEndpoint);return}
  try{
    const response=await fetch(endpoint,{method:"POST",body:new FormData(event.currentTarget),headers:{Accept:"application/json"}});
    if(!response.ok)throw new Error("RSVP failed");
    setFormMessage(t.sent);event.currentTarget.reset();attendanceValue.value="";
    attendanceButtons.forEach(option=>{option.classList.remove("is-selected");option.setAttribute("aria-pressed","false")});
  }catch(error){setFormMessage(t.sendError)}
});
applyLanguage();
setInterval(()=>updateCountdown(eventDateFrom({...defaults,...(window.SAQTAA_CONFIG||{})})),1000);
