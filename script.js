// ===================== بيانات التطبيق =====================
let friends = [];
let debts = []; // { id, paidBy, owedBy, amount, reason, groupId, timestamp }
let groups = []; // { id, name, members: [] }
let currentGroupFilter = null; // null يعني كل المجموعات
let selectedReason = 'غير ذلك';

// تحميل البيانات من localStorage
function loadData() {
    const savedFriends = localStorage.getItem('fm_friends');
    const savedDebts = localStorage.getItem('fm_debts');
    const savedGroups = localStorage.getItem('fm_groups');
    if (savedFriends) friends = JSON.parse(savedFriends);
    else {
        // بيانات تجريبية افتراضية
        friends = [
            { id: 'f1', name: 'أحمد', phone: '0123456789' },
            { id: 'f2', name: 'محمد', phone: '0123456788' },
            { id: 'f3', name: 'سارة', phone: '0123456787' },
            { id: 'f4', name: 'نور', phone: '0123456786' }
        ];
    }
    if (savedDebts) debts = JSON.parse(savedDebts);
    else {
        debts = [
            { id: 'd1', paidBy: 'f1', owedBy: 'f2', amount: 50, reason: 'قهوة', timestamp: Date.now() - 86400000 },
            { id: 'd2', paidBy: 'f3', owedBy: 'f1', amount: 120, reason: 'أكل', timestamp: Date.now() - 172800000 },
            { id: 'd3', paidBy: 'f2', owedBy: 'f4', amount: 80, reason: 'رحلة', timestamp: Date.now() - 259200000 }
        ];
    }
    if (savedGroups) groups = JSON.parse(savedGroups);
    else {
        groups = [
            { id: 'g1', name: 'أصحاب الجامعة', members: ['f1', 'f2', 'f3'] },
            { id: 'g2', name: 'الشغل', members: ['f1', 'f4'] }
        ];
    }
}
function saveData() {
    localStorage.setItem('fm_friends', JSON.stringify(friends));
    localStorage.setItem('fm_debts', JSON.stringify(debts));
    localStorage.setItem('fm_groups', JSON.stringify(groups));
}

