// Page de téléchargement de l'application mobile (Android : APK de test ; iPhone : TestFlight).
import { bindLangSwitch, initI18n, lang, langSwitch } from "../shared/i18n.js";
import { LOGO, WORDMARK, icon, initTheme, qrSvg } from "../shared/ui.js";

initTheme();
const APK = "WawID-eVisa-android.apk";

function render() {
  const en = lang() === "en";
  const T = (fr, e) => (en ? e : fr);
  app.innerHTML = `
  <header class="p-nav"><nav class="p-nav-bar">
    <a class="brand" href="../"><span class="brand-logo">${LOGO}</span><span><span class="brand-name">${WORDMARK}</span><br><span class="brand-sub">${T("Application mobile", "Mobile app")}</span></span></a>
    <div class="p-links"><a href="../">${T("Portail voyageur", "Traveler portal")}</a><a href="../aide/">${T("Aide", "Help")}</a></div>
    ${langSwitch()}
  </nav></header>
  <main class="p-main" data-no-i18n>
    <section style="margin:8px 0 22px">
      <h1 style="margin:0 0 8px">${T("WawID e-Visa sur votre téléphone", "WawID e-Visa on your phone")}</h1>
      <p class="muted" style="max-width:720px">${T("Scannez votre passeport, lisez sa puce en NFC et déposez votre demande d'e-Visa pour le Sénégal. Version de test.", "Scan your passport, read its chip over NFC and apply for your Senegal e-Visa. Test version.")}</p>
    </section>
    <div class="dl-grid">
      <article class="card dl-card">
        <h2>Android</h2>
        <div class="dl-qr">${qrSvg(new URL(APK, location.href).href)}<div>
          <a class="btn primary" href="${APK}" download>${icon("download")} ${T("Télécharger l'APK", "Download the APK")}</a>
          <p class="small muted" style="margin-top:8px">${T("Android 7 ou plus récent, ARM 64 bits (34 Mo).", "Android 7 or later, 64-bit ARM (34 MB).")}</p>
        </div></div>
        <ol>
          <li>${T("Ouvrez cette page sur le téléphone, ou scannez le QR code.", "Open this page on the phone, or scan the QR code.")}</li>
          <li>${T("Téléchargez l'APK puis ouvrez-le.", "Download the APK, then open it.")}</li>
          <li>${T("Autorisez « Installer des applications inconnues » pour le navigateur si Android le demande.", "Allow “Install unknown apps” for the browser if Android asks.")}</li>
          <li>${T("Activez le NFC (Paramètres → Appareils connectés).", "Turn NFC on (Settings → Connected devices).")}</li>
        </ol>
        <p class="small muted">${T("Version de test signée hors Google Play : Play Protect peut afficher un avertissement. La version officielle passera par Google Play.", "Test build signed outside Google Play: Play Protect may show a warning. The official release will go through Google Play.")}</p>
      </article>
      <article class="card dl-card">
        <h2>iPhone</h2>
        <ol>
          <li>${T("Installez l'app TestFlight depuis l'App Store.", "Install the TestFlight app from the App Store.")}</li>
          <li>${T("Acceptez l'invitation reçue par e-mail (testeurs ajoutés dans App Store Connect).", "Accept the e-mail invitation (testers are added in App Store Connect).")}</li>
          <li>${T("Installez « WawID e-Visa » depuis TestFlight.", "Install “WawID e-Visa” from TestFlight.")}</li>
        </ol>
        <p class="small muted">${T("iPhone 7 ou plus récent, iOS 15.5 minimum. Apple n'autorise pas l'installation hors App Store / TestFlight.", "iPhone 7 or later, iOS 15.5 minimum. Apple does not allow installation outside the App Store / TestFlight.")}</p>
      </article>
      <article class="card dl-card">
        <h2>${T("Tester", "Testing")}</h2>
        <ol>
          <li>${T("Nouvelle demande → scannez la bande MRZ (2 lignes en bas de la page photo).", "New application → scan the MRZ band (2 lines at the bottom of the photo page).")}</li>
          <li>${T("Lire la puce NFC : passeport fermé à plat, téléphone posé sur la couverture, sans bouger.", "Read the NFC chip: passport closed and flat, phone on the cover, keep still.")}</li>
          <li>${T("Complétez le séjour, payez (démonstration) et notez la référence EV….", "Complete your stay, pay (demo) and note the EV… reference.")}</li>
          <li>${T("Vérifiez la demande dans le back-office : e-Visa → Toutes.", "Check the application in the back office: e-Visa → All.")}</li>
        </ol>
      </article>
    </div>
  </main>`;
  bindLangSwitch(app);
}

const app = document.getElementById("app");
initI18n("../").then(render);
