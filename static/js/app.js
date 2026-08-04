/**
 * Smart Hotel Management System - Bangladesh
 * Frontend JavaScript
 */

// ─── Sidebar Toggle (Mobile) ─────────────────────────────────────────────────
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('mobileOverlay');
const toggleBtn = document.getElementById('sidebarToggle');

if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  });
}
if (overlay) {
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  });
}

// ─── Auto-dismiss alerts ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.auto-dismiss').forEach(el => {
    setTimeout(() => {
      el.style.transition = 'opacity 0.5s';
      el.style.opacity    = '0';
      setTimeout(() => el.remove(), 500);
    }, 4000);
  });

  // Animate stat cards on load
  document.querySelectorAll('.stat-card').forEach((el, i) => {
    el.style.animationDelay = `${i * 0.07}s`;
    el.classList.add('fade-in');
  });

  // Tooltip init (Bootstrap)
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
    new bootstrap.Tooltip(el);
  });
});

// ─── Room availability checker (booking form) ─────────────────────────────────
const roomTypeSelect   = document.getElementById('roomTypeFilter');
const roomSelect       = document.getElementById('room_id');
const checkinInput     = document.getElementById('checkin_date');
const checkoutInput    = document.getElementById('checkout_date');
const totalDisplay     = document.getElementById('totalDisplay');
const nightsDisplay    = document.getElementById('nightsDisplay');

function computeTotal() {
  const selected = roomSelect ? roomSelect.options[roomSelect.selectedIndex] : null;
  if (!selected || !checkinInput || !checkoutInput) return;

  const price    = parseFloat(selected.dataset.price || 0);
  const cin      = new Date(checkinInput.value);
  const cout     = new Date(checkoutInput.value);
  const nights   = Math.max(0, (cout - cin) / 86400000);

  if (nightsDisplay) nightsDisplay.textContent = nights + ' night(s)';
  if (totalDisplay)  totalDisplay.textContent  = '৳' + (price * nights).toLocaleString('en-BD');
}

if (roomSelect)    roomSelect.addEventListener('change', computeTotal);
if (checkinInput)  checkinInput.addEventListener('change', computeTotal);
if (checkoutInput) checkoutInput.addEventListener('change', computeTotal);

// ─── Edit-Room modal population ──────────────────────────────────────────────
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-edit-room]');
  if (!btn) return;
  const modal = document.getElementById('editRoomModal');
  if (!modal) return;
  modal.querySelector('[name=room_number]').value = btn.dataset.number  || '';
  modal.querySelector('[name=room_type]').value   = btn.dataset.type    || '';
  modal.querySelector('[name=ac_type]').value      = btn.dataset.ac     || '';
  modal.querySelector('[name=price]').value        = btn.dataset.price  || '';
  modal.querySelector('[name=status]').value       = btn.dataset.status || '';
  modal.querySelector('form').action = `/edit-room/${btn.dataset.id}`;
});

// Edit Customer
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-edit-customer]');
  if (!btn) return;
  const modal = document.getElementById('editCustomerModal');
  if (!modal) return;
  modal.querySelector('[name=full_name]').value    = btn.dataset.name    || '';
  modal.querySelector('[name=phone]').value        = btn.dataset.phone   || '';
  modal.querySelector('[name=email]').value        = btn.dataset.email   || '';
  modal.querySelector('[name=nid_passport]').value = btn.dataset.nid     || '';
  modal.querySelector('[name=address]').value      = btn.dataset.address || '';
  modal.querySelector('form').action = `/edit-customer/${btn.dataset.id}`;
});

// ─── Checkout due amount preview ──────────────────────────────────────────────
const checkoutPaidInput = document.getElementById('checkoutPaid');
const checkoutDueDisplay = document.getElementById('checkoutDue');
const checkoutTotal = parseFloat(document.getElementById('checkoutTotalAmt')?.dataset?.total || 0);

if (checkoutPaidInput) {
  checkoutPaidInput.addEventListener('input', () => {
    const paid = parseFloat(checkoutPaidInput.value) || 0;
    const due  = Math.max(checkoutTotal - paid, 0);
    if (checkoutDueDisplay) checkoutDueDisplay.textContent = '৳' + due.toLocaleString('en-BD');
  });
}

// ─── Confirm before delete ────────────────────────────────────────────────────
document.addEventListener('submit', e => {
  const form = e.target;
  if (form.dataset.confirm) {
    if (!confirm(form.dataset.confirm)) e.preventDefault();
  }
});

// ─── Print invoice ────────────────────────────────────────────────────────────
function printInvoice() { window.print(); }