// ===================== دوال مساعدة =====================
function getFriendName(id) {
    const f = friends.find(fr => fr.id === id);
    return f ? f.name : 'غير معروف';
}
function getFriendInitials(name) {
    return name.substring(0, 2).toUpperCase();
}
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===================== التنقل بين الصفحات =====================
function navigateTo(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageName}`).classList.add('active');
    document.querySelectorAll('.sidebar nav button').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.sidebar nav button[data-page="${pageName}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    currentGroupFilter = null;
    refreshUI();
}
window.navigateTo = navigateTo;

// أحداث أزرار القائمة
document.querySelectorAll('.sidebar nav button').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
});

// ===================== تحديث واجهات المستخدم =====================
function refreshUI() {
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;
    const pageId = activePage.id;
    if (pageId === 'page-dashboard') renderDashboard();
    if (pageId === 'page-friends') renderFriendsList();
    if (pageId === 'page-add-debt') { populateDebtSelects(); renderDebtList(); }
    if (pageId === 'page-split') populateSplitPaidBy();
    if (pageId === 'page-groups') renderGroupsList();
    if (pageId === 'page-history') renderFullHistory();
    if (pageId === 'page-stats') renderStats();
}

function populateSelect(selectId, excludeId = null) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">-- اختر --</option>';
    friends.forEach(f => {
        if (f.id !== excludeId) {
            const option = document.createElement('option');
            option.value = f.id;
            option.textContent = f.name;
            select.appendChild(option);
        }
    });
}

function populateDebtSelects() {
    populateSelect('debtPaidBy');
    populateSelect('debtOwedBy');
    // ربط السبب المختار
    document.querySelectorAll('#reasonChips .chip').forEach(chip => {
        chip.classList.remove('selected');
        if (chip.dataset.reason === selectedReason) chip.classList.add('selected');
    });
    document.getElementById('debtReasonOther').value = '';
}
function populateSplitPaidBy() {
    populateSelect('splitPaidBy');
}

// ===================== لوحة التحكم =====================
function getBalances() {
    const balanceMap = {};
    friends.forEach(f => balanceMap[f.id] = 0);
    debts.forEach(d => {
        balanceMap[d.paidBy] = (balanceMap[d.paidBy] || 0) + d.amount;
        balanceMap[d.owedBy] = (balanceMap[d.owedBy] || 0) - d.amount;
    });
    return balanceMap;
}

function renderDashboard() {
    const balances = getBalances();
    let totalOwed = 0, totalLent = 0;
    Object.values(balances).forEach(val => {
        if (val > 0) totalLent += val;
        else totalOwed += Math.abs(val);
    });
    const cardsHTML = `
        <div class="card stat-card"><div class="value green">${totalLent.toFixed(0)} ج</div><div class="label">إجمالي الفلوس اللي ليك</div></div>
        <div class="card stat-card"><div class="value red">${totalOwed.toFixed(0)} ج</div><div class="label">إجمالي الديون عليك</div></div>
        <div class="card stat-card"><div class="value">${friends.length}</div><div class="label">عدد الأصدقاء</div></div>
    `;
    document.getElementById('dashboardCards').innerHTML = cardsHTML;

    // اقتراح تسوية
    const suggestion = getSettlementSuggestion(balances);
    document.getElementById('settlementSuggestion').textContent = suggestion || 'كل الحسابات متسوية 👍';

    // آخر العمليات
    const recent = [...debts].sort((a,b) => b.timestamp - a.timestamp).slice(0, 5);
    const recentHTML = recent.length ? recent.map(d => `
        <div class="list-item">
            <div class="avatar">${getFriendInitials(getFriendName(d.paidBy))}</div>
            <div class="flex-1">
                <div class="text-bold">${getFriendName(d.paidBy)} → ${getFriendName(d.owedBy)}</div>
                <div class="text-sm">${d.reason} • ${new Date(d.timestamp).toLocaleDateString('ar-EG')}</div>
            </div>
            <span class="badge badge-red">${d.amount} ج</span>
        </div>
    `).join('') : '<div class="empty-state"><div class="icon">📭</div><p>لا توجد عمليات بعد</p></div>';
    document.getElementById('recentTransactions').innerHTML = recentHTML;
}

function getSettlementSuggestion(balances) {
    const creditors = [], debtors = [];
    Object.entries(balances).forEach(([id, val]) => {
        if (val > 0.01) creditors.push({ id, amount: val });
        else if (val < -0.01) debtors.push({ id, amount: -val });
    });
    if (creditors.length === 0 || debtors.length === 0) return null;
    // اقتراح بسيط: أول دائن ياخد من أول مدين
    const c = creditors[0], d = debtors[0];
    const amount = Math.min(c.amount, d.amount);
    return `💡 بدل ما حد ينسى، خلي ${getFriendName(d.id)} يدفع لـ ${getFriendName(c.id)} ${amount.toFixed(0)} جنيه وخلاص!`;
}

// ===================== الأصدقاء =====================
function renderFriendsList() {
    const container = document.getElementById('friendsList');
    if (friends.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">👤</div><p>مافيش أصحاب لسة!</p></div>';
        return;
    }
    const balances = getBalances();
    container.innerHTML = friends.map(f => {
        const bal = balances[f.id] || 0;
        const balClass = bal > 0 ? 'green' : (bal < 0 ? 'red' : '');
        return `
            <div class="list-item">
                <div class="avatar">${getFriendInitials(f.name)}</div>
                <div class="flex-1">
                    <div class="text-bold">${f.name}</div>
                    ${f.phone ? `<div class="text-sm">📞 ${f.phone}</div>` : ''}
                </div>
                <span class="badge ${bal > 0 ? 'badge-green' : (bal < 0 ? 'badge-red' : 'badge-neutral')}">${bal !== 0 ? bal.toFixed(0) + ' ج' : 'متساوي'}</span>
                <button class="btn btn-sm btn-outline" onclick="settleFriend('${f.id}')">تسوية</button>
                <button class="btn btn-sm btn-danger" onclick="deleteFriend('${f.id}')">🗑</button>
            </div>
        `;
    }).join('');
}

window.settleFriend = function(friendId) {
    // تصفير ديون الشخص مع الكل عن طريق إضافة ديون عكسية
    const balances = getBalances();
    const bal = balances[friendId] || 0;
    if (Math.abs(bal) < 0.01) return showToast('الحساب متساوي بالفعل', 'info');
    // إنشاء تسوية: لو ليه فلوس (bal > 0) يبقى هو دفع للآخرين؟ لا، الأبسط: نحذف كل الديون المرتبطة بيه.
    debts = debts.filter(d => d.paidBy !== friendId && d.owedBy !== friendId);
    saveData();
    refreshUI();
    showToast('تمت تسوية كل ديون ' + getFriendName(friendId), 'success');
};

window.deleteFriend = function(id) {
    if (confirm(`متأكد من حذف ${getFriendName(id)}؟`)) {
        friends = friends.filter(f => f.id !== id);
        debts = debts.filter(d => d.paidBy !== id && d.owedBy !== id);
        groups.forEach(g => g.members = g.members.filter(m => m !== id));
        saveData();
        refreshUI();
        showToast('تم الحذف', 'error');
    }
};

function openFriendModal() {
    const modalHTML = `
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
        </div>
    `;
    document.getElementById('modalContainer').innerHTML = modalHTML;
}
window.openFriendModal = openFriendModal;

window.addFriend = function() {
    const name = document.getElementById('newFriendName').value.trim();
    if (!name) return showToast('الاسم مطلوب', 'error');
    const phone = document.getElementById('newFriendPhone').value.trim();
    friends.push({ id: generateId(), name, phone });
    saveData();
    closeModal();
    refreshUI();
    showToast('تمت إضافة الصديق', 'success');
};

function closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
}
window.closeModal = closeModal;

// ===================== إضافة دين =====================
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('chip') && e.target.closest('#reasonChips')) {
        document.querySelectorAll('#reasonChips .chip').forEach(c => c.classList.remove('selected'));
        e.target.classList.add('selected');
        selectedReason = e.target.dataset.reason;
    }
});

window.addDebt = function() {
    const paidBy = document.getElementById('debtPaidBy').value;
    const owedBy = document.getElementById('debtOwedBy').value;
    const amount = parseFloat(document.getElementById('debtAmount').value);
    if (!paidBy || !owedBy || isNaN(amount) || amount <= 0) return showToast('املأ البيانات صحيحة', 'error');
    if (paidBy === owedBy) return showToast('الشخص مش ممكن يكون دافع ومدين لنفسه', 'error');
    const reasonOther = document.getElementById('debtReasonOther').value.trim();
    const reason = selectedReason === 'غير ذلك' && reasonOther ? reasonOther : selectedReason;
    debts.push({ id: generateId(), paidBy, owedBy, amount, reason, timestamp: Date.now() });
    saveData();
    refreshUI();
    document.getElementById('debtAmount').value = '';
    showToast('تم تسجيل الدين ✅', 'success');
};

function renderDebtList() {
    const container = document.getElementById('debtList');
    if (debts.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>لا توجد ديون مسجلة</p></div>';
        return;
    }
    container.innerHTML = debts.map(d => `
        <div class="list-item">
            <span>${getFriendName(d.paidBy)} → ${getFriendName(d.owedBy)}</span>
            <span class="badge badge-red">${d.amount} ج</span>
            <span class="text-sm">${d.reason}</span>
            <button class="btn btn-sm btn-danger" onclick="deleteDebt('${d.id}')">🗑</button>
        </div>
    `).join('');
}
window.deleteDebt = function(id) {
    debts = debts.filter(d => d.id !== id);
    saveData();
    refreshUI();
    showToast('تم حذف الدين', 'error');
};

// ===================== تقسيم فاتورة =====================
window.splitBill = function() {
    const total = parseFloat(document.getElementById('splitTotal').value);
    const count = parseInt(document.getElementById('splitCount').value);
    const paidById = document.getElementById('splitPaidBy').value;
    if (!total || !count || count < 2 || !paidById) return showToast('اكمل البيانات', 'error');
    const perPerson = total / count;
    // الشخص الدافع يتحمل نصيبه، والباقي عليهم
    const others = friends.filter(f => f.id !== paidById).slice(0, count - 1);
    if (others.length < count - 1) return showToast('عدد الأصدقاء غير كافي', 'error');
    others.forEach(f => {
        debts.push({
            id: generateId(),
            paidBy: paidById,
            owedBy: f.id,
            amount: perPerson,
            reason: 'تقسيم فاتورة',
            timestamp: Date.now()
        });
    });
    saveData();
    refreshUI();
    document.getElementById('splitPreview').textContent = `كل شخص يدفع ${perPerson.toFixed(2)} ج (تم تسجيل ${others.length} مديونيات)`;
    showToast('تم تقسيم الفاتورة وتسجيلها', 'success');
};

document.getElementById('splitTotal').addEventListener('input', function() {
    const total = parseFloat(this.value);
    const count = parseInt(document.getElementById('splitCount').value);
    if (total && count && count > 0) {
        document.getElementById('splitPreview').textContent = `النصيب التقريبي لكل شخص: ${(total/count).toFixed(2)} ج`;
    }
});
document.getElementById('splitCount').addEventListener('input', function() {
    const total = parseFloat(document.getElementById('splitTotal').value);
    const count = parseInt(this.value);
    if (total && count && count > 0) {
        document.getElementById('splitPreview').textContent = `النصيب التقريبي لكل شخص: ${(total/count).toFixed(2)} ج`;
    }
});

// ===================== المجموعات =====================
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
            <button class="btn btn-sm btn-outline" onclick="filterByGroup('${g.id}')">عرض الحسابات</button>
            <button class="btn btn-sm btn-danger" onclick="deleteGroup('${g.id}')">🗑</button>
        </div>
    `).join('');
}

