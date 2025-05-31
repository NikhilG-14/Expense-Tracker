// Enhanced data structure and state management
class ExpenseTracker {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem("transactions")) || [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.categories = {
            food: { icon: '🍔', color: '#f59e0b' },
            transport: { icon: '🚗', color: '#3b82f6' },
            shopping: { icon: '🛍️', color: '#ec4899' },
            entertainment: { icon: '🎬', color: '#8b5cf6' },
            bills: { icon: '📱', color: '#ef4444' },
            health: { icon: '🏥', color: '#10b981' },
            salary: { icon: '💼', color: '#059669' },
            freelance: { icon: '💻', color: '#0891b2' },
            investment: { icon: '📈', color: '#7c3aed' },
            other: { icon: '📦', color: '#6b7280' }
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.render();
        this.updateAnalytics();
    }

    bindEvents() {
        document.getElementById('form').addEventListener('submit', (e) => this.addTransaction(e));
        document.getElementById('search').addEventListener('input', (e) => this.handleSearch(e));
        document.getElementById('type').addEventListener('change', (e) => this.handleTypeChange(e));
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilter(e));
        });

        // Add time filter event listeners
        document.querySelectorAll('.time-filter button').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleTimeFilter(e));
        });
    }

    addTransaction(e) {
        e.preventDefault();
        
        const text = document.getElementById('text').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const type = document.getElementById('type').value;

        if (!text || isNaN(amount)) { // FIX: allow 0, prevent NaN
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        const transaction = {
            id: Date.now(),
            text,
            amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
            category,
            type,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };

        this.transactions.unshift(transaction);
        this.saveToStorage();
        this.render();
        this.updateAnalytics();
        this.clearForm();
        this.showNotification('Transaction added successfully!', 'success');
    }

    removeTransaction(id) {
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveToStorage();
        this.render();
        this.updateAnalytics();
        this.showNotification('Transaction deleted', 'info');
    }

    handleFilter(e) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.filter;
        this.render();
    }

    handleSearch(e) {
        this.searchTerm = e.target.value.toLowerCase();
        this.render();
    }

    handleTypeChange(e) {
        const amountInput = document.getElementById('amount');
        if (e.target.value === 'expense') {
            amountInput.style.borderColor = 'var(--danger)';
        } else {
            amountInput.style.borderColor = 'var(--success)';
        }
    }

    handleTimeFilter(e) {
        document.querySelectorAll('.time-filter button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.updateCategoryChart();
    }

    getFilteredTransactions() {
        let filtered = [...this.transactions];

        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(t => 
                t.text.toLowerCase().includes(this.searchTerm) ||
                t.category.toLowerCase().includes(this.searchTerm)
            );
        }

        // Apply category/type filter
        if (this.currentFilter === 'income') {
            filtered = filtered.filter(t => t.amount > 0);
        } else if (this.currentFilter === 'expense') {
            filtered = filtered.filter(t => t.amount < 0);
        } else if (this.currentFilter === 'today') {
            const today = new Date().toDateString();
            filtered = filtered.filter(t => new Date(t.date).toDateString() === today);
        } else if (this.currentFilter === 'week') {
            const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(t => t.timestamp > weekAgo);
        } else if (this.currentFilter === 'month') {
            const monthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(t => t.timestamp > monthAgo);
        }

        return filtered;
    }

    render() {
        const list = document.getElementById('list');
        const filtered = this.getFilteredTransactions();

        if (filtered.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #6b7280;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                    <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 0.5rem;">No transactions found</div>
                    <div style="font-size: 0.9rem;">Add your first transaction to get started!</div>
                </div>
            `;
            return;
        }

        list.innerHTML = filtered.map(transaction => {
            const category = this.categories[transaction.category] || this.categories['other']; // FIX
            const date = new Date(transaction.date);
            const timeAgo = this.getTimeAgo(date);
            
            return `
                <div class="transaction-item ${transaction.amount > 0 ? 'income' : 'expense'}">
                    <div class="transaction-icon" style="background: ${category.color}">
                        ${category.icon}
                    </div>
                    <div class="transaction-info">
                        <div class="transaction-desc">${transaction.text}</div>
                        <div class="transaction-meta">
                            <span>${transaction.category}</span>
                            <span>${timeAgo}</span>
                            <span>${date.toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="transaction-amount" style="color: ${transaction.amount > 0 ? 'var(--success)' : 'var(--danger)'}">
                        ${transaction.amount > 0 ? '+' : ''}$${Math.abs(transaction.amount).toFixed(2)}
                    </div>
                    <button class="delete-btn" onclick="tracker.removeTransaction(${transaction.id})">×</button>
                </div>
            `;
        }).join('');

        this.updateBalance();
    }

    updateBalance() {
        const amounts = this.transactions.map(t => t.amount);
        const total = amounts.reduce((acc, amount) => acc + amount, 0);
        const income = amounts.filter(amount => amount > 0).reduce((acc, amount) => acc + amount, 0);
        const expenses = amounts.filter(amount => amount < 0).reduce((acc, amount) => acc + amount, 0);

        document.getElementById('balance').textContent = `$${total.toFixed(2)}`;
        document.getElementById('money-plus').textContent = `+$${income.toFixed(2)}`;
        document.getElementById('money-minus').textContent = `-$${Math.abs(expenses).toFixed(2)}`;

        // Calculate and display balance change (simulated)
        const balanceChange = document.getElementById('balance-change');
        const changePercent = this.calculateMonthlyChange();
        balanceChange.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}% from last month`;

        // Update income/expense changes
        const incomeChangeEl = document.getElementById('income-change');
        const expenseChangeEl = document.getElementById('expense-change');
        const incomeChange = this.calculateIncomeChange();
        const expenseChange = this.calculateExpenseChange();
        
        incomeChangeEl.textContent = `${incomeChange >= 0 ? '+' : ''}${incomeChange.toFixed(1)}% from last month`;
        expenseChangeEl.textContent = `${expenseChange >= 0 ? '+' : ''}${expenseChange.toFixed(1)}% from last month`;
    }

    updateAnalytics() {
        this.updateBasicStats();
        this.updateCategoryChart();
        this.updateRecentActivity();
    }

    updateBasicStats() {
        const total = this.transactions.length;
        const amounts = this.transactions.map(t => Math.abs(t.amount));
        const expenses = this.transactions.filter(t => t.amount < 0);
        const income = this.transactions.filter(t => t.amount > 0);
        
        const avgTransaction = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
        const largestExpense = expenses.length > 0 ? Math.max(...expenses.map(t => Math.abs(t.amount))) : 0;
        
        const totalIncome = income.reduce((acc, t) => acc + t.amount, 0);
        const totalExpenses = Math.abs(expenses.reduce((acc, t) => acc + t.amount, 0));
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

        document.getElementById('total-transactions').textContent = total;
        document.getElementById('avg-transaction').textContent = `$${avgTransaction.toFixed(0)}`;
        document.getElementById('largest-expense').textContent = `$${largestExpense.toFixed(0)}`;
        document.getElementById('savings-rate').textContent = `${Math.max(0, savingsRate).toFixed(0)}%`;
    }

    updateCategoryChart() {
        const chartContainer = document.getElementById('category-chart');
        const activeTimeFilter = document.querySelector('.time-filter button.active')?.textContent.toLowerCase() || 'week';
        
        // Filter transactions based on time period
        let filteredTransactions = this.getTransactionsByPeriod(activeTimeFilter);
        const expenses = filteredTransactions.filter(t => t.amount < 0);
        
        if (expenses.length === 0) {
            chartContainer.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 2rem;">No expense data for this period</div>';
            return;
        }

        // Group by category
        const categoryTotals = {};
        expenses.forEach(transaction => {
            const category = transaction.category;
            categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(transaction.amount);
        });

        // Sort categories by amount
        const sortedCategories = Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 6); // Show top 6 categories

        const maxAmount = Math.max(...sortedCategories.map(([,amount]) => amount));

        chartContainer.innerHTML = sortedCategories.map(([category, amount]) => {
            const percentage = (amount / maxAmount) * 100;
            const categoryInfo = this.categories[category] || this.categories['other']; // FIX
            
            return `
                <div class="progress-item">
                    <div style="display: flex; align-items: center; gap: 0.5rem; min-width: 120px;">
                        <span>${categoryInfo.icon}</span>
                        <span style="font-size: 0.9rem; font-weight: 600; text-transform: capitalize;">${category}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%; background: ${categoryInfo.color};"></div>
                    </div>
                    <div style="font-weight: 700, min-width: 80px, text-align: right;">$${amount.toFixed(0)}</div>
                </div>
            `;
        }).join('');
    }

    updateRecentActivity() {
        const container = document.getElementById('recent-activity');
        const recent = this.transactions.slice(0, 5);
        
        if (recent.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 2rem;">No recent activity</div>';
            return;
        }

        container.innerHTML = recent.map(transaction => {
            const category = this.categories[transaction.category] || this.categories['other']; // FIX
            const timeAgo = this.getTimeAgo(new Date(transaction.date));
            
            return `
                <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid #f1f5f9;">
                    <div style="width: 40px; height: 40px; border-radius: 10px; background: ${category.color}; display: flex; align-items: center; justify-content: center; color: white;">
                        ${category.icon}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600, margin-bottom: 0.25rem;">${transaction.text}</div>
                        <div style="font-size: 0.85rem; color: #6b7280;">${timeAgo}</div>
                    </div>
                    <div style="font-weight: 700; color: ${transaction.amount > 0 ? 'var(--success)' : 'var(--danger)'};">
                        ${transaction.amount > 0 ? '+' : ''}$${Math.abs(transaction.amount).toFixed(2)}
                    </div>
                </div>
            `;
        }).join('');
    }

    getTransactionsByPeriod(period) {
        const now = Date.now();
        let cutoff;
        
        switch(period) {
            case 'week':
                cutoff = now - (7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                cutoff = now - (30 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                cutoff = now - (365 * 24 * 60 * 60 * 1000);
                break;
            default:
                cutoff = now - (7 * 24 * 60 * 60 * 1000);
        }
        
        return this.transactions.filter(t => t.timestamp > cutoff);
    }

    calculateMonthlyChange() {
        const now = new Date();
        const thisMonth = this.transactions.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        });
        
        const lastMonth = this.transactions.filter(t => {
            const date = new Date(t.date);
            const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
            return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear();
        });

        const thisMonthTotal = thisMonth.reduce((acc, t) => acc + t.amount, 0);
        const lastMonthTotal = lastMonth.reduce((acc, t) => acc + t.amount, 0);
        
        if (lastMonthTotal === 0) return 0;
        return ((thisMonthTotal - lastMonthTotal) / Math.abs(lastMonthTotal)) * 100;
    }

    calculateIncomeChange() {
        // Simulate income change calculation
        return Math.random() * 20 - 5; // Random between -5% and +15%
    }

    calculateExpenseChange() {
        // Simulate expense change calculation
        return Math.random() * 15 - 10; // Random between -10% and +5%
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInMs = now - date;
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays < 7) return `${diffInDays}d ago`;
        return date.toLocaleDateString();
    }

    showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            info: '#3b82f6',
            warning: '#f59e0b'
        };
        
        notification.style.background = colors[type] || colors.info;
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Hide notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    saveToStorage() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }

    clearForm() {
        document.getElementById('form').reset();
        document.getElementById('amount').style.borderColor = '#e5e7eb';
    }
}

// Global functions for HTML onclick handlers
function clearForm() {
    tracker.clearForm();
}

// Initialize the expense tracker
const tracker = new ExpenseTracker();

// Clear local storage (for testing/resetting)
// localStorage.removeItem('transactions');