// ===================== بيانات التطبيق =====================
let friends = [];
let debts = []; // { id, paidBy, owedBy, amount, reason, location, dueDays, penalty, timestamp, settled }
let groups = []; // { id, name, members[], chat[] }
let currentGroupFilter = null;
let selectedReason = 'غير ذلك';
let scannedAmount = null;

// تحميل البيانات من localStorage
function loadData() {
    const f = localStorage.getItem('fm_friends');
    const d = localStorage.getItem('fm_debts');
    const g = localStorage.getItem('fm_groups');
    
    if (f) friends = JSON.parse(f);
    else friends = [
        { id:'f1', name:'أحمد', phone:'0123456789' },
        { id:'f2', name:'محمد', phone:'0123456788' },
        { id:'f3', name:'سارة', phone:'0123456787' },
        { id:'f4', name:'نور', phone:'0123456786' }
    ];
    
    if (d) debts = JSON.parse(d);
    else debts = [
        { id:'d1', paidBy:'f1', owedBy:'f2', amount:50, reason:'قهوة', location:'كافيه النجوم', dueDays:0, penalty:0, timestamp:Date.now()-86400000, settled:false },
        { id:'d2', paidBy:'f3', owedBy:'f1', amount:120, reason:'أكل', location:'مطعم البيتزا', dueDays:3, penalty:5, timestamp:Date.now()-172800000, settled:false },
        { id:'d3', paidBy:'f2', owedBy:'f4', amount:80, reason:'رحلة', location:'', dueDays:0, penalty:0, timestamp:Date.now()-259200000, settled:false }
    ];
    
    if (g) groups = JSON.parse(g);
    else groups = [
        { id:'g1', name:'أصحاب الجامعة', members:['f1','f2','f3'], chat:[] },
        { id:'g2', name:'الشغل', members:['f1','f4'], chat:[] }
    ];
}

function saveData() {
    localStorage.setItem('fm_friends', JSON.stringify(friends));
    localStorage.setItem('fm_debts', JSON.stringify(debts));
    localStorage.setItem('fm_groups', JSON.stringify(groups));
}

// ===================== وظائف مساعدة =====================
function getFriendName(id) { const f = friends.find(x=>x.id===id); return f ? f.name : 'غير معروف'; }
function getInitials(name) { return name.substring(0,2).toUpperCase(); }
function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2,6); }
function showToast(msg, type='info') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// تشغيل صوت العملات (إذا كان الملف موجوداً)
function playCashSound() {
    const audio = document.getElementById('cashSound');
    if (audio && audio.play) {
        audio.currentTime = 0;
        audio.play().catch(()=>{});
    }
}

// تأثير سقوط العملات
function triggerCoinsRain() {
    const container = document.getElementById('coinsRain');
    for (let i=0; i<15; i++) {
        const coin = document.createElement('div');
        coin.className = 'coin';
        coin.textContent = '🪙';
        coin.style.left = Math.random() * 100 + '%';
        coin.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
        coin.style.fontSize = (Math.random() * 1.5 + 1.5) + 'rem';
        container.appendChild(coin);
        setTimeout(() => coin.remove(), 3500);
    }
}

