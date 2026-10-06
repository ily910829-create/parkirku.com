const places = [
  { id: 'taman', name: 'Taman Ria Kota Bima', type: 'TAMAN HIBURAN', address: 'Kota Bima · Nusa Tenggara Barat', capacity: 180, icon: '♧', className: '', price: 5000, vip: true },
  { id: 'gacoan', name: 'Mie Gacoan Bima', type: 'KULINER', address: 'Kota Bima · Nusa Tenggara Barat', capacity: 120, icon: '✦', className: 'food', price: 3000, vip: false },
  { id: 'museum', name: 'Museum Asi Mbojo', type: 'WISATA BUDAYA', address: 'Kota Bima · Nusa Tenggara Barat', capacity: 160, icon: '▤', className: 'museum', price: 10000, vip: false },
];
const DBKEY = 'parkirku_demo_v1';
let data = load();
let installPrompt = null;

function load() {
  try { return JSON.parse(localStorage.getItem(DBKEY)) || { tickets: [], payments: [] }; }
  catch { return { tickets: [], payments: [] }; }
}
function save() { localStorage.setItem(DBKEY, JSON.stringify(data)); render(); }
function money(n) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n); }
function activeTickets() { return data.tickets.filter(t => !t.outAt); }
function locationName(id) { return places.find(p => p.id === id)?.name || 'Lokasi'; }
function showNotice(msg) {
  const n = document.querySelector('#notice');
  n.textContent = msg; n.hidden = false;
  setTimeout(() => { n.hidden = true; }, 5500);
}
function uid() { return 'PK-' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(); }