window.filterByGroup = function(groupId) {
    currentGroupFilter = groupId;
    navigateTo('dashboard');
    showToast(`عرض حسابات مجموعة: ${groups.find(g=>g.id===groupId)?.name}`, 'info');
};

window.deleteGroup = function(id) {
    groups = groups.filter(g => g.id !== id);
    saveData();
    refreshUI();
    showToast('تم حذف المجموعة', 'error');
};

function openGroupModal() {
    const membersCheckboxes = friends.map(f => `
        <label style="display:flex;align-items:center;gap:8px;margin:6px 0;">
            <input type="checkbox" value="${f.id}" class="group-member-check"> ${f.name}
        </label>
    `).join('');
    const modalHTML = `
        <div class="modal-overlay" id="groupModal">
            <div class="modal">
                <h3>👨‍👩‍👦 مجموعة جديدة</h3>
                <div class="form-group"><label>اسم المجموعة</label><input id="newGroupName" placeholder="مثال: أصحاب القهوة"></div>
                <div class="form-group"><label>الأعضاء</label>${membersCheckboxes}</div>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
                    <button class="btn btn-primary" onclick="createGroup()">إنشاء</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modalContainer').innerHTML = modalHTML;
}
window.openGroupModal = openGroupModal;

window.createGroup = function() {
    const name = document.getElementById('newGroupName').value.trim();
    if (!name) return showToast('اسم المجموعة مطلوب', 'error');
    const checkboxes = document.querySelectorAll('.group-member-check:checked');
    const members = Array.from(checkboxes).map(cb => cb.value);
    if (members.length === 0) return showToast('اختر عضو واحد على الأقل', 'error');
    groups.push({ id: generateId(), name, members });
    saveData();
    closeModal();
    refreshUI();
    showToast('تم إنشاء المجموعة', 'success');
};

// ===================== السجل والإحصائيات =====================
function renderFullHistory() {
    const container = document.getElementById('fullHistoryList');
    if (debts.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>السجل فارغ</p></div>';
        return;
    }
    container.innerHTML = [...debts].sort((a,b)=>b.timestamp-a.timestamp).map(d => `
        <div class="list-item">
            <div>${getFriendName(d.paidBy)} → ${getFriendName(d.owedBy)}: ${d.amount} ج</div>
            <div class="text-sm">${d.reason} • ${new Date(d.timestamp).toLocaleString('ar-EG')}</div>
            <button class="btn btn-sm btn-danger" onclick="deleteDebt('${d.id}')">🗑</button>
        </div>
    `).join('');
}

function renderStats() {
    const balances = getBalances();
    const friendsWithBal = Object.entries(balances).map(([id, val]) => ({ id, val }));
    friendsWithBal.sort((a,b) => b.val - a.val);
    const maxAbs = Math.max(1, ...friendsWithBal.map(f => Math.abs(f.val)));
    const chartHTML = `
        <div class="bar-chart">
            ${friendsWithBal.map(f => {
                const height = Math.abs(f.val) / maxAbs * 150;
                const cls = f.val >= 0 ? '' : 'neg';
                return `<div class="bar-col">
                    <div class="bar-val">${f.val.toFixed(0)}</div>
                    <div class="bar ${cls}" style="height:${Math.max(4, height)}px;"></div>
                    <div class="bar-label">${getFriendName(f.id)}</div>
                </div>`;
            }).join('')}
        </div>
        <p class="text-sm" style="margin-top: 8px;">📊 الأعمدة الخضراء = ليك فلوس، الحمراء = عليك فلوس</p>
    `;
    document.getElementById('statsContainer').innerHTML = `
        <div class="card">${chartHTML}</div>
    `;
}

// ===================== الوضع المظلم =====================
const darkToggle = document.getElementById('darkToggle');
darkToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    darkToggle.querySelector('span:last-child').textContent = isDark ? 'الوضع الفاتح' : 'الوضع المظلم';
    darkToggle.querySelector('.nav-icon').textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('fm_dark', isDark ? '1' : '0');
});
if (localStorage.getItem('fm_dark') === '1') {
    document.body.classList.add('dark');
    darkToggle.querySelector('.nav-icon').textContent = '☀️';
    darkToggle.querySelector('span:last-child').textContent = 'الوضع الفاتح';
}

// ===================== مشاركة الملخص =====================
document.getElementById('shareBtn').addEventListener('click', () => {
    const balances = getBalances();
    const summary = friends.map(f => {
        const b = balances[f.id] || 0;
        const status = b > 0 ? `ليه ${b.toFixed(0)} ج` : (b < 0 ? `عليه ${Math.abs(b).toFixed(0)} ج` : 'متساوي');
        return `${f.name}: ${status}`;
    }).join('\n');
    const shareText = `📋 ملخص حسابات Friends Money:\n${summary}\nرابط الموقع: [ضع الرابط هنا]`;
    if (navigator.share) {
        navigator.share({ title: 'ملخص Friends Money', text: shareText }).catch(() => {});
    } else {
        navigator.clipboard.writeText(shareText).then(() => showToast('تم نسخ الملخص!', 'success'));
    }
});

// ===================== بدء التشغيل =====================
loadData();
refreshUI();

// تحديث الواجهة عند الحاجة
window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('fm_')) {
        loadData();
        refreshUI();
    }
});