// ===================== التنقل بين الصفحات =====================
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelectorAll('.sidebar nav button').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.sidebar nav button[data-page="${page}"]`);
    if (btn) btn.classList.add('active');
    currentGroupFilter = null;
    refreshUI();
}
window.navigateTo = navigateTo;

document.querySelectorAll('.sidebar nav button').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
});

// ===================== تحديث الواجهات =====================
function refreshUI() {
    const active = document.querySelector('.page.active');
    if (!active) return;
    const id = active.id;
    if (id === 'page-dashboard') renderDashboard();
    if (id === 'page-friends') renderFriendsList();
    if (id === 'page-add-debt') { setupDebtAutocomplete(); renderDebtList(); }
    if (id === 'page-split') { populateSplitCheckboxes(); setupSplitAutocomplete(); }
    if (id === 'page-groups') renderGroupsList();
    if (id === 'page-ranking') renderRanking();
    if (id === 'page-history') renderFullHistory();
    if (id === 'page-stats') renderStats();
}

// ===================== الإكمال التلقائي =====================
function setupAutocomplete(inputId, hiddenId, dropdownId) {
    const input = document.getElementById(inputId);
    const hidden = document.getElementById(hiddenId);
    const dropdown = document.getElementById(dropdownId);
    if (!input) return;
    
    input.addEventListener('input', () => {
        const val = input.value.trim();
        if (!val) { dropdown.style.display = 'none'; hidden.value = ''; return; }
        const matches = friends.filter(f => f.name.includes(val));
        if (matches.length === 0) { dropdown.style.display = 'none'; return; }
        dropdown.innerHTML = matches.map(f => `<div data-id="${f.id}">${f.name}</div>`).join('');
        dropdown.style.display = 'block';
        dropdown.querySelectorAll('div').forEach(div => {
            div.addEventListener('click', () => {
                input.value = div.textContent;
                hidden.value = div.dataset.id;
                dropdown.style.display = 'none';
            });
        });
    });
    input.addEventListener('blur', () => {
        setTimeout(() => dropdown.style.display = 'none', 200);
    });
}

function setupDebtAutocomplete() {
    setupAutocomplete('debtPaidByName', 'debtPaidBy', 'paidByDropdown');
    setupAutocomplete('debtOwedByName', 'debtOwedBy', 'owedByDropdown');
    document.querySelectorAll('#reasonChips .chip').forEach(chip => {
        chip.classList.remove('selected');
        if (chip.dataset.reason === selectedReason) chip.classList.add('selected');
    });
    document.getElementById('debtReasonOther').value = '';
}

function setupSplitAutocomplete() {
    setupAutocomplete('splitPaidByName', 'splitPaidBy', 'splitPaidByDropdown');
}

// اختيار السبب بالرقاقات
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('chip') && e.target.closest('#reasonChips')) {
        document.querySelectorAll('#reasonChips .chip').forEach(c => c.classList.remove('selected'));
        e.target.classList.add('selected');
        selectedReason = e.target.dataset.reason;
    }
});

// ===================== لوحة التحكم =====================
function getBalances() {
    const map = {};
    friends.forEach(f => map[f.id] = 0);
    debts.filter(d => !d.settled).forEach(d => {
        map[d.paidBy] = (map[d.paidBy] || 0) + d.amount;
        map[d.owedBy] = (map[d.owedBy] || 0) - d.amount;
    });
    return map;
}

function renderDashboard() {
    const balances = getBalances();
    let totalOwed = 0, totalLent = 0;
    Object.values(balances).forEach(v => {
        if (v > 0) totalLent += v;
        else totalOwed += Math.abs(v);
    });
    
    document.getElementById('dashboardCards').innerHTML = `
        <div class="card stat-card"><div class="value green">${totalLent.toFixed(0)} ج</div><div class="label">إجمالي الفلوس اللي ليك</div></div>
        <div class="card stat-card"><div class="value red">${totalOwed.toFixed(0)} ج</div><div class="label">إجمالي الديون عليك</div></div>
        <div class="card stat-card"><div class="value">${friends.length}</div><div class="label">عدد الأصدقاء</div></div>
    `;
    
    // اقتراح تسوية ذكي (أقل عدد تحويلات)
    const suggestion = calculateMinimalTransfers(balances);
    document.getElementById('settlementSuggestion').textContent = suggestion.text || 'كل الحسابات متسوية 👍';
    document.getElementById('minimalTransfers').innerHTML = suggestion.transfers.map(t =>
        `<div class="list-item"><span>${getFriendName(t.from)} يدفع لـ ${getFriendName(t.to)} : ${t.amount.toFixed(0)} ج</span></div>`
    ).join('');
    
    // تنبيهات الديون المتأخرة
    const now = Date.now();
    const overdue = debts.filter(d => !d.settled && d.dueDays > 0 && (now - d.timestamp) > d.dueDays * 86400000);
    document.getElementById('overdueAlerts').innerHTML = overdue.length ? overdue.map(d => {
        const daysLate = Math.floor((now - d.timestamp) / 86400000) - d.dueDays;
        const penalty = d.penalty ? (d.amount * d.penalty / 100).toFixed(0) : 0;
        return `<div class="list-item" style="border-right:4px solid var(--danger);">
            <span>⚠️ ${getFriendName(d.owedBy)} مديون لـ ${getFriendName(d.paidBy)} بمبلغ ${d.amount} ج (متأخر ${daysLate} يوم)</span>
            ${penalty > 0 ? `<span class="badge badge-red">+${penalty} ج غرامة</span>` : ''}
        </div>`;
    }).join('') : '<div class="empty-state"><p>👍 مفيش ديون متأخرة</p></div>';
    
    // آخر العمليات
    const recent = [...debts].sort((a,b)=> b.timestamp - a.timestamp).slice(0,5);
    document.getElementById('recentTransactions').innerHTML = recent.length ? recent.map(d => `
        <div class="list-item">
            <div class="avatar">${getInitials(getFriendName(d.paidBy))}</div>
            <div class="flex-1">
                <div class="text-bold">${getFriendName(d.paidBy)} → ${getFriendName(d.owedBy)}</div>
                <div class="text-sm">${d.reason} ${d.location ? '📍'+d.location : ''} • ${new Date(d.timestamp).toLocaleDateString('ar-EG')}</div>
            </div>
            <span class="badge badge-red">${d.amount} ج</span>
        </div>
    `).join('') : '<div class="empty-state"><div class="icon">📭</div><p>لا توجد عمليات بعد</p></div>';
}

function calculateMinimalTransfers(balances) {
    const creditors = [], debtors = [];
    Object.entries(balances).forEach(([id, val]) => {
        if (val > 0.01) creditors.push({ id, amount: val });
        else if (val < -0.01) debtors.push({ id, amount: -val });
    });
    if (creditors.length === 0 && debtors.length === 0) return { text: null, transfers: [] };
    
    // خوارزمية مبسطة: نطابق أكبر الدائنين مع أكبر المدينين
    let transfers = [];
    let i = 0, j = 0;
    while (i < creditors.length && j < debtors.length) {
        const amount = Math.min(creditors[i].amount, debtors[j].amount);
        transfers.push({ from: debtors[j].id, to: creditors[i].id, amount });
        creditors[i].amount -= amount;
        debtors[j].amount -= amount;
        if (creditors[i].amount < 0.01) i++;
        if (debtors[j].amount < 0.01) j++;
    }
    const text = transfers.length ? `💡 ممكن تسووا ${transfers.length} تحويلات بس بدل الفوضى:` : null;
    return { text, transfers };
}

// ===================== الأصدقاء =====================
function renderFriendsList() {
    const search = document.getElementById('friendSearch')?.value?.trim() || '';
    const filtered = friends.filter(f => f.name.includes(search));
    const container = document.getElementById('friendsList');
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">👤</div><p>مافيش أصحاب</p></div>';
        return;
    }
    const balances = getBalances();
    container.innerHTML = filtered.map(f => {
        const bal = balances[f.id] || 0;
        return `
            <div class="list-item">
                <div class="avatar">${getInitials(f.name)}</div>
                <div class="flex-1">
                    <div class="text-bold">${f.name}</div>
                    ${f.phone ? `<div class="text-sm">📞 ${f.phone}</div>` : ''}
                </div>
                <span class="badge ${bal>0?'badge-green': bal<0?'badge-red':'badge-neutral'}">${bal !== 0 ? bal.toFixed(0)+' ج' : 'متساوي'}</span>
                <button class="btn btn-sm btn-outline" onclick="settleFriend('${f.id}')">تسوية</button>
                <button class="btn btn-sm btn-danger" onclick="deleteFriend('${f.id}')">🗑</button>
            </div>`;
    }).join('');
}
window.settleFriend = function(id) {
    debts = debts.filter(d => d.paidBy !== id && d.owedBy !== id);
    saveData(); refreshUI(); showToast('تمت تسوية كل ديون ' + getFriendName(id), 'success');
};
window.deleteFriend = function(id) {
    if (confirm(`متأكد من حذف ${getFriendName(id)}؟`)) {
        friends = friends.filter(f => f.id !== id);
        debts = debts.filter(d => d.paidBy !== id && d.owedBy !== id);
        groups.forEach(g => g.members = g.members.filter(m => m !== id));
        saveData(); refreshUI(); showToast('تم الحذف', 'error');
    }
};

function openFriendModal() {
    document.getElementById('modalContainer').innerHTML = `
        <div class="modal-overlay" id="friendModal">
            <div class="modal">
                <h3>➕ إضافة صديق جديد</h3>
                <div class="form-group"><label>الاسم</label><input id="newFriendName" placeholder="اسم الصديق"></div>
                <div class="form-group"><label>رقم الهاتف (اختياري)</label><input id="newFriendPhone" placeholder="01xxxxxxxxx"></div>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
                    <button class="btn btn-primary" onclick="addFriend()">إضافة</button>
                </div>
            </div>
        </div>`;
}
window.openFriendModal = openFriendModal;
window.addFriend = function() {
    const name = document.getElementById('newFriendName').value.trim();
    if (!name) return showToast('الاسم مطلوب', 'error');
    const phone = document.getElementById('newFriendPhone').value.trim();
    friends.push({ id: genId(), name, phone });
    saveData(); closeModal(); refreshUI(); showToast('تمت إضافة الصديق', 'success');
};
function closeModal() { document.getElementById('modalContainer').innerHTML = ''; }
window.closeModal = closeModal;

// ===================== إضافة دين =====================
window.addDebt = function() {
    const paidBy = document.getElementById('debtPaidBy').value;
    const owedBy = document.getElementById('debtOwedBy').value;
    const amount = parseFloat(document.getElementById('debtAmount').value);
    if (!paidBy || !owedBy || isNaN(amount) || amount <= 0) return showToast('املأ البيانات صحيحة', 'error');
    if (paidBy === owedBy) return showToast('مش ممكن نفس الشخص', 'error');
    
    const reasonOther = document.getElementById('debtReasonOther').value.trim();
    const reason = selectedReason === 'غير ذلك' && reasonOther ? reasonOther : selectedReason;
    const location = document.getElementById('debtLocation').value.trim();
    const dueDays = parseInt(document.getElementById('debtDueDays').value) || 0;
    const penalty = parseFloat(document.getElementById('debtPenalty').value) || 0;
    
    debts.push({
        id: genId(), paidBy, owedBy, amount, reason, location,
        dueDays, penalty, timestamp: Date.now(), settled: false
    });
    saveData(); refreshUI();
    document.getElementById('debtAmount').value = '';
    triggerCoinsRain();
    playCashSound();
    showToast('تم تسجيل الدين ✅', 'success');
};

function renderDebtList() {
    const container = document.getElementById('debtList');
    if (debts.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>لا توجد ديون</p></div>'; return;
    }
    container.innerHTML = debts.map(d => `
        <div class="list-item">
            <span>${getFriendName(d.paidBy)} → ${getFriendName(d.owedBy)}</span>
            <span class="badge badge-red">${d.amount} ج</span>
            <span class="text-sm">${d.reason} ${d.location ? '📍'+d.location : ''}</span>
            <button class="btn btn-sm btn-danger" onclick="deleteDebt('${d.id}')">🗑</button>
        </div>
    `).join('');
}
window.deleteDebt = function(id) {
    debts = debts.filter(d => d.id !== id);
    saveData(); refreshUI(); showToast('تم حذف الدين', 'error');
};

// ===================== تقسيم فاتورة =====================
function populateSplitCheckboxes() {
    const container = document.getElementById('splitMembersCheckboxes');
    container.innerHTML = friends.map(f => `
        <label style="display:flex;align-items:center;gap:8px;margin:4px 0;">
            <input type="checkbox" class="split-member-check" value="${f.id}" checked> ${f.name}
        </label>
    `).join('');
}
window.selectAllSplitMembers = function() {
    document.querySelectorAll('.split-member-check').forEach(cb => cb.checked = true);
};
window.splitBillSmart = function() {
    const total = parseFloat(document.getElementById('splitTotal').value);
    if (!total || total <= 0) return showToast('أدخل المبلغ', 'error');
    const paidBy = document.getElementById('splitPaidBy').value;
    if (!paidBy) return showToast('اختر اللي دفع', 'error');
    const selected = Array.from(document.querySelectorAll('.split-member-check:checked')).map(cb => cb.value);
    if (selected.length < 2) return showToast('اختر على الأقل شخصين', 'error');
    if (!selected.includes(paidBy)) return showToast('اللي دفع لازم يكون من المختارين', 'error');
    
    const perPerson = total / selected.length;
    const location = document.getElementById('splitLocation').value.trim();
    selected.forEach(id => {
        if (id === paidBy) return;
        debts.push({
            id: genId(), paidBy, owedBy: id, amount: perPerson,
            reason: 'تقسيم فاتورة', location, dueDays:0, penalty:0,
            timestamp: Date.now(), settled: false
        });
    });
    saveData(); refreshUI();
    document.getElementById('splitPreview').textContent = `تم تسجيل ${selected.length-1} مديونيات، كل واحد ${perPerson.toFixed(2)} ج`;
    showToast('تم تقسيم الفاتورة', 'success');
};

// ===================== تصوير فاتورة (OCR محاكي) =====================
window.handleReceiptUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    // محاكاة قراءة المبلغ من الصورة (لأغراض العرض)
    const reader = new FileReader();
    reader.onload = function(e) {
        // في الواقع سنستخدم Tesseract.js لكن هنا نعرض قيمة عشوائية للعرض
        const fakeAmount = (Math.random() * 500 + 50).toFixed(2);
        scannedAmount = parseFloat(fakeAmount);
        document.getElementById('ocrResult').innerHTML = `
            <p>✅ تم استخراج المبلغ: <strong>${scannedAmount} ج</strong></p>
            <p class="text-sm">(في النسخة الحقيقية سيتم استخدام OCR لقراءة الفاتورة)</p>`;
        document.getElementById('splitScannedBtn').disabled = false;
    };
    reader.readAsDataURL(file);
};
window.splitScannedBill = function() {
    if (!scannedAmount) return;
    const count = parseInt(document.getElementById('scanSplitCount').value) || 2;
    const paidBy = friends[0]?.id; // أول صديق كافتراضي
    if (!paidBy) return showToast('أضف أصدقاء أولاً', 'error');
    const perPerson = scannedAmount / count;
    for (let i=1; i<count; i++) {
        const owed = friends[i]?.id;
        if (owed && owed !== paidBy) {
            debts.push({
                id: genId(), paidBy, owedBy: owed, amount: perPerson,
                reason: 'فاتورة مصورة', location: '', dueDays:0, penalty:0,
                timestamp: Date.now(), settled: false
            });
        }
    }
    saveData(); refreshUI();
    showToast(`تم تقسيم ${scannedAmount} ج على ${count} أشخاص`, 'success');
    scannedAmount = null;
    document.getElementById('splitScannedBtn').disabled = true;
    document.getElementById('ocrResult').innerHTML = '';
};

// ===================== المجموعات والشات =====================
function renderGroupsList() {
    const container = document.getElementById('groupsList');
    if (groups.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">👨‍👩‍👦</div><p>لا توجد مجموعات</p></div>';
        return;
    }
    container.innerHTML = groups.map(g => `
        <div class="list-item">
            <div class="flex-1">
                <div class="text-bold">${g.name}</div>
                <div class="text-sm">${g.members.length} أعضاء</div>
            </div>
            <button class="btn btn-sm btn-outline" onclick="openGroupChat('${g.id}')">💬 شات</button>
            <button class="btn btn-sm btn-danger" onclick="deleteGroup('${g.id}')">🗑</button>
        </div>
    `).join('');
}
window.openGroupChat = function(groupId) {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const chatHtml = `
        <div class="card">
            <h3>💬 شات ${group.name}</h3>
            <div id="chatMessages" style="max-height:200px; overflow-y:auto; margin-bottom:12px;">
                ${(group.chat||[]).map(m => `<div class="text-sm"><strong>${getFriendName(m.sender)}:</strong> ${m.text}</div>`).join('')}
            </div>
            <div style="display:flex; gap:8px;">
                <input id="chatInput" placeholder="اكتب رسالة..." style="flex:1;">
                <button class="btn btn-primary btn-sm" onclick="sendGroupMessage('${groupId}')">إرسال</button>
            </div>
        </div>`;
    document.getElementById('groupChatContainer').innerHTML = chatHtml;
    document.getElementById('groupChatContainer').style.display = 'block';
};
window.sendGroupMessage = function(groupId) {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    if (!group.chat) group.chat = [];
    group.chat.push({ sender: friends[0]?.id || 'unknown', text, timestamp: Date.now() }); // استخدام أول صديق كمرسل (للتبسيط)
    saveData();
    openGroupChat(groupId); // تحديث العرض
};
window.deleteGroup = function(id) {
    groups = groups.filter(g => g.id !== id);
    saveData(); refreshUI(); showToast('تم حذف المجموعة', 'error');
};
function openGroupModal() {
    const checkboxes = friends.map(f => `
        <label style="display:flex;align-items:center;gap:8px;margin:6px 0;">
            <input type="checkbox" value="${f.id}" class="group-member-check"> ${f.name}
        </label>
    `).join('');
    document.getElementById('modalContainer').innerHTML = `
        <div class="modal-overlay" id="groupModal">
            <div class="modal">
                <h3>👨‍👩‍👦 مجموعة جديدة</h3>
                <div class="form-group"><label>اسم المجموعة</label><input id="newGroupName" placeholder="مثال: أصحاب القهوة"></div>
                <div class="form-group"><label>الأعضاء</label>${checkboxes}</div>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
                    <button class="btn btn-primary" onclick="createGroup()">إنشاء</button>
                </div>
            </div>
        </div>`;
}
window.openGroupModal = openGroupModal;
window.createGroup = function() {
    const name = document.getElementById('newGroupName').value.trim();
    if (!name) return showToast('اسم المجموعة مطلوب', 'error');
    const members = Array.from(document.querySelectorAll('.group-member-check:checked')).map(cb => cb.value);
    if (members.length === 0) return showToast('اختر عضو واحد على الأقل', 'error');
    groups.push({ id: genId(), name, members, chat: [] });
    saveData(); closeModal(); refreshUI(); showToast('تم إنشاء المجموعة', 'success');
};

// ===================== التصنيف والتحليل =====================
function renderRanking() {
    const balances = getBalances();
    const list = friends.map(f => ({ id: f.id, bal: balances[f.id] || 0 }));
    const bestPayers = [...list].sort((a,b) => b.bal - a.bal);
    const mostOwed = [...list].sort((a,b) => a.bal - b.bal);
    
    document.getElementById('bestPayerRanking').innerHTML = bestPayers.map((f,i) => `
        <div class="list-item">
            <span>${i+1}. ${getFriendName(f.id)}</span>
            <span class="badge badge-green">${f.bal > 0 ? '+' + f.bal.toFixed(0) : f.bal.toFixed(0)} ج</span>
        </div>`).join('');
    
    document.getElementById('mostOwedRanking').innerHTML = mostOwed.map((f,i) => `
        <div class="list-item">
            <span>${i+1}. ${getFriendName(f.id)}</span>
            <span class="badge badge-red">${f.bal.toFixed(0)} ج</span>
        </div>`).join('');
    
    document.getElementById('behaviorAnalysis').innerHTML = friends.map(f => {
        const paidCount = debts.filter(d => d.paidBy === f.id && !d.settled).length;
        const owedCount = debts.filter(d => d.owedBy === f.id && !d.settled).length;
        let msg = '';
        if (paidCount > owedCount) msg = `💪 ${f.name} بيدفع أكتر من أصحابه`;
        else if (owedCount > paidCount) msg = `🐌 ${f.name} دايمًا مديون`;
        else msg = `⚖️ ${f.name} متوازن`;
        return `<div class="list-item"><span>${msg}</span></div>`;
    }).join('');
}

// ===================== السجل والإحصائيات =====================
function renderFullHistory() {
    const search = document.getElementById('historySearch')?.value?.trim() || '';
    let filtered = debts;
    if (search) filtered = debts.filter(d => getFriendName(d.paidBy).includes(search) || getFriendName(d.owedBy).includes(search));
    const container = document.getElementById('fullHistoryList');
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>السجل فارغ</p></div>'; return;
    }
    container.innerHTML = filtered.sort((a,b)=>b.timestamp-a.timestamp).map(d => `
        <div class="list-item">
            <div>${getFriendName(d.paidBy)} → ${getFriendName(d.owedBy)}: ${d.amount} ج</div>
            <div class="text-sm">${d.reason} ${d.location ? '📍'+d.location : ''} • ${new Date(d.timestamp).toLocaleString('ar-EG')}</div>
            <button class="btn btn-sm btn-danger" onclick="deleteDebt('${d.id}')">🗑</button>
        </div>
    `).join('');
}

function renderStats() {
    const balances = getBalances();
    const entries = Object.entries(balances).map(([id,val]) => ({id,val}));
    entries.sort((a,b) => b.val - a.val);
    const maxAbs = Math.max(1, ...entries.map(e => Math.abs(e.val)));
    
    document.getElementById('statsChart').innerHTML = `
        <div class="bar-chart">
            ${entries.map(e => {
                const h = Math.abs(e.val) / maxAbs * 150;
                const cls = e.val >= 0 ? '' : 'neg';
                return `<div class="bar-col">
                    <div class="bar-val">${e.val.toFixed(0)}</div>
                    <div class="bar ${cls}" style="height:${Math.max(4,h)}px;"></div>
                    <div class="bar-label">${getFriendName(e.id)}</div>
                </div>`;
            }).join('')}
        </div>`;
    
    // تقييم الثقة
    document.getElementById('trustScores').innerHTML = friends.map(f => {
        const totalDebts = debts.filter(d => d.owedBy === f.id).length;
        const settled = debts.filter(d => d.owedBy === f.id && d.settled).length;
        const score = totalDebts ? Math.round((settled / totalDebts) * 100) : 100;
        return `<div class="list-item"><span>${f.name} ⭐ ${score}%</span></div>`;
    }).join('');
}

// ===================== الوضع المظلم =====================
const darkToggle = document.getElementById('darkToggle');
darkToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    darkToggle.querySelector('.nav-icon').textContent = isDark ? '☀️' : '🌙';
    darkToggle.querySelector('span:last-child').textContent = isDark ? 'الوضع الفاتح' : 'الوضع المظلم';
    localStorage.setItem('fm_dark', isDark ? '1' : '0');
});
if (localStorage.getItem('fm_dark') === '1') {
    document.body.classList.add('dark');
    darkToggle.querySelector('.nav-icon').textContent = '☀️';
    darkToggle.querySelector('span:last-child').textContent = 'الوضع الفاتح';
}

// ===================== تصدير PDF ومشاركة =====================
document.getElementById('shareBtn').addEventListener('click', () => {
    const balances = getBalances();
    const summary = friends.map(f => {
        const b = balances[f.id] || 0;
        return `${f.name}: ${b>0?'ليه '+b.toFixed(0): b<0?'عليه '+Math.abs(b).toFixed(0): 'متساوي'} ج`;
    }).join('\n');
    const text = `📋 ملخص حسابات Friends Money:\n${summary}\nالتواصل: 01116604156`;
    if (navigator.share) navigator.share({ title: 'ملخص Friends Money', text }).catch(()=>{});
    else { navigator.clipboard.writeText(text).then(() => showToast('تم نسخ الملخص!', 'success')); }
});

document.getElementById('exportPdfBtn').addEventListener('click', () => {
    alert('خاصية تصدير PDF ستضاف في التحديث القادم بإذن الله 📄');
});

// ===================== وضع عدم الاتصال =====================
window.addEventListener('online', () => document.getElementById('offlineBar').style.display = 'none');
window.addEventListener('offline', () => document.getElementById('offlineBar').style.display = 'block');

// ===================== بدء التشغيل =====================
loadData();
refreshUI();