// Creates a standards-based QR Code Model 2, version 1-L. Ticket IDs are short ASCII strings.
function qrSvg(value) {
  const bits = [];
  const appendBits = (number, length) => { for (let i = length - 1; i >= 0; i--) bits.push((number >>> i) & 1); };
  const bytes = Array.from(new TextEncoder().encode(value));
  if (bytes.length > 17) throw new Error('Kode tiket terlalu panjang untuk QR versi 1.');
  appendBits(0b0100, 4); // byte mode
  appendBits(bytes.length, 8);
  bytes.forEach(byte => appendBits(byte, 8));
  const dataCapacity = 19 * 8;
  for (let i = 0; i < 4 && bits.length < dataCapacity; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const dataWords = [];
  for (let i = 0; i < bits.length; i += 8) dataWords.push(bits.slice(i, i + 8).reduce((n, bit) => (n << 1) | bit, 0));
  for (let pad = 0; dataWords.length < 19; pad++) dataWords.push(pad % 2 ? 0x11 : 0xec);

  const multiply = (a, b) => {
    let result = 0;
    for (let i = 0; i < 8; i++) {
      if (b & 1) result ^= a;
      const carry = a & 0x80;
      a = (a << 1) & 0xff;
      if (carry) a ^= 0x1d;
      b >>>= 1;
    }
    return result;
  };
  const polyMultiply = (a, b) => {
    const result = Array(a.length + b.length - 1).fill(0);
    a.forEach((x, i) => b.forEach((y, j) => { result[i + j] ^= multiply(x, y); }));
    return result;
  };
  let generator = [1], root = 1;
  for (let i = 0; i < 7; i++) { generator = polyMultiply(generator, [1, root]); root = multiply(root, 2); }
  const remainder = [...dataWords, ...Array(7).fill(0)];
  for (let i = 0; i < dataWords.length; i++) {
    const factor = remainder[i];
    if (factor) for (let j = 0; j < generator.length; j++) remainder[i + j] ^= multiply(generator[j], factor);
  }
  const allWords = [...dataWords, ...remainder.slice(dataWords.length)];
  const size = 21;
  const matrix = Array.from({ length: size }, () => Array(size).fill(null));
  const setFunction = (row, col, value) => { if (row >= 0 && row < size && col >= 0 && col < size) matrix[row][col] = value; };
  const finder = (top, left) => {
    for (let dy = -1; dy <= 7; dy++) for (let dx = -1; dx <= 7; dx++) {
      const row = top + dy, col = left + dx;
      if (row < 0 || row >= size || col < 0 || col >= size) continue;
      const inside = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      const distance = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
      setFunction(row, col, inside && (distance === 3 || distance <= 1));
    }
  };
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
  for (let i = 8; i < size - 8; i++) { setFunction(6, i, i % 2 === 0); setFunction(i, 6, i % 2 === 0); }
  // Reserve both format-information areas and the fixed dark module.
  for (let i = 0; i <= 5; i++) setFunction(8, i, false);
  setFunction(8, 7, false); setFunction(8, 8, false); setFunction(7, 8, false);
  for (let i = 9; i < 15; i++) setFunction(14 - i, 8, false);
  for (let i = 0; i < 8; i++) setFunction(8, size - 1 - i, false);
  for (let i = 8; i < 15; i++) setFunction(size - 15 + i, 8, false);
  setFunction(size - 8, 8, true);

  const stream = allWords.flatMap(word => Array.from({ length: 8 }, (_, i) => (word >>> (7 - i)) & 1));
  let bitIndex = 0, upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right--;
    for (let step = 0; step < size; step++) {
      const row = upward ? size - 1 - step : step;
      for (let side = 0; side < 2; side++) {
        const col = right - side;
        if (matrix[row][col] !== null) continue;
        let dark = bitIndex < stream.length ? stream[bitIndex++] === 1 : false;
        if ((row + col) % 2 === 0) dark = !dark; // mask pattern 0
        matrix[row][col] = dark;
      }
    }
    upward = !upward;
  }

  // Error-correction level L and mask pattern 0, BCH-encoded per QR specification.
  const formatData = 1 << 3;
  let formatRemainder = formatData << 10;
  for (let bit = 14; bit >= 10; bit--) if ((formatRemainder >>> bit) & 1) formatRemainder ^= 0x537 << (bit - 10);
  const format = ((formatData << 10) | formatRemainder) ^ 0x5412;
  const formatBit = i => ((format >>> i) & 1) !== 0;
  for (let i = 0; i <= 5; i++) setFunction(8, i, formatBit(i));
  setFunction(8, 7, formatBit(6)); setFunction(8, 8, formatBit(7)); setFunction(7, 8, formatBit(8));
  for (let i = 9; i < 15; i++) setFunction(14 - i, 8, formatBit(i));
  for (let i = 0; i < 8; i++) setFunction(8, size - 1 - i, formatBit(i));
  for (let i = 8; i < 15; i++) setFunction(size - 15 + i, 8, formatBit(i));
  setFunction(size - 8, 8, true);

  let path = '';
  matrix.forEach((row, r) => row.forEach((dark, c) => { if (dark) path += `M${c + 4} ${r + 4}h1v1h-1z`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="290" height="290" viewBox="0 0 29 29"><rect width="29" height="29" fill="#fff"/><path d="${path}" fill="#111"/></svg>`;
}

function render() {
  const active = activeTickets();
  const sold = data.payments.reduce((sum, item) => sum + item.amount, 0);
  document.querySelector('#parkedCount').textContent = active.length;
  document.querySelector('#slotCount').textContent = places.reduce((sum, place) => sum + place.capacity, 0) - active.length;
  document.querySelector('#revenue').textContent = money(sold);
  document.querySelector('#panelRevenue').textContent = money(sold);
  document.querySelector('#locationCount').textContent = String(places.length).padStart(2, '0');
  document.querySelector('#capacityBar').style.width = Math.min(100, Math.max(3, active.length / 460 * 100)) + '%';
  document.querySelector('#heroCode').textContent = new Date().getFullYear() + '-' + String(active.length + 412).padStart(4, '0');
  const query = (document.querySelector('#search').value || '').toLocaleLowerCase('id');
  document.querySelector('#locationGrid').innerHTML = places.filter(p => (p.name + ' ' + p.type + ' ' + p.address).toLocaleLowerCase('id').includes(query)).map(place => {
    const used = active.filter(ticket => ticket.place === place.id).length;
    const free = Math.max(0, place.capacity - used);
    return `<article class="location-card"><div class="location-visual ${place.className}"><span class="loc-icon">${place.icon}</span><span class="loc-badge">${place.vip ? '✦ VIP demo' : 'PARKIR MUDAH'}</span></div><div class="location-body"><small>${place.type}</small><h3>${place.name}</h3><span style="font-size:10px;color:#89948c">${place.address}</span><div class="location-meta"><span><b>${free}</b> slot · contoh</span><span>${money(place.price)} · contoh</span></div><a class="book-link" href="#scan" data-book="${place.id}">Pilih lokasi →</a></div></article>`;
  }).join('');
  document.querySelectorAll('#locationGrid [data-book]').forEach(link => { link.onclick = () => { document.querySelector('#locationSelect').value = link.dataset.book; }; });
}

function record() {
  const action = document.querySelector('#action').value;
  const place = document.querySelector('#locationSelect').value;
  const vehicle = document.querySelector('#vehicle').value;
  const payment = 'Tunai';
  const raw = document.querySelector('#plate').value.trim();
  if (action === 'in') {
    if (activeTickets().filter(ticket => ticket.place === place).length >= places.find(item => item.id === place).capacity) return showNotice('Slot lokasi ini penuh. Silakan pilih lokasi lain.');
    const selectedPlace = places.find(item => item.id === place);
    const ticket = { code: uid(), place, vehicle, plate: raw || 'TANPA-PLAT', payment, amount: selectedPlace.price, at: new Date().toISOString(), vip: selectedPlace.vip, outAt: null };
    data.tickets.unshift(ticket);
    data.payments.unshift({ code: ticket.code, place, amount: ticket.amount, payment, at: ticket.at, plate: ticket.plate });
    save(); openTicket(ticket); document.querySelector('#plate').value = '';
    showNotice(`Kendaraan masuk dicatat. Tiket ${ticket.code} tersimpan di browser ini.`);
  } else {
    const ticket = data.tickets.find(item => !item.outAt && (raw ? item.code.toLowerCase() === raw.toLowerCase() || item.plate.toLowerCase() === raw.toLowerCase() : item.place === place));
    if (!ticket) return showNotice('QR tiket aktif tidak ditemukan. Pindai QR atau masukkan kode tiket.');
    ticket.outAt = new Date().toISOString(); save(); document.querySelector('#plate').value = '';
    showNotice(`Kendaraan keluar tercatat untuk ${ticket.code}.`);
  }
}

function openTicket(ticket) {
  document.querySelector('#ticketCode').textContent = ticket.code;
  document.querySelector('#ticketPlace').textContent = locationName(ticket.place);
  document.querySelector('#ticketVehicle').textContent = ticket.vehicle + ' · ' + ticket.plate;
  document.querySelector('#ticketTime').textContent = new Date(ticket.at).toLocaleString('id-ID');
  document.querySelector('.vip-label').textContent = ticket.vip ? '✦ VIP demo' : 'Parkir reguler';
  document.querySelector('#vipCode').textContent = 'PKVIP-' + ticket.code.slice(-4);
  document.querySelector('#ticketQr').src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(qrSvg(ticket.code));
  document.querySelector('#ticketModal').showModal();
  document.querySelector('#downloadTicket').onclick = () => {
    const blob = new Blob([qrSvg(ticket.code)], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = ticket.code + '-QR.svg'; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
}

document.querySelector('#locationSelect').innerHTML = places.map(place => `<option value="${place.id}">${place.name}</option>`).join('');
document.querySelector('#search').addEventListener('input', render);
document.querySelector('#action').addEventListener('change', event => {
  document.querySelector('#recordBtn').textContent = event.target.value === 'in' ? 'Catat kendaraan masuk →' : 'Catat kendaraan keluar →';
});
document.querySelector('#recordBtn').onclick = record;
document.querySelector('#plate').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); record(); } });
document.querySelector('#openTicket').onclick = () => { document.querySelector('#scan').scrollIntoView({ behavior: 'smooth' }); document.querySelector('#plate').focus(); };
document.querySelector('#vipBtn').onclick = () => document.querySelector('#vipModal').showModal();
document.querySelectorAll('[data-close]').forEach(button => { button.onclick = () => button.closest('dialog').close(); });
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
document.querySelector('#exportBtn').onclick = () => {
  const rows = [['Kode tiket', 'Lokasi', 'Nomor kendaraan', 'Jenis', 'Pembayaran', 'Nominal', 'Waktu masuk', 'Waktu keluar'], ...data.tickets.map(ticket => [ticket.code, locationName(ticket.place), ticket.plate, ticket.vehicle, ticket.payment, ticket.amount, new Date(ticket.at).toLocaleString('id-ID'), ticket.outAt ? new Date(ticket.outAt).toLocaleString('id-ID') : 'Masih parkir'])];
  const csv = '\ufeff' + rows.map(row => row.map(cell => '"' + String(cell).replaceAll('"', '""') + '"').join(',')).join('\r\n');
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = 'parkirku-laporan.csv'; link.click(); URL.revokeObjectURL(link.href);
};
window.addEventListener('online', () => { document.querySelector('#netStatus').textContent = 'Online'; });
window.addEventListener('offline', () => { document.querySelector('#netStatus').textContent = 'Offline · data lokal'; });
document.querySelector('#netStatus').textContent = navigator.onLine ? 'Online' : 'Offline · data lokal';
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); installPrompt = event;
  const button = document.querySelector('#installBtn'); button.hidden = false;
  button.onclick = async () => { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; button.hidden = true; };
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
render();
