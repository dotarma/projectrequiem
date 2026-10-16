import { COPY, MODES, FAQS } from './content.js';

const ZIP = 'Project-Requiem-0.3.0-pre.5.zip';
const SHA = '1c854d699abb073cb07a803735fea1fb168e78fab8e64cad54da7c37ac91618c';
const COMMAND = "powershell -NoProfile -ExecutionPolicy Bypass -File .\\Install.ps1 `\n  -GamePath 'C:\\Games\\Resident Evil Requiem'";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let language = 'en';
try { language = localStorage.getItem('project-requiem-site-language') === 'vi' ? 'vi' : 'en'; } catch {}
let mode = 'standard';
let panic = false;

function format(value, digits) {
  return new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(value);
}

function updateStress() {
  const stress = Number($('#stress-slider').value);
  if (stress >= 100) panic = true;
  else if (stress <= 90) panic = false;
  $('#stress-value').textContent = stress;
  $('#stress-slider').style.setProperty('--progress', `${stress}%`);
  const values = {
    heal: [45 * (1 - 0.25 * stress / 100), 1, '%'],
    damage: [1.45 * (1 + 0.15 * stress / 100), 2, '×'],
    reload: [1.5 * (1 + 0.25 * stress / 100), 2, '×'],
    jam: [16 * (0.5 + 0.5 * stress / 100), 1, '%'],
  };
  for (const [key, [value, digits, unit]] of Object.entries(values)) {
    const output = $(`#metric-${key}`);
    output.replaceChildren(document.createTextNode(format(value, digits)));
    const suffix = document.createElement('span');
    suffix.textContent = unit;
    output.append(suffix);
  }
  $('#bar-heal').style.width = `${values.heal[0]}%`;
  $('#bar-damage').style.width = `${values.damage[0] / 2 * 100}%`;
  $('#bar-reload').style.width = `${values.reload[0] / 2 * 100}%`;
  $('#bar-jam').style.width = `${values.jam[0] / 20 * 100}%`;
  $('#panic-label').textContent = COPY[language][panic ? 'panic_on' : 'panic_off'];
  $('.panic-state').classList.toggle('active', panic);
  $('#stress-slider').setAttribute('aria-label', COPY[language].stress_label);
}

function renderMode() {
  const data = MODES[language][mode];
  $('#mode-tag').textContent = data.tag;
  $('#mode-title').textContent = data.title;
  $('#mode-body').textContent = data.body;
  $('#mode-note').textContent = data.note;
  $('#mode-rules').replaceChildren(...data.rules.map(([label, value]) => {
    const entry = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = value;
    entry.append(dt, dd);
    return entry;
  }));
  $$('.mode-tab').forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  $('#mode-panel').setAttribute('aria-labelledby', `tab-${mode}`);
}

function renderFaqs() {
  const open = $$('#faq-list details').findIndex((detail) => detail.open);
  $('#faq-list').replaceChildren(...FAQS[language].map(({ q, a }, index) => {
    const detail = document.createElement('details');
    const summary = document.createElement('summary');
    const answer = document.createElement('p');
    summary.textContent = q;
    answer.textContent = a;
    detail.open = index === open;
    detail.append(summary, answer);
    return detail;
  }));
}

function applyLanguage(next) {
  language = next === 'vi' ? 'vi' : 'en';
  const copy = COPY[language];
  document.documentElement.lang = language;
  $$('[data-i18n]').forEach((element) => {
    if (copy[element.dataset.i18n] !== undefined) element.textContent = copy[element.dataset.i18n];
  });
  $$('.lang-button').forEach((button) => {
    const selected = button.dataset.lang === language;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  $$('[data-doc-link]').forEach((link) => link.href = language === 'vi' ? './docs/vi/README.html' : './docs/README.html');
  $('[data-doc-testing]').href = language === 'vi' ? './docs/vi/TESTING.html' : './docs/TESTING.html';
  $('.menu-toggle').setAttribute('aria-label', copy.menu_open);
  $('#close-checksum').setAttribute('aria-label', copy.checksum_close);
  $('#download-checksum-link').textContent = language === 'vi' ? 'Tải file .sha256' : 'Download .sha256';
  document.title = `Project Requiem — ${copy.hero_title1} ${copy.hero_title2}`;
  $('meta[name="description"]').content = copy.hero_body;
  renderMode();
  renderFaqs();
  updateStress();
  try { localStorage.setItem('project-requiem-site-language', language); } catch {}
}

async function copyText(text, button, key) {
  let copied = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch {}
  if (!copied) {
    const field = document.createElement('textarea');
    field.value = text;
    field.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.append(field);
    field.select();
    try { copied = document.execCommand('copy'); } catch {}
    field.remove();
    button.focus();
  }
  const target = button.querySelector('[data-i18n]') || button;
  target.textContent = copied ? COPY[language].copy_done : (language === 'vi' ? 'Hãy chọn và sao chép' : 'Select and copy manually');
  $('#live-message').textContent = target.textContent;
  window.setTimeout(() => target.textContent = COPY[language][key], 2200);
}

$('#install-command').textContent = COMMAND;
$('#checksum-value').textContent = SHA;
$$('[data-download]').forEach((link) => link.href = `./downloads/${ZIP}`);
$('#stress-slider').addEventListener('input', updateStress);
$$('.lang-button').forEach((button) => button.addEventListener('click', () => applyLanguage(button.dataset.lang)));
$$('.mode-tab').forEach((button, index, tabs) => {
  button.addEventListener('click', () => { mode = button.dataset.mode; renderMode(); });
  button.addEventListener('keydown', (event) => {
    let target;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') target = 0;
    if (event.key === 'End') target = tabs.length - 1;
    if (target !== undefined) {
      event.preventDefault();
      mode = tabs[target].dataset.mode;
      renderMode();
      tabs[target].focus();
    }
  });
});
$('#copy-command').addEventListener('click', () => copyText(COMMAND, $('#copy-command'), 'copy_command'));
$('#copy-checksum').addEventListener('click', () => copyText(SHA, $('#copy-checksum'), 'copy_checksum'));
$('#show-checksum').addEventListener('click', () => $('#checksum-dialog').showModal());
$('#close-checksum').addEventListener('click', () => $('#checksum-dialog').close());
$('#checksum-dialog').addEventListener('click', (event) => {
  if (event.target === $('#checksum-dialog')) {
    const rect = event.target.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close();
  }
});
$('.menu-toggle').addEventListener('click', () => {
  const open = $('.menu-toggle').getAttribute('aria-expanded') !== 'true';
  $('.menu-toggle').setAttribute('aria-expanded', String(open));
  $('#mobile-menu').hidden = !open;
});
$$('#mobile-menu a').forEach((link) => link.addEventListener('click', () => {
  $('.menu-toggle').setAttribute('aria-expanded', 'false');
  $('#mobile-menu').hidden = true;
}));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    $('.menu-toggle').setAttribute('aria-expanded', 'false');
    $('#mobile-menu').hidden = true;
  }
});
applyLanguage(language);
